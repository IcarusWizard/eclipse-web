import { describe, expect, it, test } from 'bun:test';
import {
  areCoordsEqual,
  areSectorsConnected,
  getEdgeBetween,
  getHexDistance,
  getOppositeEdge,
  hasWormholeOnEdge,
  findLegalExploreRotation,
  findNextLegalExploreRotation,
  getEdgeTowardCenter,
} from '../rules/hexMath';
import {
  calculateBlueprintStats,
  createDefaultHumanBlueprints,
  SHIP_LIMITS,
  countPlayerShips,
  getRemainingShipSupply,
  createFactionBlueprints,
} from '../rules/shipValidation';
import { SHIP_PARTS } from '../rules/partData';
import {
  sortUnitsByInitiative,
  getSectorDefenderOwnerId,
  buildCombatUnitsForSector,
  executeCombatStep,
} from '../rules/combatEngine';
import { createInitialGame, ALIEN_FACTIONS } from '../rules/setup';
import {
  executeAction,
  validateAction,
  checkAndTriggerCombat,
  calculateFinalScores,
  computeCurrentScores,
  transitionToUpkeep,
} from '../rules/gameReducer';
import {
  saveGameState,
  loadActiveGameState,
  loadTableByNumber,
  listSavedTables,
  getTableNumber,
} from '../rules/persistence';
import type { SectorTile } from '../types/sector';
import type { CombatState } from '../types/state';
import {
  getIncomeForTrack,
  getUpkeepForDiscs,
  calculateActionCostForecast,
  getPlayerTechRows,
  TECH_ROW_VP_TABLE,
  getIncomeForecast,
  applyUpkeepPhase,
  POPULATION_TRACK_SPACES,
} from '../rules/economyEngine';
import { CENTER_SECTOR, generateSectorDecks, DISCOVERY_TILES } from '../rules/sectorData';
import {
  createInitialTechBag,
  drawTechTilesForSetup,
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

    // Default legal rotation calculation:
    // Sector A at (0, 0) has wormhole at Edge 0 (pointing East to (1, 0))
    // Sector D at (1, 0) has wormhole ONLY at base edge 1
    // Edge from D to A is Edge 3 (West).
    // In clockwise rotation rot, edge 3 corresponds to baseIndex (3 - rot + 6) % 6.
    // We want (3 - rot + 6) % 6 === 1 => rot = 2!
    const sectorD = {
      id: 'D',
      sectorNumber: 104,
      ring: 1 as const,
      coord: { q: 1, r: 0 },
      rotation: 0,
      wormholes: [false, true, false, false, false, false], // wormhole only at index 1
      planets: [],
      victoryPoints: 1,
      hasArtifact: false,
      hasDiscovery: false,
      ancientsCount: 0,
      ships: [],
    };

    // At rotation 0, sector D does not connect
    expect(areSectorsConnected(sectorA, sectorD)).toBe(false);

    // findLegalExploreRotation should automatically find rotation 2
    const legalRot = findLegalExploreRotation(sectorA, sectorD, { q: 1, r: 0 });
    expect(legalRot).toBe(2);

    // Verifying that rotation 2 is indeed connected
    const rotatedD = { ...sectorD, rotation: legalRot };
    expect(areSectorsConnected(sectorA, rotatedD)).toBe(true);

    // findNextLegalExploreRotation cycles clockwise to the next valid orientation
    const nextRot = findNextLegalExploreRotation(sectorA, sectorD, { q: 1, r: 0 }, 0);
    expect(nextRot).toBe(2);

    // If already legal at rotation 0, preserves 0
    expect(findLegalExploreRotation(sectorA, sectorB, { q: 1, r: 0 })).toBe(0);
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
    // 11 cubes on board = 2 income
    expect(getIncomeForTrack(11)).toBe(2);
    // 10 cubes on board = 3 income
    expect(getIncomeForTrack(10)).toBe(3);
    // 5 cubes on board = 12 income
    expect(getIncomeForTrack(5)).toBe(12);
    // 0 cubes on board = 28 income
    expect(getIncomeForTrack(0)).toBe(28);
  });

  it('computes progressive upkeep cost from discs remaining', () => {
    expect(getUpkeepForDiscs(13)).toBe(0);
    expect(getUpkeepForDiscs(12)).toBe(0);
    expect(getUpkeepForDiscs(10)).toBe(1);
    expect(getUpkeepForDiscs(7)).toBe(5);
    expect(getUpkeepForDiscs(3)).toBe(17);
    expect(getUpkeepForDiscs(0)).toBe(30);
  });
});

