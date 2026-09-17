import { describe, expect, it } from 'bun:test';
import {
  areCoordsEqual,
  areSectorsConnected,
  getEdgeBetween,
  getHexDistance,
  getOppositeEdge,
  hasWormholeOnEdge,
} from '../rules/hexMath';
import {
  calculateBlueprintStats,
  createDefaultHumanBlueprints,
  SHIP_LIMITS,
  countPlayerShips,
  getRemainingShipSupply,
} from '../rules/shipValidation';
import { SHIP_PARTS } from '../rules/partData';
import { createInitialGame } from '../rules/setup';
import { executeAction, validateAction } from '../rules/gameReducer';
import {
  getIncomeForTrack,
  getUpkeepForDiscs,
  calculateActionCostForecast,
  getPlayerTechRows,
  TECH_ROW_VP_TABLE,
} from '../rules/economyEngine';
import { CENTER_SECTOR, generateSectorDecks } from '../rules/sectorData';
import {
  createInitialTechBag,
  drawTechTilesForRound,
  calculateTechCost,
  MILITARY_TECHS,
  GRID_TECHS,
  NANO_TECHS,
  RARE_TECHS,
  TECH_CATALOG,
} from '../rules/techData';

describe('Hexagonal Galaxy Math & Wormholes', () => {
  it('correctly calculates axial hex distance', () => {
    expect(getHexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(getHexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    expect(getHexDistance({ q: 0, r: 0 }, { q: 0, r: -2 })).toBe(2);
    expect(getHexDistance({ q: -2, r: 2 }, { q: 2, r: -2 })).toBe(4);
  });

  it('correctly identifies neighbor edges and opposites', () => {
    const from = { q: 0, r: 0 };
    const to = { q: 1, r: 0 }; // Edge 0 (East, 0°)
    const edge = getEdgeBetween(from, to);
    expect(edge).toBe(0);
    expect(getOppositeEdge(0)).toBe(3);
  });

  it('correctly checks wormhole alignment between sectors', () => {
    const sectorA = {
      id: 'A',
      sectorNumber: 101,
      ring: 1 as const,
      coord: { q: 0, r: 0 },
      rotation: 0,
      wormholes: [true, false, false, false, false, false], // Wormhole on Edge 0 (East)
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      ships: [],
    };

    const sectorB = {
      id: 'B',
      sectorNumber: 102,
      ring: 1 as const,
      coord: { q: 1, r: 0 }, // At edge 0 of A (East)
      rotation: 0,
      wormholes: [false, false, false, true, false, false], // Wormhole on Edge 3 (West - facing A)
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      ships: [],
    };

    const sectorC = {
      id: 'C',
      sectorNumber: 103,
      ring: 1 as const,
      coord: { q: 1, r: 0 },
      rotation: 0,
      wormholes: [false, true, false, false, false, false], // Missing wormhole on Edge 3!
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      ships: [],
    };

    expect(areSectorsConnected(sectorA, sectorB)).toBe(true);

    // If sector B rotates by 1 (60 deg), wormhole moves away from Edge 3
    sectorB.rotation = 1;
    expect(areSectorsConnected(sectorA, sectorB)).toBe(false);

    // With Wormhole Generator, one side having a wormhole is sufficient
    expect(areSectorsConnected(sectorA, sectorC, true)).toBe(true);
  });
});

describe('Ship Blueprint Validation', () => {
  it('validates a balanced Terran Interceptor blueprint', () => {
    const interceptor = {
      type: 'interceptor' as const,
      maxSlots: 4,
      baseInitiative: 3,
      baseBuildCost: 3,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.nuclear_source, // +3 power
        SHIP_PARTS.nuclear_drive,  // -1 power, speed 1
        null,
      ],
    };

    const stats = calculateBlueprintStats(interceptor);
    expect(stats.isValid).toBe(true);
    expect(stats.totalPowerProduced).toBe(3);
    expect(stats.totalPowerConsumed).toBe(2); // 1 (cannon) + 1 (drive)
    expect(stats.totalHull).toBe(1);
    expect(stats.totalDriveSpeed).toBe(1);
  });

  it('fails validation when power consumed exceeds power produced', () => {
    const powerDeficitShip = {
      type: 'interceptor' as const,
      maxSlots: 4,
      baseInitiative: 3,
      baseBuildCost: 3,
      slots: [
        SHIP_PARTS.antimatter_cannon, // -4 power!
        SHIP_PARTS.nuclear_source,    // +3 power
        SHIP_PARTS.nuclear_drive,     // -1 power
        null,
      ],
    };

    const stats = calculateBlueprintStats(powerDeficitShip);
    expect(stats.isValid).toBe(false);
    expect(stats.errors[0]).toContain('Insufficient power');
  });

  it('fails validation when mobile ship has no drive', () => {
    const stationaryCruiser = {
      type: 'cruiser' as const,
      maxSlots: 6,
      baseInitiative: 2,
      baseBuildCost: 5,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.nuclear_source,
        null,
        null,
        null,
        null,
      ],
    };

    const stats = calculateBlueprintStats(stationaryCruiser);
    expect(stats.isValid).toBe(false);
    expect(stats.errors[0]).toContain('must have at least one drive');
  });

  it('verifies human default blueprints have correct HP and components', () => {
    const defaultBps = createDefaultHumanBlueprints();

    // Cruiser has 1 hull in default layout -> 2 HP (1 base + 1 hull)
    const cruiserStats = calculateBlueprintStats(defaultBps.cruiser!);
    expect(cruiserStats.isValid).toBe(true);
    expect(cruiserStats.totalHull).toBe(2);
    const cruiserHulls = defaultBps.cruiser!.slots.filter((s) => s?.id === 'hull').length;
    expect(cruiserHulls).toBe(1);

    // Dreadnought has 2 hulls and 1 nuclear source in default layout -> 3 HP (1 base + 2 hulls)
    const dreadStats = calculateBlueprintStats(defaultBps.dreadnought!);
    expect(dreadStats.isValid).toBe(true);
    expect(dreadStats.totalHull).toBe(3);
    const dreadHulls = defaultBps.dreadnought!.slots.filter((s) => s?.id === 'hull').length;
    expect(dreadHulls).toBe(2);
    const dreadSources = defaultBps.dreadnought!.slots.filter((s) => s?.id === 'nuclear_source').length;
    expect(dreadSources).toBe(1);

    // Interceptor has 1 HP (1 base, 0 hulls)
    const interceptorStats = calculateBlueprintStats(defaultBps.interceptor!);
    expect(interceptorStats.isValid).toBe(true);
    expect(interceptorStats.totalHull).toBe(1);

    // Starbase has 2 HP (1 base + 1 hull)
    const starbaseStats = calculateBlueprintStats(defaultBps.starbase!);
    expect(starbaseStats.isValid).toBe(true);
    expect(starbaseStats.totalHull).toBe(2);
  });
});

describe('Economy & Upkeep', () => {
  it('computes correct income as cubes are removed from player board', () => {
    // 12 cubes on board = 2 income
    expect(getIncomeForTrack(12)).toBe(2);
    // 11 cubes on board = 3 income
    expect(getIncomeForTrack(11)).toBe(3);
    // 6 cubes on board = 12 income
    expect(getIncomeForTrack(6)).toBe(12);
  });

  it('computes progressive upkeep cost from discs remaining', () => {
    expect(getUpkeepForDiscs(13)).toBe(0);
    expect(getUpkeepForDiscs(12)).toBe(0);
    expect(getUpkeepForDiscs(10)).toBe(1);
    expect(getUpkeepForDiscs(7)).toBe(5);
    expect(getUpkeepForDiscs(3)).toBe(15);
  });
});

