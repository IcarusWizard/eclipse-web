import { describe, expect, it } from 'bun:test';
import {
  areCoordsEqual,
  areSectorsConnected,
  getEdgeBetween,
  getHexDistance,
  getOppositeEdge,
  hasWormholeOnEdge,
} from '../rules/hexMath';
import { calculateBlueprintStats } from '../rules/shipValidation';
import { SHIP_PARTS } from '../rules/partData';
import { createInitialGame } from '../rules/setup';
import { executeAction, validateAction } from '../rules/gameReducer';
import { getIncomeForTrack, getUpkeepForDiscs } from '../rules/economyEngine';
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

    expect(areSectorsConnected(sectorA, sectorB)).toBe(true);

    // If sector B rotates by 1 (60 deg), wormhole moves away from Edge 3
    sectorB.rotation = 1;
    expect(areSectorsConnected(sectorA, sectorB)).toBe(false);

    // With Wormhole Generator, one side having a wormhole is sufficient
    expect(areSectorsConnected(sectorA, sectorB, true)).toBe(true);
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
    expect(getUpkeepForDiscs(14)).toBe(0);
    expect(getUpkeepForDiscs(12)).toBe(1);
    expect(getUpkeepForDiscs(10)).toBe(3);
    expect(getUpkeepForDiscs(7)).toBe(9);
    expect(getUpkeepForDiscs(3)).toBe(21);
  });
});

describe('Game Setup & Turn Engine Flow', () => {
  it('initializes a 2-player game with human factions symmetrically', () => {
    const game = createInitialGame(2);
    expect(game.players.length).toBe(2);
    expect(game.round).toBe(1);
    expect(game.phase).toBe('ACTION_PHASE');
    expect(game.sectors.length).toBe(3); // Center 001 + 2 Home Sectors
    expect(game.players[0]!.influenceTrack.discsOnTrack).toBe(13); // 1 disc placed on home
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
    // Winning player should now have a pending discovery choice and combat should be cleanly closed
    expect(combatRes.newState.activeCombat).toBeNull();
    expect(combatRes.newState.pendingDiscovery).not.toBeNull();
    expect(combatRes.newState.pendingDiscovery?.discovery.id).toBe('disc_flux_shield');
    expect(combatRes.newState.pendingDiscovery?.playerId).toBe(p1.id);
    const updatedGuarded = combatRes.newState.sectors.find((s) => s.id === guardedSector.id)!;
    expect(updatedGuarded.ancientsCount).toBe(0);
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
        { id: 'ancient_ship_1', ownerId: 'ancient', type: 'ancient' as const, damage: 1 }, // 1 dmg
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
    const resolvedSec = currentState.sectors.find((s) => s.id === battleSector.id)!;
    expect(resolvedSec.ancientsCount).toBe(0);
    // Any surviving ship should have its damage repaired to 0
    for (const ship of resolvedSec.ships) {
      expect(ship.damage).toBe(0);
    }
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
  });
});