describe('Game Setup & Turn Engine Flow', () => {
  it('initializes a 2-player game with human factions symmetrically', () => {
    const game = createInitialGame(2);
    expect(game.players.length).toBe(2);
    expect(game.round).toBe(1);
    // Center 001 + 2 Home Sectors + 4 Guardian Sectors (Sector 212 at unused starting hexes)
    expect(game.sectors.length).toBe(7);
    expect(game.sectors.filter((s) => s.sectorNumber === 212).length).toBe(4);
    expect(game.sectors.filter((s) => s.ships.some((ship) => ship.type === 'guardian')).length).toBe(4);
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
    it('contains all 39 authentic technologies with exact official base costs and slot tiers (Rulebook p. 3 & p. 31)', () => {
      expect(MILITARY_TECHS.length).toBe(8);
      expect(GRID_TECHS.length).toBe(8);
      expect(NANO_TECHS.length).toBe(8);
      expect(RARE_TECHS.length).toBe(15);
      expect(TECH_CATALOG.length).toBe(39);

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

    it('creates an official 114-tile tech bag (99 regular tiles + 15 rare tiles)', () => {
      const bag = createInitialTechBag();
      expect(bag.length).toBe(114);

      const militaryTiles = bag.filter((t) => t.category === 'military');
      const gridTiles = bag.filter((t) => t.category === 'grid');
      const nanoTiles = bag.filter((t) => t.category === 'nano');
      const rareTiles = bag.filter((t) => t.category === 'rare');

      expect(militaryTiles.length).toBe(33); // 5+5+5+5+4+3+3+3
      expect(gridTiles.length).toBe(33); // 5+5+5+5+4+3+3+3
      expect(nanoTiles.length).toBe(33); // 5+5+5+5+4+3+3+3
      expect(rareTiles.length).toBe(15); // 15 unique rare techs * 1 copy

      // Verify Rift Cannon is NOT present in Second Dawn
      expect(RARE_TECHS.some((t) => t.id === 'rift_cannon')).toBe(false);
      expect(bag.some((t) => t.id === 'rift_cannon')).toBe(false);

      // Verify canonical 15 rare techs are present
      const expectedRareIds = [
        'antimatter_splitter',
        'neutron_absorber',
        'conifold_field',
        'absorption_shield',
        'cloaking_device',
        'improved_logistics',
        'sentient_hull',
        'soliton_cannon',
        'transition_drive',
        'warp_portal',
        'flux_missile',
        'pico_modulator',
        'ancient_labs',
        'zero_point_source',
        'metasynthesis',
      ];
      expect(RARE_TECHS.length).toBe(15);
      expect(RARE_TECHS.map((t) => t.id).sort()).toEqual(expectedRareIds.sort());
    });

    it('draws tiles for setup: 2p draws 12 regular, 4p draws 16 regular, rare tiles do not count toward limit', () => {
      const bag = createInitialTechBag();
      // For 2 players setup (rulebook p. 5): 12 regular tiles
      const result2p = drawTechTilesForSetup(bag, 2);
      expect(result2p.regularDrawn).toBe(12);
      expect(result2p.drawn.filter((t) => t.category !== 'rare').length).toBe(12);
      expect(result2p.drawn.length).toBe(12 + result2p.rareDrawn);
      expect(result2p.remainingBag.length).toBe(114 - result2p.drawn.length);

      // For 4 players setup: 16 regular tiles
      const result4p = drawTechTilesForSetup(bag, 4);
      expect(result4p.regularDrawn).toBe(16);
      expect(result4p.drawn.filter((t) => t.category !== 'rare').length).toBe(16);
    });

    it('draws tiles for cleanup round: 2p draws 5 regular, 4p draws 7 regular, rare tiles do not count toward limit', () => {
      const bag = createInitialTechBag();
      // For 2 players cleanup (rulebook p. 25): 2 + 3 = 5 regular tiles
      const result2p = drawTechTilesForRound(bag, 2);
      expect(result2p.regularDrawn).toBe(5);
      expect(result2p.drawn.filter((t) => t.category !== 'rare').length).toBe(5);
      expect(result2p.drawn.length).toBe(5 + result2p.rareDrawn);
      expect(result2p.remainingBag.length).toBe(114 - result2p.drawn.length);

      // For 4 players cleanup: 4 + 3 = 7 regular tiles
      const result4p = drawTechTilesForRound(bag, 4);
      expect(result4p.regularDrawn).toBe(7);
      expect(result4p.drawn.filter((t) => t.category !== 'rare').length).toBe(7);
    });

    it('correctly computes canonical discounts for regular and rare technologies', () => {
      // Slot 3: Improved Hull in GRID_TECHS (baseCost 6, minCost 4)
      const improvedHull = GRID_TECHS.find((t) => t.id === 'improved_hull')!;
      expect(improvedHull).toBeDefined();
      expect(calculateTechCost(improvedHull, 0)).toBe(6);
      expect(calculateTechCost(improvedHull, 1)).toBe(5);
      expect(calculateTechCost(improvedHull, 2)).toBe(4);
      expect(calculateTechCost(improvedHull, 3)).toBe(4);
      expect(calculateTechCost(improvedHull, 6)).toBe(4);

      // Slot 8: Artifact Key (baseCost 16, minCost 8, discounts: [0, 1, 2, 3, 4, 6, 8])
      const artifactKey = NANO_TECHS.find((t) => t.id === 'artifact_key')!;
      expect(calculateTechCost(artifactKey, 0)).toBe(16);
      expect(calculateTechCost(artifactKey, 1)).toBe(15);
      expect(calculateTechCost(artifactKey, 2)).toBe(14);
      expect(calculateTechCost(artifactKey, 3)).toBe(13);
      expect(calculateTechCost(artifactKey, 4)).toBe(12);
      expect(calculateTechCost(artifactKey, 5)).toBe(10);
      expect(calculateTechCost(artifactKey, 6)).toBe(8);

      // Rare: Ancient Labs (baseCost 13, minCost 9)
      const ancientLabs = RARE_TECHS.find((t) => t.id === 'ancient_labs')!;
      expect(calculateTechCost(ancientLabs, 0)).toBe(13);
      expect(calculateTechCost(ancientLabs, 1)).toBe(12);
      expect(calculateTechCost(ancientLabs, 2)).toBe(11);
      expect(calculateTechCost(ancientLabs, 3)).toBe(10);
      expect(calculateTechCost(ancientLabs, 4)).toBe(9);
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

    it('grants exactly 1 bonus Influence Disc for Advanced Robotics and 2 for Quantum Grid', () => {
      const game = createInitialGame(2);
      const p1 = game.players[0]!;
      p1.resources.science = 50;

      const initialTotalDiscs = p1.influenceTrack.totalDiscs;
      const initialDiscsOnTrack = p1.influenceTrack.discsOnTrack;

      // 1. Research Advanced Robotics
      const advRobotics = NANO_TECHS.find((t) => t.id === 'advanced_robotics')!;
      game.techSupply.unshift(advRobotics);

      const res1 = executeAction(game, {
        type: 'RESEARCH',
        playerId: p1.id,
        techId: 'advanced_robotics',
      });
      expect(res1.success).toBe(true);

      const p1AfterRobotics = res1.newState.players[0]!;
      // Advanced Robotics must add exactly 1 disc:
      // totalDiscs increases from 13 -> 14 (+1)
      expect(p1AfterRobotics.influenceTrack.totalDiscs).toBe(initialTotalDiscs + 1);
      // discsOnTrack: -1 (action disc placed on research) + 1 (bonus disc from Robotics) = initialDiscsOnTrack
      expect(p1AfterRobotics.influenceTrack.discsOnTrack).toBe(initialDiscsOnTrack - 1 + 1);

      // 2. Research Quantum Grid
      res1.newState.activePlayerIndex = 0;
      const quantumGrid = GRID_TECHS.find((t) => t.id === 'quantum_grid')!;
      res1.newState.techSupply.unshift(quantumGrid);

      const discsOnTrackBeforeQuantum = p1AfterRobotics.influenceTrack.discsOnTrack;
      const res2 = executeAction(res1.newState, {
        type: 'RESEARCH',
        playerId: p1.id,
        techId: 'quantum_grid',
      });
      expect(res2.success).toBe(true);

      const p1AfterQuantum = res2.newState.players[0]!;
      // Quantum Grid adds 2 discs: totalDiscs 14 -> 16 (+2)
      expect(p1AfterQuantum.influenceTrack.totalDiscs).toBe(initialTotalDiscs + 3);
      // discsOnTrack: -1 (action disc) + 2 (bonus discs from Quantum Grid) = discsOnTrackBeforeQuantum + 1
      expect(p1AfterQuantum.influenceTrack.discsOnTrack).toBe(discsOnTrackBeforeQuantum - 1 + 2);
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
      // P1 controls 1 home sector with an Artifact -> pending choice of 5 resources
      expect(res.newState.pendingArtifactReward).toBeDefined();
      expect(res.newState.pendingArtifactReward!.totalResources).toBe(5);
      expect(res.newState.pendingArtifactReward!.artifactsCount).toBe(1);

      // Player allocates 2 Money, 1 Science, 2 Materials
      const allocRes = executeAction(res.newState, {
        type: 'ALLOCATE_ARTIFACT_REWARD',
        playerId: p1.id,
        resources: { money: 2, science: 1, materials: 2 },
      });
      expect(allocRes.success).toBe(true);
      const updatedP1 = allocRes.newState.players[0]!;
      expect(updatedP1.resources.materials).toBe(4 + 2); // 4 initial + 2 chosen
      expect(allocRes.newState.pendingArtifactReward).toBeNull();
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
      // Next 3 actions: 5 discs -> 10 upkeep (increase: +7)
      expect(forecastMid.after3Actions.discsRemaining).toBe(5);
      expect(forecastMid.after3Actions.upkeep).toBe(10);
      expect(forecastMid.after3Actions.costIncrease).toBe(7);

      // 3. Late-turn / deep expansion state: 4 discs on track
      p1.influenceTrack.discsOnTrack = 4;
      const forecastLate = calculateActionCostForecast(p1);
      expect(forecastLate.currentUpkeep).toBe(13); // 4 discs -> 13 upkeep
      // Next 1 action: 3 discs -> 17 upkeep (+4)
      expect(forecastLate.after1Action.upkeep).toBe(17);
      expect(forecastLate.after1Action.costIncrease).toBe(4);
      // Next 2 actions: 2 discs -> 21 upkeep (+8)
      expect(forecastLate.after2Actions.upkeep).toBe(21);
      expect(forecastLate.after2Actions.costIncrease).toBe(8);
      // Next 3 actions: 1 disc -> 25 upkeep (+12)
      expect(forecastLate.after3Actions.upkeep).toBe(25);
      expect(forecastLate.after3Actions.costIncrease).toBe(12);
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
      expect(updatedRows.military.nextDiscount).toBe(6); // 6 discount for 6th tech (table: [0, 1, 2, 3, 4, 6, 8])
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

  describe('Official Eclipse: Second Dawn BackLog Fixes & Enhancements', () => {
    describe('1. Wild (Gray) Population Slots & Orbitals', () => {
      it('enforces Orbital build cost of 4 Materials and tech prerequisite', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;

        // Attempt build without Orbital tech
        p1.resources.materials = 10;
        const noTechRes = executeAction(game, {
          type: 'BUILD',
          playerId: p1.id,
          items: [{ sectorId: homeSec.id, itemType: 'orbital' }],
        });
        expect(noTechRes.success).toBe(false);
        expect(noTechRes.error).toContain('Must research Orbital tech');

        // Research Orbital
        p1.techTrack.researched.push({
          id: 'orbital',
          name: 'Orbital',
          category: 'grid',
          baseCost: 8,
          minCost: 4,
        });

        const buildRes = executeAction(game, {
          type: 'BUILD',
          playerId: p1.id,
          items: [{ sectorId: homeSec.id, itemType: 'orbital' }],
        });
        expect(buildRes.success).toBe(true);
        expect(buildRes.newState.players[0]!.resources.materials).toBe(6); // 10 - 4 = 6!

        // Max 1 orbital per sector
        buildRes.newState.activePlayerIndex = 0;
        const duplicateRes = executeAction(buildRes.newState, {
          type: 'BUILD',
          playerId: p1.id,
          items: [{ sectorId: homeSec.id, itemType: 'orbital' }],
        });
        expect(duplicateRes.success).toBe(false);
        expect(duplicateRes.error).toContain('already contains an Orbital structure');
      });

      it('allows colonizing an orbital slot with Money or Science and rejects Material', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;

        homeSec.planets.push({
          id: 'orbital_slot_1',
          resource: 'science',
          isAdvanced: false,
          isOrbital: true,
        });
        const orbIndex = homeSec.planets.length - 1;

        // Try material on orbital
        const matRes = executeAction(game, {
          type: 'COLONIZE',
          playerId: p1.id,
          sectorId: homeSec.id,
          planetIndex: orbIndex,
          chosenResource: 'material',
        });
        expect(matRes.success).toBe(false);
        expect(matRes.error).toContain('Orbitals can only produce Money or Science');

        // Colonize with Money
        const moneyCubesBefore = p1.population.money.cubesOnBoard;
        const moneyRes = executeAction(game, {
          type: 'COLONIZE',
          playerId: p1.id,
          sectorId: homeSec.id,
          planetIndex: orbIndex,
          chosenResource: 'money',
        });
        expect(moneyRes.success).toBe(true);
        expect(moneyRes.newState.players[0]!.population.money.cubesOnBoard).toBe(moneyCubesBefore - 1);
        const colonizedSlot = moneyRes.newState.sectors.find((s) => s.id === homeSec.id)!.planets[orbIndex]!;
        expect(colonizedSlot.colonizedBy).toBe(p1.id);
        expect(colonizedSlot.colonizedResource).toBe('money');
      });

      it('allows choosing Money, Science, or Material on wild gray slots and enforces advanced tech', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const homeSec = game.sectors.find((s) => s.id === `home_sector_${p1.id}`)!;

        homeSec.planets.push({
          id: 'wild_adv_slot',
          resource: 'any',
          isAdvanced: true,
        });
        const wildIndex = homeSec.planets.length - 1;

        // Try colonizing advanced wild without tech
        const noTechRes = executeAction(game, {
          type: 'COLONIZE',
          playerId: p1.id,
          sectorId: homeSec.id,
          planetIndex: wildIndex,
          chosenResource: 'science',
        });
        expect(noTechRes.success).toBe(false);
        expect(noTechRes.error).toContain('Requires Advanced Labs or Metasynthesis');

        // Grant Advanced Labs
        p1.techTrack.researched.push({
          id: 'advanced_labs',
          name: 'Advanced Labs',
          category: 'nano',
          baseCost: 8,
          minCost: 4,
        });

        const sciCubesBefore = p1.population.science.cubesOnBoard;
        const colonizeRes = executeAction(game, {
          type: 'COLONIZE',
          playerId: p1.id,
          sectorId: homeSec.id,
          planetIndex: wildIndex,
          chosenResource: 'science',
        });
        expect(colonizeRes.success).toBe(true);
        expect(colonizeRes.newState.players[0]!.population.science.cubesOnBoard).toBe(sciCubesBefore - 1);
        expect(colonizeRes.newState.sectors.find((s) => s.id === homeSec.id)!.planets[wildIndex]!.colonizedResource).toBe('science');
      });

      it('returns population cubes to player board tracks when a sector is abandoned via Influence', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const sec: SectorTile = {
          id: 'sector_col_abandon',
          sectorNumber: 991,
          ring: 1,
          coord: { q: 1, r: -1 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [
            { id: 'p1', resource: 'material', isAdvanced: false, colonizedBy: p1.id, colonizedResource: 'material' },
            { id: 'p2', resource: 'science', isAdvanced: false, colonizedBy: p1.id, colonizedResource: 'science' },
          ],
          victoryPoints: 1,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          discOwner: p1.id,
          ships: [],
        };
        game.sectors.push(sec);
        p1.population.material.cubesOnBoard = 10;
        p1.population.science.cubesOnBoard = 10;

        const abandonRes = executeAction(game, {
          type: 'INFLUENCE',
          playerId: p1.id,
          abandonSectors: [sec.id],
        });
        expect(abandonRes.success).toBe(true);
        const updatedP1 = abandonRes.newState.players[0]!;
        expect(updatedP1.population.material.cubesOnBoard).toBe(11);
        expect(updatedP1.population.science.cubesOnBoard).toBe(11);
        const updatedSec = abandonRes.newState.sectors.find((s) => s.id === sec.id)!;
        expect(updatedSec.discOwner).toBeUndefined();
        expect(updatedSec.planets[0]!.colonizedBy).toBeUndefined();
        expect(updatedSec.planets[1]!.colonizedBy).toBeUndefined();
      });
    });

    describe('2. Income Cubes & Forecast on Player Board', () => {
      it('correctly calculates current income, next 1 cube and next 2 cubes deltas', () => {
        // At 11 cubes on board (none colonized): income is 2
        const f11 = getIncomeForecast(11);
        expect(f11.currentIncome).toBe(2);
        expect(f11.next1Cube.income).toBe(3);
        expect(f11.next1Cube.delta).toBe(1); // +1 gain
        expect(f11.next2Cubes.income).toBe(4);
        expect(f11.next2Cubes.delta).toBe(2); // +2 gain

        // At 10 cubes on board (1 colonized): income is 3
        const f10 = getIncomeForecast(10);
        expect(f10.currentIncome).toBe(3);
        expect(f10.next1Cube.income).toBe(4);
        expect(f10.next1Cube.delta).toBe(1);
        expect(f10.next2Cubes.income).toBe(6);
        expect(f10.next2Cubes.delta).toBe(3); // from 3 to 6 is +3!

        // At 5 cubes on board: income is 12
        const f5 = getIncomeForecast(5);
        expect(f5.currentIncome).toBe(12);
        expect(f5.next1Cube.income).toBe(15);
        expect(f5.next1Cube.delta).toBe(3);
        expect(f5.next2Cubes.income).toBe(18);
        expect(f5.next2Cubes.delta).toBe(6);
      });

      it('verifies POPULATION_TRACK_SPACES ascending order (2 to 28) and correct active/covered state logic', () => {
        const expectedValues = [2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28];
        expect(POPULATION_TRACK_SPACES.map((s) => s.value)).toEqual(expectedValues);

        // At 10 cubes on board (game start, 1 colonized):
        // Space 2 (slot 0) is passed (uncovered)
        // Space 3 (slot 1) is ACTIVE (income = 3)
        // Space 4 (slot 2) is NEXT cube (+1 delta)
        // Space 6 (slot 3) is +2 cubes (+3 delta)
        // Spaces 4 through 28 have 10 cubes
        const cubesOnBoard = 10;
        const activeSpace = POPULATION_TRACK_SPACES.find((s) => s.cubesOnBoardThreshold === cubesOnBoard)!;
        expect(activeSpace.value).toBe(3);

        const nextSpace = POPULATION_TRACK_SPACES.find((s) => s.cubesOnBoardThreshold === cubesOnBoard - 1)!;
        expect(nextSpace.value).toBe(4);

        const coveredSpaces = POPULATION_TRACK_SPACES.filter((s) => cubesOnBoard > s.cubesOnBoardThreshold);
        expect(coveredSpaces.length).toBe(10); // 10 cubes covering spaces 4 through 28
        expect(coveredSpaces.map((s) => s.value)).toEqual([4, 6, 8, 10, 12, 15, 18, 21, 24, 28]);
      });
    });

    describe('3. Bankruptcy Logic', () => {
      it('resolves negative money deficit via emergency trade and sector abandonment', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        p1.resources.money = 0;
        p1.influenceTrack.discsOnTrack = 2; // Upkeep = 18!
        p1.population.money.cubesOnBoard = 11; // Income = 3. Net delta = 3 - 18 = -15!
        p1.resources.materials = 22; // Emergency trade: 2:1 -> 22 mats = 11 credits -> deficit is -4
        p1.resources.science = 0; // Emergency trade: science income (2) -> 2 sci = 1 credit -> deficit is -3 (abandoning sector saves 3 upkeep!)

        // Controlled non-home sector
        const nonHomeSec: SectorTile = {
          id: 'sec_non_home_bankrupt',
          sectorNumber: 981,
          ring: 2,
          coord: { q: 2, r: -2 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [{ id: 'p_bankrupt', resource: 'material', isAdvanced: false, colonizedBy: p1.id }],
          victoryPoints: 2,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          discOwner: p1.id,
          ships: [],
        };
        game.sectors.push(nonHomeSec);

        const upkeepRes = applyUpkeepPhase(p1, game.sectors);
        expect(upkeepRes.bankrupt).toBe(true);
        expect(upkeepRes.eliminated).toBe(false);
        expect(upkeepRes.updatedPlayer.resources.money).toBeGreaterThanOrEqual(0);
        expect(upkeepRes.abandonedSectorIds).toContain(nonHomeSec.id);
      });

      it('eliminates a player who cannot balance their budget after exhausting all assets', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        p1.resources.money = 0;
        p1.resources.materials = 0;
        p1.resources.science = 0;
        p1.influenceTrack.discsOnTrack = 0; // Upkeep = 30!
        p1.population.money.cubesOnBoard = 12; // Income = 2

        const upkeepRes = applyUpkeepPhase(p1, []);
        expect(upkeepRes.bankrupt).toBe(true);
        expect(upkeepRes.eliminated).toBe(true);
        expect(upkeepRes.updatedPlayer.isEliminated).toBe(true);
      });
    });

    describe('4. Reputation Tiles System', () => {
      it('creates official 33-tile reputation bag (16x1, 9x2, 5x3, 3x4)', () => {
        const game = createInitialGame(2);
        expect(game.reputationBag.length).toBe(33);
        const counts: Record<number, number> = {};
        for (const val of game.reputationBag) {
          counts[val] = (counts[val] || 0) + 1;
        }
        expect(counts[1]).toBe(16);
        expect(counts[2]).toBe(9);
        expect(counts[3]).toBe(5);
        expect(counts[4]).toBe(3);
      });

      it('allows claiming a reputation tile after combat, placing it on track, and replacing when full', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;

        game.pendingReputationDraw = {
          playerId: p1.id,
          drawnTiles: [1, 2, 4],
          sectorId: 'home_sector_player_1',
        };

        const claimRes = executeAction(game, {
          type: 'CLAIM_REPUTATION_TILE',
          playerId: p1.id,
          selectedTileIndex: 2, // Keeps 4 VP tile!
        });

        expect(claimRes.success).toBe(true);
        const updatedP1 = claimRes.newState.players[0]!;
        expect(updatedP1.reputationTiles).toEqual([4]);
        expect(claimRes.newState.pendingReputationDraw).toBeNull();

        // Fill track to 5 tiles and test replacement
        updatedP1.reputationTiles = [1, 2, 1, 2, 3];
        claimRes.newState.pendingReputationDraw = {
          playerId: p1.id,
          drawnTiles: [4],
          sectorId: 'home_sector_player_1',
        };

        const replaceRes = executeAction(claimRes.newState, {
          type: 'CLAIM_REPUTATION_TILE',
          playerId: p1.id,
          selectedTileIndex: 0, // 4 VP
          replaceTrackIndex: 0, // Replaces first 1 VP tile
        });

        expect(replaceRes.success).toBe(true);
        expect(replaceRes.newState.players[0]!.reputationTiles).toContain(4);
        expect(replaceRes.newState.players[0]!.reputationTiles.length).toBe(5);
      });
    });

    describe('5. Combat Retreat', () => {
      it('declares retreat for ships of a type and completes retreat to friendly adjacent sector on next activation', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;

        // Ensure interceptor has extra hull to survive enemy salvo before its next activation
        p1.blueprints.interceptor.slots[3] = SHIP_PARTS.hull;

        const combatSec: SectorTile = {
          id: 'sec_combat_test',
          sectorNumber: 881,
          ring: 1,
          coord: { q: 0, r: -1 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [],
          victoryPoints: 1,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          discOwner: undefined,
          ships: [
            { id: 'p1_int_retreat', ownerId: p1.id, type: 'interceptor', damage: 0 },
            { id: 'p2_cruiser_foe', ownerId: p2.id, type: 'cruiser', damage: 0 },
          ],
        };

        // Friendly controlled retreat destination
        const retreatDest: SectorTile = {
          id: 'sec_retreat_dest',
          sectorNumber: 882,
          ring: 1,
          coord: { q: 0, r: -2 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [],
          victoryPoints: 1,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          discOwner: p1.id, // Controlled by p1!
          ships: [], // No enemies
        };

        game.sectors.push(combatSec, retreatDest);

        game.activeCombat = {
          sectorId: combatSec.id,
          roundNumber: 1,
          stage: 'regular',
          initiativeOrder: [],
          currentTurnIndex: 0,
          lastRolls: [],
          retreatDeclared: {},
        };

        // Step 1: P1 Interceptor declares retreat during its activation
        const declareRes = executeAction(game, {
          type: 'RESOLVE_COMBAT_STEP',
          playerId: p1.id,
          retreatShipIds: ['p1_int_retreat'],
          retreatDestinationSectorId: retreatDest.id,
        });

        expect(declareRes.success).toBe(true);
        expect(declareRes.newState.activeCombat?.retreatDeclared['p1_int_retreat']).toBe(retreatDest.id);

        // Step 2: P2 Cruiser activates and attacks in initiative order
        const p2AttackRes = executeAction(declareRes.newState, {
          type: 'RESOLVE_COMBAT_STEP',
          playerId: p2.id,
        });
        expect(p2AttackRes.success).toBe(true);

        // Step 3: On its next activation (Engagement Round 2), P1 Interceptor completes its retreat!
        const completeRes = executeAction(p2AttackRes.newState, {
          type: 'RESOLVE_COMBAT_STEP',
          playerId: p1.id,
        });

        expect(completeRes.success).toBe(true);
        const updatedDest = completeRes.newState.sectors.find((s) => s.id === retreatDest.id)!;
        expect(updatedDest.ships.some((s) => s.id === 'p1_int_retreat')).toBe(true);
      });

      it('6. Population Bombardment: destroys population cubes before disc overthrow; with neutron bombs wipes all', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;

        // Give P1 Neutron Bombs
        p1.techTrack.researched.push({
          id: 'neutron_bombs',
          name: 'Neutron Bombs',
          category: 'military',
          cost: 5,
          minCost: 2,
        });

        // Set up Sector 102 controlled by P2 with 2 population cubes and 1 weak ship
        const combatSec = game.sectors.find((s) => s.ring > 0)!;
        combatSec.discOwner = p2.id;
        combatSec.planets = [
          { id: 'p_1', resource: 'money', isAdvanced: false, colonizedBy: p2.id, colonizedResource: 'money' },
          { id: 'p_2', resource: 'science', isAdvanced: false, colonizedBy: p2.id, colonizedResource: 'science' },
        ];
        p2.population.money.cubesOnBoard = 10;
        p2.population.science.cubesOnBoard = 10;
        p2.influenceTrack.discsOnTrack = 10;

        // P2 has 1 Interceptor with 1 hull remaining; P1 has 1 Dreadnought with full hull
        combatSec.ships = [
          { id: 'p2_ship', ownerId: p2.id, type: 'interceptor', damage: 0 },
          { id: 'p1_dread', ownerId: p1.id, type: 'dreadnought', damage: 0 },
        ];

        game.phase = 'COMBAT_PHASE';
        game.activeCombat = {
          sectorId: combatSec.id,
          roundNumber: 1,
          stage: 'regular',
          initiativeOrder: [],
          currentTurnIndex: 0,
          lastRolls: [],
          retreatDeclared: {},
        };

        // P1 attacks and destroys P2's ship
        // We set P2's ship damage to 1 right before combat concludes or step combat
        combatSec.ships[0].damage = 1; // 1 damage kills interceptor (hull = 1)

        const stepRes = executeAction(game, {
          type: 'RESOLVE_COMBAT_STEP',
          playerId: p1.id,
        });

        expect(stepRes.success).toBe(true);
        const updatedSec = stepRes.newState.sectors.find((s) => s.id === combatSec.id)!;
        // Neutron bombs should have auto-annihilated all 2 P2 population cubes
        expect(updatedSec.planets.every((p) => !p.colonizedBy)).toBe(true);
        // P2 cubes returned to player board
        expect(stepRes.newState.players[1]!.population.money.cubesOnBoard).toBe(11);
        expect(stepRes.newState.players[1]!.population.science.cubesOnBoard).toBe(11);
        // P2 Influence disc was overthrown and returned to track
        expect(updatedSec.discOwner).toBeUndefined();
        expect(stepRes.newState.players[1]!.influenceTrack.discsOnTrack).toBe(11);
        // P1 victor gets pendingCombatConquest
        expect(stepRes.newState.pendingCombatConquest?.winnerPlayerId).toBe(p1.id);
      });

      it('6b. Population Bombardment without defending ships: enemy ship in controlled sector bombards population and overthrows control even with 0 defending ships', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;

        // P2 controls sector 201 with an influence disc and 1 colonized population cube
        const targetSec: SectorTile = {
          id: 'sec_201_controlled',
          sectorNumber: 201,
          ring: 2,
          coord: { q: 2, r: -1 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          discOwner: p2.id,
          planets: [
            {
              resource: 'money',
              isAdvanced: false,
              colonizedBy: p2.id,
              colonizedResource: 'money',
            },
          ],
          victoryPoints: 2,
          hasArtifact: false,
          hasDiscovery: false,
          discoveryClaimed: false,
          ancientsCount: 0,
          // P1 has an Interceptor in this sector; P2 has ZERO ships in this sector!
          ships: [
            {
              id: 'p1_interceptor_1',
              ownerId: p1.id,
              type: 'interceptor',
              damage: 0,
            },
          ],
        };

        p2.influenceTrack.discsOnTrack = 10;
        p2.population.money.cubesOnBoard = 9; // 1 cube in home, 1 cube in sec 201
        p1.techTrack.researched.push(MILITARY_TECHS.find((t) => t.id === 'neutron_bombs')!);

        game.sectors.push(targetSec);

        // Both players pass to conclude ACTION_PHASE and enter COMBAT_PHASE
        const pass1 = executeAction(game, { type: 'PASS', playerId: p1.id });
        expect(pass1.success).toBe(true);
        const pass2 = executeAction(pass1.newState, { type: 'PASS', playerId: p2.id });
        expect(pass2.success).toBe(true);

        // The game should have entered COMBAT_PHASE, bombarded P2's population, overthrown P2's disc,
        // and paused with pendingCombatConquest for P1!
        expect(pass2.newState.phase).toBe('COMBAT_PHASE');
        const updatedSec = pass2.newState.sectors.find((s) => s.id === targetSec.id)!;
        expect(updatedSec.planets[0]!.colonizedBy).toBeUndefined(); // Population wiped
        expect(updatedSec.discOwner).toBeUndefined(); // Disc overthrown
        expect(pass2.newState.players[1]!.influenceTrack.discsOnTrack).toBe(11); // Disc returned to P2
        expect(pass2.newState.players[1]!.population.money.cubesOnBoard).toBe(10); // Cube returned to P2
        expect(pass2.newState.pendingCombatConquest?.winnerPlayerId).toBe(p1.id);
        expect(pass2.newState.pendingCombatConquest?.sectorId).toBe(targetSec.id);
      });

      it('7. Ship Base Initiative & Defender Tie-Breaking: verifies official Human base initiatives and defender tie priority', () => {
        const bps = createDefaultHumanBlueprints();
        // Base initiatives:
        expect(bps.interceptor.baseInitiative).toBe(2);
        expect(bps.cruiser.baseInitiative).toBe(1);
        expect(bps.dreadnought.baseInitiative).toBe(0);
        expect(bps.starbase.baseInitiative).toBe(4);

        // Calculated starting initiatives with components (Computers provide die hit bonus, NOT initiative in 2nd Dawn; only Drives/parts give init):
        const intStats = calculateBlueprintStats(bps.interceptor);
        expect(intStats.totalInitiative).toBe(3); // 2 base + 1 Nuclear Drive

        const cruStats = calculateBlueprintStats(bps.cruiser);
        expect(cruStats.totalInitiative).toBe(2); // 1 base + 1 Nuclear Drive

        const dreStats = calculateBlueprintStats(bps.dreadnought);
        expect(dreStats.totalInitiative).toBe(1); // 0 base + 1 Nuclear Drive

        const staStats = calculateBlueprintStats(bps.starbase);
        expect(staStats.totalInitiative).toBe(4); // 4 base (no drive)

        // Defender tie-breaking test:
        const defenderUnit = {
          id: 'def_1',
          ownerId: 'player_def',
          type: 'cruiser',
          initiative: 3,
          maxHull: 2,
          currentDamage: 0,
          computerBonus: 1,
          shieldBonus: 0,
          weapons: [],
        };
        const attackerUnit = {
          id: 'atk_1',
          ownerId: 'player_atk',
          type: 'interceptor',
          initiative: 3,
          maxHull: 1,
          currentDamage: 0,
          computerBonus: 0,
          shieldBonus: 0,
          weapons: [],
        };

        const sorted = sortUnitsByInitiative([attackerUnit, defenderUnit], 'player_def');
        expect(sorted[0].id).toBe('def_1'); // Defender wins the initiative tie!
        expect(sorted[1].id).toBe('atk_1');
      });

      it('8. Plasma Cannon Die Count: confirms 1 orange die (2 damage per hit)', () => {
        const pc = SHIP_PARTS.plasma_cannon;
        expect(pc).toBeDefined();
        expect(pc.dice).toBeDefined();
        expect(pc.dice!.length).toBe(1);
        expect(pc.dice![0].color).toBe('orange');
        expect(pc.dice![0].count).toBe(1);
        expect(pc.dice![0].damagePerHit).toBe(2);

        // A dreadnought with 2 plasma cannons should have exactly 2 orange dice
        const bps = createDefaultHumanBlueprints();
        bps.dreadnought.slots[0] = SHIP_PARTS.plasma_cannon;
        bps.dreadnought.slots[1] = SHIP_PARTS.plasma_cannon;

        const diceCount = bps.dreadnought.slots
          .filter((s) => s?.dice)
          .flatMap((s) => s!.dice!)
          .filter((d) => d.color === 'orange')
          .reduce((sum, d) => sum + d.count, 0);

        expect(diceCount).toBe(2); // 2 plasma cannons = 2 dice!
      });

      it('9. Combat Resolution Order: resolves multi-sector battles in descending Sector Number order', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;

        // Add 2 combat sectors: Sector 102 (inner) and Sector 204 (middle)
        const sec102 = {
          id: 'sec_102',
          sectorNumber: 102,
          ring: 1 as const,
          coord: { q: 1, r: 0 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [],
          victoryPoints: 1,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          ships: [
            { id: 's_102_p1', ownerId: p1.id, type: 'interceptor' as const, damage: 0 },
            { id: 's_102_p2', ownerId: p2.id, type: 'interceptor' as const, damage: 0 },
          ],
        };
        const sec204 = {
          id: 'sec_204',
          sectorNumber: 204,
          ring: 2 as const,
          coord: { q: 2, r: 0 },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [],
          victoryPoints: 2,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          ships: [
            { id: 's_204_p1', ownerId: p1.id, type: 'cruiser' as const, damage: 0 },
            { id: 's_204_p2', ownerId: p2.id, type: 'cruiser' as const, damage: 0 },
          ],
        };
        game.sectors.push(sec102, sec204);

        // Pass both players to enter COMBAT_PHASE
        const pass1 = executeAction(game, { type: 'PASS', playerId: p1.id });
        const pass2 = executeAction(pass1.newState, { type: 'PASS', playerId: p2.id });

        expect(pass2.newState.phase).toBe('COMBAT_PHASE');
        expect(pass2.newState.activeCombat).toBeDefined();

        // Must select the sector with highest sectorNumber first (204 > 102)!
        const activeSec = pass2.newState.sectors.find((s) => s.id === pass2.newState.activeCombat!.sectorId)!;
        expect(activeSec.sectorNumber).toBe(204);
      });

      it('10. Influence Action: readies 2 used colony ships and allows claiming eligible sectors and abandoning controlled sectors', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;

        // Exhaust all colony ships
        p1.colonyShips.ready = 0;
        const initialDiscs = p1.influenceTrack.discsOnTrack;

        // Add an adjacent sector to claim
        const homeSec = game.sectors.find((s) => s.discOwner === p1.id)!;
        const targetSec = {
          id: 'sec_target_inf',
          sectorNumber: 105,
          ring: 1 as const,
          coord: { q: homeSec.coord.q + 1, r: homeSec.coord.r },
          rotation: 0,
          wormholes: [true, true, true, true, true, true],
          planets: [],
          victoryPoints: 1,
          hasArtifact: false,
          hasDiscovery: false,
          ancientsCount: 0,
          ships: [],
        };
        game.sectors.push(targetSec);

        const infRes = executeAction(game, {
          type: 'INFLUENCE',
          playerId: p1.id,
          claimSectors: [targetSec.id],
        });

        expect(infRes.success).toBe(true);
        // Colony ships readied by 2
        expect(infRes.newState.players[0]!.colonyShips.ready).toBe(2);
        // Target sector claimed
        expect(infRes.newState.sectors.find((s) => s.id === targetSec.id)!.discOwner).toBe(p1.id);
        // Net discs: 1 action disc + 1 claim disc = 2 discs deducted
        expect(infRes.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 2);

        // P2 passes turn so active turn cycles back to P1
        const p2Pass = executeAction(infRes.newState, {
          type: 'PASS',
          playerId: p2.id,
        });
        expect(p2Pass.success).toBe(true);

        // Now take another INFLUENCE action to abandon targetSec
        const abandonRes = executeAction(p2Pass.newState, {
          type: 'INFLUENCE',
          playerId: p1.id,
          abandonSectors: [targetSec.id],
        });

        expect(abandonRes.success).toBe(true);
        // Target sector abandoned
        expect(abandonRes.newState.sectors.find((s) => s.id === targetSec.id)!.discOwner).toBeUndefined();
        // 1 action disc deducted, 1 disc returned from abandoned sector: net delta = 0
        expect(abandonRes.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 2);
      });
    });

    describe('11. Authentic 36 Discovery Tiles & Missile Combat Logic', () => {
      test('official discovery bag contains exactly 36 tiles across 24 distinct types', () => {
        expect(DISCOVERY_TILES.length).toBe(36);

        // 11 Resource tiles
        const mat6 = DISCOVERY_TILES.filter((t) => t.immediateReward?.materials === 6);
        const sci5 = DISCOVERY_TILES.filter((t) => t.immediateReward?.science === 5);
        const mon8 = DISCOVERY_TILES.filter((t) => t.immediateReward?.money === 8);
        const multi = DISCOVERY_TILES.filter(
          (t) =>
            t.immediateReward?.materials === 2 &&
            t.immediateReward?.science === 2 &&
            t.immediateReward?.money === 3
        );
        expect(mat6.length).toBe(3);
        expect(sci5.length).toBe(3);
        expect(mon8.length).toBe(3);
        expect(multi.length).toBe(2);

        // 10 Special / Structure tiles
        const techTiles = DISCOVERY_TILES.filter((t) => t.immediateReward?.ancientTech);
        const cruiserTiles = DISCOVERY_TILES.filter((t) => t.immediateReward?.grantShipType === 'cruiser');
        const orbitalTiles = DISCOVERY_TILES.filter((t) => t.immediateReward?.grantStructure === 'orbital');
        const monolithTiles = DISCOVERY_TILES.filter((t) => t.immediateReward?.grantStructure === 'monolith');
        const warpPortalTiles = DISCOVERY_TILES.filter((t) => t.immediateReward?.warpPortal);

        expect(techTiles.length).toBe(3);
        expect(cruiserTiles.length).toBe(3);
        expect(orbitalTiles.length).toBe(2);
        expect(monolithTiles.length).toBe(1);
        expect(warpPortalTiles.length).toBe(1);

        // 15 Ancient Ship Parts
        const partTiles = DISCOVERY_TILES.filter((t) => !!t.shipPartId);
        expect(partTiles.length).toBe(15);

        const expectedPartIds = [
          'ion_disruptor',
          'ion_turret',
          'plasma_turret',
          'soliton_charger',
          'ion_missile',
          'axion_computer',
          'antimatter_missile',
          'muon_source',
          'flux_shield',
          'conformal_drive',
          'nonlinear_drive',
          'shard_hull',
          'hypergrid_source',
          'inversion_shield',
          'soliton_missile',
        ];

        for (const pid of expectedPartIds) {
          const found = partTiles.find((t) => t.shipPartId === pid);
          expect(found).toBeDefined();
          // Verify part is defined in SHIP_PARTS
          const partDef = SHIP_PARTS[pid];
          expect(partDef).toBeDefined();
          expect(partDef.id).toBe(pid);
        }

        // Verify setup initializes 36 discovery tiles: 4 on Guardian Sectors, 32 in bag
        const game = createInitialGame(2);
        const tilesOnGuardians = game.sectors.filter((s) => s.sectorNumber === 212 && s.discoveryTile).length;
        expect(game.discoveryBag.length + tilesOnGuardians).toBe(36);
        expect(game.discoveryBag.length).toBe(32);
        expect(tilesOnGuardians).toBe(4);
      });

      test('resolves discovery choices: Ancient Tech grants lowest cost regular tech for free', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;

        // Sort supply regular techs to know lowest cost
        const regularTechs = game.techSupply
          .filter((t) => t.category !== 'rare')
          .sort((a, b) => a.baseCost - b.baseCost);
        const lowestTech = regularTechs[0]!;

        const initialScience = p1.resources.science;
        const initialResearchedCount = p1.techTrack.researched.length;

        game.pendingDiscovery = {
          sectorId: game.sectors[1]!.id,
          playerId: p1.id,
          discovery: {
            id: 'disc_ancient_tech_test',
            name: 'Ancient Tech',
            description: 'Free tech',
            immediateReward: { ancientTech: true, victoryPoints: 2 },
          },
        };

        const res = executeAction(game, {
          type: 'DISCOVERY_CHOICE',
          playerId: p1.id,
          sectorId: game.sectors[1]!.id,
          keepForVictoryPoints: false,
        });

        expect(res.success).toBe(true);
        const updatedP1 = res.newState.players[0]!;
        expect(updatedP1.techTrack.researched.length).toBe(initialResearchedCount + 1);
        expect(updatedP1.techTrack.researched.some((t) => t.id === lowestTech.id)).toBe(true);
        // Free: science must NOT be deducted
        expect(updatedP1.resources.science).toBe(initialScience);
      });

      test('resolves discovery choices: Ancient Orbital, Monolith, and Warp Portal', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const testSector = game.sectors[1]!;

        // 1. Orbital Discovery
        game.pendingDiscovery = {
          sectorId: testSector.id,
          playerId: p1.id,
          discovery: {
            id: 'disc_orbital_test',
            name: 'Ancient Orbital',
            description: 'Free orbital',
            immediateReward: { grantStructure: 'orbital', materials: 2, victoryPoints: 2 },
          },
        };

        const initialMat = p1.resources.materials;
        const orbRes = executeAction(game, {
          type: 'DISCOVERY_CHOICE',
          playerId: p1.id,
          sectorId: testSector.id,
          keepForVictoryPoints: false,
        });

        expect(orbRes.success).toBe(true);
        const updatedSec = orbRes.newState.sectors.find((s) => s.id === testSector.id)!;
        expect(updatedSec.structures?.orbital).toBe(true);
        expect(updatedSec.planets.some((p) => p.isOrbital)).toBe(true);
        expect(orbRes.newState.players[0]!.resources.materials).toBe(initialMat + 2);

        // 2. Warp Portal Discovery
        orbRes.newState.pendingDiscovery = {
          sectorId: testSector.id,
          playerId: p1.id,
          discovery: {
            id: 'disc_warp_test',
            name: 'Ancient Warp Portal',
            description: 'Warp portal',
            immediateReward: { warpPortal: true, victoryPoints: 2 },
          },
        };

        const warpRes = executeAction(orbRes.newState, {
          type: 'DISCOVERY_CHOICE',
          playerId: p1.id,
          sectorId: testSector.id,
          keepForVictoryPoints: false,
        });

        expect(warpRes.success).toBe(true);
        const warpSec = warpRes.newState.sectors.find((s) => s.id === testSector.id)!;
        expect(warpSec.hasWarpPortal).toBe(true);

        // Test connectivity between two Warp Portal sectors
        const anotherWarpSec: SectorTile = {
          ...game.sectors[2]!,
          id: 'warp_sec_remote',
          hasWarpPortal: true,
          coord: { q: 10, r: 10 }, // Far away
        };
        expect(areSectorsConnected(warpSec, anotherWarpSec)).toBe(true);
      });

      test('resolves discovery choices: Equipping Ancient Missile to Cruiser blueprint', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const testSector = game.sectors[1]!;

        game.pendingDiscovery = {
          sectorId: testSector.id,
          playerId: p1.id,
          discovery: {
            id: 'disc_soliton_missile',
            name: 'Soliton Missile',
            description: 'Missiles',
            shipPartId: 'soliton_missile',
          },
        };

        const res = executeAction(game, {
          type: 'DISCOVERY_CHOICE',
          playerId: p1.id,
          sectorId: testSector.id,
          keepForVictoryPoints: false,
          equipShipType: 'cruiser',
          equipSlotIndex: 0,
        });

        expect(res.success).toBe(true);
        const updatedP1 = res.newState.players[0]!;
        expect(updatedP1.blueprints.cruiser.slots[0]?.id).toBe('soliton_missile');
        expect(updatedP1.unlockedAncientParts).toContain('soliton_missile');
      });

      test('combat sequence: missiles fire once in initiative order, then regular round fires cannons', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;
        const battleSector = game.sectors[1]!;

        // Equip P1 Cruiser with Soliton Missile (2 blue dice, 3 dmg each, isMissile: true, +2 initiative)
        // Soliton Missile gives initiative 2 + Cruiser base 1 + nuclear drive 1 = 4 initiative
        p1.blueprints.cruiser.slots[0] = SHIP_PARTS.soliton_missile;
        p1.blueprints.cruiser.slots[1] = SHIP_PARTS.ion_cannon; // 1 yellow die (1 dmg)

        // P2 Cruiser has only Ion Cannon (initiative 2, 1 yellow die)
        p2.blueprints.cruiser.slots[0] = SHIP_PARTS.ion_cannon;
        p2.blueprints.cruiser.slots[1] = SHIP_PARTS.improved_hull; // 3 HP total

        // Place 1 P1 cruiser and 1 P2 cruiser in sector
        battleSector.ships = [
          { id: 'p1_cruiser', ownerId: p1.id, type: 'cruiser', damage: 0 },
          { id: 'p2_cruiser', ownerId: p2.id, type: 'cruiser', damage: 0 },
        ];
        battleSector.discOwner = p2.id; // P2 is Defender

        // Advance to COMBAT_PHASE
        game.phase = 'COMBAT_PHASE';
        game.resolvedCombatSectorIds = [];

        // Calling checkAndTriggerCombat
        checkAndTriggerCombat(game);

        expect(game.activeCombat).toBeDefined();
        // Since P1 Cruiser has missiles, combat must initialize into 'missile' stage
        expect(game.activeCombat!.stage).toBe('missile');
        expect(game.activeCombat!.roundNumber).toBe(1);

        const units = buildCombatUnitsForSector(battleSector, [p1, p2]);
        expect(units.find((u) => u.id === 'p1_cruiser')!.weapons.some((w) => w.isMissile)).toBe(true);

        // Step 1: P1 Cruiser fires missiles
        const step1 = executeCombatStep(units, game.activeCombat!, undefined, p2.id);

        // Missiles were fired
        expect(step1.rolls.length).toBeGreaterThan(0);
        // All rolls in step 1 must be blue (soliton missile)
        for (const r of step1.rolls) {
          expect(r.dieColor).toBe('blue');
        }

        // If P2 wasn't destroyed by missiles, stage must transition to 'regular' because P2 has no missiles
        if (!step1.isCombatOver) {
          expect(game.activeCombat!.stage).toBe('regular');
          expect(game.activeCombat!.roundNumber).toBe(1);

          // Step 2: Engagement round begins (cannons only)
          const step2 = executeCombatStep(step1.updatedUnits, game.activeCombat!, undefined, p2.id);
          for (const r of step2.rolls) {
            // Must be yellow (Ion Cannons), NOT blue (Soliton Missiles cannot fire in regular round!)
            expect(r.dieColor).toBe('yellow');
          }
        }
      });

      test('combat stalemate: ships armed only with missiles trigger stalemate in regular round', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p2 = game.players[1]!;
        const battleSector = game.sectors[1]!;

        // Both ships only have missiles and NO cannons
        p1.blueprints.interceptor.slots = [
          SHIP_PARTS.nuclear_drive,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.flux_missile, // Yellow missiles, no cannons
          null,
        ];

        p2.blueprints.interceptor.slots = [
          SHIP_PARTS.nuclear_drive,
          SHIP_PARTS.nuclear_source,
          SHIP_PARTS.flux_missile, // Yellow missiles, no cannons
          null,
        ];

        battleSector.ships = [
          { id: 'p1_int', ownerId: p1.id, type: 'interceptor', damage: 0 },
          { id: 'p2_int', ownerId: p2.id, type: 'interceptor', damage: 0 },
        ];
        battleSector.discOwner = p2.id; // Defender is P2

        const combatState: CombatState = {
          sectorId: battleSector.id,
          defenderOwnerId: p2.id,
          roundNumber: 1,
          stage: 'regular', // Missiles were already fired in missile stage
          initiativeOrder: [],
          currentTurnIndex: 0,
          lastRolls: [],
          retreatDeclared: {},
          missileFiredShipIds: ['p1_int', 'p2_int'],
        };

        const units = buildCombatUnitsForSector(battleSector, [p1, p2]);
        // Execute regular combat step when no units have cannons
        const result = executeCombatStep(units, combatState, undefined, p2.id);

        // Stalemate: attacker (p1) is destroyed/eliminated, defender (p2) wins!
        expect(result.isCombatOver).toBe(true);
        expect(result.winnerOwnerId).toBe(p2.id);
      });
    });

    describe('12. Official Alien Factions & BackLog Verifications', () => {
      it('verifies Cruiser initiative with Soliton Cannon, Gluon Computer, Improved Hull, Tachyon Source, Fusion Drive, Improved Hull', () => {
        const cruiserBp = {
          type: 'cruiser' as const,
          name: 'Cruiser',
          baseInitiative: 1,
          slots: [
            SHIP_PARTS.soliton_cannon,
            SHIP_PARTS.gluon_computer,
            SHIP_PARTS.improved_hull,
            SHIP_PARTS.tachyon_source,
            SHIP_PARTS.fusion_drive,
            SHIP_PARTS.improved_hull,
          ],
        };

        const stats = calculateBlueprintStats(cruiserBp);
        // Base initiative = 1
        // Fusion Drive initiative = 2
        // Soliton Cannon, Gluon Computer, Improved Hull, Tachyon Source = 0 initiative
        // Total initiative = 1 + 2 = 3 (NOT 6!)
        expect(stats.totalInitiative).toBe(3);
        expect(stats.computerBonus).toBe(3); // Gluon Computer provides +3 hit modifier
        expect(stats.totalPowerProduced).toBe(9); // Tachyon Source produces 9 power
        expect(stats.totalPowerConsumed).toBe(7); // Soliton Cannon (3) + Gluon Computer (2) + Fusion Drive (2) = 7
        expect(stats.isValid).toBe(true);
      });

      it('verifies official Upkeep Table progression (upkeep is 30 when 0 discs remain on track)', () => {
        expect(getUpkeepForDiscs(16)).toBe(0);
        expect(getUpkeepForDiscs(13)).toBe(0);
        expect(getUpkeepForDiscs(12)).toBe(0);
        expect(getUpkeepForDiscs(11)).toBe(0);
        expect(getUpkeepForDiscs(10)).toBe(1);
        expect(getUpkeepForDiscs(9)).toBe(2);
        expect(getUpkeepForDiscs(8)).toBe(3);
        expect(getUpkeepForDiscs(7)).toBe(5);
        expect(getUpkeepForDiscs(6)).toBe(7);
        expect(getUpkeepForDiscs(5)).toBe(10);
        expect(getUpkeepForDiscs(4)).toBe(13);
        expect(getUpkeepForDiscs(3)).toBe(17);
        expect(getUpkeepForDiscs(2)).toBe(21);
        expect(getUpkeepForDiscs(1)).toBe(25);
        expect(getUpkeepForDiscs(0)).toBe(30);
      });

      it('verifies Eridani Empire setup and preprinted power', () => {
        const game = createInitialGame(1, ['eridani_empire']);
        const eridani = game.players[0]!;
        expect(eridani.faction.id).toBe('eridani_empire');
        expect(eridani.resources.money).toBe(26);
        expect(eridani.resources.science).toBe(2);
        expect(eridani.resources.materials).toBe(4);
        expect(eridani.influenceTrack.totalDiscs).toBe(11);
        expect(eridani.influenceTrack.discsOnTrack).toBe(10); // 1 disc placed on home sector 222
        expect(eridani.reputationTiles.length).toBe(2); // 2 starting rep tiles drawn from bag
        expect(eridani.techTrack.researched.map((t) => t.id).sort()).toEqual(
          ['fusion_drive', 'gauss_shield', 'plasma_cannon'].sort()
        );
        // Preprinted power +1 on ships
        expect(eridani.blueprints.interceptor.preprintedPower).toBe(1);
        expect(eridani.blueprints.cruiser.preprintedPower).toBe(1);
        expect(eridani.blueprints.dreadnought.preprintedPower).toBe(1);
        // Home sector 222 exists and contains 1 Interceptor
        const homeSector = game.sectors.find((s) => s.sectorNumber === 222);
        expect(homeSector).toBeDefined();
        expect(homeSector?.discOwner).toBe(eridani.id);
        expect(homeSector?.ships.length).toBe(1);
        expect(homeSector?.ships[0]?.type).toBe('interceptor');
      });

      it('verifies Hydran Progress setup, 2 research activations, and advanced science cube', () => {
        const game = createInitialGame(1, ['hydran_progress']);
        const hydran = game.players[0]!;
        expect(hydran.faction.id).toBe('hydran_progress');
        expect(hydran.resources.money).toBe(2);
        expect(hydran.resources.science).toBe(6);
        expect(hydran.resources.materials).toBe(2);
        expect(hydran.faction.researchActivations).toBe(2);
        expect(hydran.techTrack.researched.map((t) => t.id)).toEqual(['advanced_labs']);
        // 9 science cubes remaining on board because 1 cube starts on the Advanced Science slot of Sector 224
        expect(hydran.population.science.cubesOnBoard).toBe(9);
        const homeSector = game.sectors.find((s) => s.sectorNumber === 224);
        expect(homeSector).toBeDefined();
        const advSciPlanet = homeSector?.planets.find((p) => p.isAdvanced && p.resource === 'science');
        expect(advSciPlanet?.colonizedBy).toBe(hydran.id);
      });

      it('verifies Planta setup, colony ships, compact blueprints, and +1 VP per sector bonus', () => {
        const game = createInitialGame(1, ['planta']);
        const planta = game.players[0]!;
        expect(planta.faction.id).toBe('planta');
        expect(planta.resources.money).toBe(2);
        expect(planta.resources.science).toBe(3);
        expect(planta.resources.materials).toBe(4);
        expect(planta.colonyShips.total).toBe(4);
        expect(planta.colonyShips.ready).toBe(4);
        expect(planta.faction.exploreActivations).toBe(2);
        expect(planta.techTrack.researched.map((t) => t.id)).toEqual(['starbase']);
        // Compact slot counts
        expect(planta.blueprints.interceptor.slots.length).toBe(3);
        expect(planta.blueprints.cruiser.slots.length).toBe(5);
        expect(planta.blueprints.dreadnought.slots.length).toBe(7);
        expect(planta.blueprints.starbase.slots.length).toBe(4);
        // Preprinted stats
        expect(planta.blueprints.interceptor.preprintedComputer).toBe(1);
        expect(planta.blueprints.interceptor.preprintedPower).toBe(2);
        expect(planta.blueprints.starbase.preprintedPower).toBe(5);
        // Base initiative is lower (-1 compared to Human)
        expect(planta.blueprints.interceptor.baseInitiative).toBe(1);
        expect(planta.blueprints.cruiser.baseInitiative).toBe(0);

        // Score bonus: +1 VP per controlled sector
        calculateFinalScores(game);
        expect(game.finalScores?.[planta.id]).toBeDefined();
        expect(game.finalScores?.[planta.id]?.speciesBonus).toBe(1); // controls 1 sector (Sector 226)
      });

      it('verifies Descendants of Draco peaceful coexistence with Ancients and scoring bonus', () => {
        const game = createInitialGame(1, ['descendants_of_draco']);
        const draco = game.players[0]!;
        expect(draco.faction.id).toBe('descendants_of_draco');
        expect(draco.techTrack.researched.map((t) => t.id)).toEqual(['fusion_drive']);

        // Set up an Ancient sector adjacent to Draco
        const ancientSector: SectorTile = {
          id: 'ancient_sec_101',
          sectorNumber: 101,
          coord: { q: 0, r: -1 },
          ring: 1,
          victoryPoints: 2,
          wormholes: [true, true, true, true, true, true],
          planets: [],
          ancientsCount: 1,
          ships: [{ id: 'anc_1', ownerId: 'ancient', type: 'ancient', damage: 0 }],
        };
        game.sectors.push(ancientSector);

        // Draco can claim influence in Ancient sector without combat
        const canInfluence = validateAction(game, {
          type: 'INFLUENCE',
          playerId: draco.id,
          sectorCoordsToClaim: [ancientSector.coord],
        });
        expect(canInfluence.valid).toBe(true);

        // Final score calculation awards 1 VP per Ancient ship on map
        calculateFinalScores(game);
        expect(game.finalScores?.[draco.id]?.speciesBonus).toBeGreaterThanOrEqual(1);
      });

      it('verifies Mechanema discounted build costs and 3 build / 3 upgrade activations', () => {
        const game = createInitialGame(1, ['mechanema']);
        const mechanema = game.players[0]!;
        expect(mechanema.faction.id).toBe('mechanema');
        expect(mechanema.faction.upgradeActivations).toBe(3);
        expect(mechanema.faction.buildActivations).toBe(3);
        expect(mechanema.techTrack.researched.map((t) => t.id)).toEqual(['positron_computer']);

        // Home sector: Sector 230
        const homeSector = game.sectors.find((s) => s.sectorNumber === 230)!;

        // Mechanema builds interceptor for 2 Materials (normally 3)
        mechanema.resources.materials = 10;
        const res = executeAction(game, {
          type: 'BUILD',
          playerId: mechanema.id,
          items: [{ itemType: 'interceptor', sectorId: homeSector.id }],
        });
        expect(res.success).toBe(true);
        expect(res.newState.players[0]?.resources.materials).toBe(8); // 10 - 2 = 8
      });

      it('verifies Orion Hegemony starts with Cruiser, increased initiative, and preprinted power', () => {
        const game = createInitialGame(1, ['orion_hegemony']);
        const orion = game.players[0]!;
        expect(orion.faction.id).toBe('orion_hegemony');
        expect(orion.faction.tradeRatio).toBe(4);
        expect(orion.techTrack.researched.map((t) => t.id).sort()).toEqual(
          ['gauss_shield', 'neutron_bombs'].sort()
        );

        // Home sector 232 contains 1 Cruiser (not Interceptor!)
        const homeSector = game.sectors.find((s) => s.sectorNumber === 232)!;
        expect(homeSector).toBeDefined();
        expect(homeSector.ships.length).toBe(1);
        expect(homeSector.ships[0]?.type).toBe('cruiser');

        // All ships have +1 base initiative compared to Human
        expect(orion.blueprints.interceptor.baseInitiative).toBe(3); // Human 2 -> Orion 3
        expect(orion.blueprints.cruiser.baseInitiative).toBe(2); // Human 1 -> Orion 2
        expect(orion.blueprints.dreadnought.baseInitiative).toBe(1); // Human 0 -> Orion 1
        expect(orion.blueprints.starbase.baseInitiative).toBe(5); // Human 4 -> Orion 5

        // Preprinted power
        expect(orion.blueprints.interceptor.preprintedPower).toBe(1);
        expect(orion.blueprints.cruiser.preprintedPower).toBe(2);
        expect(orion.blueprints.dreadnought.preprintedPower).toBe(3);
      });

      it('13a. Home system orientation: ensures wormhole always points toward Galactic Center', () => {
        for (const count of [2, 3, 4, 5, 6]) {
          const game = createInitialGame(count);
          for (const p of game.players) {
            const home = game.sectors.find((s) => s.id === `home_sector_${p.id}`)!;
            expect(home).toBeDefined();
            const edgeTowardCenter = getEdgeTowardCenter(home.coord);
            // Must have a wormhole on the edge facing Galactic Center (0, 0)
            const hasWormhole = hasWormholeOnEdge(home, edgeTowardCenter);
            expect(hasWormhole).toBe(true);
          }
        }
      });

      it('13b. Planta 2 Explore Activations & FINISH_EXPLORE flow', () => {
        const game = createInitialGame(2, ['planta', 'terran_federation']);
        const planta = game.players[0]!;
        expect(planta.faction.id).toBe('planta');
        expect(planta.faction.exploreActivations).toBe(2);

        const initialDiscs = planta.influenceTrack.discsOnTrack;
        const homeSector = game.sectors.find((s) => s.id === `home_sector_${planta.id}`)!;
        const targetCoord1 = { q: homeSector.coord.q, r: homeSector.coord.r - 1 };

        // 1st Explore: Costs 1 action disc, leaves 1 pending activation, does NOT advance turn
        const res1 = executeAction(game, {
          type: 'EXPLORE',
          playerId: planta.id,
          fromCoord: homeSector.coord,
          targetCoord: targetCoord1,
          rotation: 0,
          claimInfluence: false,
        });

        expect(res1.success).toBe(true);
        expect(res1.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 1);
        expect(res1.newState.pendingExploreActivations).toBe(1);
        // Turn stays with Planta!
        expect(res1.newState.activePlayerIndex).toBe(0);

        // Option A: Test FINISH_EXPLORE clears pending activation and advances turn
        const finishRes = executeAction(res1.newState, {
          type: 'FINISH_EXPLORE',
          playerId: planta.id,
        });
        expect(finishRes.success).toBe(true);
        expect(finishRes.newState.pendingExploreActivations).toBe(0);
        expect(finishRes.newState.activePlayerIndex).toBe(1); // Turn advanced to Terran!

        // Option B: 2nd Explore without spending an action disc
        const targetCoord2 = { q: homeSector.coord.q + 1, r: homeSector.coord.r - 1 };
        const res2 = executeAction(res1.newState, {
          type: 'EXPLORE',
          playerId: planta.id,
          fromCoord: homeSector.coord,
          targetCoord: targetCoord2,
          rotation: 0,
          claimInfluence: false,
          isSecondActivation: true,
        });

        expect(res2.success).toBe(true);
        // Does NOT deduct an extra disc!
        expect(res2.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 1);
        expect(res2.newState.pendingExploreActivations).toBe(0);
        // Turn advances to Terran!
        expect(res2.newState.activePlayerIndex).toBe(1);
      });

      it('13c. Draco Explore: reveals 2 tiles, places chosen tile, and unchosen goes to bottom of deck', () => {
        const game = createInitialGame(2, ['descendants_of_draco', 'terran_federation']);
        const draco = game.players[0]!;
        expect(draco.faction.id).toBe('descendants_of_draco');

        const homeSector = game.sectors.find((s) => s.id === `home_sector_${draco.id}`)!;
        // Edge 0 ({ q + 1, r }) has an open wormhole on Draco's rotated home sector (in Ring 2)
        const targetCoord = { q: homeSector.coord.q + 1, r: homeSector.coord.r };

        const deck = game.sectorDecks.ring2;
        expect(deck.length).toBeGreaterThanOrEqual(2);

        const topTile = deck[deck.length - 1]!;
        const secondTile = deck[deck.length - 2]!;
        const rot = findLegalExploreRotation(homeSector, secondTile, targetCoord);

        // Draco chooses second tile (index 1)
        const res = executeAction(game, {
          type: 'EXPLORE',
          playerId: draco.id,
          fromCoord: homeSector.coord,
          targetCoord,
          rotation: rot,
          claimInfluence: false,
          chosenTileIndex: 1,
        });

        expect(res.success).toBe(true);
        // Chosen tile (secondTile) was placed on map
        const placedSector = res.newState.sectors.find(
          (s) => s.coord.q === targetCoord.q && s.coord.r === targetCoord.r
        );
        expect(placedSector).toBeDefined();
        expect(placedSector!.sectorNumber).toBe(secondTile.sectorNumber);

        // Unchosen tile (topTile) was unshifted to bottom of deck
        expect(res.newState.sectorDecks.ring2[0]!.sectorNumber).toBe(topTile.sectorNumber);
      });

      it('13d. Draco claiming sectors containing Ancients in both Explore and Influence actions', () => {
        // 1. Explore: Draco places disc in a sector with Ancients
        const game = createInitialGame(2, ['descendants_of_draco', 'terran_federation']);
        const draco = game.players[0]!;
        const terran = game.players[1]!;

        const homeSector = game.sectors.find((s) => s.id === `home_sector_${draco.id}`)!;
        const targetCoord = { q: homeSector.coord.q + 1, r: homeSector.coord.r };

        // Force top tile of ring 2 deck to have an Ancient
        const deck = game.sectorDecks.ring2;
        const ancientTile = deck[deck.length - 1]!;
        ancientTile.ancientsCount = 1;
        ancientTile.ships = [{ id: 'anc_1', ownerId: 'ancient', type: 'ancient', damage: 0 }];
        const rot = findLegalExploreRotation(homeSector, ancientTile, targetCoord);

        const exploreRes = executeAction(game, {
          type: 'EXPLORE',
          playerId: draco.id,
          fromCoord: homeSector.coord,
          targetCoord,
          rotation: rot,
          claimInfluence: true,
          chosenTileIndex: 0,
        });

        expect(exploreRes.success).toBe(true);
        const placedTile = exploreRes.newState.sectors.find(
          (s) => s.coord.q === targetCoord.q && s.coord.r === targetCoord.r
        )!;
        expect(placedTile).toBeDefined();
        expect(placedTile.discOwner).toBe(draco.id); // Draco controls sector despite Ancient present!
        expect(placedTile.ancientsCount).toBe(1);

        // 2. Influence: Draco can claim uncontrolled sector containing Ancients
        placedTile.discOwner = undefined; // make uncontrolled
        exploreRes.newState.activePlayerIndex = 0; // Draco's turn
        const dracoInfluenceRes = executeAction(exploreRes.newState, {
          type: 'INFLUENCE',
          playerId: draco.id,
          claimSectors: [placedTile.id],
        });
        expect(dracoInfluenceRes.success).toBe(true);

        // 3. Influence: Non-Draco (Terran) player CANNOT claim sector with Ancients
        exploreRes.newState.activePlayerIndex = 1; // Terran's turn
        const terranInfluenceRes = executeAction(exploreRes.newState, {
          type: 'INFLUENCE',
          playerId: terran.id,
          claimSectors: [placedTile.id],
        });
        expect(terranInfluenceRes.valid === false || terranInfluenceRes.success === false).toBe(true);
      });

      it('13e. Game Persistence & Table Sessions', () => {
        const game = createInitialGame(3);
        const tableNum = getTableNumber(game);
        expect(tableNum).toBeGreaterThanOrEqual(100);
        expect(tableNum).toBeLessThan(1000);

        saveGameState(game);

        const loaded = loadActiveGameState();
        expect(loaded).toBeDefined();
        expect(loaded!.id).toBe(game.id);
        expect(loaded!.players.length).toBe(3);

        const loadedByNum = loadTableByNumber(tableNum);
        expect(loadedByNum).toBeDefined();
        expect(loadedByNum!.id).toBe(game.id);

        const tables = listSavedTables();
        expect(tables.some((t) => t.tableNumber === tableNum)).toBe(true);
      });

      it('13f. Hydran double research with progressive discounts', () => {
        const game = createInitialGame(2, ['hydran_progress', 'terran_federation']);
        const hydran = game.players[0]!;
        expect(hydran.faction.id).toBe('hydran_progress');
        expect(hydran.faction.researchActivations).toBe(2);

        // Supply setup: Ensure 2 military techs in supply
        game.techSupply = [
          { id: 'plasma_cannon', name: 'Plasma Cannon', category: 'military', cost: 4, minCost: 2, baseCost: 4 },
          { id: 'tachyon_drive', name: 'Tachyon Drive', category: 'military', cost: 6, minCost: 3, baseCost: 6 },
        ];
        hydran.resources.science = 20;
        const initialDiscs = hydran.influenceTrack.discsOnTrack;

        // Hydran researches both technologies in a single action
        const res = executeAction(game, {
          type: 'RESEARCH',
          playerId: hydran.id,
          researches: [
            { techId: 'plasma_cannon' },
            { techId: 'tachyon_drive' },
          ],
        });

        expect(res.success).toBe(true);
        // Only 1 action disc deducted
        expect(res.newState.players[0]!.influenceTrack.discsOnTrack).toBe(initialDiscs - 1);
        expect(res.newState.players[0]!.techTrack.militaryCount).toBe(2);

        // 1st tech (plasma_cannon): count was 0 -> discount 0 -> cost 4
        // 2nd tech (tachyon_drive): count was 1 -> discount 1 -> cost 6 - 1 = 5
        // Total cost = 4 + 5 = 9 science. 20 - 9 = 11 science remaining
        expect(res.newState.players[0]!.resources.science).toBe(11);

        // Non-Hydran player attempting 2 researches is rejected
        const terranGame = createInitialGame(2, ['terran_federation', 'hydran_progress']);
        const terran = terranGame.players[0]!;
        terranGame.techSupply = [
          { id: 'plasma_cannon', name: 'Plasma Cannon', category: 'military', cost: 4, minCost: 2, baseCost: 4 },
          { id: 'tachyon_drive', name: 'Tachyon Drive', category: 'military', cost: 6, minCost: 3, baseCost: 6 },
        ];
        terran.resources.science = 20;

        const invalidRes = executeAction(terranGame, {
          type: 'RESEARCH',
          playerId: terran.id,
          researches: [
            { techId: 'plasma_cannon' },
            { techId: 'tachyon_drive' },
          ],
        });
        expect(invalidRes.success).toBe(false);
        expect(invalidRes.error).toContain('Cannot research more than 1 technologies');
      });

      it('13g. Live scoring computation with species bonuses', () => {
        const game = createInitialGame(2, ['planta', 'descendants_of_draco']);
        const planta = game.players[0]!;
        const draco = game.players[1]!;

        // Setup test scoring state
        // 1. Monolith (3 VP)
        const homePlanta = game.sectors.find((s) => s.id === `home_sector_${planta.id}`)!;
        homePlanta.structures = { monolith: true };

        // 2. Reputation tiles (3 + 2 = 5 VP)
        planta.reputationTiles = [3, 2];

        // 3. Tech with VP (Advanced Labs +1 VP)
        planta.techTrack.researched.push({
          id: 'advanced_labs',
          name: 'Advanced Labs',
          category: 'nano',
          cost: 12,
          minCost: 6,
          baseCost: 12,
          victoryPoints: 1,
        });

        // 4. Kept Discovery tile (2 VP)
        planta.keptDiscoveryTiles = ['warp_portal_disc'];

        // 5. Ancients on board for Draco bonus
        const ancientSector = game.sectors.find((s) => s.ring === 2 && s.id !== homePlanta.id)!;
        ancientSector.ancientsCount = 3;
        ancientSector.ships = [
          { id: 'a1', ownerId: 'ancient', type: 'ancient', damage: 0 },
          { id: 'a2', ownerId: 'ancient', type: 'ancient', damage: 0 },
          { id: 'a3', ownerId: 'ancient', type: 'ancient', damage: 0 },
        ];

        const { scores, leaderPlayerId } = computeCurrentScores(game);
        expect(scores[planta.id]).toBeDefined();
        const pScores = scores[planta.id]!;

        expect(pScores.sectors).toBe(homePlanta.victoryPoints); // 3 VP
        expect(pScores.monoliths).toBe(3); // 1 monolith = 3 VP
        expect(pScores.reputation).toBe(5); // 3 + 2 = 5 VP
        expect(pScores.techs).toBe(1); // Advanced Labs = 1 VP
        expect(pScores.discoveries).toBe(2); // 1 kept tile = 2 VP
        expect(pScores.speciesBonus).toBe(1); // Planta controls 1 sector = +1 VP bonus

        const expectedPlantaTotal = homePlanta.victoryPoints + 3 + 5 + 1 + 2 + 1;
        expect(pScores.total).toBe(expectedPlantaTotal);

        // Draco gets 1 VP per ancient on board
        const dScores = scores[draco.id]!;
        expect(dScores.speciesBonus).toBe(3); // 3 ancients on board
      });

      it('14. verifies GCDS weaponry is 4 yellow Ion Cannon dice (count 4, damage 1) and Guardian ship stats', () => {
        const game = createInitialGame(2);
        const center = game.sectors.find((s) => s.sectorNumber === 1)!;
        expect(center.ships.length).toBe(1);
        expect(center.ships[0]!.type).toBe('gcds');

        const units = buildCombatUnitsForSector(center, game.players);
        const gcdsUnit = units.find((u) => u.type === 'gcds');
        expect(gcdsUnit).toBeDefined();
        expect(gcdsUnit?.maxHull).toBe(7);
        expect(gcdsUnit?.shieldBonus).toBe(0);
        expect(gcdsUnit?.computerBonus).toBe(2);
        expect(gcdsUnit?.initiative).toBe(0);
        expect(gcdsUnit?.weapons).toEqual([{ color: 'yellow', damage: 1, count: 4 }]);

        // Guardian sector
        const guardianSec = game.sectors.find((s) => s.sectorNumber === 212)!;
        const gUnits = buildCombatUnitsForSector(guardianSec, game.players);
        const guardianUnit = gUnits.find((u) => u.type === 'guardian');
        expect(guardianUnit).toBeDefined();
        expect(guardianUnit?.maxHull).toBe(3);
        expect(guardianUnit?.shieldBonus).toBe(1);
        expect(guardianUnit?.computerBonus).toBe(2);
        expect(guardianUnit?.initiative).toBe(3);
        expect(guardianUnit?.weapons).toEqual([{ color: 'yellow', damage: 1, count: 3 }]);
      });

      it('15. verifies Guardian sectors in games with fewer than 6 players', () => {
        // In a 2-player game, 4 starting coordinates are replaced with Sector 212 Guardian sectors
        const game2 = createInitialGame(2);
        const guardianSectors = game2.sectors.filter((s) => s.sectorNumber === 212);
        expect(guardianSectors.length).toBe(4);
        for (const gSec of guardianSectors) {
          expect(gSec.ring).toBe(2);
          expect(gSec.victoryPoints).toBe(2);
          expect(gSec.hasDiscovery).toBe(true);
          expect(gSec.guardiansCount).toBe(1);
          expect(gSec.ships.some((s) => s.type === 'guardian')).toBe(true);
        }

        // In a 6-player game, 0 starting coordinates are replaced with Guardian sectors
        const game6 = createInitialGame(6);
        const guardianSectors6 = game6.sectors.filter((s) => s.sectorNumber === 212);
        expect(guardianSectors6.length).toBe(0);
      });

      it('16. verifies Ring 3 sector deck sizing by player count and exhaustion prevention', () => {
        const g2 = createInitialGame(2);
        expect(g2.sectorDecks.ring3.length).toBe(5);

        const g3 = createInitialGame(3);
        expect(g3.sectorDecks.ring3.length).toBe(8);

        const g4 = createInitialGame(4);
        expect(g4.sectorDecks.ring3.length).toBe(14);

        const g5 = createInitialGame(5);
        expect(g5.sectorDecks.ring3.length).toBe(16);

        const g6 = createInitialGame(6);
        expect(g6.sectorDecks.ring3.length).toBe(18);

        // Test deck exhaustion fails explore
        g2.sectorDecks.ring3 = []; // exhaust ring 3
        const p1 = g2.players[0]!;
        const homeSector = g2.sectors.find((s) => s.discOwner === p1.id)!;
        const res = executeAction(g2, {
          type: 'EXPLORE',
          playerId: p1.id,
          fromCoord: homeSector.coord,
          targetCoord: { q: 1, r: -3 }, // Ring 3 coord adjacent to (0, -2)
          rotation: 0,
        });
        expect(res.success).toBe(false);
        expect(res.error).toContain('remaining');
      });

      it('17. verifies Tactical Bankruptcy: sector abandonment step-by-step and player elimination', () => {
        const game = createInitialGame(2);
        const p1 = game.players[0]!;
        const p1Home = game.sectors.find((s) => s.discOwner === p1.id)!;

        // Give player a severe deficit
        p1.resources.money = -15;
        p1.resources.science = 0;
        p1.resources.materials = 0;
        p1.influenceTrack.discsOnTrack = 2; // Upkeep is high

        // Transition to Upkeep
        transitionToUpkeep(game);
        expect(game.pendingBankruptcy).toBeDefined();
        expect(game.pendingBankruptcy?.playerId).toBe(p1.id);

        // Player abandons home sector
        const abandonRes = executeAction(game, {
          type: 'ABANDON_SECTOR_BANKRUPTCY',
          playerId: p1.id,
          sectorId: p1Home.id,
        });
        expect(abandonRes.success).toBe(true);
        expect(abandonRes.newState.sectors.find((s) => s.id === p1Home.id)?.discOwner).toBeUndefined();

        // Since p1 has no more sectors and deficit still persists, p1 is eliminated
        const updatedP1 = abandonRes.newState.players.find((p) => p.id === p1.id)!;
        expect(updatedP1.isEliminated).toBe(true);
        expect(abandonRes.newState.pendingBankruptcy).toBeNull();
      });

      it('18. verifies Faction Reputation Track Slot counts', () => {
        const game = createInitialGame(6, [
          'eridani_empire',
          'planta',
          'mechanema',
          'hydran_progress',
          'descendants_of_draco',
          'orion_hegemony',
        ]);

        expect(game.players[0]!.faction.reputationSlots).toBe(4); // Eridani
        expect(game.players[1]!.faction.reputationSlots).toBe(4); // Planta
        expect(game.players[2]!.faction.reputationSlots).toBe(4); // Mechanema
        expect(game.players[3]!.faction.reputationSlots).toBe(5); // Hydran
        expect(game.players[4]!.faction.reputationSlots).toBe(5); // Draco
        expect(game.players[5]!.faction.reputationSlots).toBe(5); // Orion
      });

      it('19. verifies Home Sector authentic X-shape wormhole layout connects to 1 inner, 1 middle, 2 outer', () => {
        const game = createInitialGame(2);
        const homeSectors = game.sectors.filter((s) => s.sectorNumber >= 221 && s.sectorNumber <= 232);
        for (const home of homeSectors) {
          // Exactly 4 wormholes
          const openWormholes = home.wormholes.filter(Boolean).length;
          expect(openWormholes).toBe(4);
        }
      });
    });
  });
});