describe('Game Setup & Turn Engine Flow', () => {
  it('initializes a 2-player game with human factions symmetrically', () => {
    const game = createInitialGame(2);
    expect(game.players.length).toBe(2);
    expect(game.round).toBe(1);
    expect(game.phase).toBe('ACTION_PHASE');
    expect(game.sectors.length).toBe(3); // Center 001 + 2 Home Sectors
    expect(game.players[0]!.influenceTrack.totalDiscs).toBe(13);
    expect(game.players[0]!.influenceTrack.discsOnTrack).toBe(12); // 1 disc placed on home
    // Humans start with 3 colony ships, and all 3 are unused (ready) at game start
    expect(game.players[0]!.colonyShips.total).toBe(3);
    expect(game.players[0]!.colonyShips.ready).toBe(3);

    // Terran home sector has 5 population squares: 3 standard (colonized) + 1 adv money + 1 adv science (uncolonized)
    const p1Home = game.sectors.find((s) => s.id === `home_sector_${game.players[0]!.id}`)!;
    expect(p1Home.planets.length).toBe(5);
    expect(p1Home.planets[0]!.resource).toBe('money');
    expect(p1Home.planets[0]!.isAdvanced).toBe(false);
    expect(p1Home.planets[0]!.colonizedBy).toBe(game.players[0]!.id);

    expect(p1Home.planets[1]!.resource).toBe('science');
    expect(p1Home.planets[1]!.isAdvanced).toBe(false);
    expect(p1Home.planets[1]!.colonizedBy).toBe(game.players[0]!.id);

    expect(p1Home.planets[2]!.resource).toBe('material');
    expect(p1Home.planets[2]!.isAdvanced).toBe(false);
    expect(p1Home.planets[2]!.colonizedBy).toBe(game.players[0]!.id);

    expect(p1Home.planets[3]!.resource).toBe('money');
    expect(p1Home.planets[3]!.isAdvanced).toBe(true);
    expect(p1Home.planets[3]!.colonizedBy).toBeUndefined();

    expect(p1Home.planets[4]!.resource).toBe('science');
    expect(p1Home.planets[4]!.isAdvanced).toBe(true);
    expect(p1Home.planets[4]!.colonizedBy).toBeUndefined();
  });

  it('allows active player to pass and gives first passer +2 credits', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    const initialMoney = p1.resources.money;

    const res = executeAction(game, {
      type: 'PASS',
      playerId: p1.id,
    });

    expect(res.success).toBe(true);
    expect(res.newState.players[0]!.hasPassed).toBe(true);
    expect(res.newState.players[0]!.isFirstPasser).toBe(true);
    expect(res.newState.players[0]!.resources.money).toBe(initialMoney + 2);
    // Next active player should now be player 2
    expect(res.newState.activePlayerIndex).toBe(1);
  });

  it('transitions through combat/upkeep/cleanup when both players pass and refreshes colony ships', () => {
    let game = createInitialGame(2);
    const p1 = game.players[0]!;
    const p2 = game.players[1]!;

    // Exhaust 1 colony ship for player 1
    p1.colonyShips.ready = 2;

    const r1 = executeAction(game, { type: 'PASS', playerId: p1.id });
    expect(r1.success).toBe(true);

    const r2 = executeAction(r1.newState, { type: 'PASS', playerId: p2.id });
    expect(r2.success).toBe(true);

    // After all pass, it processes upkeep and cleanup into round 2!
    expect(r2.newState.round).toBe(2);
    expect(r2.newState.phase).toBe('ACTION_PHASE');
    expect(r2.newState.passedPlayerIds.length).toBe(0);
    // Colony ships must refresh back to full 3 in Cleanup phase!
    expect(r2.newState.players[0]!.colonyShips.ready).toBe(3);
  });

  it('allows colonizing an unoccupied planet slot with a ready colony ship', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    // Add a controlled sector with an uncolonized planet
    const testSector = {
      id: 'controlled_sector_test',
      sectorNumber: 201,
      ring: 2 as const,
      coord: { q: 1, r: -2 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [
        { id: 'planet_col_test', resource: 'material' as const, isAdvanced: false },
      ],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      discOwner: p1.id,
      ships: [],
    };
    game.sectors.push(testSector);

    expect(p1.colonyShips.ready).toBe(3);

    const res = executeAction(game, {
      type: 'COLONIZE',
      playerId: p1.id,
      sectorId: testSector.id,
      planetIndex: 0,
    });

    expect(res.success).toBe(true);
    expect(res.newState.players[0]!.colonyShips.ready).toBe(2);
    const updatedSec = res.newState.sectors.find((s) => s.id === testSector.id)!;
    expect(updatedSec.planets[0]!.colonizedBy).toBe(p1.id);
  });

  it('enforces advanced planet tech requirements (Advanced Economy/Labs/Mining or Metasynthesis)', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    const advSector = {
      id: 'adv_sector_test',
      sectorNumber: 202,
      ring: 2 as const,
      coord: { q: 2, r: -2 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [
        { id: 'planet_adv_mat', resource: 'material' as const, isAdvanced: true },
      ],
      victoryPoints: 2,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      discOwner: p1.id,
      ships: [],
    };
    game.sectors.push(advSector);

    // Attempt colonize without Advanced Mining tech
    const failRes = executeAction(game, {
      type: 'COLONIZE',
      playerId: p1.id,
      sectorId: advSector.id,
      planetIndex: 0,
    });
    expect(failRes.success).toBe(false);
    expect(failRes.error).toContain('Requires Advanced Mining tech');

    // Grant Advanced Mining tech
    p1.techTrack.researched.push({
      id: 'advanced_mining',
      name: 'Advanced Mining',
      category: 'military',
      tier: 5,
      baseCost: 10,
      minCost: 6,
      costByDiscount: [10, 8, 6, 6],
    });

    const successRes = executeAction(game, {
      type: 'COLONIZE',
      playerId: p1.id,
      sectorId: advSector.id,
      planetIndex: 0,
    });
    expect(successRes.success).toBe(true);
    const sec = successRes.newState.sectors.find((s) => s.id === advSector.id)!;
    expect(sec.planets[0]!.colonizedBy).toBe(p1.id);
  });

  it('allows building up to 2 items in a single Build action (and up to 3 with Nanorobots)', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    p1.resources.materials = 15;
    const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;

    // Build 2 ships (1 Interceptor cost 3 + 1 Cruiser cost 5 = 8 Materials)
    const res2 = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [
        { sectorId: homeSec.id, itemType: 'interceptor' },
        { sectorId: homeSec.id, itemType: 'cruiser' },
      ],
    });

    expect(res2.success).toBe(true);
    expect(res2.newState.players[0]!.resources.materials).toBe(15 - 8);
    const updatedHome = res2.newState.sectors.find((s) => s.id === homeSec.id)!;
    // Initial 1 interceptor + 1 new interceptor + 1 new cruiser = 3 ships
    expect(updatedHome.ships.length).toBe(3);

    // Attempting to build 3 items without Nanorobots fails
    const fail3 = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [
        { sectorId: homeSec.id, itemType: 'interceptor' },
        { sectorId: homeSec.id, itemType: 'interceptor' },
        { sectorId: homeSec.id, itemType: 'interceptor' },
      ],
    });
    expect(fail3.success).toBe(false);
    expect(fail3.error).toContain('Cannot build more than 2 items');

    // With Nanorobots tech researched, 3 items is permitted
    p1.techTrack.researched.push({
      id: 'nanorobots',
      name: 'Nanorobots',
      category: 'nano',
      tier: 1,
      baseCost: 2,
      minCost: 2,
      costByDiscount: [2, 2, 2, 2],
    });

    const success3 = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [
        { sectorId: homeSec.id, itemType: 'interceptor' },
        { sectorId: homeSec.id, itemType: 'interceptor' },
        { sectorId: homeSec.id, itemType: 'interceptor' },
      ],
    });
    expect(success3.success).toBe(true);
    expect(success3.newState.players[0]!.resources.materials).toBe(15 - 9);
  });

  it('allows human players to move up to 3 times in a single Move action (aliens restricted to 2)', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;
    const ship = homeSec.ships[0]!;

    // Create a chain of 3 sectors connected by wormholes
    const secA = {
      id: 'sec_move_chain_a',
      sectorNumber: 101,
      ring: 1 as const,
      coord: { q: 0, r: -1 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      discOwner: p1.id,
      ships: [],
    };
    const secB = {
      id: 'sec_move_chain_b',
      sectorNumber: 102,
      ring: 1 as const,
      coord: { q: 1, r: -2 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      discOwner: p1.id,
      ships: [],
    };
    game.sectors.push(secA, secB);

    // Human player moves the same ship 3 times: Home -> secA -> secB -> Home
    const move3Res = executeAction(game, {
      type: 'MOVE',
      playerId: p1.id,
      moves: [
        { shipId: ship.id, fromSectorId: homeSec.id, toSectorId: secA.id },
        { shipId: ship.id, fromSectorId: secA.id, toSectorId: secB.id },
        { shipId: ship.id, fromSectorId: secB.id, toSectorId: homeSec.id },
      ],
    });

    expect(move3Res.success).toBe(true);

    // Attempting 4 moves without Improved Logistics fails for human
    const fail4 = executeAction(game, {
      type: 'MOVE',
      playerId: p1.id,
      moves: [
        { shipId: ship.id, fromSectorId: homeSec.id, toSectorId: secA.id },
        { shipId: ship.id, fromSectorId: secA.id, toSectorId: secB.id },
        { shipId: ship.id, fromSectorId: secB.id, toSectorId: homeSec.id },
        { shipId: ship.id, fromSectorId: homeSec.id, toSectorId: secA.id },
      ],
    });
    expect(fail4.success).toBe(false);
    expect(fail4.error).toContain('Cannot make more than 3 ship movements');

    // For alien player with moveActivations: 2, 3 moves should be rejected
    const alienPlayer = {
      ...p1,
      id: 'alien_player',
      faction: {
        ...p1.faction,
        isHuman: false,
        moveActivations: 2,
      },
    };
    const alienGame = {
      ...game,
      players: [alienPlayer],
    };
    const alienFail = executeAction(alienGame, {
      type: 'MOVE',
      playerId: alienPlayer.id,
      moves: [
        { shipId: ship.id, fromSectorId: homeSec.id, toSectorId: secA.id },
        { shipId: ship.id, fromSectorId: secA.id, toSectorId: secB.id },
        { shipId: ship.id, fromSectorId: secB.id, toSectorId: homeSec.id },
      ],
    });
    expect(alienFail.success).toBe(false);
    expect(alienFail.error).toContain('Cannot make more than 2 ship movements');
  });

  it('awards 0 credits when discarding an explored tile', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    const initialMoney = p1.resources.money;
    const initialDiscs = p1.influenceTrack.discsOnTrack;

    // Explore and discard
    const res = executeAction(game, {
      type: 'EXPLORE',
      playerId: p1.id,
      fromCoord: { q: 0, r: -2 },
      targetCoord: { q: 0, r: -1 },
      rotation: 0,
      discard: true,
    });

    expect(res.success).toBe(true);
    // Discs on track decreased by 1 for taking Explore action
    expect(res.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 1);
    // Money remains exactly the same (0 credits bonus on discard)
    expect(res.newState.players[0]!.resources.money).toBe(initialMoney);
  });

  it('handles peaceful discovery tile claims (2 VP vs immediate reward/part)', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    // Set up a pending discovery for an ancient ship part
    const discoveryTile = {
      id: 'disc_ion_turret',
      name: 'Ion Turret',
      description: 'Ancient weapon module',
      shipPartId: 'ion_turret',
    };

    game.pendingDiscovery = {
      sectorId: 'sector_101',
      discovery: discoveryTile,
      playerId: p1.id,
    };

    // Choice 1: Keep for 2 VP
    const resVP = executeAction(game, {
      type: 'DISCOVERY_CHOICE',
      playerId: p1.id,
      sectorId: 'sector_101',
      keepForVictoryPoints: true,
    });

    expect(resVP.success).toBe(true);
    expect(resVP.newState.pendingDiscovery).toBeNull();
    expect(resVP.newState.players[0]!.keptDiscoveryTiles.length).toBe(1);
    expect(resVP.newState.players[0]!.keptDiscoveryTiles[0]!.id).toBe('disc_ion_turret');

    // Choice 2: Take immediate reward / unlock ancient part
    const resPart = executeAction(game, {
      type: 'DISCOVERY_CHOICE',
      playerId: p1.id,
      sectorId: 'sector_101',
      keepForVictoryPoints: false,
    });

    expect(resPart.success).toBe(true);
    expect(resPart.newState.pendingDiscovery).toBeNull();
    expect(resPart.newState.players[0]!.unlockedAncientParts).toContain('ion_turret');
  });

  it('allows installing Ancient Tech directly onto a ship blueprint immediately for free', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    const discoveryTile = {
      id: 'disc_flux_shield',
      name: 'Flux Shield',
      description: 'Ancient alien shield',
      shipPartId: 'flux_shield',
    };

    game.pendingDiscovery = {
      sectorId: 'sector_101',
      discovery: discoveryTile,
      playerId: p1.id,
    };

    // Cruiser slot 3 initially empty (null) or replace it
    const res = executeAction(game, {
      type: 'DISCOVERY_CHOICE',
      playerId: p1.id,
      sectorId: 'sector_101',
      keepForVictoryPoints: false,
      equipShipType: 'cruiser',
      equipSlotIndex: 3,
    });

    expect(res.success).toBe(true);
    expect(res.newState.pendingDiscovery).toBeNull();
    const updatedP1 = res.newState.players[0]!;
    expect(updatedP1.unlockedAncientParts).toContain('flux_shield');
    expect(updatedP1.blueprints.cruiser.slots[3]?.id).toBe('flux_shield');
  });

  it('deploys a free cruiser to the sector when choosing Ancient Cruiser immediate reward', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    const targetSector = game.sectors[1]!;
    const initialShipCount = targetSector.ships.length;

    const cruiserDiscovery = {
      id: 'disc_ancient_cruiser',
      name: 'Ancient Cruiser',
      description: 'Deploy 1 free Cruiser to this sector immediately or keep for 2 VP.',
      immediateReward: { grantShipType: 'cruiser' as const, victoryPoints: 2 },
    };

    game.pendingDiscovery = {
      sectorId: targetSector.id,
      discovery: cruiserDiscovery,
      playerId: p1.id,
    };

    const res = executeAction(game, {
      type: 'DISCOVERY_CHOICE',
      playerId: p1.id,
      sectorId: targetSector.id,
      keepForVictoryPoints: false,
    });

    expect(res.success).toBe(true);
    expect(res.newState.pendingDiscovery).toBeNull();
    const updatedSector = res.newState.sectors.find((s) => s.id === targetSector.id)!;
    expect(updatedSector.ships.length).toBe(initialShipCount + 1);
    const spawnedShip = updatedSector.ships.find((s) => s.ownerId === p1.id && s.type === 'cruiser');
    expect(spawnedShip).toBeDefined();
    expect(spawnedShip?.damage).toBe(0);
  });

  it('uncovers guarded discovery tile after defeating ancients in combat', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    // Create a sector with 1 ancient and a discovery tile
    const guardedSector = {
      id: 'test_sec_combat',
      sectorNumber: 105,
      ring: 1 as const,
      coord: { q: 1, r: -1 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [],
      victoryPoints: 2,
      hasArtifact: false,
      hasDiscovery: true,
      discoveryClaimed: false,
      discoveryTile: {
        id: 'disc_flux_shield',
        name: 'Flux Shield',
        description: 'Ancient alien shield',
        shipPartId: 'flux_shield',
      },
      ancientsCount: 1,
      ships: [
        { id: 'anc_1', ownerId: 'ancient', type: 'ancient' as const, damage: 1 }, // 1 damage already, hull is 2
        { id: 'player_cruiser', ownerId: p1.id, type: 'cruiser' as const, damage: 0 },
      ],
    };

    game.sectors.push(guardedSector);
    game.phase = 'COMBAT_PHASE';
    game.activeCombat = {
      sectorId: guardedSector.id,
      roundNumber: 1,
      stage: 'regular',
      initiativeOrder: [],
      currentTurnIndex: 0,
      lastRolls: [],
      retreatDeclared: {},
    };

    // Directly simulate ancient being destroyed and resolving combat step
    // Remove ancient ship to simulate defeat
    guardedSector.ships = [{ id: 'player_cruiser', ownerId: p1.id, type: 'cruiser' as const, damage: 0 }];

    const combatRes = executeAction(game, {
      type: 'RESOLVE_COMBAT_STEP',
      playerId: p1.id,
      sectorId: guardedSector.id,
    });

    expect(combatRes.success).toBe(true);
    // Winning player should now have a pending conquest decision and combat should be cleanly closed
    expect(combatRes.newState.activeCombat).toBeNull();
    expect(combatRes.newState.pendingCombatConquest).not.toBeNull();
    expect(combatRes.newState.pendingCombatConquest?.winnerPlayerId).toBe(p1.id);

    // Player resolves conquest choice (claims control)
    const conquestRes = executeAction(combatRes.newState, {
      type: 'COMBAT_CONQUEST',
      playerId: p1.id,
      sectorId: guardedSector.id,
      claimInfluence: true,
    });
    expect(conquestRes.success).toBe(true);
    expect(conquestRes.newState.pendingCombatConquest).toBeNull();
    expect(conquestRes.newState.pendingDiscovery).not.toBeNull();
    expect(conquestRes.newState.pendingDiscovery?.discovery.id).toBe('disc_flux_shield');
    expect(conquestRes.newState.pendingDiscovery?.playerId).toBe(p1.id);
    const updatedGuarded = conquestRes.newState.sectors.find((s) => s.id === guardedSector.id)!;
    expect(updatedGuarded.ancientsCount).toBe(0);
    expect(updatedGuarded.discOwner).toBe(p1.id);
  });

  it('correctly resolves multi-round tactical battle until victory, clears combat, and repairs surviving ships', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    const battleSector = {
      id: 'test_sec_full_battle',
      sectorNumber: 104,
      ring: 1 as const,
      coord: { q: 0, r: 1 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [],
      victoryPoints: 2,
      hasArtifact: false,
      hasDiscovery: true,
      discoveryClaimed: false,
      discoveryTile: {
        id: 'disc_ion_turret',
        name: 'Ion Turret',
        description: 'Ancient module',
        shipPartId: 'ion_turret',
      },
      ancientsCount: 1,
      ships: [
        { id: 'ancient_ship_1', ownerId: 'ancient', type: 'ancient' as const, damage: 1 }, // 1 dmg (1 HP remaining)
        { id: 'p1_dreadnought', ownerId: p1.id, type: 'dreadnought' as const, damage: 0 },
        { id: 'p1_cruiser', ownerId: p1.id, type: 'cruiser' as const, damage: 0 },
      ],
    };

    game.sectors.push(battleSector);
    game.phase = 'COMBAT_PHASE';
    game.activeCombat = {
      sectorId: battleSector.id,
      roundNumber: 1,
      stage: 'regular',
      initiativeOrder: [],
      currentTurnIndex: 0,
      lastRolls: [],
      retreatDeclared: {},
    };

    let currentState = game;
    let iterations = 0;
    while (currentState.activeCombat && iterations < 30) {
      iterations++;
      const res = executeAction(currentState, {
        type: 'RESOLVE_COMBAT_STEP',
        playerId: p1.id,
        sectorId: battleSector.id,
      });
      expect(res.success).toBe(true);
      currentState = res.newState;
    }

    // Engagement must terminate cleanly without an infinite loop
    expect(iterations).toBeLessThan(30);
    expect(currentState.activeCombat).toBeNull();
    expect(currentState.pendingCombatConquest).not.toBeNull();
    expect(currentState.pendingCombatConquest?.winnerPlayerId).toBe(p1.id);

    // Resolve conquest
    const conquestRes = executeAction(currentState, {
      type: 'COMBAT_CONQUEST',
      playerId: p1.id,
      sectorId: battleSector.id,
      claimInfluence: true,
    });
    expect(conquestRes.success).toBe(true);
    const resolvedSec = conquestRes.newState.sectors.find((s) => s.id === battleSector.id)!;
    expect(resolvedSec.ancientsCount).toBe(0);
    // Winner must take control of the sector by placing an Influence Disc
    expect(resolvedSec.discOwner).toBe(p1.id);
    // Any surviving ship should have its damage repaired to 0
    for (const ship of resolvedSec.ships) {
      expect(ship.damage).toBe(0);
    }
  });

  it('prompts winner with combat conquest decision to control sector and optionally colonize open planets', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    const initialDiscs = p1.influenceTrack.discsOnTrack;
    const initialColony = p1.colonyShips.ready;

    // Create a sector with open planets that was conquered in battle
    const conqueredSector = {
      id: 'conquered_sec_test',
      sectorNumber: 108,
      ring: 1 as const,
      coord: { q: 1, r: 0 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [
        { id: 'p_money_1', resource: 'money' as const, isAdvanced: false },
        { id: 'p_mat_1', resource: 'material' as const, isAdvanced: false },
        { id: 'p_sci_adv', resource: 'science' as const, isAdvanced: true },
      ],
      victoryPoints: 2,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      ships: [{ id: 'surviving_cruiser', ownerId: p1.id, type: 'cruiser' as const, damage: 0 }],
    };

    // Add another sector with hostile forces so combat phase remains active after this conquest
    const anotherCombatSec = {
      id: 'another_battle_sec',
      sectorNumber: 202,
      ring: 2 as const,
      coord: { q: -2, r: 1 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 1,
      ships: [
        { id: 'ancient_cruiser', ownerId: 'ancients', type: 'cruiser' as const, damage: 0 },
        { id: 'p2_interceptor', ownerId: game.players[1]!.id, type: 'interceptor' as const, damage: 0 },
      ],
    };

    game.sectors.push(conqueredSector, anotherCombatSec);
    game.phase = 'COMBAT_PHASE';
    game.pendingCombatConquest = {
      sectorId: conqueredSector.id,
      winnerPlayerId: p1.id,
    };

    // Case 1: Attempting to colonize without controlling sector fails
    const invalidColonizeNoControl = executeAction(game, {
      type: 'COMBAT_CONQUEST',
      playerId: p1.id,
      sectorId: conqueredSector.id,
      claimInfluence: false,
      colonizePlanetIndices: [0],
    });
    expect(invalidColonizeNoControl.success).toBe(false);
    expect(invalidColonizeNoControl.error).toContain('Must control sector with an Influence Disc to colonize planets');

    // Case 2: Attempting to colonize an advanced slot without tech fails
    const invalidAdvanced = executeAction(game, {
      type: 'COMBAT_CONQUEST',
      playerId: p1.id,
      sectorId: conqueredSector.id,
      claimInfluence: true,
      colonizePlanetIndices: [2], // p_sci_adv
    });
    expect(invalidAdvanced.success).toBe(false);
    expect(invalidAdvanced.error).toContain('Requires Advanced Labs or Metasynthesis');

    // Case 3: Successfully place influence disc AND colonize standard money and material planets
    const validConquest = executeAction(game, {
      type: 'COMBAT_CONQUEST',
      playerId: p1.id,
      sectorId: conqueredSector.id,
      claimInfluence: true,
      colonizePlanetIndices: [0, 1],
    });
    expect(validConquest.success).toBe(true);
    expect(validConquest.newState.pendingCombatConquest).toBeNull();
    const updatedSec = validConquest.newState.sectors.find((s) => s.id === conqueredSector.id)!;
    expect(updatedSec.discOwner).toBe(p1.id);
    expect(validConquest.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 1);
    expect(validConquest.newState.players[0]!.colonyShips.ready).toBe(initialColony - 2);
    expect(updatedSec.planets[0]!.colonizedBy).toBe(p1.id);
    expect(updatedSec.planets[1]!.colonizedBy).toBe(p1.id);
    expect(updatedSec.planets[2]!.colonizedBy).toBeUndefined();
  });

  it('allows taking the INFLUENCE action to claim and abandon sector control and refresh colony ships', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;

    const neutralSec = {
      id: 'sec_influence_test',
      sectorNumber: 205,
      ring: 2 as const,
      coord: { q: 1, r: -2 },
      rotation: 0,
      wormholes: [true, true, true, true, true, true],
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      ships: [{ id: 'ship_p1', ownerId: p1.id, type: 'cruiser' as const, damage: 0 }],
    };
    game.sectors.push(neutralSec);

    const initialDiscs = p1.influenceTrack.discsOnTrack;
    p1.colonyShips.ready = 1;

    // Claim sector control and refresh colony ships
    const resClaim = executeAction(game, {
      type: 'INFLUENCE',
      playerId: p1.id,
      claimSectors: [neutralSec.id],
      refreshColonyShips: true,
    });

    expect(resClaim.success).toBe(true);
    const updatedSec = resClaim.newState.sectors.find((s) => s.id === neutralSec.id)!;
    expect(updatedSec.discOwner).toBe(p1.id);
    const updatedP1 = resClaim.newState.players[0]!;
    // Used 1 disc for action activation, 1 disc placed on sector
    expect(updatedP1.influenceTrack.discsOnTrack).toBe(initialDiscs - 2);
    expect(updatedP1.colonyShips.ready).toBe(3); // 1 + 2 = 3

    // Abandon sector control (set activePlayerIndex back to p1 for next turn)
    resClaim.newState.activePlayerIndex = 0;
    const resAbandon = executeAction(resClaim.newState, {
      type: 'INFLUENCE',
      playerId: p1.id,
      abandonSectors: [neutralSec.id],
    });

    expect(resAbandon.success).toBe(true);
    const abandonedSec = resAbandon.newState.sectors.find((s) => s.id === neutralSec.id)!;
    expect(abandonedSec.discOwner).toBeUndefined();
  });

  describe('Official Eclipse: Second Dawn Sector Specifications', () => {
    it('aligns Galactic Center (Sector 001) with official 6 resources and stats', () => {
      expect(CENTER_SECTOR.sectorNumber).toBe(1);
      expect(CENTER_SECTOR.victoryPoints).toBe(4);
      expect(CENTER_SECTOR.wormholes).toEqual([true, true, true, true, true, true]);
      expect(CENTER_SECTOR.hasArtifact).toBe(true);
      expect(CENTER_SECTOR.hasDiscovery).toBe(true);
      expect(CENTER_SECTOR.hasGCDS).toBe(true);
      expect(CENTER_SECTOR.ships.some((s) => s.type === 'gcds')).toBe(true);

      // Exactly 6 population squares: 2 Money, 2 Science, 2 Material
      expect(CENTER_SECTOR.planets.length).toBe(6);
      const moneyPlanets = CENTER_SECTOR.planets.filter((p) => p.resource === 'money');
      const sciencePlanets = CENTER_SECTOR.planets.filter((p) => p.resource === 'science');
      const materialPlanets = CENTER_SECTOR.planets.filter((p) => p.resource === 'material');

      expect(moneyPlanets.length).toBe(2);
      expect(sciencePlanets.length).toBe(2);
      expect(materialPlanets.length).toBe(2);
    });

    it('generates authentic Ring 1, 2, and 3 decks matching official BGG component stats', () => {
      const decks = generateSectorDecks();

      // Ring 1 (101 - 110)
      expect(decks.ring1.length).toBe(10);
      const r1VP = decks.ring1.reduce((sum, s) => sum + s.victoryPoints, 0);
      const r1Artifacts = decks.ring1.filter((s) => s.hasArtifact).length;
      const r1Discoveries = decks.ring1.filter((s) => s.hasDiscovery).length;
      const r1Pop = decks.ring1.reduce((sum, s) => sum + s.planets.length, 0);
      const r1Connections = decks.ring1.reduce((sum, s) => sum + s.wormholes.filter(Boolean).length, 0);

      expect(r1VP).toBe(23);
      expect(r1Artifacts).toBe(2);
      expect(r1Discoveries).toBe(6);
      expect(r1Pop).toBe(26);
      expect(r1Connections).toBe(45);

      // Ring 2 (201 - 211, 214, 281)
      expect(decks.ring2.length).toBe(13);
      const r2VP = decks.ring2.reduce((sum, s) => sum + s.victoryPoints, 0);
      const r2Artifacts = decks.ring2.filter((s) => s.hasArtifact).length;
      const r2Discoveries = decks.ring2.filter((s) => s.hasDiscovery).length;
      const r2Pop = decks.ring2.reduce((sum, s) => sum + s.planets.length, 0);

      expect(r2VP).toBe(20);
      expect(r2Artifacts).toBe(3);
      expect(r2Discoveries).toBe(8);
      expect(r2Pop).toBe(26);

      // Ring 3 (301 - 318, 381, 382)
      expect(decks.ring3.length).toBe(20);
      const r3VP = decks.ring3.reduce((sum, s) => sum + s.victoryPoints, 0);
      const r3Artifacts = decks.ring3.filter((s) => s.hasArtifact).length;
      const r3Discoveries = decks.ring3.filter((s) => s.hasDiscovery).length;
      const r3Pop = decks.ring3.reduce((sum, s) => sum + s.planets.length, 0);

      expect(r3VP).toBe(28);
      expect(r3Artifacts).toBe(3);
      expect(r3Discoveries).toBe(12);
      expect(r3Pop).toBe(35);
    });
  });

  describe('Official Eclipse: Second Dawn Technology Rules & Tech Tray', () => {
    it('contains all 40 authentic technologies with exact official base costs and slot tiers', () => {
      expect(MILITARY_TECHS.length).toBe(8);
      expect(GRID_TECHS.length).toBe(8);
      expect(NANO_TECHS.length).toBe(8);
      expect(RARE_TECHS.length).toBe(16);
      expect(TECH_CATALOG.length).toBe(40);

      // Verify slot base costs [2, 4, 6, 8, 10, 12, 14, 16]
      const expectedSlotCosts = [2, 4, 6, 8, 10, 12, 14, 16];
      for (let i = 0; i < 8; i++) {
        expect(MILITARY_TECHS[i]!.baseCost).toBe(expectedSlotCosts[i]!);
        expect(MILITARY_TECHS[i]!.tier).toBe(i + 1);
        expect(GRID_TECHS[i]!.baseCost).toBe(expectedSlotCosts[i]!);
        expect(GRID_TECHS[i]!.tier).toBe(i + 1);
        expect(NANO_TECHS[i]!.baseCost).toBe(expectedSlotCosts[i]!);
        expect(NANO_TECHS[i]!.tier).toBe(i + 1);
      }
    });

    it('creates an official 112-tile tech bag (96 regular tiles + 16 rare tiles)', () => {
      const bag = createInitialTechBag();
      expect(bag.length).toBe(112);

      const militaryTiles = bag.filter((t) => t.category === 'military');
      const gridTiles = bag.filter((t) => t.category === 'grid');
      const nanoTiles = bag.filter((t) => t.category === 'nano');
      const rareTiles = bag.filter((t) => t.category === 'rare');

      expect(militaryTiles.length).toBe(32); // 8 techs * 4 copies
      expect(gridTiles.length).toBe(32); // 8 techs * 4 copies
      expect(nanoTiles.length).toBe(32); // 8 techs * 4 copies
      expect(rareTiles.length).toBe(16); // 16 unique rare techs * 1 copy
    });

    it('draws tiles until (playerCount + 3) regular tiles are drawn, rare tiles do not count toward limit', () => {
      const bag = createInitialTechBag();
      // For 2 players: limit is 2 + 3 = 5 regular tiles
      const result2p = drawTechTilesForRound(bag, 2);
      expect(result2p.regularDrawn).toBe(5);
      expect(result2p.drawn.filter((t) => t.category !== 'rare').length).toBe(5);
      expect(result2p.drawn.length).toBe(5 + result2p.rareDrawn);
      expect(result2p.remainingBag.length).toBe(112 - result2p.drawn.length);

      // For 4 players: limit is 4 + 3 = 7 regular tiles
      const result4p = drawTechTilesForRound(bag, 4);
      expect(result4p.regularDrawn).toBe(7);
      expect(result4p.drawn.filter((t) => t.category !== 'rare').length).toBe(7);
    });

    it('correctly computes canonical discounts for regular and rare technologies', () => {
      // Slot 3: Improved Hull in GRID_TECHS (cost: [6, 5, 4, 4])
      const improvedHull = GRID_TECHS.find((t) => t.id === 'improved_hull')!;
      expect(improvedHull).toBeDefined();
      expect(calculateTechCost(improvedHull, 0)).toBe(6);
      expect(calculateTechCost(improvedHull, 1)).toBe(5);
      expect(calculateTechCost(improvedHull, 2)).toBe(4);
      expect(calculateTechCost(improvedHull, 3)).toBe(4);
      expect(calculateTechCost(improvedHull, 6)).toBe(4);

      // Slot 8: Artifact Key (cost: [16, 14, 12, 8])
      const artifactKey = NANO_TECHS.find((t) => t.id === 'artifact_key')!;
      expect(calculateTechCost(artifactKey, 0)).toBe(16);
      expect(calculateTechCost(artifactKey, 1)).toBe(14);
      expect(calculateTechCost(artifactKey, 2)).toBe(12);
      expect(calculateTechCost(artifactKey, 3)).toBe(8);
      expect(calculateTechCost(artifactKey, 5)).toBe(8);

      // Rare: Ancient Labs (cost: [13, 11, 9, 9])
      const ancientLabs = RARE_TECHS.find((t) => t.id === 'ancient_labs')!;
      expect(calculateTechCost(ancientLabs, 0)).toBe(13);
      expect(calculateTechCost(ancientLabs, 1)).toBe(11);
      expect(calculateTechCost(ancientLabs, 2)).toBe(9);
      expect(calculateTechCost(ancientLabs, 3)).toBe(9);
    });

    it('researches a technology, deducts discounted science, and replenishes supply in cleanup', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      p1.resources.science = 20;

      // Force a known tech into techSupply
      const neutronBombs = MILITARY_TECHS.find((t) => t.id === 'neutron_bombs')!;
      game.techSupply.unshift(neutronBombs);

      const initialCount = game.techSupply.filter((t) => t.id === 'neutron_bombs').length;

      const res = executeAction(game, {
        type: 'RESEARCH',
        playerId: p1.id,
        techId: 'neutron_bombs',
      });

      expect(res.success).toBe(true);
      const updatedP1 = res.newState.players[0]!;
      expect(updatedP1.resources.science).toBe(18); // 20 - 2
      expect(updatedP1.techTrack.militaryCount).toBe(1);
      expect(updatedP1.techTrack.researched.some((t) => t.id === 'neutron_bombs')).toBe(true);
      expect(res.newState.techSupply.filter((t) => t.id === 'neutron_bombs').length).toBe(initialCount - 1);

      // Verify Round Cleanup replenishes techSupply
      const p2 = res.newState.players[1]!;
      const supplyBeforeCleanup = res.newState.techSupply.length;
      const bagBeforeCleanup = res.newState.techBag.length;

      // After P1 takes RESEARCH action, active player is P2.
      expect(res.newState.activePlayerIndex).toBe(1);

      // Both players pass to trigger end of round and Cleanup
      const pass1 = executeAction(res.newState, { type: 'PASS', playerId: p2.id });
      expect(pass1.success).toBe(true);

      const pass2 = executeAction(pass1.newState, { type: 'PASS', playerId: p1.id });
      expect(pass2.success).toBe(true);
      expect(pass2.newState.round).toBe(2);
      // Tech supply must have received at least 5 regular tiles!
      expect(pass2.newState.techSupply.length).toBeGreaterThanOrEqual(supplyBeforeCleanup + 5);
      expect(pass2.newState.techBag.length).toBeLessThan(bagBeforeCleanup);
    });

    it('ensures all home systems contain an Artifact and Artifact Key rewards controlled artifacts without inherent VP', () => {
      // 1. Initial 2-player setup
      const game2 = createInitialGame(2);
      const homeSectors = game2.sectors.filter((s) => s.sectorNumber >= 221 && s.sectorNumber <= 226);
      expect(homeSectors.length).toBe(2);
      for (const home of homeSectors) {
        expect(home.hasArtifact).toBe(true);
      }
      expect(CENTER_SECTOR.hasArtifact).toBe(true);

      // 2. Initial 6-player setup
      const game6 = createInitialGame(6);
      const allHomeSectors = game6.sectors.filter((s) => s.sectorNumber >= 221 && s.sectorNumber <= 226);
      expect(allHomeSectors.length).toBe(6);
      for (const home of allHomeSectors) {
        expect(home.hasArtifact).toBe(true);
      }

      // 3. Artifact Key technology activation
      const p1 = game2.players[0]!;
      p1.resources.science = 20;
      p1.resources.materials = 4;

      const artifactKey = NANO_TECHS.find((t) => t.id === 'artifact_key')!;
      game2.techSupply.unshift(artifactKey);

      const res = executeAction(game2, {
        type: 'RESEARCH',
        playerId: p1.id,
        techId: 'artifact_key',
      });

      expect(res.success).toBe(true);
      const updatedP1 = res.newState.players[0]!;
      // P1 controls 1 home sector which has an artifact -> +5 Materials (4 + 5 = 9)
      expect(updatedP1.resources.materials).toBe(9);
    });

    it('enforces official action activations for Human factions: Explore (1), Research (1), Upgrade (2), Build (2), Move (3)', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;

      // 1. Check helper activation counts
      expect(p1.faction.exploreActivations).toBe(1);
      expect(p1.faction.researchActivations).toBe(1);
      expect(p1.faction.upgradeActivations).toBe(2);
      expect(p1.faction.buildActivations).toBe(2);
      expect(p1.faction.moveActivations).toBe(3);

      // 2. Test UPGRADE action with 0 changes fails
      const zeroUpgradeRes = executeAction(game, {
        type: 'UPGRADE',
        playerId: p1.id,
        upgrades: [
          {
            shipType: 'interceptor',
            slotIndex: 0,
            partId: p1.blueprints.interceptor.slots[0]?.id || null, // unchanged
          },
        ],
      });
      expect(zeroUpgradeRes.success).toBe(false);
      expect(zeroUpgradeRes.error).toContain('No component modifications');

      // 3. Test UPGRADE action with 2 valid changes succeeds
      const validUpgradeRes = executeAction(game, {
        type: 'UPGRADE',
        playerId: p1.id,
        upgrades: [
          {
            shipType: 'interceptor',
            slotIndex: 0,
            partId: 'ion_cannon',
          },
          {
            shipType: 'cruiser',
            slotIndex: 0,
            partId: 'hull',
          },
        ],
      });
      expect(validUpgradeRes.success).toBe(true);
      expect(validUpgradeRes.newState.players[0]!.influenceTrack.discsOnTrack).toBe(p1.influenceTrack.discsOnTrack - 1);

      // 4. Test UPGRADE action with 3 changes fails (exceeds Human limit of 2)
      const invalidUpgradeRes = executeAction(game, {
        type: 'UPGRADE',
        playerId: p1.id,
        upgrades: [
          { shipType: 'interceptor', slotIndex: 0, partId: 'plasma_cannon' },
          { shipType: 'interceptor', slotIndex: 1, partId: 'fusion_source' },
          { shipType: 'cruiser', slotIndex: 0, partId: 'hull' },
        ],
      });
      expect(invalidUpgradeRes.success).toBe(false);
      expect(invalidUpgradeRes.error).toContain('Cannot make more than 2 component upgrades');
    });
  });
});

describe('Ship Supply Limits & Starbase Restrictions', () => {
  it('enforces official supply limits: 8 Interceptors, 4 Cruisers, 2 Dreadnoughts, 4 Starbases', () => {
    const game = createInitialGame(2);
    const p1 = game.players[0]!;
    const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;

    // 1. Verify initial fleet and supply
    const initialCounts = countPlayerShips(game.sectors, p1.id);
    expect(initialCounts.interceptor).toBe(1); // 1 starting interceptor
    expect(initialCounts.cruiser).toBe(0);
    expect(initialCounts.dreadnought).toBe(0);
    expect(initialCounts.starbase).toBe(0);

    const supply = getRemainingShipSupply(game.sectors, p1.id);
    expect(supply.interceptor).toBe(7); // 8 - 1
    expect(supply.cruiser).toBe(4);     // 4 - 0
    expect(supply.dreadnought).toBe(2); // 2 - 0
    expect(supply.starbase).toBe(4);    // 4 - 0

    // 2. Give player plenty of materials to test builds
    p1.resources.materials = 100;

    // 3. Test Dreadnought Limit of 2:
    // Build 2 dreadnoughts (legal, reaches max 2)
    const build2Dreadnoughts = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [
        { sectorId: homeSec.id, itemType: 'dreadnought' },
        { sectorId: homeSec.id, itemType: 'dreadnought' },
      ],
    });
    expect(build2Dreadnoughts.success).toBe(true);
    const after2Dre = build2Dreadnoughts.newState;
    expect(countPlayerShips(after2Dre.sectors, p1.id).dreadnought).toBe(2);
    expect(getRemainingShipSupply(after2Dre.sectors, p1.id).dreadnought).toBe(0);

    // Make it p1's turn again
    after2Dre.activePlayerIndex = 0;

    // Attempting to build a 3rd dreadnought must be rejected
    const build3rdDreadnought = executeAction(after2Dre, {
      type: 'BUILD',
      playerId: p1.id,
      items: [{ sectorId: homeSec.id, itemType: 'dreadnought' }],
    });
    expect(build3rdDreadnought.success).toBe(false);
    expect(build3rdDreadnought.error).toContain('reached maximum limit of 2');

    // 4. Test Interceptor Limit of 8:
    // Player has 1 starting interceptor. Add 7 more to simulate having 8 deployed
    homeSec.ships.push(
      { id: 'i2', ownerId: p1.id, type: 'interceptor', damage: 0 },
      { id: 'i3', ownerId: p1.id, type: 'interceptor', damage: 0 },
      { id: 'i4', ownerId: p1.id, type: 'interceptor', damage: 0 },
      { id: 'i5', ownerId: p1.id, type: 'interceptor', damage: 0 },
      { id: 'i6', ownerId: p1.id, type: 'interceptor', damage: 0 },
      { id: 'i7', ownerId: p1.id, type: 'interceptor', damage: 0 },
      { id: 'i8', ownerId: p1.id, type: 'interceptor', damage: 0 },
    );
    expect(countPlayerShips(game.sectors, p1.id).interceptor).toBe(8);
    expect(getRemainingShipSupply(game.sectors, p1.id).interceptor).toBe(0);

    // Attempting to build 9th interceptor fails
    game.activePlayerIndex = 0;
    const build9thInt = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [{ sectorId: homeSec.id, itemType: 'interceptor' }],
    });
    expect(build9thInt.success).toBe(false);
    expect(build9thInt.error).toContain('reached maximum limit of 8');

    // 5. Test Cruiser Limit of 4:
    homeSec.ships.push(
      { id: 'c1', ownerId: p1.id, type: 'cruiser', damage: 0 },
      { id: 'c2', ownerId: p1.id, type: 'cruiser', damage: 0 },
      { id: 'c3', ownerId: p1.id, type: 'cruiser', damage: 0 },
      { id: 'c4', ownerId: p1.id, type: 'cruiser', damage: 0 },
    );
    expect(countPlayerShips(game.sectors, p1.id).cruiser).toBe(4);
    game.activePlayerIndex = 0;
    const build5thCru = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [{ sectorId: homeSec.id, itemType: 'cruiser' }],
    });
    expect(build5thCru.success).toBe(false);
    expect(build5thCru.error).toContain('reached maximum limit of 4');

    // 6. Test Starbase per-sector limit (max 1 Starbase per sector):
    game.activePlayerIndex = 0;
    const build1stStarbase = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [{ sectorId: homeSec.id, itemType: 'starbase' }],
    });
    expect(build1stStarbase.success).toBe(true);

    // Attempting to build a second starbase in the SAME sector fails
    const stateAfter1stSb = build1stStarbase.newState;
    stateAfter1stSb.activePlayerIndex = 0;
    const build2ndStarbaseInSameSector = executeAction(stateAfter1stSb, {
      type: 'BUILD',
      playerId: p1.id,
      items: [{ sectorId: homeSec.id, itemType: 'starbase' }],
    });
    expect(build2ndStarbaseInSameSector.success).toBe(false);
    expect(build2ndStarbaseInSameSector.error).toContain('already contains a Starbase');

    // 7. Test ship destruction returns miniature to supply:
    // If one of the cruisers is destroyed in combat (removed from sector):
    const cruIndex = homeSec.ships.findIndex((s) => s.type === 'cruiser');
    homeSec.ships.splice(cruIndex, 1);
    expect(countPlayerShips(game.sectors, p1.id).cruiser).toBe(3);
    expect(getRemainingShipSupply(game.sectors, p1.id).cruiser).toBe(1);

    // Now building a Cruiser succeeds again!
    game.activePlayerIndex = 0;
    const rebuildCruiser = executeAction(game, {
      type: 'BUILD',
      playerId: p1.id,
      items: [{ sectorId: homeSec.id, itemType: 'cruiser' }],
    });
    expect(rebuildCruiser.success).toBe(true);
    expect(countPlayerShips(rebuildCruiser.newState.sectors, p1.id).cruiser).toBe(4);
  });

  describe('Physical Player Board, Upkeep Forecast & Tech Rows', () => {
    it('correctly calculates future upkeep cost and cost delta for the next 1, 2, and 3 actions', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;

      // 1. Starting state: 12 discs on track (1 disc on home system)
      expect(p1.influenceTrack.discsOnTrack).toBe(12);
      const forecastStart = calculateActionCostForecast(p1);
      expect(forecastStart.currentUpkeep).toBe(0);
      expect(forecastStart.after1Action.discsRemaining).toBe(11);
      expect(forecastStart.after1Action.upkeep).toBe(0);
      expect(forecastStart.after1Action.costIncrease).toBe(0); // 0 -> 0 (+0)
      expect(forecastStart.after2Actions.discsRemaining).toBe(10);
      expect(forecastStart.after2Actions.upkeep).toBe(1);
      expect(forecastStart.after2Actions.costIncrease).toBe(1); // 0 -> 1 (+1)
      expect(forecastStart.after3Actions.discsRemaining).toBe(9);
      expect(forecastStart.after3Actions.upkeep).toBe(2);
      expect(forecastStart.after3Actions.costIncrease).toBe(2); // 0 -> 2 (+2)

      // 2. Mid-turn state: 8 discs on track (5 discs used for actions and systems)
      p1.influenceTrack.discsOnTrack = 8;
      const forecastMid = calculateActionCostForecast(p1);
      expect(forecastMid.currentUpkeep).toBe(3); // 8 discs -> 3 upkeep
      // Next 1 action: 7 discs -> 5 upkeep (increase: +2)
      expect(forecastMid.after1Action.discsRemaining).toBe(7);
      expect(forecastMid.after1Action.upkeep).toBe(5);
      expect(forecastMid.after1Action.costIncrease).toBe(2);
      // Next 2 actions: 6 discs -> 7 upkeep (increase: +4)
      expect(forecastMid.after2Actions.discsRemaining).toBe(6);
      expect(forecastMid.after2Actions.upkeep).toBe(7);
      expect(forecastMid.after2Actions.costIncrease).toBe(4);
      // Next 3 actions: 5 discs -> 9 upkeep (increase: +6)
      expect(forecastMid.after3Actions.discsRemaining).toBe(5);
      expect(forecastMid.after3Actions.upkeep).toBe(9);
      expect(forecastMid.after3Actions.costIncrease).toBe(6);

      // 3. Late-turn / deep expansion state: 4 discs on track
      p1.influenceTrack.discsOnTrack = 4;
      const forecastLate = calculateActionCostForecast(p1);
      expect(forecastLate.currentUpkeep).toBe(12); // 4 discs -> 12 upkeep
      // Next 1 action: 3 discs -> 15 upkeep (+3)
      expect(forecastLate.after1Action.upkeep).toBe(15);
      expect(forecastLate.after1Action.costIncrease).toBe(3);
      // Next 2 actions: 2 discs -> 18 upkeep (+6)
      expect(forecastLate.after2Actions.upkeep).toBe(18);
      expect(forecastLate.after2Actions.costIncrease).toBe(6);
      // Next 3 actions: 1 disc -> 21 upkeep (+9)
      expect(forecastLate.after3Actions.upkeep).toBe(21);
      expect(forecastLate.after3Actions.costIncrease).toBe(9);
    });

    it('correctly categorizes researched technologies into Military, Grid, and Nano rows and tracks discounts and VP', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;

      // Initial state: 0 techs researched
      const initialRows = getPlayerTechRows(p1);
      expect(initialRows.military.count).toBe(0);
      expect(initialRows.military.nextDiscount).toBe(0);
      expect(initialRows.grid.count).toBe(0);
      expect(initialRows.nano.count).toBe(0);

      // Add Military techs (e.g. Plasma Cannon, Starbase, Neutron Bombs, Phase Shield)
      const plasmaCannon = MILITARY_TECHS.find((t) => t.id === 'plasma_cannon')!;
      const starbase = MILITARY_TECHS.find((t) => t.id === 'starbase')!;
      const neutronBombs = MILITARY_TECHS.find((t) => t.id === 'neutron_bombs')!;
      const phaseShield = MILITARY_TECHS.find((t) => t.id === 'phase_shield')!;
      p1.techTrack.researched.push(plasmaCannon, starbase, neutronBombs, phaseShield);

      // Add Grid tech
      const positron = GRID_TECHS.find((t) => t.id === 'positron_computer')!;
      p1.techTrack.researched.push(positron);

      // Add Nano tech
      const nanorobots = NANO_TECHS.find((t) => t.id === 'nanorobots')!;
      p1.techTrack.researched.push(nanorobots);

      // Add Rare tech placed in Military track
      const metasynthesis = { ...RARE_TECHS.find((t) => t.id === 'metasynthesis')!, placedTrack: 'military' as const };
      p1.techTrack.researched.push(metasynthesis);

      const updatedRows = getPlayerTechRows(p1);
      // Military row has 4 military techs + 1 rare tech placed in military = 5 total
      expect(updatedRows.military.count).toBe(5);
      expect(updatedRows.military.nextDiscount).toBe(5); // 5 discount for 6th tech
      expect(updatedRows.military.victoryPoints).toBe(2); // 5 techs in row = 2 VP!

      // Grid row has 1 tech
      expect(updatedRows.grid.count).toBe(1);
      expect(updatedRows.grid.nextDiscount).toBe(1);
      expect(updatedRows.grid.victoryPoints).toBe(0);

      // Nano row has 1 tech
      expect(updatedRows.nano.count).toBe(1);
      expect(updatedRows.nano.nextDiscount).toBe(1);
    });

    it('verifies all 4 ship blueprints display valid starting stats and components', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;

      // Interceptor: 4 slots, 1 HP
      const intStats = calculateBlueprintStats(p1.blueprints.interceptor);
      expect(intStats.isValid).toBe(true);
      expect(intStats.totalHull).toBe(1);
      expect(p1.blueprints.interceptor.maxSlots).toBe(4);

      // Cruiser: 6 slots, 2 HP (1 Hull)
      const cruStats = calculateBlueprintStats(p1.blueprints.cruiser);
      expect(cruStats.isValid).toBe(true);
      expect(cruStats.totalHull).toBe(2);
      expect(p1.blueprints.cruiser.maxSlots).toBe(6);

      // Dreadnought: 8 slots, 3 HP (2 Hulls)
      const dreStats = calculateBlueprintStats(p1.blueprints.dreadnought);
      expect(dreStats.isValid).toBe(true);
      expect(dreStats.totalHull).toBe(3);
      expect(p1.blueprints.dreadnought.maxSlots).toBe(8);

      // Starbase: 5 slots, 2 HP (1 Hull)
      const staStats = calculateBlueprintStats(p1.blueprints.starbase);
      expect(staStats.isValid).toBe(true);
      expect(staStats.totalHull).toBe(2);
      expect(p1.blueprints.starbase.maxSlots).toBe(5);
    });
  });

  describe('Drive Speed & Multi-Hex Movement Activations', () => {
    it('allows a ship with Fusion Drive (Drive Speed 2) to move 2 hexes in 1 activation', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;
      homeSec.wormholes = [true, true, true, true, true, true];

      // Deploy a cruiser to home sector
      const cruiser = {
        id: 'cruiser_test_1',
        ownerId: p1.id,
        type: 'cruiser' as const,
        damageTaken: 0,
      };
      homeSec.ships.push(cruiser);

      // Upgrade Cruiser blueprint with Fusion Drive (Speed 2)
      p1.blueprints.cruiser = {
        ...p1.blueprints.cruiser,
        slots: [
          SHIP_PARTS.ion_cannon,
          SHIP_PARTS.electron_computer,
          SHIP_PARTS.hull,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.fusion_drive, // Speed 2
        ],
      };

      const stats = calculateBlueprintStats(p1.blueprints.cruiser);
      expect(stats.isValid).toBe(true);
      expect(stats.totalDriveSpeed).toBe(2);

      // Create a chain of 3 sectors: Home (0, -2) <-> SecA (0, -1) <-> SecB (1, -2)
      const secA: SectorTile = {
        id: 'sector_test_A',
        sectorNumber: 991,
        ring: 1,
        coord: { q: 0, r: -1 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: p1.id,
        ships: [],
      };
      const secB: SectorTile = {
        id: 'sector_test_B',
        sectorNumber: 992,
        ring: 1,
        coord: { q: 1, r: -2 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: p1.id,
        ships: [],
      };
      game.sectors.push(secA, secB);

      // Move Cruiser 2 hexes: Home -> SecA -> SecB in 1 activation (activationIndex: 0)
      const res = executeAction(game, {
        type: 'MOVE',
        playerId: p1.id,
        moves: [
          { shipId: cruiser.id, fromSectorId: homeSec.id, toSectorId: secA.id, activationIndex: 0 },
          { shipId: cruiser.id, fromSectorId: secA.id, toSectorId: secB.id, activationIndex: 0 },
        ],
      });

      expect(res.success).toBe(true);
      if (res.success) {
        const afterHome = res.newState.sectors.find((s) => s.id === homeSec.id)!;
        const afterB = res.newState.sectors.find((s) => s.id === secB.id)!;
        expect(afterHome.ships.find((s) => s.id === cruiser.id)).toBeUndefined();
        expect(afterB.ships.find((s) => s.id === cruiser.id)).toBeDefined();
      }
    });

    it('rejects taking more steps than Drive Speed in a single activation', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;
      homeSec.wormholes = [true, true, true, true, true, true];

      const cruiser = {
        id: 'cruiser_test_2',
        ownerId: p1.id,
        type: 'cruiser' as const,
        damageTaken: 0,
      };
      homeSec.ships.push(cruiser);

      p1.blueprints.cruiser = {
        ...p1.blueprints.cruiser,
        slots: [
          SHIP_PARTS.ion_cannon,
          SHIP_PARTS.electron_computer,
          SHIP_PARTS.hull,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.fusion_drive,
        ],
      };

      const secA: SectorTile = {
        id: 'sector_test_A2',
        sectorNumber: 993,
        ring: 1,
        coord: { q: 0, r: -1 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: p1.id,
        ships: [],
      };
      const secB: SectorTile = {
        id: 'sector_test_B2',
        sectorNumber: 994,
        ring: 1,
        coord: { q: 1, r: -2 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: p1.id,
        ships: [],
      };
      game.sectors.push(secA, secB);

      // Attempt 3 steps with Speed 2 engine in a single activation (activationIndex: 0)
      const failRes = executeAction(game, {
        type: 'MOVE',
        playerId: p1.id,
        moves: [
          { shipId: cruiser.id, fromSectorId: homeSec.id, toSectorId: secA.id, activationIndex: 0 },
          { shipId: cruiser.id, fromSectorId: secA.id, toSectorId: secB.id, activationIndex: 0 },
          { shipId: cruiser.id, fromSectorId: secB.id, toSectorId: secA.id, activationIndex: 0 },
        ],
      });

      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain('Drive Speed 2');
    });

    it('allows a human player to perform 3 activations of 2 steps each (total 6 hexes) with Fusion Drive', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;
      homeSec.wormholes = [true, true, true, true, true, true];

      const cruiser = {
        id: 'cruiser_test_3',
        ownerId: p1.id,
        type: 'cruiser' as const,
        damageTaken: 0,
      };
      homeSec.ships.push(cruiser);

      p1.blueprints.cruiser = {
        ...p1.blueprints.cruiser,
        slots: [
          SHIP_PARTS.ion_cannon,
          SHIP_PARTS.electron_computer,
          SHIP_PARTS.hull,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.fusion_drive, // Speed 2
        ],
      };

      const secA: SectorTile = {
        id: 'sector_test_A3',
        sectorNumber: 995,
        ring: 1,
        coord: { q: 0, r: -1 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: p1.id,
        ships: [],
      };
      game.sectors.push(secA);

      // 3 activations, each moving Home <-> SecA (2 steps each = 6 steps total)
      const res = executeAction(game, {
        type: 'MOVE',
        playerId: p1.id,
        moves: [
          // Activation 0: 2 steps
          { shipId: cruiser.id, fromSectorId: homeSec.id, toSectorId: secA.id, activationIndex: 0 },
          { shipId: cruiser.id, fromSectorId: secA.id, toSectorId: homeSec.id, activationIndex: 0 },
          // Activation 1: 2 steps
          { shipId: cruiser.id, fromSectorId: homeSec.id, toSectorId: secA.id, activationIndex: 1 },
          { shipId: cruiser.id, fromSectorId: secA.id, toSectorId: homeSec.id, activationIndex: 1 },
          // Activation 2: 2 steps
          { shipId: cruiser.id, fromSectorId: homeSec.id, toSectorId: secA.id, activationIndex: 2 },
          { shipId: cruiser.id, fromSectorId: secA.id, toSectorId: homeSec.id, activationIndex: 2 },
        ],
      });

      expect(res.success).toBe(true);
    });

    it('enforces pinning: a ship entering a sector with hostile forces cannot move further', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;
      homeSec.wormholes = [true, true, true, true, true, true];

      const cruiser = {
        id: 'cruiser_test_4',
        ownerId: p1.id,
        type: 'cruiser' as const,
        damageTaken: 0,
      };
      homeSec.ships.push(cruiser);

      p1.blueprints.cruiser = {
        ...p1.blueprints.cruiser,
        slots: [
          SHIP_PARTS.ion_cannon,
          SHIP_PARTS.electron_computer,
          SHIP_PARTS.hull,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.fusion_drive,
        ],
      };

      // Ancient sector connected to Home (0, -2) -> (0, -1)
      const ancientSec: SectorTile = {
        id: 'sector_ancient_pin',
        sectorNumber: 997,
        ring: 1,
        coord: { q: 0, r: -1 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 1, // Ancient ship presents!
        discOwner: null,
        ships: [],
      };
      // Connected to ancientSec (0, -1) -> (1, -2)
      const thirdSec: SectorTile = {
        id: 'sector_third',
        sectorNumber: 998,
        ring: 1,
        coord: { q: 1, r: -2 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: null,
        ships: [],
      };
      game.sectors.push(ancientSec, thirdSec);

      // Attempt to move into ancient sector and then keep moving to thirdSec in same activation
      const failRes = executeAction(game, {
        type: 'MOVE',
        playerId: p1.id,
        moves: [
          { shipId: cruiser.id, fromSectorId: homeSec.id, toSectorId: ancientSec.id, activationIndex: 0 },
          { shipId: cruiser.id, fromSectorId: ancientSec.id, toSectorId: thirdSec.id, activationIndex: 0 },
        ],
      });

      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain('pinned by hostile forces');
    });

    it('rejects movement for Starbases with Drive Speed 0', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;
      homeSec.wormholes = [true, true, true, true, true, true];

      const starbase = {
        id: 'starbase_test_1',
        ownerId: p1.id,
        type: 'starbase' as const,
        damageTaken: 0,
      };
      homeSec.ships.push(starbase);

      const secA: SectorTile = {
        id: 'sector_secA_sb',
        sectorNumber: 999,
        ring: 1,
        coord: { q: 0, r: -1 },
        rotation: 0,
        wormholes: [true, true, true, true, true, true],
        planets: [],
        victoryPoints: 1,
        hasArtifact: false,
        hasDiscovery: false,
        ancientsCount: 0,
        discOwner: p1.id,
        ships: [],
      };
      game.sectors.push(secA);

      const failRes = executeAction(game, {
        type: 'MOVE',
        playerId: p1.id,
        moves: [
          { shipId: starbase.id, fromSectorId: homeSec.id, toSectorId: secA.id, activationIndex: 0 },
        ],
      });

      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain('Drive Speed 0 and cannot move');
    });
  });
});

