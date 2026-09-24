/**
 * Game State Reducer and Action Validation Engine for Eclipse: Second Dawn
 */

import { GameState, GamePhase, GameLogEntry, CombatState } from '../types/state';
import { GameAction, BuildAction, UpgradeAction, MoveAction, ResearchAction } from '../types/actions';
import { areCoordsEqual, areSectorsConnected, getEdgeBetween, getRingFromCoord, hasWormholeOnEdge } from './hexMath';
import { calculateTechCost, drawTechTilesForRound } from './techData';
import { calculateBlueprintStats, SHIP_LIMITS, countPlayerShips } from './shipValidation';
import { SHIP_PARTS, ANCIENT_PART_IDS } from './partData';
import { applyUpkeepPhase, abandonSectorForUpkeep, getIncomeForTrack, getUpkeepForDiscs } from './economyEngine';
import { buildCombatUnitsForSector, executeCombatStep, getSectorDefenderOwnerId, rollD6, sortUnitsByInitiative } from './combatEngine';
import { SectorTile, ShipType, PlanetSlot, SectorShip } from '../types/galaxy';
import { PlayerState } from '../types/player';

export interface ActionResult {
  success: boolean;
  newState: GameState;
  error?: string;
}

export function canColonizePlanetSlot(
  player: PlayerState,
  planet: PlanetSlot
): { canColonize: boolean; reason?: string } {
  if (planet.colonizedBy) {
    return { canColonize: false, reason: 'Planet is already colonized.' };
  }
  const hasMeta = player.techTrack.researched.some((t) => t.id === 'metasynthesis');
  const hasAdvEco = hasMeta || player.techTrack.researched.some((t) => t.id === 'advanced_economy');
  const hasAdvSci = hasMeta || player.techTrack.researched.some((t) => t.id === 'advanced_labs');
  const hasAdvMat = hasMeta || player.techTrack.researched.some((t) => t.id === 'advanced_mining');

  if (planet.isOrbital) {
    const canMoney = player.population.money.cubesOnBoard > 0;
    const canSci = player.population.science.cubesOnBoard > 0;
    if (!canMoney && !canSci) {
      return { canColonize: false, reason: 'No Money or Science cubes left on player board.' };
    }
    return { canColonize: true };
  }

  if (planet.resource === 'any') {
    if (planet.isAdvanced) {
      const canMoney = hasAdvEco && player.population.money.cubesOnBoard > 0;
      const canSci = hasAdvSci && player.population.science.cubesOnBoard > 0;
      const canMat = hasAdvMat && player.population.material.cubesOnBoard > 0;
      if (!canMoney && !canSci && !canMat) {
        return {
          canColonize: false,
          reason: 'Requires Advanced tech (Economy, Labs, or Mining) or Metasynthesis and available cubes.',
        };
      }
      return { canColonize: true };
    } else {
      const canMoney = player.population.money.cubesOnBoard > 0;
      const canSci = player.population.science.cubesOnBoard > 0;
      const canMat = player.population.material.cubesOnBoard > 0;
      if (!canMoney && !canSci && !canMat) {
        return { canColonize: false, reason: 'No population cubes remaining on player board.' };
      }
      return { canColonize: true };
    }
  }

  if (planet.isAdvanced) {
    if (planet.resource === 'money' && !hasAdvEco) {
      return { canColonize: false, reason: 'Requires Advanced Economy or Metasynthesis' };
    }
    if (planet.resource === 'material' && !hasAdvMat) {
      return { canColonize: false, reason: 'Requires Advanced Mining or Metasynthesis' };
    }
    if (planet.resource === 'science' && !hasAdvSci) {
      return { canColonize: false, reason: 'Requires Advanced Labs or Metasynthesis' };
    }
  }

  const resType = planet.resource as 'money' | 'science' | 'material';
  if (player.population[resType].cubesOnBoard <= 0) {
    return { canColonize: false, reason: `No ${resType} cubes left on player board.` };
  }

  return { canColonize: true };
}

export function canExchangeAmbassadors(
  state: { phase?: string; traitorPlayerId?: string | null; players: PlayerState[]; sectors: SectorTile[] },
  p1Id: string,
  p2Id: string
): { canExchange: boolean; reason?: string } {
  if (state.phase && state.phase !== 'ACTION_PHASE') {
    return { canExchange: false, reason: 'Diplomacy is only available in Action Phase.' };
  }
  const p1 = state.players.find((p) => p.id === p1Id);
  const p2 = state.players.find((p) => p.id === p2Id);
  if (!p1 || !p2) {
    return { canExchange: false, reason: 'Player not found.' };
  }
  if (p1.id === p2.id) {
    return { canExchange: false, reason: 'Cannot exchange ambassadors with yourself.' };
  }
  if (p1.ambassadorTiles?.includes(p2.id)) {
    return { canExchange: false, reason: 'Already allied (+1 VP).' };
  }
  if (state.traitorPlayerId === p1.id) {
    return { canExchange: false, reason: `${p1.name} holds the Traitor Tile (-2 VP).` };
  }
  if (state.traitorPlayerId === p2.id) {
    return { canExchange: false, reason: `${p2.name} holds the Traitor Tile.` };
  }

  const p1AmbSlots = p1.faction.ambassadorSlots ?? 3;
  const p1RepSlots = p1.faction.reputationSlots ?? 5;
  if (p1AmbSlots <= 0) {
    return { canExchange: false, reason: `${p1.name} cannot exchange ambassadors (${p1.faction.name} has 0 ambassador slots).` };
  }
  if ((p1.ambassadorTiles?.length || 0) >= p1AmbSlots) {
    return { canExchange: false, reason: `${p1.name} has no available ambassador slots.` };
  }
  if ((p1.ambassadorTiles?.length || 0) + p1.reputationTiles.length >= p1RepSlots) {
    return { canExchange: false, reason: `${p1.name}'s reputation track is full.` };
  }

  const p2AmbSlots = p2.faction.ambassadorSlots ?? 3;
  const p2RepSlots = p2.faction.reputationSlots ?? 5;
  if (p2AmbSlots <= 0) {
    return { canExchange: false, reason: `${p2.name} cannot exchange ambassadors (${p2.faction.name} has 0 ambassador slots).` };
  }
  if ((p2.ambassadorTiles?.length || 0) >= p2AmbSlots) {
    return { canExchange: false, reason: `${p2.name} has no available ambassador slots.` };
  }
  if ((p2.ambassadorTiles?.length || 0) + p2.reputationTiles.length >= p2RepSlots) {
    return { canExchange: false, reason: `${p2.name}'s reputation track is full.` };
  }

  const p1HasCube =
    p1.population.money.cubesOnBoard > 0 ||
    p1.population.science.cubesOnBoard > 0 ||
    p1.population.material.cubesOnBoard > 0;
  if (!p1HasCube) {
    return { canExchange: false, reason: `${p1.name} has no population cubes available on their tracks.` };
  }

  const p2HasCube =
    p2.population.money.cubesOnBoard > 0 ||
    p2.population.science.cubesOnBoard > 0 ||
    p2.population.material.cubesOnBoard > 0;
  if (!p2HasCube) {
    return { canExchange: false, reason: `${p2.name} has no population cubes available on their tracks.` };
  }

  const p1Sectors = state.sectors.filter((s) => s.discOwner === p1.id || s.ships.some((shp) => shp.ownerId === p1.id));
  const p2Sectors = state.sectors.filter((s) => s.discOwner === p2.id || s.ships.some((shp) => shp.ownerId === p2.id));
  const hasWormholeGen =
    p1.techTrack.researched.some((t) => t.id === 'wormhole_generator') ||
    p2.techTrack.researched.some((t) => t.id === 'wormhole_generator');

  const areConnected = p1Sectors.some((s1) =>
    p2Sectors.some((s2) => s1.id === s2.id || areSectorsConnected(s1, s2, hasWormholeGen))
  );
  if (!areConnected) {
    return { canExchange: false, reason: 'Players must control adjacent or connected sectors via wormholes/warp portals to establish diplomacy.' };
  }

  return { canExchange: true };
}

export function validateAction(state: GameState, action: GameAction): { valid: boolean; error?: string } {
  if (state.phase === 'GAME_OVER') {
    return { valid: false, error: 'The game has ended.' };
  }

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) {
    return { valid: false, error: 'Player not found.' };
  }

  // If an action is pending confirmation, only CONFIRM_TURN_ACTION, REVERT_TURN_ACTION, or intermediate choices (like COLONIZE) are permitted
  if (state.pendingActionConfirmation) {
    if (
      action.type !== 'CONFIRM_TURN_ACTION' &&
      action.type !== 'REVERT_TURN_ACTION' &&
      action.type !== 'DISCOVERY_CHOICE' &&
      action.type !== 'COMBAT_CONQUEST' &&
      action.type !== 'RESOLVE_COMBAT_STEP' &&
      action.type !== 'CLAIM_REPUTATION_TILE' &&
      action.type !== 'ALLOCATE_ARTIFACT_REWARD' &&
      action.type !== 'COLONIZE'
    ) {
      return {
        valid: false,
        error: 'Please confirm or revert the pending action before taking another action.',
      };
    }
  }

  // Active player check (except combat, colonization, trade, conquest, discovery choices, confirm/revert)
  if (state.phase === 'ACTION_PHASE') {
    const activePlayer = state.players[state.activePlayerIndex];
    if (
      activePlayer?.id !== action.playerId &&
      action.type !== 'COLONIZE' &&
      action.type !== 'TRADE' &&
      action.type !== 'DISCOVERY_CHOICE' &&
      action.type !== 'COMBAT_CONQUEST' &&
      action.type !== 'RESOLVE_COMBAT_STEP' &&
      action.type !== 'CLAIM_REPUTATION_TILE' &&
      action.type !== 'ALLOCATE_ARTIFACT_REWARD' &&
      action.type !== 'ABANDON_SECTOR_BANKRUPTCY' &&
      action.type !== 'CONFIRM_TURN_ACTION' &&
      action.type !== 'REVERT_TURN_ACTION'
    ) {
      return { valid: false, error: `It is not player ${action.playerId}'s turn.` };
    }
  }

  // Reaction constraints for passed players: can only take Reaction actions (Build 1, Move 1, Upgrade 1) or Pass
  const isPassedPlayer = player.hasPassed || state.passedPlayerIds.includes(player.id);
  if (isPassedPlayer) {
    if (
      action.type === 'EXPLORE' ||
      action.type === 'RESEARCH' ||
      action.type === 'INFLUENCE' ||
      action.type === 'FINISH_EXPLORE'
    ) {
      return {
        valid: false,
        error: 'Passed players can only take Reaction actions (Build 1, Move 1, or Upgrade 1) or Pass.',
      };
    }
  }

  switch (action.type) {
    case 'EXPLORE': {
      // 1. Check if source coord exists and is controlled or contains player's ship
      const sourceSector = state.sectors.find((s) => areCoordsEqual(s.coord, action.fromCoord));
      if (!sourceSector) {
        return { valid: false, error: 'Invalid source coordinate for exploration.' };
      }
      const hasShipOrDisc =
        sourceSector.discOwner === action.playerId ||
        sourceSector.ships.some((ship) => ship.ownerId === action.playerId);
      if (!hasShipOrDisc) {
        return { valid: false, error: 'Must have a ship or influence disc in source sector to explore adjacent hexes.' };
      }

      // 2. Check target coord is empty
      const targetExists = state.sectors.some((s) => areCoordsEqual(s.coord, action.targetCoord));
      if (targetExists) {
        return { valid: false, error: 'Target coordinate already contains an explored sector.' };
      }

      // 3. Must have available disc to take action (unless it is a free second activation, e.g. Planta)
      const isSecondActivation = action.isSecondActivation || (state.pendingExploreActivations && state.pendingExploreActivations > 0);
      if (!isSecondActivation && player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Explore.' };
      }

      // 4. Sector deck must not be exhausted for target ring
      const ring = getRingFromCoord(action.targetCoord);
      const deck =
        ring === 1
          ? state.sectorDecks?.ring1
          : ring === 2
          ? state.sectorDecks?.ring2
          : state.sectorDecks?.ring3;
      if (!deck || deck.length === 0) {
        return { valid: false, error: `No Ring ${ring} sector tiles remaining in the stack.` };
      }

      return { valid: true };
    }

    case 'FINISH_EXPLORE': {
      if (!state.pendingExploreActivations || state.pendingExploreActivations <= 0) {
        return { valid: false, error: 'No pending explore activations to finish.' };
      }
      return { valid: true };
    }

    case 'RESEARCH': {
      const researches = action.researches ?? (action.techId ? [{ techId: action.techId, targetTrack: action.targetTrack }] : []);
      if (researches.length === 0) {
        return { valid: false, error: 'Must specify at least one technology to research.' };
      }

      const maxResearch = player.faction.researchActivations ?? 1;
      if (researches.length > maxResearch) {
        return { valid: false, error: `Cannot research more than ${maxResearch} technologies in a single Research action.` };
      }

      if (player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Research.' };
      }

      // Clone researched list & track counts to accurately compute progressive discounts
      const simResearched = new Set(player.techTrack.researched.map((t) => t.id));
      let simMilitary = player.techTrack.militaryCount;
      let simGrid = player.techTrack.gridCount;
      let simNano = player.techTrack.nanoCount;
      let totalScienceCost = 0;

      // Track remaining supply count to prevent researching more copies than available
      const supplyCopyCount = new Map<string, number>();
      for (const t of state.techSupply) {
        supplyCopyCount.set(t.id, (supplyCopyCount.get(t.id) || 0) + 1);
      }

      for (const item of researches) {
        const availableCount = supplyCopyCount.get(item.techId) || 0;
        if (availableCount <= 0) {
          return { valid: false, error: `Technology ${item.techId} is not available in the tech supply.` };
        }
        supplyCopyCount.set(item.techId, availableCount - 1);

        if (simResearched.has(item.techId)) {
          return { valid: false, error: `Player has already researched ${item.techId}.` };
        }
        simResearched.add(item.techId);

        const tech = state.techSupply.find((t) => t.id === item.techId)!;
        let count = 0;
        if (tech.category === 'military') {
          if (simMilitary >= 7) {
            return { valid: false, error: 'Military tech track is full (maximum 7 technologies).' };
          }
          count = simMilitary++;
        } else if (tech.category === 'grid') {
          if (simGrid >= 7) {
            return { valid: false, error: 'Grid tech track is full (maximum 7 technologies).' };
          }
          count = simGrid++;
        } else if (tech.category === 'nano') {
          if (simNano >= 7) {
            return { valid: false, error: 'Nano tech track is full (maximum 7 technologies).' };
          }
          count = simNano++;
        } else {
          let targetTrack = item.targetTrack;
          if (targetTrack) {
            if (targetTrack === 'military' && simMilitary >= 7) {
              return { valid: false, error: 'Military tech track is full (maximum 7 technologies).' };
            }
            if (targetTrack === 'grid' && simGrid >= 7) {
              return { valid: false, error: 'Grid tech track is full (maximum 7 technologies).' };
            }
            if (targetTrack === 'nano' && simNano >= 7) {
              return { valid: false, error: 'Nano tech track is full (maximum 7 technologies).' };
            }
          } else {
            const availTracks: ('military' | 'grid' | 'nano')[] = [];
            if (simMilitary < 7) availTracks.push('military');
            if (simGrid < 7) availTracks.push('grid');
            if (simNano < 7) availTracks.push('nano');
            if (availTracks.length === 0) {
              return { valid: false, error: 'All technology tracks are full (maximum 7 technologies each).' };
            }
            const getCnt = (tr: 'military' | 'grid' | 'nano') => (tr === 'military' ? simMilitary : tr === 'grid' ? simGrid : simNano);
            availTracks.sort((a, b) => getCnt(b) - getCnt(a));
            targetTrack = availTracks[0]!;
          }
          if (targetTrack === 'military') count = simMilitary++;
          else if (targetTrack === 'grid') count = simGrid++;
          else count = simNano++;
        }

        if (tech.id === 'warp_portal') {
          const controlledSectors = state.sectors.filter((s) => s.discOwner === player.id);
          if (controlledSectors.length === 0) {
            return { valid: false, error: 'Cannot research Warp Portal: you must control at least one sector to place the portal.' };
          }
          const portalSectorId = item.warpPortalSectorId || (action as any).warpPortalSectorId;
          if (!portalSectorId) {
            return { valid: false, error: 'Warp Portal placement requires selecting a controlled sector.' };
          }
          const sec = state.sectors.find((s) => s.id === portalSectorId && s.discOwner === player.id);
          if (!sec) {
            return { valid: false, error: 'Invalid sector for Warp Portal: must be a controlled sector.' };
          }
        }

        totalScienceCost += calculateTechCost(tech, count);
      }

      if (player.resources.science < totalScienceCost) {
        return {
          valid: false,
          error: `Insufficient science. Total cost is ${totalScienceCost}, but player has ${player.resources.science}.`,
        };
      }
      return { valid: true };
    }

    case 'UPGRADE': {
      if (player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Upgrade.' };
      }
      if (!action.upgrades || action.upgrades.length === 0) {
        return { valid: false, error: 'Must specify at least one blueprint component upgrade.' };
      }
      for (const up of action.upgrades) {
        const bp = player.blueprints[up.shipType];
        if (!bp) return { valid: false, error: `Unknown ship type ${up.shipType}.` };
        if (up.slotIndex < 0 || up.slotIndex >= bp.maxSlots) {
          return { valid: false, error: `Invalid slot index ${up.slotIndex} for ${up.shipType}.` };
        }
      }

      // Count actual modified slots compared to current blueprint state
      let modifiedCount = 0;
      for (const up of action.upgrades) {
        const bp = player.blueprints[up.shipType]!;
        const currentPartId = bp.slots[up.slotIndex]?.id || null;
        if (currentPartId !== up.partId) {
          modifiedCount += 1;
        }
      }

      if (modifiedCount === 0) {
        return { valid: false, error: 'No component modifications were made to blueprints.' };
      }

      const isPassed = player.hasPassed || state.passedPlayerIds.includes(player.id);
      const maxUpgrade = isPassed ? 1 : getMaxUpgradeActivations(player);
      if (modifiedCount > maxUpgrade) {
        return {
          valid: false,
          error: isPassed
            ? 'Reaction Upgrade allows at most 1 component upgrade.'
            : `Cannot make more than ${maxUpgrade} component upgrades in a single Upgrade action. (Attempted ${modifiedCount})`,
        };
      }
      return { valid: true };
    }

    case 'BUILD': {
      if (player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Build.' };
      }
      if (!action.items || action.items.length === 0) {
        return { valid: false, error: 'Must specify at least one item to build.' };
      }

      const isPassed = player.hasPassed || state.passedPlayerIds.includes(player.id);
      const maxBuild = isPassed ? 1 : getMaxBuildActivations(player);
      if (action.items.length > maxBuild) {
        return {
          valid: false,
          error: isPassed
            ? 'Reaction Build allows building at most 1 item.'
            : `Cannot build more than ${maxBuild} items in a single Build action.`,
        };
      }

      // Track deployed ships and staged ships in this action
      const currentShips = countPlayerShips(state.sectors, action.playerId);
      const queuedShips: Record<ShipType, number> = {
        interceptor: 0,
        cruiser: 0,
        dreadnought: 0,
        starbase: 0,
      };

      let totalMaterialsCost = 0;
      for (const item of action.items) {
        const sector = state.sectors.find((s) => s.id === item.sectorId);
        if (!sector) {
          return { valid: false, error: `Sector ${item.sectorId} not found.` };
        }
        if (sector.discOwner !== action.playerId) {
          return { valid: false, error: `Must control sector ${item.sectorId} with an influence disc to build here.` };
        }
        // Enemy ships cannot be present to build (Draco can build in sectors with friendly Ancients)
        const isDraco = player.faction.id === 'descendants_of_draco';
        const hasEnemies = sector.ships.some(
          (s) => s.ownerId !== action.playerId && (!isDraco || (s.ownerId !== 'ancient' && s.type !== 'ancient'))
        );
        if (hasEnemies) {
          return { valid: false, error: `Cannot build in sector ${item.sectorId} while enemy ships are present.` };
        }

        // Validate Ship Supply Limits (8 Interceptors, 4 Cruisers, 2 Dreadnoughts, 4 Starbases)
        if (item.itemType in queuedShips) {
          const st = item.itemType as ShipType;
          queuedShips[st]++;
          if (currentShips[st] + queuedShips[st] > SHIP_LIMITS[st]) {
            return {
              valid: false,
              error: `Cannot build ${st}: reached maximum limit of ${SHIP_LIMITS[st]} (${currentShips[st]} currently in service).`,
            };
          }
        }

        if (item.itemType === 'orbital') {
          if (!player.techTrack.researched.some((t) => t.id === 'orbital')) {
            return { valid: false, error: 'Must research Orbital tech before building Orbitals.' };
          }
          if (sector.structures?.orbital || sector.planets.some((p) => p.isOrbital)) {
            return {
              valid: false,
              error: `Sector ${sector.sectorNumber} already contains an Orbital structure (maximum 1 per sector).`,
            };
          }
        }

        if (item.itemType === 'monolith') {
          if (!player.techTrack.researched.some((t) => t.id === 'monolith')) {
            return { valid: false, error: 'Must research Monolith tech before building Monoliths.' };
          }
          if (sector.structures?.monolith) {
            return {
              valid: false,
              error: `Sector ${sector.sectorNumber} already contains a Monolith (maximum 1 per sector).`,
            };
          }
        }

        const isMechanema = player.faction.id === 'mechanema';
        let cost = isMechanema ? 2 : 3;
        if (item.itemType === 'cruiser') cost = isMechanema ? 4 : 5;
        else if (item.itemType === 'dreadnought') cost = isMechanema ? 7 : 8;
        else if (item.itemType === 'starbase') cost = isMechanema ? 2 : 3;
        else if (item.itemType === 'orbital') cost = isMechanema ? 3 : 4;
        else if (item.itemType === 'monolith') cost = isMechanema ? 8 : 10;

        totalMaterialsCost += cost;
      }

      if (player.resources.materials < totalMaterialsCost) {
        return {
          valid: false,
          error: `Insufficient materials. Required: ${totalMaterialsCost}, Available: ${player.resources.materials}.`,
        };
      }
      return { valid: true };
    }

    case 'MOVE': {
      if (player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Move.' };
      }
      if (!action.moves || action.moves.length === 0) {
        return { valid: false, error: 'Must specify at least one ship movement.' };
      }

      const isPassed = player.hasPassed || state.passedPlayerIds.includes(player.id);
      const maxMoveActivations = isPassed ? 1 : getMaxMoveActivations(player);
      const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');

      // 1. Build a map of all ships currently in sectors with their blueprint driveSpeed
      const shipMap = new Map<
        string,
        { ship: SectorShip; currentSectorId: string; driveSpeed: number }
      >();
      for (const s of state.sectors) {
        for (const ship of s.ships) {
          if (ship.ownerId === action.playerId) {
            const bp = player.blueprints[ship.type];
            const stats = bp ? calculateBlueprintStats(bp) : null;
            const driveSpeed = stats ? stats.totalDriveSpeed : 1;
            shipMap.set(ship.id, { ship, currentSectorId: s.id, driveSpeed });
          }
        }
      }

      // 2. Group steps into activations
      interface MoveActivationGroup {
        activationIndex: number;
        shipId: string;
        steps: typeof action.moves;
      }
      const activations: MoveActivationGroup[] = [];

      const hasExplicitIndices = action.moves.every((m) => m.activationIndex !== undefined);
      if (hasExplicitIndices) {
        const grouped = new Map<number, typeof action.moves>();
        for (const m of action.moves) {
          const list = grouped.get(m.activationIndex!) || [];
          list.push(m);
          grouped.set(m.activationIndex!, list);
        }
        for (const [idx, steps] of grouped) {
          const firstShip = steps[0]!.shipId;
          if (steps.some((s) => s.shipId !== firstShip)) {
            return { valid: false, error: 'A single move activation can only move one ship.' };
          }
          activations.push({ activationIndex: idx, shipId: firstShip, steps });
        }
      } else {
        // Automatic grouping for consecutive steps of the same ship up to driveSpeed
        let currentAct: MoveActivationGroup | null = null;
        for (const m of action.moves) {
          const shipInfo = shipMap.get(m.shipId);
          const maxSpeed = shipInfo ? shipInfo.driveSpeed : 1;
          if (currentAct && currentAct.shipId === m.shipId && currentAct.steps.length < maxSpeed) {
            currentAct.steps.push(m);
          } else {
            currentAct = {
              activationIndex: activations.length,
              shipId: m.shipId,
              steps: [m],
            };
            activations.push(currentAct);
          }
        }
      }

      if (activations.length > maxMoveActivations) {
        return {
          valid: false,
          error: isPassed
            ? 'Reaction Move allows moving at most 1 ship.'
            : `Cannot make more than ${maxMoveActivations} ship movements (move activations) in a single Move action (attempted ${activations.length}).`,
        };
      }

      // 3. Validate paths, drive speed limits, and pinning
      const pinnedShips = new Set<string>();
      const isDraco = player.faction.id === 'descendants_of_draco';

      // Track ships in each sector across activations
      const simSectorShips = new Map<string, { id: string; ownerId: string; type: string }[]>();
      for (const s of state.sectors) {
        simSectorShips.set(s.id, s.ships.map((sh) => ({ id: sh.id, ownerId: sh.ownerId, type: sh.type })));
      }

      const getHostilesInSec = (sec: SectorTile, shipsList: { id: string; ownerId: string; type: string }[]) => {
        let ancients = Math.max(
          sec.ancientsCount || 0,
          shipsList.filter((s) => s.ownerId === 'ancient' || s.type === 'ancient').length
        );
        if (isDraco) ancients = 0;
        const gcdsShips = shipsList.filter((s) => s.ownerId === 'gcds' || s.type === 'gcds').length;
        const gcdsCount = sec.hasGCDS && gcdsShips === 0 ? 1 : gcdsShips;
        const guardianShips = shipsList.filter((s) => s.ownerId === 'guardian' || s.type === 'guardian').length;
        const otherPlayerShips = shipsList.filter(
          (s) => s.ownerId !== action.playerId && s.ownerId.startsWith('player_')
        ).length;
        return ancients + gcdsCount + guardianShips + otherPlayerShips;
      };

      for (const act of activations) {
        const shipInfo = shipMap.get(act.shipId);
        if (!shipInfo) {
          return { valid: false, error: `Ship ${act.shipId} not found or not owned by player.` };
        }
        if (shipInfo.driveSpeed <= 0) {
          return { valid: false, error: `${shipInfo.ship.type} has Drive Speed 0 and cannot move.` };
        }
        if (act.steps.length > shipInfo.driveSpeed) {
          return {
            valid: false,
            error: `Ship ${shipInfo.ship.type} attempted to move ${act.steps.length} hexes in one activation, but its engine only has Drive Speed ${shipInfo.driveSpeed}.`,
          };
        }
        if (pinnedShips.has(act.shipId)) {
          return { valid: false, error: `Ship ${shipInfo.ship.type} is pinned by hostile forces and cannot move further.` };
        }

        // Check if origin sector pins this ship before taking any step (hostiles pin 1:1)
        const originSecId = shipInfo.currentSectorId;
        const originSec = state.sectors.find((s) => s.id === originSecId);
        if (originSec) {
          const shipsInOrigin = simSectorShips.get(originSecId) || [];
          const friendlyCount = shipsInOrigin.filter((s) => s.ownerId === action.playerId).length;
          const hostiles = getHostilesInSec(originSec, shipsInOrigin);
          if (hostiles > 0 && friendlyCount <= hostiles) {
            return {
              valid: false,
              error: `Ship ${shipInfo.ship.type} is pinned in Sector ${originSec.sectorNumber} (friendly ships: ${friendlyCount}, hostile ships: ${hostiles}) and cannot move.`,
            };
          }
        }

        for (let sIdx = 0; sIdx < act.steps.length; sIdx++) {
          const step = act.steps[sIdx]!;
          if (pinnedShips.has(act.shipId)) {
            return { valid: false, error: `Ship ${shipInfo.ship.type} was pinned by hostile forces upon entering and cannot take further movement steps.` };
          }
          if (shipInfo.currentSectorId !== step.fromSectorId) {
            return {
              valid: false,
              error: `Ship is currently in Sector ${shipInfo.currentSectorId}, cannot move from ${step.fromSectorId}.`,
            };
          }

          const fromSec = state.sectors.find((s) => s.id === step.fromSectorId);
          const toSec = state.sectors.find((s) => s.id === step.toSectorId);
          if (!fromSec || !toSec) {
            return { valid: false, error: 'Sector not found for movement.' };
          }
          if (!areSectorsConnected(fromSec, toSec, hasWormholeGen)) {
            return {
              valid: false,
              error: `Wormhole does not connect Sector ${fromSec.sectorNumber} and Sector ${toSec.sectorNumber}.`,
            };
          }

          // Advance ship's simulated location in simSectorShips
          const fromList = simSectorShips.get(fromSec.id) || [];
          const shipInFromIdx = fromList.findIndex((s) => s.id === act.shipId);
          if (shipInFromIdx >= 0) {
            const [moved] = fromList.splice(shipInFromIdx, 1);
            const toList = simSectorShips.get(toSec.id) || [];
            toList.push(moved!);
            simSectorShips.set(toSec.id, toList);
          }
          shipInfo.currentSectorId = step.toSectorId;

          // Check if destination has hostiles -> pinned if friendly <= hostile
          const shipsInTo = simSectorShips.get(toSec.id) || [];
          const friendlyInTo = shipsInTo.filter((s) => s.ownerId === action.playerId).length;
          const hostilesInTo = getHostilesInSec(toSec, shipsInTo);
          if (hostilesInTo > 0 && friendlyInTo <= hostilesInTo) {
            pinnedShips.add(act.shipId);
            if (sIdx < act.steps.length - 1) {
              return {
                valid: false,
                error: `Ship ${shipInfo.ship.type} was pinned by hostile forces upon entering Sector ${toSec.sectorNumber} and cannot take further movement steps.`,
              };
            }
          }
        }
      }

      return { valid: true };
    }

    case 'INFLUENCE': {
      const claimed = action.claimSectors ?? [];
      const abandoned = action.abandonSectors ?? [];
      const totalActivations = claimed.length + abandoned.length;
      const maxActivations = getMaxInfluenceActivations(player);

      if (totalActivations > maxActivations) {
        return { valid: false, error: `Maximum ${maxActivations} influence activations allowed per action.` };
      }

      // Cannot target the same sector more than once in an Influence action
      const allSectorIds = [...claimed, ...abandoned];
      if (new Set(allSectorIds).size !== allSectorIds.length) {
        return { valid: false, error: 'Cannot target the same sector more than once in an Influence action.' };
      }

      // Net discs needed = 1 (action disc) + claimed.length - abandoned.length
      if (player.influenceTrack.discsOnTrack < 1) {
        return { valid: false, error: 'No influence discs remaining on track.' };
      }
      if (player.influenceTrack.discsOnTrack < 1 + claimed.length - abandoned.length) {
        return { valid: false, error: 'Not enough influence discs on track for the requested claims.' };
      }

      const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');

      for (const secId of claimed) {
        const sec = state.sectors.find((s) => s.id === secId);
        if (!sec) return { valid: false, error: `Sector ${secId} not found.` };
        if (sec.discOwner) {
          return { valid: false, error: `Sector ${sec.sectorNumber} is already controlled by another player.` };
        }
        const isDraco = player.faction.id === 'descendants_of_draco';
        const hasHostiles =
          (!isDraco && sec.ancientsCount > 0) ||
          sec.hasGCDS ||
          sec.ships.some(
            (s) => s.ownerId !== player.id && (!isDraco || (s.ownerId !== 'ancient' && s.type !== 'ancient'))
          );
        if (hasHostiles) {
          return { valid: false, error: `Cannot claim Sector ${sec.sectorNumber} while hostile forces are present.` };
        }
        // Rulebook page 14: Uncontrolled sector where only you have a ship OR no opponent ships and wormhole connection exists to friendly sector
        const hasShips = sec.ships.some((s) => s.ownerId === player.id);
        const hasConnectedFriendly = state.sectors.some((other) => {
          if (other.id === sec.id) return false;
          const isFriendly = other.discOwner === player.id || other.ships.some((s) => s.ownerId === player.id);
          if (!isFriendly) return false;
          return areSectorsConnected(other, sec, hasWormholeGen);
        });

        if (!hasShips && !hasConnectedFriendly) {
          return {
            valid: false,
            error: `Sector ${sec.sectorNumber} must have a friendly ship or a wormhole connection to a friendly-controlled sector.`,
          };
        }
      }

      for (const secId of abandoned) {
        const sec = state.sectors.find((s) => s.id === secId);
        if (!sec) return { valid: false, error: `Sector ${secId} not found.` };
        if (sec.discOwner !== player.id) {
          return { valid: false, error: `You do not control Sector ${sec.sectorNumber}.` };
        }
      }

      return { valid: true };
    }

    case 'COLONIZE': {
      if (player.colonyShips.ready <= 0) {
        return { valid: false, error: 'No ready colony ships available.' };
      }
      const sector = state.sectors.find((s) => s.id === action.sectorId);
      if (!sector) return { valid: false, error: 'Sector not found.' };
      if (sector.discOwner !== action.playerId) {
        return { valid: false, error: 'Can only colonize planets in sectors controlled by your influence disc.' };
      }
      const planet = sector.planets[action.planetIndex];
      if (!planet) return { valid: false, error: 'Planet not found.' };
      if (planet.colonizedBy) return { valid: false, error: 'Planet slot is already colonized.' };

      // Orbitals accept only Money or Science
      if (planet.isOrbital) {
        const chosen = action.chosenResource || 'science';
        if (chosen !== 'money' && chosen !== 'science') {
          return { valid: false, error: 'Orbitals can only produce Money or Science.' };
        }
        if (player.population[chosen].cubesOnBoard <= 0) {
          return { valid: false, error: `No ${chosen} population cubes left on player board.` };
        }
        return { valid: true };
      }

      // Wild planet slot ('any')
      if (planet.resource === 'any') {
        const chosen = action.chosenResource;
        if (!chosen || !['money', 'science', 'material'].includes(chosen)) {
          return { valid: false, error: 'Must specify chosen resource (money, science, or material) for wild planet slot.' };
        }
        if (player.population[chosen].cubesOnBoard <= 0) {
          return { valid: false, error: `No ${chosen} population cubes left on player board.` };
        }
        if (planet.isAdvanced) {
          const hasMeta = player.techTrack.researched.some((t) => t.id === 'metasynthesis');
          if (chosen === 'money' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_economy')) {
            return { valid: false, error: 'Requires Advanced Economy or Metasynthesis to place Money cube on this gray advanced slot.' };
          }
          if (chosen === 'science' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_labs')) {
            return { valid: false, error: 'Requires Advanced Labs or Metasynthesis to place Science cube on this gray advanced slot.' };
          }
          if (chosen === 'material' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_mining')) {
            return { valid: false, error: 'Requires Advanced Mining or Metasynthesis to place Material cube on this gray advanced slot.' };
          }
        }
        return { valid: true };
      }

      // Standard single-resource slot
      const resType = planet.resource as 'money' | 'science' | 'material';
      if (planet.isAdvanced) {
        const hasMeta = player.techTrack.researched.some((t) => t.id === 'metasynthesis');
        if (resType === 'money' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_economy')) {
          return { valid: false, error: 'Requires Advanced Economy tech to colonize this gray slot.' };
        }
        if (resType === 'material' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_mining')) {
          return { valid: false, error: 'Requires Advanced Mining tech to colonize this gray slot.' };
        }
        if (resType === 'science' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_labs')) {
          return { valid: false, error: 'Requires Advanced Labs tech to colonize this gray slot.' };
        }
      }
      if (player.population[resType].cubesOnBoard <= 0) {
        return { valid: false, error: `No ${resType} cubes left on player board.` };
      }
      return { valid: true };
    }

    case 'PASS':
      return { valid: true };

    case 'TRADE': {
      const ratio = player.faction.tradeRatio || 2;
      const toRes = action.toResource || 'money';
      if (action.fromResource === toRes) {
        return { valid: false, error: 'Cannot trade a resource for itself.' };
      }
      if (action.amount <= 0 || action.amount % ratio !== 0) {
        return { valid: false, error: `Trade amount must be a positive multiple of ${ratio}.` };
      }
      const available =
        action.fromResource === 'money'
          ? player.resources.money
          : action.fromResource === 'science'
          ? player.resources.science
          : player.resources.materials;
      if (available < action.amount) {
        return { valid: false, error: `Not enough ${action.fromResource} to trade.` };
      }
      return { valid: true };
    }

    case 'DIPLOMACY_EXCHANGE': {
      const check = canExchangeAmbassadors(state, action.playerId, action.targetPlayerId);
      if (!check.canExchange) {
        return { valid: false, error: check.reason || 'Cannot exchange ambassadors.' };
      }
      if (action.initiatorCube && player.population[action.initiatorCube].cubesOnBoard <= 0) {
        return { valid: false, error: `${player.name} has no available population cubes on the ${action.initiatorCube} track.` };
      }
      const targetPlayer = state.players.find((p) => p.id === action.targetPlayerId)!;
      if (action.targetCube && targetPlayer.population[action.targetCube].cubesOnBoard <= 0) {
        return { valid: false, error: `${targetPlayer.name} has no available population cubes on the ${action.targetCube} track.` };
      }

      return { valid: true };
    }

    case 'DISCOVERY_CHOICE': {
      if (!state.pendingDiscovery) {
        return { valid: false, error: 'No pending discovery tile to claim.' };
      }
      if (state.pendingDiscovery.playerId !== action.playerId) {
        return { valid: false, error: 'Only the discovering player can make this choice.' };
      }
      if (action.equipShipType) {
        const bp = player.blueprints[action.equipShipType];
        if (!bp) return { valid: false, error: `Invalid ship type ${action.equipShipType}.` };
        if (action.equipSlotIndex === undefined || action.equipSlotIndex < 0 || action.equipSlotIndex >= bp.maxSlots) {
          return { valid: false, error: `Invalid slot index for ${action.equipShipType}.` };
        }
        const disc = state.pendingDiscovery.discovery;
        if (disc.shipPartId) {
          const part = SHIP_PARTS[disc.shipPartId];
          if (part) {
            const testBp = { ...bp, slots: [...bp.slots] };
            testBp.slots[action.equipSlotIndex] = part;
            const stats = calculateBlueprintStats(testBp);
            if (stats.totalPowerConsumed > stats.totalPowerProduced) {
              return {
                valid: false,
                error: `Cannot install ${part.name}: power consumed (${stats.totalPowerConsumed}) exceeds power produced (${stats.totalPowerProduced}).`,
              };
            }
          }
        }
      }
      return { valid: true };
    }

    case 'COMBAT_CONQUEST': {
      if (!state.pendingCombatConquest) {
        return { valid: false, error: 'No combat conquest decision pending.' };
      }
      if (state.pendingCombatConquest.winnerPlayerId !== action.playerId) {
        return { valid: false, error: 'Only the battle victor can make this conquest decision.' };
      }
      const sector = state.sectors.find((s) => s.id === action.sectorId);
      if (!sector) return { valid: false, error: 'Sector not found.' };

      if (action.claimInfluence && sector.discOwner !== action.playerId) {
        if (player.influenceTrack.discsOnTrack <= 0) {
          return { valid: false, error: 'No influence discs available on track to control this sector.' };
        }
      }

      if (action.colonizePlanetIndices && action.colonizePlanetIndices.length > 0) {
        const willControl = action.claimInfluence || sector.discOwner === action.playerId;
        if (!willControl) {
          return { valid: false, error: 'Must control sector with an Influence Disc to colonize planets.' };
        }
        if (action.colonizePlanetIndices.length > player.colonyShips.ready) {
          return {
            valid: false,
            error: `Cannot colonize ${action.colonizePlanetIndices.length} planets: only ${player.colonyShips.ready} colony ships ready.`,
          };
        }
        for (const pIdx of action.colonizePlanetIndices) {
          const planet = sector.planets[pIdx];
          if (!planet) return { valid: false, error: `Invalid planet index ${pIdx}.` };
          const check = canColonizePlanetSlot(player, planet);
          if (!check.canColonize) {
            return { valid: false, error: check.reason || 'Cannot colonize planet slot.' };
          }
        }
      }
      return { valid: true };
    }

    case 'CLAIM_REPUTATION_TILE': {
      if (!state.pendingReputationDraw) {
        return { valid: false, error: 'No reputation tile draw pending.' };
      }
      if (state.pendingReputationDraw.playerId !== action.playerId) {
        return { valid: false, error: 'Only the active drawing player can claim a reputation tile.' };
      }
      return { valid: true };
    }

    case 'ALLOCATE_ARTIFACT_REWARD': {
      if (!state.pendingArtifactReward || state.pendingArtifactReward.playerId !== action.playerId) {
        return { valid: false, error: 'No pending Artifact Key reward for this player.' };
      }
      const totalReward = state.pendingArtifactReward.totalResources;
      const m = Math.max(0, action.resources?.money || 0);
      const sc = Math.max(0, action.resources?.science || 0);
      const mat = Math.max(0, action.resources?.materials || 0);
      if (m + sc + mat !== totalReward) {
        return {
          valid: false,
          error: `Total allocated resources (${m + sc + mat}) must equal exactly ${totalReward}.`,
        };
      }
      return { valid: true };
    }

    case 'ABANDON_SECTOR_BANKRUPTCY': {
      if (!state.pendingBankruptcy || state.pendingBankruptcy.playerId !== action.playerId) {
        return { valid: false, error: 'No pending bankruptcy for this player.' };
      }
      const sector = state.sectors.find((s) => s.id === action.sectorId);
      if (!sector || sector.discOwner !== action.playerId) {
        return { valid: false, error: 'Cannot abandon a sector not controlled by this player.' };
      }
      return { valid: true };
    }

    case 'RESOLVE_COMBAT_STEP': {
      if (!state.activeCombat) {
        return { valid: false, error: 'No active combat in progress.' };
      }
      const sector = state.sectors.find((s) => s.id === state.activeCombat!.sectorId);
      if (!sector) {
        return { valid: false, error: 'Combat sector not found.' };
      }
      if (state.activeCombat.stage === 'resolved' || (action as any).concludeCombat) {
        return { valid: true };
      }
      const units = buildCombatUnitsForSector(sector, state.players);
      const defenderId = state.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sector);
      const aliveUnits = sortUnitsByInitiative(
        units.filter((u) => u.currentDamage < u.maxHull),
        defenderId
      );
      if (aliveUnits.length > 0) {
        const isMissileStage = state.activeCombat.stage === 'missile';
        const pendingMissileUnits = isMissileStage
          ? aliveUnits.filter(
              (u) => u.weapons.some((w) => w.isMissile) && !state.activeCombat!.missileFiredShipIds?.includes(u.id)
            )
          : [];
        const activeAttacker = isMissileStage
          ? (pendingMissileUnits[0] || null)
          : aliveUnits[state.activeCombat.currentTurnIndex % aliveUnits.length];

        if (activeAttacker) {
          const isPlayerShip = state.players.some((p) => p.id === activeAttacker.ownerId);
          if (isPlayerShip && action.playerId && action.playerId !== activeAttacker.ownerId) {
            return {
              valid: false,
              error: `Only player ${activeAttacker.ownerId} can command their ${activeAttacker.type}.`,
            };
          }
        }
      }
      if (action.retreatShipIds && action.playerId) {
        const otherShip = sector.ships.find(
          (s) => action.retreatShipIds!.includes(s.id) && s.ownerId !== action.playerId
        );
        if (otherShip) {
          return { valid: false, error: 'Cannot retreat ships belonging to another player.' };
        }
      }
      return { valid: true };
    }

    case 'CONFIRM_TURN_ACTION': {
      if (!state.pendingActionConfirmation) {
        return { valid: false, error: 'No action pending confirmation.' };
      }
      if (action.playerId !== state.pendingActionConfirmation.playerId) {
        return { valid: false, error: 'Only the acting player can confirm their action.' };
      }
      return { valid: true };
    }

    case 'REVERT_TURN_ACTION': {
      if (!state.pendingActionConfirmation) {
        return { valid: false, error: 'No action pending confirmation.' };
      }
      if (action.playerId !== state.pendingActionConfirmation.playerId) {
        return { valid: false, error: 'Only the acting player can revert their action.' };
      }
      if (!state.pendingActionConfirmation.canRevert) {
        return {
          valid: false,
          error: 'This action cannot be reverted because it revealed hidden information (e.g. exploration or discovery tile).',
        };
      }
      if (!state.pendingActionConfirmation.snapshot) {
        return { valid: false, error: 'No state snapshot available to revert.' };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

export function executeAction(state: GameState, action: GameAction): ActionResult {
  const validation = validateAction(state, action);
  if (!validation.valid) {
    return { success: false, newState: state, error: validation.error };
  }

  // Clone state
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const playerIndex = newState.players.findIndex((p) => p.id === action.playerId);
  const player = newState.players[playerIndex]!;

  // Taking any non-PASS action breaks the consecutive pass streak
  if (
    action.type !== 'PASS' &&
    action.type !== 'CONFIRM_TURN_ACTION' &&
    action.type !== 'REVERT_TURN_ACTION' &&
    action.type !== 'COLONIZE' &&
    action.type !== 'TRADE' &&
    action.type !== 'DISCOVERY_CHOICE' &&
    action.type !== 'CLAIM_REPUTATION_TILE' &&
    action.type !== 'RESOLVE_COMBAT_STEP' &&
    action.type !== 'COMBAT_CONQUEST' &&
    action.type !== 'ALLOCATE_ARTIFACT_REWARD' &&
    action.type !== 'ABANDON_SECTOR_BANKRUPTCY'
  ) {
    newState.consecutivePasses = 0;
  }

  const addLog = (message: string, type: GameLogEntry['type'] = 'action') => {
    newState.log.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      round: newState.round,
      phase: newState.phase,
      playerId: action.playerId,
      message,
      type,
    });
  };

  const snapshotJson = action.requireConfirmation
    ? JSON.stringify({ ...state, pendingActionConfirmation: null })
    : undefined;

  switch (action.type) {
    case 'EXPLORE': {
      const isSecondActivation = action.isSecondActivation || (newState.pendingExploreActivations && newState.pendingExploreActivations > 0);
      if (isSecondActivation) {
        newState.pendingExploreActivations = 0;
      } else {
        // Deduct action disc
        player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
        player.actionsTakenThisRound += 1;
        const maxExplores = player.faction.exploreActivations ?? 1;
        if (maxExplores > 1) {
          newState.pendingExploreActivations = maxExplores - 1;
        } else {
          newState.pendingExploreActivations = 0;
        }
      }

      const ring = getRingFromCoord(action.targetCoord);
      const deck = ring === 1 ? newState.sectorDecks.ring1 : ring === 2 ? newState.sectorDecks.ring2 : newState.sectorDecks.ring3;

      let drawnTile: SectorTile | undefined;
      const isDraco = player.faction.id === 'descendants_of_draco';

      // Draco Explore Ability: draw 2 tiles, choose 1, place other at bottom of deck
      if (isDraco && deck.length >= 2) {
        const tileTop = deck.pop()!;
        const tileSecond = deck.pop()!;
        const pickIndex = action.chosenTileIndex ?? 0;
        if (pickIndex === 1) {
          drawnTile = tileSecond;
          deck.unshift(tileTop);
          addLog(`${player.name} (Draco) drew 2 tiles, chose Sector ${drawnTile.sectorNumber}, and placed Sector ${tileTop.sectorNumber} at bottom of deck.`);
        } else {
          drawnTile = tileTop;
          deck.unshift(tileSecond);
          addLog(`${player.name} (Draco) drew 2 tiles, chose Sector ${drawnTile.sectorNumber}, and placed Sector ${tileSecond.sectorNumber} at bottom of deck.`);
        }
      } else {
        drawnTile = deck.pop();
      }

      if (!drawnTile) {
        addLog(`${player.name} tried to explore Ring ${ring}, but the sector deck is exhausted!`, 'system');
        break;
      }

      drawnTile.coord = action.targetCoord;
      drawnTile.rotation = action.rotation;

      // Wormhole connection check
      const sourceSector = newState.sectors.find((s) => areCoordsEqual(s.coord, action.fromCoord));
      const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');
      const isConnected = sourceSector ? areSectorsConnected(sourceSector, drawnTile, hasWormholeGen) : true;

      if (!action.discard && isConnected) {
        // Place on map (Draco can place influence discs in sectors with Ancients)
        if ((drawnTile.ancientsCount === 0 || isDraco) && action.claimInfluence && player.influenceTrack.discsOnTrack > 0) {
          drawnTile.discOwner = player.id;
          player.influenceTrack.discsOnTrack -= 1;
          addLog(`${player.name} explored Sector ${drawnTile.sectorNumber} at (${action.targetCoord.q}, ${action.targetCoord.r}) and placed an Influence Disc!`);
        } else {
          addLog(`${player.name} explored Sector ${drawnTile.sectorNumber} at (${action.targetCoord.q}, ${action.targetCoord.r}).`);
        }

        // Discovery tile handling
        if (drawnTile.hasDiscovery && newState.discoveryBag.length > 0) {
          const disc = newState.discoveryBag.pop();
          if (disc) {
            drawnTile.discoveryTile = disc;
            drawnTile.discoveryClaimed = false;
            if (drawnTile.ancientsCount === 0) {
              newState.pendingDiscovery = {
                sectorId: drawnTile.id,
                discovery: disc,
                playerId: player.id,
              };
              addLog(`${player.name} discovered an Ancient artifact in Sector ${drawnTile.sectorNumber}! Awaiting commander's decision...`);
            } else {
              addLog(`${player.name} revealed Sector ${drawnTile.sectorNumber} containing a Discovery Tile, guarded by ${drawnTile.ancientsCount} Ancient ship(s)!`);
            }
          }
        }

        newState.sectors.push(drawnTile);
      } else {
        deck.unshift(drawnTile);
        addLog(`${player.name} discarded explored sector tile from Ring ${ring} to the bottom of the stack.`);
      }

      break;
    }

    case 'FINISH_EXPLORE': {
      newState.pendingExploreActivations = 0;
      addLog(`${player.name} finished their exploration action.`);
      break;
    }

    case 'RESEARCH': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      const researches = action.researches ?? (action.techId ? [{ techId: action.techId, targetTrack: action.targetTrack }] : []);

      for (const item of researches) {
        const techIndex = newState.techSupply.findIndex((t) => t.id === item.techId);
        if (techIndex < 0) continue;
        const tech = newState.techSupply.splice(techIndex, 1)[0]!;

        let targetTrack: 'military' | 'grid' | 'nano' = 'nano';
        if (tech.category === 'military' || tech.category === 'grid' || tech.category === 'nano') {
          targetTrack = tech.category;
        } else {
          if (
            item.targetTrack &&
            (item.targetTrack === 'military'
              ? player.techTrack.militaryCount < 7
              : item.targetTrack === 'grid'
              ? player.techTrack.gridCount < 7
              : player.techTrack.nanoCount < 7)
          ) {
            targetTrack = item.targetTrack;
          } else {
            const availTracks: ('military' | 'grid' | 'nano')[] = [];
            if (player.techTrack.militaryCount < 7) availTracks.push('military');
            if (player.techTrack.gridCount < 7) availTracks.push('grid');
            if (player.techTrack.nanoCount < 7) availTracks.push('nano');
            if (availTracks.length > 0) {
              const getCnt = (tr: 'military' | 'grid' | 'nano') =>
                tr === 'military' ? player.techTrack.militaryCount : tr === 'grid' ? player.techTrack.gridCount : player.techTrack.nanoCount;
              availTracks.sort((a, b) => getCnt(b) - getCnt(a));
              targetTrack = availTracks[0]!;
            } else {
              targetTrack = 'nano';
            }
          }
        }

        const count =
          targetTrack === 'military'
            ? player.techTrack.militaryCount
            : targetTrack === 'grid'
            ? player.techTrack.gridCount
            : player.techTrack.nanoCount;

        const cost = calculateTechCost(tech, count);
        player.resources.science -= cost;
        player.techTrack.researched.push({ ...tech, placedTrack: targetTrack });

        if (targetTrack === 'military') player.techTrack.militaryCount += 1;
        else if (targetTrack === 'grid') player.techTrack.gridCount += 1;
        else if (targetTrack === 'nano') player.techTrack.nanoCount += 1;

        // Special instantaneous tech abilities
        if (tech.id === 'warp_portal') {
          let targetSec = action.warpPortalSectorId
            ? newState.sectors.find((s) => s.id === action.warpPortalSectorId && s.discOwner === player.id)
            : null;
          if (!targetSec) {
            targetSec = newState.sectors.find((s) => s.discOwner === player.id) || null;
          }
          if (targetSec) {
            targetSec.hasWarpPortal = true;
            targetSec.hasRareWarpPortal = true;
            addLog(`${player.name} placed the Warp Portal Tile on Sector ${targetSec.sectorNumber} (+1 VP to controller at game end)!`);
          }
        } else if (tech.id === 'quantum_grid') {
          player.influenceTrack.totalDiscs += 2;
          player.influenceTrack.discsOnTrack += 2;
          addLog(`${player.name} gained 2 bonus Influence Discs from Quantum Grid.`);
        } else if (tech.id === 'advanced_robotics') {
          player.influenceTrack.totalDiscs += 1;
          player.influenceTrack.discsOnTrack += 1;
          addLog(`${player.name} gained 1 bonus Influence Disc from Advanced Robotics.`);
        } else if (tech.id === 'ancient_labs') {
          if (newState.discoveryBag && newState.discoveryBag.length > 0) {
            const disc = newState.discoveryBag.shift()!;
            player.keptDiscoveryTiles.push(disc);
            addLog(`${player.name} claimed Discovery Tile (${disc.name}) from Ancient Labs.`);
          }
        } else if (tech.id === 'artifact_key') {
          const controlledArtifacts = newState.sectors.filter(
            (s) => s.discOwner === player.id && s.hasArtifact
          ).length;
          const totalReward = controlledArtifacts * 5;
          if (totalReward > 0) {
            if (action.artifactRewardResources) {
              const m = Math.max(0, action.artifactRewardResources.money || 0);
              const sc = Math.max(0, action.artifactRewardResources.science || 0);
              const mat = Math.max(0, action.artifactRewardResources.materials || 0);
              if (m + sc + mat === totalReward) {
                player.resources.money += m;
                player.resources.science += sc;
                player.resources.materials += mat;
                addLog(
                  `${player.name} activated Artifact Key across ${controlledArtifacts} controlled Artifact(s) and received ${m} Money, ${sc} Science, ${mat} Materials!`
                );
              } else {
                newState.pendingArtifactReward = {
                  playerId: player.id,
                  totalResources: totalReward,
                  artifactsCount: controlledArtifacts,
                };
              }
            } else {
              newState.pendingArtifactReward = {
                playerId: player.id,
                totalResources: totalReward,
                artifactsCount: controlledArtifacts,
              };
            }
          }
        }

        addLog(`${player.name} researched ${tech.name} for ${cost} Science (${targetTrack.toUpperCase()} track).`);
      }
      break;
    }

    case 'UPGRADE': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      const upgradeDetails: string[] = [];
      for (const up of action.upgrades) {
        const bp = player.blueprints[up.shipType]!;
        const oldPart = bp.slots[up.slotIndex];
        const part = up.partId ? SHIP_PARTS[up.partId] || null : null;
        bp.slots[up.slotIndex] = part;

        // When installing an Ancient part from storage, remove it so it cannot be placed again
        if (up.partId && player.unlockedAncientParts && player.unlockedAncientParts.includes(up.partId)) {
          player.unlockedAncientParts = player.unlockedAncientParts.filter((pid) => pid !== up.partId);
        }

        if (part && oldPart) {
          upgradeDetails.push(`installed ${part.name} on ${up.shipType.toUpperCase()} (replaced ${oldPart.name})`);
        } else if (part) {
          upgradeDetails.push(`installed ${part.name} on ${up.shipType.toUpperCase()} (Slot ${up.slotIndex + 1})`);
        } else if (oldPart) {
          upgradeDetails.push(`removed ${oldPart.name} from ${up.shipType.toUpperCase()}`);
        }
      }
      const detailsMsg = upgradeDetails.length > 0 ? `: ${upgradeDetails.join(', ')}` : '';
      addLog(`🛠️ ${player.name} upgraded ship blueprints${detailsMsg}.`, 'action');
      break;
    }

    case 'BUILD': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      for (const item of action.items) {
        const sector = newState.sectors.find((s) => s.id === item.sectorId)!;
        const isMechanema = player.faction.id === 'mechanema';
        let cost = isMechanema ? 2 : 3;
        if (item.itemType === 'cruiser') cost = isMechanema ? 4 : 5;
        else if (item.itemType === 'dreadnought') cost = isMechanema ? 7 : 8;
        else if (item.itemType === 'starbase') cost = isMechanema ? 2 : 3;
        else if (item.itemType === 'orbital') cost = isMechanema ? 3 : 4;
        else if (item.itemType === 'monolith') cost = isMechanema ? 8 : 10;

        player.resources.materials -= cost;

        if (item.itemType === 'monolith') {
          sector.structures = sector.structures || {};
          sector.structures.monolith = true;
          addLog(`🏗️ ${player.name} built a Monolith in Sector ${sector.sectorNumber} for ${cost} Materials.`, 'action');
        } else if (item.itemType === 'orbital') {
          sector.structures = sector.structures || {};
          sector.structures.orbital = true;
          sector.planets.push({
            id: `orbital_${sector.id}_${Date.now()}`,
            resource: 'science',
            isAdvanced: false,
            isOrbital: true,
          });
          addLog(`🛰️ ${player.name} built an Orbital in Sector ${sector.sectorNumber} for ${cost} Materials.`, 'action');
        } else {
          sector.ships.push({
            id: `ship_${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ownerId: player.id,
            type: item.itemType as ShipType,
            damage: 0,
          });
          addLog(`🚀 ${player.name} constructed a ${item.itemType.toUpperCase()} in Sector ${sector.sectorNumber} for ${cost} Materials.`, 'action');
        }
      }
      break;
    }

    case 'MOVE': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      // Group moves by activation index
      const stepsByActivation: Record<number, typeof action.moves> = {};
      const moves = action.moves || [];
      for (const step of moves) {
        const actIdx = step.activationIndex ?? 0;
        if (!stepsByActivation[actIdx]) {
          stepsByActivation[actIdx] = [];
        }
        stepsByActivation[actIdx]!.push(step);
      }

      for (const actIdxStr of Object.keys(stepsByActivation)) {
        const actSteps = stepsByActivation[Number(actIdxStr)]!;
        for (const step of actSteps) {
          const fromSector = newState.sectors.find((s) => s.id === step.fromSectorId)!;
          const toSector = newState.sectors.find((s) => s.id === step.toSectorId)!;

          const shipIdx = fromSector.ships.findIndex((s) => s.id === step.shipId);
          if (shipIdx >= 0) {
            const [movedShip] = fromSector.ships.splice(shipIdx, 1);
            if (movedShip) {
              toSector.ships.push(movedShip);
              toSector.playerEntryOrder = toSector.playerEntryOrder || [];
              if (!toSector.playerEntryOrder.includes(player.id)) {
                toSector.playerEntryOrder.push(player.id);
              }

              // Check if moved into allied player's territory -> break alliance and take Traitor tile (-2 VP)
              const alliedPresent =
                (toSector.discOwner && toSector.discOwner !== player.id && player.ambassadorTiles.includes(toSector.discOwner) ? toSector.discOwner : null) ||
                toSector.ships.find((s) => s.ownerId !== player.id && s.ownerId.startsWith('player_') && player.ambassadorTiles.includes(s.ownerId))?.ownerId ||
                toSector.planets.find((p) => p.colonizedBy && p.colonizedBy !== player.id && player.ambassadorTiles.includes(p.colonizedBy))?.colonizedBy;

              if (alliedPresent) {
                const allyPlayer = newState.players.find((p) => p.id === alliedPresent);
                player.ambassadorTiles = (player.ambassadorTiles || []).filter((id) => id !== alliedPresent);
                if (player.ambassadorCubes?.[alliedPresent]) {
                  const pRes = player.ambassadorCubes[alliedPresent];
                  player.population[pRes].cubesOnBoard = Math.min(11, player.population[pRes].cubesOnBoard + 1);
                  delete player.ambassadorCubes[alliedPresent];
                }
                if (allyPlayer) {
                  allyPlayer.ambassadorTiles = (allyPlayer.ambassadorTiles || []).filter((id) => id !== player.id);
                  if (allyPlayer.ambassadorCubes?.[player.id]) {
                    const allyRes = allyPlayer.ambassadorCubes[player.id];
                    allyPlayer.population[allyRes].cubesOnBoard = Math.min(11, allyPlayer.population[allyRes].cubesOnBoard + 1);
                    delete allyPlayer.ambassadorCubes[player.id];
                  }
                }
                newState.traitorPlayerId = player.id;
                addLog(`⚔️ ${player.name} moved into allied space of ${allyPlayer?.name || alliedPresent}, breaking the alliance and claiming the Traitor Tile (-2 VP)!`, 'combat');
              }

              addLog(
                `${player.name} navigated a ${movedShip.type.toUpperCase()} from Sector ${fromSector.sectorNumber} to Sector ${toSector.sectorNumber}.`
              );
            }
          }
        }
      }
      break;
    }

    case 'DIPLOMACY_EXCHANGE': {
      const targetPlayer = newState.players.find((p) => p.id === action.targetPlayerId);
      if (targetPlayer) {
        player.ambassadorTiles = player.ambassadorTiles || [];
        targetPlayer.ambassadorTiles = targetPlayer.ambassadorTiles || [];
        player.ambassadorTiles.push(targetPlayer.id);
        targetPlayer.ambassadorTiles.push(player.id);

        player.ambassadorCubes = player.ambassadorCubes || {};
        targetPlayer.ambassadorCubes = targetPlayer.ambassadorCubes || {};

        const initCube =
          action.initiatorCube ||
          (player.population.money.cubesOnBoard > 0
            ? 'money'
            : player.population.science.cubesOnBoard > 0
            ? 'science'
            : 'material');
        const tgtCube =
          action.targetCube ||
          (targetPlayer.population.money.cubesOnBoard > 0
            ? 'money'
            : targetPlayer.population.science.cubesOnBoard > 0
            ? 'science'
            : 'material');

        player.population[initCube].cubesOnBoard = Math.max(0, player.population[initCube].cubesOnBoard - 1);
        targetPlayer.population[tgtCube].cubesOnBoard = Math.max(0, targetPlayer.population[tgtCube].cubesOnBoard - 1);

        player.ambassadorCubes[targetPlayer.id] = initCube;
        targetPlayer.ambassadorCubes[player.id] = tgtCube;

        const cubeIcon = (c: string) => (c === 'money' ? '💰' : c === 'science' ? '🔬' : '🔨');
        addLog(
          `🤝 ${player.name} (${cubeIcon(initCube)}) and ${targetPlayer.name} (${cubeIcon(tgtCube)}) established Diplomatic Relations and exchanged Ambassadors (+1 VP each)!`,
          'action'
        );
      }
      break;
    }

    case 'INFLUENCE': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      // Flip two colony ships face-up (ready)
      player.colonyShips.ready = Math.min(
        player.colonyShips.total,
        player.colonyShips.ready + 2
      );

      // Abandon sectors first (returns influence discs and population cubes)
      if (action.abandonSectors) {
        for (const secId of action.abandonSectors) {
          const sec = newState.sectors.find((s) => s.id === secId);
          if (sec && sec.discOwner === player.id) {
            sec.discOwner = undefined;
            const discsBefore = player.influenceTrack.discsOnTrack;
            player.influenceTrack.discsOnTrack = Math.min(
              player.influenceTrack.totalDiscs,
              player.influenceTrack.discsOnTrack + 1
            );
            // Return any population cubes in this sector to player board
            for (const p of sec.planets) {
              if (p.colonizedBy === player.id) {
                const res = p.colonizedResource || (p.resource !== 'any' ? p.resource : 'money');
                if (res === 'money' || res === 'science' || res === 'material') {
                  player.population[res].cubesOnBoard = Math.min(
                    11,
                    player.population[res].cubesOnBoard + 1
                  );
                }
                p.colonizedBy = undefined;
                p.colonizedResource = undefined;
              }
            }
            // If player is resolving bankruptcy, calculate upkeep savings and apply to deficit
            if (newState.pendingBankruptcy && newState.pendingBankruptcy.playerId === player.id) {
              const oldUpkeep = UPKEEP_TABLE[discsBefore] ?? 30;
              const newUpkeep = UPKEEP_TABLE[player.influenceTrack.discsOnTrack] ?? 0;
              const savedUpkeep = Math.max(0, oldUpkeep - newUpkeep);
              player.resources.money += savedUpkeep;
              addLog(`${player.name} abandoned Sector ${sec.sectorNumber} during bankruptcy, saving ${savedUpkeep} upkeep!`, 'economy');
              if (player.resources.money >= 0) {
                addLog(`${player.name} restored budget solvency! Deficit cleared.`, 'economy');
                newState.pendingBankruptcy = null;
                checkNextBankruptcyOrCleanup(newState);
              } else {
                newState.pendingBankruptcy.deficit = Math.abs(player.resources.money);
              }
            } else {
              addLog(`${player.name} removed their Influence Disc and returned population cubes from Sector ${sec.sectorNumber}.`);
            }
          }
        }
      }

      // Claim sectors next (places influence disc from track)
      if (action.claimSectors) {
        for (const secId of action.claimSectors) {
          const sec = newState.sectors.find((s) => s.id === secId);
          if (sec && !sec.discOwner && player.influenceTrack.discsOnTrack > 0) {
            player.influenceTrack.discsOnTrack -= 1;
            sec.discOwner = player.id;
            addLog(`${player.name} claimed control of Sector ${sec.sectorNumber} with an Influence Disc!`);
            if (sec.discoveryTile && !sec.discoveryClaimed && (!sec.ancientsCount || sec.ancientsCount === 0) && !newState.pendingDiscovery) {
              newState.pendingDiscovery = {
                sectorId: sec.id,
                discovery: sec.discoveryTile,
                playerId: player.id,
              };
              addLog(`${player.name} discovered an Ancient artifact in Sector ${sec.sectorNumber}! Awaiting commander's decision...`);
            }
          }
        }
      }
      break;
    }

    case 'COLONIZE': {
      player.colonyShips.ready -= 1;
      const sector = newState.sectors.find((s) => s.id === action.sectorId)!;
      const planet = sector.planets[action.planetIndex]!;
      planet.colonizedBy = player.id;

      let placedRes: 'money' | 'science' | 'material';
      if (planet.isOrbital) {
        placedRes = action.chosenResource === 'money' ? 'money' : 'science';
      } else if (planet.resource === 'any') {
        placedRes = action.chosenResource || 'money';
      } else {
        placedRes = planet.resource as 'money' | 'science' | 'material';
      }

      planet.colonizedResource = placedRes;
      player.population[placedRes].cubesOnBoard = Math.max(0, player.population[placedRes].cubesOnBoard - 1);
      addLog(`${player.name} colonized a ${placedRes.toUpperCase()} slot in Sector ${sector.sectorNumber}.`);
      return { success: true, newState }; // Colonize does not pass the turn
    }

    case 'TRADE': {
      const ratio = player.faction.tradeRatio || 2;
      const toRes = action.toResource || 'money';
      const gained = action.amount / ratio;

      if (action.fromResource === 'money') {
        player.resources.money -= action.amount;
      } else if (action.fromResource === 'science') {
        player.resources.science -= action.amount;
      } else {
        player.resources.materials -= action.amount;
      }

      if (toRes === 'money') {
        player.resources.money += gained;
      } else if (toRes === 'science') {
        player.resources.science += gained;
      } else {
        player.resources.materials += gained;
      }

      addLog(`${player.name} traded ${action.amount} ${action.fromResource} for ${gained} ${toRes}.`);

      if (newState.pendingBankruptcy && newState.pendingBankruptcy.playerId === player.id) {
        if (player.resources.money >= 0) {
          addLog(`${player.name} restored budget solvency! Deficit cleared.`, 'economy');
          newState.pendingBankruptcy = null;
          checkNextBankruptcyOrCleanup(newState);
        } else {
          newState.pendingBankruptcy.deficit = Math.abs(player.resources.money);
        }
      }

      return { success: true, newState };
    }

    case 'PASS': {
      newState.consecutivePasses = (newState.consecutivePasses || 0) + 1;
      if (!newState.passedPlayerIds.includes(player.id)) {
        newState.passedPlayerIds.push(player.id);
        player.hasPassed = true;

        if (newState.passedPlayerIds.length === 1) {
          player.isFirstPasser = true;
          player.resources.money += 2; // First to pass gets +2 Credits bonus!
          addLog(`${player.name} was FIRST to PASS and received 2 Credits bonus!`, 'system');
        } else {
          addLog(`${player.name} passed for the round.`);
        }
      } else {
        addLog(`${player.name} passed.`);
      }
      break;
    }

    case 'DISCOVERY_CHOICE': {
      if (!newState.pendingDiscovery || newState.pendingDiscovery.playerId !== player.id) {
        return { success: false, newState: state, error: 'No pending discovery choice for this player.' };
      }
      const disc = newState.pendingDiscovery.discovery;
      const sector = newState.sectors.find((s) => s.id === newState.pendingDiscovery!.sectorId);
      if (sector) {
        sector.discoveryClaimed = true;
        sector.discoveryTile = undefined;
      }
      if (action.keepForVictoryPoints) {
        player.keptDiscoveryTiles = player.keptDiscoveryTiles || [];
        player.keptDiscoveryTiles.push(disc);
        addLog(`${player.name} chose to keep Discovery Tile "${disc.name}" for 2 Victory Points!`);
      } else {
        if (disc.immediateReward?.money) player.resources.money += disc.immediateReward.money;
        if (disc.immediateReward?.science) player.resources.science += disc.immediateReward.science;
        if (disc.immediateReward?.materials) player.resources.materials += disc.immediateReward.materials;
        if (disc.immediateReward?.grantStructure === 'orbital' && sector) {
          sector.structures = sector.structures || {};
          sector.structures.orbital = true;
          sector.planets.push({
            id: `orbital_${sector.id}_${Date.now()}`,
            resource: 'science',
            isAdvanced: false,
            isOrbital: true,
          });
          addLog(`${player.name} placed an Ancient Orbital in Sector ${sector.sectorNumber}!`);
        }
        if (disc.immediateReward?.grantStructure === 'monolith' && sector) {
          sector.structures = sector.structures || {};
          sector.structures.monolith = true;
          sector.hasMonolith = true;
          addLog(`${player.name} placed an Ancient Monolith in Sector ${sector.sectorNumber}!`);
        }
        if (disc.immediateReward?.warpPortal && sector) {
          sector.hasWarpPortal = true;
          sector.hasDiscoveryWarpPortal = true;
          addLog(`${player.name} discovered and placed an Ancient Warp Portal in Sector ${sector.sectorNumber}!`);
        }
        if (disc.immediateReward?.ancientTech) {
          const eligibleTechs = newState.techSupply
            .filter(
              (t) =>
                t.category !== 'rare' &&
                !player.techTrack.researched.some((r) => r.id === t.id)
            )
            .sort((a, b) => a.baseCost - b.baseCost);

          if (eligibleTechs.length > 0) {
            const minCost = eligibleTechs[0]!.baseCost;
            const tiedLowest = eligibleTechs.filter((t) => t.baseCost === minCost);
            const chosenTech = (action.chosenTechId && tiedLowest.find((t) => t.id === action.chosenTechId)) || tiedLowest[0]!;
            const techIdx = newState.techSupply.findIndex((t) => t.id === chosenTech.id);
            if (techIdx >= 0) {
              newState.techSupply.splice(techIdx, 1);
            }
            const targetTrack = chosenTech.category as 'military' | 'grid' | 'nano';
            player.techTrack.researched.push({ ...chosenTech, placedTrack: targetTrack });
            if (targetTrack === 'military') player.techTrack.militaryCount += 1;
            else if (targetTrack === 'grid') player.techTrack.gridCount += 1;
            else if (targetTrack === 'nano') player.techTrack.nanoCount += 1;

            if (chosenTech.id === 'quantum_grid') {
              player.influenceTrack.totalDiscs += 2;
              player.influenceTrack.discsOnTrack += 2;
            } else if (chosenTech.id === 'advanced_robotics') {
              player.influenceTrack.totalDiscs += 1;
              player.influenceTrack.discsOnTrack += 1;
            }
            addLog(`${player.name} acquired free Ancient Tech: ${chosenTech.name}!`);
          } else {
            addLog(`${player.name} explored Ancient Tech but no eligible regular tech remained in the supply.`);
          }
        }
        const grantShip = disc.immediateReward?.grantShipType || (disc.id === 'disc_ancient_cruiser' ? 'cruiser' : undefined);
        if (grantShip && sector) {
          const currentShips = countPlayerShips(newState.sectors, player.id);
          if (currentShips[grantShip] < SHIP_LIMITS[grantShip]) {
            sector.ships.push({
              id: `ship_${player.id}_discovery_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              ownerId: player.id,
              type: grantShip,
              damage: 0,
            });
            addLog(`${player.name} deployed a free ${grantShip.toUpperCase()} to Sector ${sector.sectorNumber}!`);
          } else {
            addLog(`${player.name} could not deploy free ${grantShip.toUpperCase()}: maximum limit of ${SHIP_LIMITS[grantShip]} already deployed.`);
          }
        }
        if (disc.shipPartId) {
          player.unlockedAncientParts = player.unlockedAncientParts || [];

          if (action.equipShipType && action.equipSlotIndex !== undefined) {
            const bp = player.blueprints[action.equipShipType];
            const part = SHIP_PARTS[disc.shipPartId];
            if (bp && part && action.equipSlotIndex >= 0 && action.equipSlotIndex < bp.maxSlots) {
              const testBp = { ...bp, slots: [...bp.slots] };
              testBp.slots[action.equipSlotIndex] = part;
              const testStats = calculateBlueprintStats(testBp);
              if (testStats.powerConsumed > testStats.powerProduced) {
                return {
                  success: false,
                  newState: state,
                  error: `Cannot install ${part.name}: power consumed (${testStats.powerConsumed}) exceeds power produced (${testStats.powerProduced}).`,
                };
              }
              bp.slots[action.equipSlotIndex] = part;
              // Placed immediately when taken: ensure it is NOT stored in player.unlockedAncientParts
              player.unlockedAncientParts = player.unlockedAncientParts.filter((pid) => pid !== disc.shipPartId);
              addLog(`${player.name} equipped Ancient Tech "${part.name}" directly to their ${action.equipShipType.toUpperCase()} blueprint (Slot ${action.equipSlotIndex + 1})!`);
            }
          } else {
            // Stored without immediately placing: add to unlockedAncientParts for future upgrades
            if (!player.unlockedAncientParts.includes(disc.shipPartId)) {
              player.unlockedAncientParts.push(disc.shipPartId);
            }
            addLog(`${player.name} claimed Ancient Tech module "${disc.name}" for future ship upgrades!`);
          }
        }
        addLog(`${player.name} claimed Discovery Reward: ${disc.name} (${disc.description})!`);
      }
      newState.pendingDiscovery = null;
      if (newState.phase === 'COMBAT_PHASE') {
        if (!newState.pendingCombatConquest && !newState.activeCombat) {
          checkAndTriggerCombat(newState);
        }
        return { success: true, newState };
      }
      break;
    }

    case 'COMBAT_CONQUEST': {
      if (!newState.pendingCombatConquest || newState.pendingCombatConquest.winnerPlayerId !== player.id) {
        return { success: false, newState: state, error: 'No combat conquest decision pending for this player.' };
      }
      const sector = newState.sectors.find((s) => s.id === action.sectorId);
      if (!sector) {
        return { success: false, newState: state, error: 'Sector not found.' };
      }

      const conquestInfo = newState.pendingCombatConquest;

      // 1. Influence Disc placement decision
      if (action.claimInfluence) {
        if (sector.discOwner !== player.id && player.influenceTrack.discsOnTrack > 0) {
          player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
          sector.discOwner = player.id;
          addLog(`${player.name} placed an Influence Disc to take control of Sector ${sector.sectorNumber}!`, 'combat');
        }
      } else {
        if (sector.discOwner !== player.id) {
          addLog(`${player.name} chose not to place an Influence Disc in Sector ${sector.sectorNumber}.`, 'combat');
        }
      }

      // 2. Colonization decision (only if player controls the sector)
      if (action.colonizePlanetIndices && action.colonizePlanetIndices.length > 0 && sector.discOwner === player.id) {
        for (const pIdx of action.colonizePlanetIndices) {
          const planet = sector.planets[pIdx];
          if (planet && !planet.colonizedBy && player.colonyShips.ready > 0) {
            planet.colonizedBy = player.id;
            player.colonyShips.ready = Math.max(0, player.colonyShips.ready - 1);
            let placedRes: 'money' | 'science' | 'material';
            if (planet.isOrbital) {
              placedRes = player.population.money.cubesOnBoard > 0 ? 'money' : 'science';
            } else if (planet.resource === 'any') {
              placedRes = player.population.money.cubesOnBoard > 0 ? 'money' : player.population.science.cubesOnBoard > 0 ? 'science' : 'material';
            } else {
              placedRes = planet.resource as 'money' | 'science' | 'material';
            }
            planet.colonizedResource = placedRes;
            player.population[placedRes].cubesOnBoard = Math.max(0, player.population[placedRes].cubesOnBoard - 1);
            addLog(`${player.name} colonized a ${placedRes.toUpperCase()} habitat in Sector ${sector.sectorNumber} using a Colony Ship!`, 'action');
          }
        }
      }

      // 3. Clear pending conquest
      newState.pendingCombatConquest = null;

      // 4. Reveal guarded discovery tile if present
      if (conquestInfo.discoveryToClaim) {
        newState.pendingDiscovery = {
          sectorId: sector.id,
          discovery: conquestInfo.discoveryToClaim,
          playerId: player.id,
        };
        addLog(`${player.name} secured Sector ${sector.sectorNumber} and uncovered an Ancient Discovery Cache!`, 'system');
      } else if (newState.phase === 'COMBAT_PHASE' && !newState.activeCombat) {
        checkAndTriggerCombat(newState);
      }

      return { success: true, newState };
    }

    case 'RESOLVE_COMBAT_STEP': {
      if (newState.activeCombat) {
        const sector = newState.sectors.find((s) => s.id === newState.activeCombat!.sectorId);
        if (sector) {
          const concludeEngagement = (winnerId: string | undefined, currentUnits: ReturnType<typeof buildCombatUnitsForSector>) => {
            // Identify duel participants (Bug 57: even if ships destroyed, player participated)
            const duelPlayerIds = (newState.activeCombat?.participatingPlayerIds || Array.from(new Set(currentUnits.map((u) => u.ownerId)))).filter((id) => id.startsWith('player_'));

            // Compute reputation tiles for participating players
            const repDrawQueue: { playerId: string; drawnTiles: number[]; sectorId: string }[] = [];

            for (const pId of duelPlayerIds) {
              const attemptedRetreat = newState.activeCombat?.retreatAttemptedPlayerIds?.includes(pId);
              const survivingShipsInSec = sector.ships.filter((s) => s.ownerId === pId).length;
              const allRetreated = attemptedRetreat && survivingShipsInSec === 0 && !newState.activeCombat?.destroyedShips?.some((d) => d.ownerId === pId);
              
              const isLoser = Boolean(winnerId && pId !== winnerId);
              const playerKills = (newState.activeCombat?.destroyedShips || []).filter(
                (casualty) => casualty.killerId === pId && casualty.ownerId !== pId
              );

              let tilesCount = allRetreated ? 0 : 1; // 1 tile for participating unless all retreated without losses

              if (isLoser && playerKills.length === 0) {
                // Bug 70: loser of the battle should only draw 1 rep tile if he doesn't destroy anything
                tilesCount = allRetreated ? 0 : 1;
              } else {
                // Kills tiles
                for (const casualty of playerKills) {
                  if (casualty.type === 'interceptor' || casualty.type === 'starbase' || casualty.type === 'ancient') {
                    tilesCount += 1;
                  } else if (casualty.type === 'cruiser' || casualty.type === 'guardian') {
                    tilesCount += 2;
                  } else if (casualty.type === 'dreadnought' || casualty.type === 'gcds') {
                    tilesCount += 3;
                  }
                }
              }

              tilesCount = Math.min(5, tilesCount); // Maximum 5 tiles drawn per battle

              if (tilesCount > 0 && newState.reputationBag.length > 0) {
                const drawn: number[] = [];
                for (let k = 0; k < tilesCount && newState.reputationBag.length > 0; k++) {
                  drawn.push(newState.reputationBag.pop()!);
                }
                if (drawn.length > 0) {
                  repDrawQueue.push({
                    playerId: pId,
                    drawnTiles: drawn,
                    sectorId: sector.id,
                  });
                }
              }
            }

            // Remove eliminated / retreated participants from sector.playerEntryOrder
            if (sector.playerEntryOrder) {
              sector.playerEntryOrder = sector.playerEntryOrder.filter((pId) => {
                return sector.ships.some((s) => s.ownerId === pId);
              });
            }

            // Check if more combats remain in this sector (Bug 66: multi-player sequential combat)
            const remainingOwners = Array.from(new Set(sector.ships.map((s) => s.ownerId)));
            const hasMoreCombatsInSector =
              remainingOwners.length > 1 &&
              !(remainingOwners.length === 2 && remainingOwners.includes('ancient') && remainingOwners.some((o) => newState.players.find((p) => p.id === o)?.faction.id === 'descendants_of_draco'));

            if (hasMoreCombatsInSector) {
              // Winner continues to fight the next player WITHOUT repairing ship damage!
              addLog(
                `⚔️ Duel in Sector ${sector.sectorNumber} resolved. Victor ${winnerId || 'Unknown'} advances to fight the next opponent without repairing ship damage!`,
                'combat'
              );
              newState.activeCombat = null;

              if (repDrawQueue.length > 0) {
                newState.pendingReputationDraw = repDrawQueue[0];
                newState.pendingReputationDrawQueue = repDrawQueue.slice(1);
              } else {
                checkAndTriggerCombat(newState);
              }
              return;
            }

            // All combats in this sector are complete!
            // 1. Repair damage on surviving ships
            for (const ship of sector.ships) {
              ship.damage = 0;
            }

            addLog(`Combat in Sector ${sector.sectorNumber} has concluded! Winner: ${winnerId || 'None'}.`, 'combat');

            if (!newState.resolvedCombatSectorIds) {
              newState.resolvedCombatSectorIds = [];
            }
            newState.resolvedCombatSectorIds.push(sector.id);

            // 2. Resolve attacking population & influence conquest
            resolveAttackingPopulationAndConquest(newState, sector, winnerId);

            newState.activeCombat = null;

            // 3. Enqueue reputation draws
            if (repDrawQueue.length > 0) {
              newState.pendingReputationDraw = repDrawQueue[0];
              newState.pendingReputationDrawQueue = repDrawQueue.slice(1);
            } else if (!newState.pendingCombatConquest) {
              checkAndTriggerCombat(newState);
            }
          };

          const units = buildCombatUnitsForSector(sector, newState.players, newState.activeCombat.participatingPlayerIds);

          // If combat is already in 'resolved' stage or explicitly flagged to conclude:
          if (newState.activeCombat.stage === 'resolved' || action.concludeCombat) {
            const winnerId = (newState.activeCombat as any).winnerOwnerId || getSectorDefenderOwnerId(sector);
            concludeEngagement(winnerId, units);
            return { success: true, newState };
          }

          const defenderId = newState.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sector);
          const destroyedBeforeCount = newState.activeCombat.destroyedShips?.length || 0;

          const combatRes = executeCombatStep(
            units,
            newState.activeCombat,
            {
              retreatShipIds: action.retreatShipIds,
              retreatDestinationSectorId: action.retreatDestinationSectorId,
            },
            defenderId
          );

          if (combatRes.declaredRetreat) {
            const p = newState.players.find((pl) => pl.id === combatRes.declaredRetreat!.ownerId);
            const destSec = newState.sectors.find((s) => s.id === combatRes.declaredRetreat!.destinationSectorId);
            addLog(
              `${p ? p.name : 'Ships'} declared retreat towards Sector ${destSec ? destSec.sectorNumber : combatRes.declaredRetreat.destinationSectorId}.`,
              'combat'
            );
          }

          if (combatRes.completedRetreat) {
            const p = newState.players.find((pl) => pl.id === combatRes.completedRetreat!.ownerId);
            const destSec = newState.sectors.find((s) => s.id === combatRes.completedRetreat!.destinationSectorId);
            const sIdx = sector.ships.findIndex((s) => s.id === combatRes.completedRetreat!.shipId);
            if (sIdx >= 0 && destSec) {
              const [retreatedShip] = sector.ships.splice(sIdx, 1);
              retreatedShip.damage = 0;
              destSec.ships.push(retreatedShip);
              addLog(
                `${p ? p.name : 'Ship'} completed retreat into Sector ${destSec.sectorNumber}.`,
                'combat'
              );
            }
          }

          // Update sector ship damage / casualties
          sector.ships = sector.ships.filter((s) => {
            const u = combatRes.updatedUnits.find((unit) => unit.id === s.id);
            if (!u) return false;
            s.damage = u.currentDamage;
            return s.damage < u.maxHull;
          });

          // Keep ancientsCount and hasGCDS synchronized with surviving sector ships
          sector.ancientsCount = sector.ships.filter(
            (s) => s.ownerId === 'ancient' || s.type === 'ancient'
          ).length;
          sector.hasGCDS = sector.ships.some(
            (s) => s.ownerId === 'gcds' || s.type === 'gcds'
          );

          newState.activeCombat.lastRolls = combatRes.rolls;
          newState.activeCombat.currentTurnIndex += 1;

          // Detailed Salvo Logs
          if (combatRes.rolls.length > 0) {
            const firingOwner = combatRes.rolls[0]?.shipOwner;
            const firingPlayer = newState.players.find((p) => p.id === firingOwner);
            const firingLabel = firingPlayer ? firingPlayer.name : firingOwner?.toUpperCase() || 'Vessel';
            const hits = combatRes.rolls.filter((r) => r.isHit).length;
            const totalDmg = combatRes.rolls.reduce((sum, r) => sum + (r.isHit ? r.damage : 0), 0);
            const diceSummary = combatRes.rolls.map((r) => `${r.roll}${r.isHit ? '✓' : '✗'}`).join(' ');
            addLog(
              `⚔️ Sector ${sector.sectorNumber}: ${firingLabel} salvo [${diceSummary}] ➔ ${hits} hit(s), ${totalDmg} dmg.`,
              'combat'
            );
          }

          // Log any newly destroyed ships
          const newlyDestroyed = (newState.activeCombat.destroyedShips || []).slice(destroyedBeforeCount);
          for (const des of newlyDestroyed) {
            const victimOwner = newState.players.find((p) => p.id === des.ownerId);
            const victimLabel = victimOwner ? victimOwner.name : des.ownerId.toUpperCase();
            addLog(
              `💥 ${victimLabel} ${des.type.toUpperCase()} was destroyed in Sector ${sector.sectorNumber}!`,
              'combat'
            );
          }

          if (combatRes.isCombatOver) {
            (newState.activeCombat as any).winnerOwnerId = combatRes.winnerOwnerId;

            // If lethal rolls were rolled and concludeCombat was not requested, pause in 'resolved' stage so players see the final roll!
            if (combatRes.rolls.length > 0 && !action.concludeCombat) {
              newState.activeCombat.stage = 'resolved';
              addLog(
                `🏁 Engagement resolved in Sector ${sector.sectorNumber}! Victor: ${combatRes.winnerOwnerId || 'None'}. Review salvo and conclude to continue.`,
                'combat'
              );
              return { success: true, newState };
            }

            concludeEngagement(combatRes.winnerOwnerId, units);
          }
        }
      }
      return { success: true, newState };
    }

    case 'CLAIM_REPUTATION_TILE': {
      if (!newState.pendingReputationDraw || newState.pendingReputationDraw.playerId !== player.id) {
        return { success: false, newState: state, error: 'No reputation tile draw pending for this commander.' };
      }

      const pending = newState.pendingReputationDraw;
      const drawnTiles = [...pending.drawnTiles];

      if (
        action.selectedTileIndex !== undefined &&
        action.selectedTileIndex >= 0 &&
        action.selectedTileIndex < drawnTiles.length
      ) {
        const keptTile = drawnTiles.splice(action.selectedTileIndex, 1)[0]!;
        const maxRepTiles = player.faction.reputationSlots ?? 5;

        if (
          player.reputationTiles.length >= maxRepTiles &&
          action.replaceTrackIndex !== undefined &&
          action.replaceTrackIndex >= 0 &&
          action.replaceTrackIndex < player.reputationTiles.length
        ) {
          const [oldTile] = player.reputationTiles.splice(action.replaceTrackIndex, 1);
          if (oldTile !== undefined) {
            newState.reputationBag.push(oldTile);
          }
          player.reputationTiles.push(keptTile);
          addLog(
            `${player.name} placed a ${keptTile} VP Reputation Tile on their track (replaced ${oldTile} VP).`,
            'combat'
          );
        } else if (player.reputationTiles.length < maxRepTiles) {
          player.reputationTiles.push(keptTile);
          addLog(`${player.name} placed a ${keptTile} VP Reputation Tile on their track.`, 'combat');
        } else {
          newState.reputationBag.push(keptTile);
          addLog(
            `${player.name} returned the drawn ${keptTile} VP Reputation Tile to the bag (track is full).`,
            'combat'
          );
        }
      } else {
        addLog(`${player.name} declined to keep a Reputation Tile.`, 'combat');
      }

      // Return remaining unselected drawn tiles to bag
      for (const t of drawnTiles) {
        newState.reputationBag.push(t);
      }
      newState.reputationBag.sort(() => Math.random() - 0.5);

      // Advance queue or finish reputation phase
      if (newState.pendingReputationDrawQueue && newState.pendingReputationDrawQueue.length > 0) {
        newState.pendingReputationDraw = newState.pendingReputationDrawQueue.shift()!;
      } else {
        newState.pendingReputationDraw = null;
        newState.pendingReputationDrawQueue = [];

        // Check for next combat or conquest
        if (!newState.pendingCombatConquest && newState.phase === 'COMBAT_PHASE' && !newState.activeCombat) {
          checkAndTriggerCombat(newState);
        }
      }

      return { success: true, newState };
    }

    case 'ALLOCATE_ARTIFACT_REWARD': {
      if (!newState.pendingArtifactReward || newState.pendingArtifactReward.playerId !== action.playerId) {
        return { newState: state, error: 'No pending Artifact Key reward for this player.' };
      }
      const totalReward = newState.pendingArtifactReward.totalResources;
      const m = Math.max(0, action.resources.money || 0);
      const sc = Math.max(0, action.resources.science || 0);
      const mat = Math.max(0, action.resources.materials || 0);
      if (m + sc + mat !== totalReward) {
        return {
          newState: state,
          error: `Total allocated resources (${m + sc + mat}) must equal exactly ${totalReward}.`,
        };
      }

      player.resources.money += m;
      player.resources.science += sc;
      player.resources.materials += mat;
      addLog(
        `${player.name} allocated Artifact Key rewards: ${m} Money, ${sc} Science, ${mat} Materials!`,
        'action'
      );
      newState.pendingArtifactReward = null;
      break;
    }

    case 'ABANDON_SECTOR_BANKRUPTCY': {
      if (!newState.pendingBankruptcy || newState.pendingBankruptcy.playerId !== action.playerId) {
        return { newState: state, error: 'No pending bankruptcy for this player.' };
      }

      const sector = newState.sectors.find((s) => s.id === action.sectorId);
      if (!sector || sector.discOwner !== player.id) {
        return { newState: state, error: 'Cannot abandon a sector not controlled by this player.' };
      }

      const { updatedPlayer, savedUpkeep } = abandonSectorForUpkeep(player, sector);
      const pIdx = newState.players.findIndex((p) => p.id === player.id);
      newState.players[pIdx] = updatedPlayer;

      addLog(
        `${player.name} abandoned Sector ${sector.sectorNumber}, returning an Influence Disc and population cubes (saved ${savedUpkeep} upkeep)!`,
        'economy'
      );

      if (updatedPlayer.resources.money >= 0) {
        addLog(`${player.name} restored budget solvency! Deficit cleared.`, 'economy');
        newState.pendingBankruptcy = null;
        checkNextBankruptcyOrCleanup(newState);
      } else {
        const remainingControlled = newState.sectors.filter((s) => s.discOwner === updatedPlayer.id);
        if (remainingControlled.length > 0) {
          newState.pendingBankruptcy = {
            playerId: updatedPlayer.id,
            deficit: Math.abs(updatedPlayer.resources.money),
          };
        } else {
          updatedPlayer.isEliminated = true;
          updatedPlayer.resources.money = 0;
          for (const sec of newState.sectors) {
            sec.ships = sec.ships.filter((s) => s.ownerId !== updatedPlayer.id);
            if (sec.discOwner === updatedPlayer.id) sec.discOwner = undefined;
          }
          addLog(
            `🚨 CIVILIZATION COLLAPSE: ${updatedPlayer.name} has no sectors remaining to abandon and is ELIMINATED!`,
            'economy'
          );
          newState.pendingBankruptcy = null;
          checkNextBankruptcyOrCleanup(newState);
        }
      }

      return { success: true, newState };
    }

    case 'CONFIRM_TURN_ACTION': {
      const conf = newState.pendingActionConfirmation!;
      newState.pendingActionConfirmation = null;
      const actingPlayer = newState.players.find((p) => p.id === conf.playerId);
      addLog(
        `${actingPlayer ? actingPlayer.name : 'Commander'} confirmed action (${conf.description}) and passed turn.`,
        'action'
      );
      // Advance turn or proceed to combat phase if all passed consecutively
      const activePlayers = newState.players.filter((p) => !p.isEliminated);
      const allPassedConsecutively = (newState.consecutivePasses || 0) >= activePlayers.length;
      if (allPassedConsecutively) {
        addLog(`All commanders have passed consecutively! Proceeding to Combat Phase.`, 'system');
        newState.phase = 'COMBAT_PHASE';
        newState.resolvedCombatSectorIds = [];
        checkAndTriggerCombat(newState);
      } else {
        let nextIdx = (newState.activePlayerIndex + 1) % newState.players.length;
        let loops = 0;
        while (newState.players[nextIdx]!.isEliminated && loops < newState.players.length) {
          nextIdx = (nextIdx + 1) % newState.players.length;
          loops++;
        }
        newState.activePlayerIndex = nextIdx;
      }
      return { success: true, newState };
    }

    case 'REVERT_TURN_ACTION': {
      const conf = state.pendingActionConfirmation!;
      const restoredState: GameState = JSON.parse(conf.snapshot!);
      restoredState.pendingActionConfirmation = null;
      const actingPlayer = restoredState.players.find((p) => p.id === conf.playerId);
      if (actingPlayer) {
        restoredState.log.unshift({
          id: `log_${Date.now()}_revert`,
          timestamp: Date.now(),
          round: restoredState.round,
          phase: restoredState.phase,
          playerId: actingPlayer.id,
          message: `${actingPlayer.name} reverted their action (${conf.description}).`,
          type: 'action',
        });
      }
      return { success: true, newState: restoredState };
    }
  }

  // Turn management during ACTION_PHASE
  if (newState.phase === 'ACTION_PHASE') {
    if (newState.pendingExploreActivations && newState.pendingExploreActivations > 0) {
      // Multiple explore activations (e.g. Planta): do not advance turn yet!
      return { success: true, newState };
    }
    if (newState.pendingArtifactReward) {
      // Multiple resources choice pending for Artifact Key: do not advance turn yet!
      return { success: true, newState };
    }
    if (newState.pendingDiscovery) {
      // Discovery tile choice pending: do not advance turn or prompt confirmation yet!
      return { success: true, newState };
    }

    if (action.requireConfirmation) {
      const canRevert =
        action.type !== 'FINISH_EXPLORE' &&
        action.type !== 'DISCOVERY_CHOICE';
      let description = `${action.type} Action`;
      if (action.type === 'BUILD') {
        const buildAct = action as BuildAction;
        const count = buildAct.items?.length || 0;
        description = `Built ${count} unit(s) / structure(s)`;
      } else if (action.type === 'UPGRADE') {
        const upAct = action as UpgradeAction;
        description = `Upgraded ${upAct.upgrades?.length || 0} blueprint part(s)`;
      } else if (action.type === 'MOVE') {
        const mvAct = action as MoveAction;
        description = `Executed ${mvAct.moves?.length || 0} fleet move(s)`;
      } else if (action.type === 'RESEARCH') {
        const resAct = action as ResearchAction;
        const count = resAct.researches?.length || 1;
        description = `Researched ${count} technology(ies)`;
      } else if (action.type === 'INFLUENCE') {
        description = `Updated influence discs & colony ships`;
      } else if (action.type === 'TRADE') {
        description = `Traded resources at treasury`;
      } else if (action.type === 'EXPLORE' || action.type === 'FINISH_EXPLORE') {
        description = `Explored sector hexes`;
      } else if (action.type === 'DISCOVERY_CHOICE') {
        description = `Explored sector & resolved discovery`;
      } else if (action.type === 'PASS') {
        description = `Passed turn for this round`;
      }

      const exploreAct = action.type === 'EXPLORE' ? (action as ExploreAction) : undefined;

      newState.pendingActionConfirmation = {
        actionType: action.type === 'DISCOVERY_CHOICE' ? 'EXPLORE' : action.type,
        playerId: action.playerId,
        description,
        canRevert,
        snapshot: canRevert ? snapshotJson : undefined,
        exploreTargetCoord: exploreAct?.targetCoord,
        exploreFromCoord: exploreAct?.fromCoord,
      };
      return { success: true, newState };
    }

    const activePlayers = newState.players.filter((p) => !p.isEliminated);
    const allPassedConsecutively = (newState.consecutivePasses || 0) >= activePlayers.length;
    if (allPassedConsecutively) {
      addLog(`All commanders have passed consecutively! Proceeding to Combat Phase.`, 'system');
      newState.phase = 'COMBAT_PHASE';
      newState.resolvedCombatSectorIds = [];
      checkAndTriggerCombat(newState);
    } else {
      let nextIdx = (newState.activePlayerIndex + 1) % newState.players.length;
      let loops = 0;
      while (newState.players[nextIdx]!.isEliminated && loops < newState.players.length) {
        nextIdx = (nextIdx + 1) % newState.players.length;
        loops++;
      }
      newState.activePlayerIndex = nextIdx;
    }
  }

  return { success: true, newState };
}

export function resolveAttackingPopulationAndConquest(
  state: GameState,
  sector: SectorTile,
  winnerId?: string | { id: string }
): void {
  const actualWinnerId = typeof winnerId === 'string' ? winnerId : winnerId?.id;
  if (!actualWinnerId || typeof actualWinnerId !== 'string' || !actualWinnerId.startsWith('player_')) {
    return;
  }

  const attackerPlayer = state.players.find((p) => p.id === actualWinnerId);
  if (!attackerPlayer) return;

  const opponentCubes = sector.planets.filter(
    (p) => p.colonizedBy && p.colonizedBy !== actualWinnerId
  );

  let bombardmentSummary: import('../types/state').BombardmentSummary | undefined = undefined;

  if (opponentCubes.length > 0) {
    const hasNeutronBombs = attackerPlayer.techTrack.researched.some(
      (t) => t.id === 'neutron_bombs'
    );
    const rolls: import('../types/state').BombardmentRoll[] = [];
    const cubesDestroyed: { resource: string; planetIndex: number }[] = [];
    const firstDefPlayer = state.players.find((pl) => pl.id === opponentCubes[0]?.colonizedBy);

    if (hasNeutronBombs) {
      // Neutron Bombs automatically annihilate all unshielded population cubes in the sector
      let destroyedCount = 0;
      sector.planets.forEach((p, pIdx) => {
        if (p.colonizedBy && p.colonizedBy !== winnerId) {
          const defPlayer = state.players.find((pl) => pl.id === p.colonizedBy);
          const hasAbsorber = defPlayer?.techTrack.researched.some((t) => t.id === 'neutron_absorber');
          if (hasAbsorber) {
            // Absorber shields against neutron bombs
            return;
          }
          if (defPlayer) {
            const res = p.colonizedResource || (p.resource !== 'any' ? p.resource : 'money');
            if (res === 'money' || res === 'science' || res === 'material') {
              if (!defPlayer.graveyardCubes) {
                defPlayer.graveyardCubes = { money: 0, science: 0, material: 0 };
              }
              defPlayer.graveyardCubes[res] = (defPlayer.graveyardCubes[res] || 0) + 1;
            }
          }
          const resName = p.colonizedResource || p.resource;
          cubesDestroyed.push({ resource: resName, planetIndex: pIdx });
          p.colonizedBy = undefined;
          p.colonizedResource = undefined;
          destroyedCount++;
        }
      });
      if (destroyedCount > 0) {
        state.log.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          round: state.round,
          phase: state.phase,
          message: `${attackerPlayer.name}'s Neutron Bombs annihilated ${destroyedCount} opponent population cube(s) in Sector ${sector.sectorNumber}! (Cubes placed in Casualty Slot)`,
          type: 'combat',
        });
      }
    }

    const remainingOppCubesBeforeCannons = sector.planets.filter(
      (p) => p.colonizedBy && p.colonizedBy !== winnerId
    );

    // If opponent cubes remain (either no neutron bombs, or defender has neutron_absorber - Bug 59), resolve standard cannon bombardment
    if (remainingOppCubesBeforeCannons.length > 0) {
      let cannonDamage = 0;
      const survivingAttackerShips = sector.ships.filter((s) => s.ownerId === winnerId);

      for (const s of survivingAttackerShips) {
        const bp = attackerPlayer.blueprints[s.type];
        if (!bp) continue;
        const stats = calculateBlueprintStats(bp);
        const compBonus = stats.computerBonus;

        for (const slot of bp.slots) {
          if (slot?.dice) {
            for (const d of slot.dice) {
              if (d.isMissile) continue; // Missiles cannot bombard population
              for (let r = 0; r < d.count; r++) {
                const roll = rollD6();
                const modified = roll + compBonus;
                const isHit = roll === 6 || (roll > 1 && modified >= 6);
                const dmg = isHit ? d.damagePerHit : 0;
                rolls.push({
                  shipType: s.type,
                  diceColor: d.color,
                  roll,
                  isHit,
                  damage: dmg,
                });
                if (isHit) {
                  cannonDamage += d.damagePerHit;
                }
              }
            }
          }
        }
      }

      let damageRemaining = cannonDamage;
      const targetPlanetsWithIndices = sector.planets
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => p.colonizedBy && p.colonizedBy !== winnerId)
        .sort((a, b) => {
          const resA = a.p.colonizedResource || a.p.resource;
          const resB = b.p.colonizedResource || b.p.resource;
          const order = { money: 1, material: 2, science: 3, any: 4 };
          return ((order as any)[resA] || 5) - ((order as any)[resB] || 5);
        });

      let cannonCubesDestroyed = 0;
      for (const { p, idx } of targetPlanetsWithIndices) {
        const defPlayer = state.players.find((pl) => pl.id === p.colonizedBy);
        const isPlanta = defPlayer?.faction.id === 'planta';
        if (!isPlanta && damageRemaining <= 0) break;

        if (defPlayer) {
          const res = p.colonizedResource || (p.resource !== 'any' ? p.resource : 'money');
          if (res === 'money' || res === 'science' || res === 'material') {
            if (!defPlayer.graveyardCubes) {
              defPlayer.graveyardCubes = { money: 0, science: 0, material: 0 };
            }
            defPlayer.graveyardCubes[res] = (defPlayer.graveyardCubes[res] || 0) + 1;
          }
        }
        cubesDestroyed.push({ resource: p.colonizedResource || p.resource, planetIndex: idx });
        p.colonizedBy = undefined;
        p.colonizedResource = undefined;
        cannonCubesDestroyed++;
        if (!isPlanta) {
          damageRemaining -= 1;
        }
      }

      const remainingOppCubes = sector.planets.filter(
        (p) => p.colonizedBy && p.colonizedBy !== winnerId
      ).length;

      state.log.unshift({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        round: state.round,
        phase: state.phase,
        message: `${attackerPlayer.name} bombarded Sector ${sector.sectorNumber} population with cannons: rolled ${cannonDamage} damage, destroying ${cannonCubesDestroyed} cube(s) (${remainingOppCubes} remaining). Destroyed cubes placed in Casualty Slot until Cleanup.`,
        type: 'combat',
      });
    }

    const finalRemainingOppCubes = sector.planets.filter(
      (p) => p.colonizedBy && p.colonizedBy !== winnerId
    ).length;

    bombardmentSummary = {
      attackerName: attackerPlayer.name,
      defenderName: firstDefPlayer?.name || 'Defender',
      totalDamage: hasNeutronBombs ? 99 : rolls.reduce((sum, r) => sum + (r.isHit ? r.damage : 0), 0),
      rolls,
      cubesDestroyed,
      cubesRemaining: finalRemainingOppCubes,
      hasNeutronBombs,
    };
  }

  // --- INFLUENCE SECTOR OVERTHROW / CONQUEST ---
  // Rule: Only remove defender influence disc if sector has NO population cubes remaining!
  const remainingOpponentCubes = sector.planets.filter(
    (p) => p.colonizedBy && p.colonizedBy !== winnerId
  );

  if (remainingOpponentCubes.length === 0) {
    // If defender lost all population & ships, remove overthrown influence disc
    if (sector.discOwner && sector.discOwner !== winnerId) {
      const loserPlayer = state.players.find((p) => p.id === sector.discOwner);
      if (loserPlayer) {
        loserPlayer.influenceTrack.discsOnTrack = Math.min(
          loserPlayer.influenceTrack.totalDiscs,
          loserPlayer.influenceTrack.discsOnTrack + 1
        );
        state.log.unshift({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          round: state.round,
          phase: state.phase,
          message: `${loserPlayer.name}'s Influence Disc in Sector ${sector.sectorNumber} was overthrown!`,
          type: 'combat',
        });
      }
      sector.discOwner = undefined;
    }

    // If attacker has surviving ships and sector is uncontrolled by them, prompt conquest
    const hasAttackerShips = sector.ships.some((s) => s.ownerId === winnerId);
    if (hasAttackerShips && sector.discOwner !== winnerId) {
      state.pendingCombatConquest = {
        sectorId: sector.id,
        winnerPlayerId: winnerId,
        discoveryToClaim: sector.discoveryTile && !sector.discoveryClaimed ? sector.discoveryTile : undefined,
        bombardmentSummary,
        canClaimInfluence: true,
      };
    }
  } else {
    // Some defender cubes survived bombardment: Defender retains control!
    state.log.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      round: state.round,
      phase: state.phase,
      message: `Defender retains control of Sector ${sector.sectorNumber} because ${remainingOpponentCubes.length} population cube(s) survived bombardment.`,
      type: 'combat',
    });

    const hasAttackerShips = sector.ships.some((s) => s.ownerId === winnerId);
    if (hasAttackerShips && bombardmentSummary) {
      state.pendingCombatConquest = {
        sectorId: sector.id,
        winnerPlayerId: winnerId,
        discoveryToClaim: undefined,
        bombardmentSummary,
        canClaimInfluence: false,
      };
    }
  }
}

export interface PinningState {
  pinnedShipIds: Set<string>;
  isShipPinned: (shipId: string) => boolean;
}

export function computePinningState(
  state: GameState,
  playerId: string,
  plannedMoves: { shipId: string; fromSectorId: string; toSectorId: string }[] = []
): PinningState {
  const player = state.players.find((p) => p.id === playerId);
  const isDraco = player?.faction.id === 'descendants_of_draco';
  const pinnedShipIds = new Set<string>();

  // Track simulated ships in sectors
  const simSectorShips = new Map<string, { id: string; ownerId: string; type: string }[]>();
  for (const s of state.sectors) {
    simSectorShips.set(s.id, s.ships.map((sh) => ({ id: sh.id, ownerId: sh.ownerId, type: sh.type })));
  }

  const getHostilesInSec = (sec: SectorTile, shipsList: { id: string; ownerId: string; type: string }[]) => {
    let ancients = Math.max(
      sec.ancientsCount || 0,
      shipsList.filter((s) => s.ownerId === 'ancient' || s.type === 'ancient').length
    );
    if (isDraco) ancients = 0;
    const gcdsShips = shipsList.filter((s) => s.ownerId === 'gcds' || s.type === 'gcds').length;
    const gcdsCount = sec.hasGCDS && gcdsShips === 0 ? 1 : gcdsShips;
    const guardianShips = shipsList.filter((s) => s.ownerId === 'guardian' || s.type === 'guardian').length;
    const otherPlayerShips = shipsList.filter(
      (s) => s.ownerId !== playerId && s.ownerId.startsWith('player_')
    ).length;
    return ancients + gcdsCount + guardianShips + otherPlayerShips;
  };

  // Replay planned moves step by step
  for (const m of plannedMoves) {
    const fromList = simSectorShips.get(m.fromSectorId) || [];
    const shipIdx = fromList.findIndex((s) => s.id === m.shipId);
    let movedShip: { id: string; ownerId: string; type: string } | undefined;
    if (shipIdx >= 0) {
      [movedShip] = fromList.splice(shipIdx, 1);
    }
    const toList = simSectorShips.get(m.toSectorId) || [];
    if (movedShip) {
      toList.push(movedShip);
      simSectorShips.set(m.toSectorId, toList);
    }

    const toSec = state.sectors.find((s) => s.id === m.toSectorId);
    if (toSec) {
      const friendlyInTo = toList.filter((s) => s.ownerId === playerId).length;
      const hostilesInTo = getHostilesInSec(toSec, toList);
      if (hostilesInTo > 0 && friendlyInTo <= hostilesInTo) {
        pinnedShipIds.add(m.shipId);
      }
    }
  }

  // Check currently simulated sector for each friendly ship
  for (const s of state.sectors) {
    const shipsInSec = simSectorShips.get(s.id) || [];
    const friendlyShips = shipsInSec.filter((sh) => sh.ownerId === playerId);
    const hostiles = getHostilesInSec(s, shipsInSec);

    if (hostiles > 0 && friendlyShips.length <= hostiles) {
      for (const sh of friendlyShips) {
        pinnedShipIds.add(sh.id);
      }
    }
  }

  return {
    pinnedShipIds,
    isShipPinned: (shipId: string) => pinnedShipIds.has(shipId),
  };
}

export function checkAndTriggerCombat(state: GameState): void {
  // If a player still has a pending conquest, discovery, or reputation tile decision, wait for resolution
  if (state.pendingCombatConquest || state.pendingDiscovery || state.pendingReputationDraw || state.activeCombat) {
    return;
  }

  if (!state.resolvedCombatSectorIds) {
    state.resolvedCombatSectorIds = [];
  }

  // 1. Find all sectors with hostile fleet battles (2+ distinct ship owners), resolved in descending Sector Number order (Rulebook page 20)
  const shipCombatSectors = state.sectors
    .filter((sec) => {
      if (state.resolvedCombatSectorIds!.includes(sec.id)) return false;
      const owners = Array.from(new Set(sec.ships.map((s) => s.ownerId)));
      // Draco does not battle Ancients
      if (owners.length === 2 && owners.includes('ancient')) {
        const otherOwner = owners.find((o) => o !== 'ancient');
        const otherPlayer = state.players.find((p) => p.id === otherOwner);
        if (otherPlayer?.faction.id === 'descendants_of_draco') {
          return false;
        }
      }
      return owners.length > 1;
    })
    .sort((a, b) => b.sectorNumber - a.sectorNumber);

  if (shipCombatSectors.length > 0) {
    const sector = shipCombatSectors[0]!;
    const distinctOwners = Array.from(new Set(sector.ships.map((s) => s.ownerId)));

    // Order owners by entry order (Rulebook page 20 & Bug 66):
    // "the person who last enter the system is the first attacker then attack the player who enter the system second last,
    // then the winner continue to attack the next player without repairing the ship. The player who control the sector is always consider the one who enter the system first."
    const orderedOwners: string[] = [];
    if (sector.discOwner && distinctOwners.includes(sector.discOwner)) {
      orderedOwners.push(sector.discOwner);
    }
    for (const npc of ['ancient', 'guardian', 'gcds']) {
      if (distinctOwners.includes(npc) && !orderedOwners.includes(npc)) {
        orderedOwners.push(npc);
      }
    }
    for (const o of distinctOwners) {
      if (!orderedOwners.includes(o) && !(sector.playerEntryOrder || []).includes(o)) {
        orderedOwners.push(o);
      }
    }
    for (const o of (sector.playerEntryOrder || [])) {
      if (distinctOwners.includes(o) && !orderedOwners.includes(o)) {
        orderedOwners.push(o);
      }
    }

    let attackerOwnerId = orderedOwners[orderedOwners.length - 1];
    let defenderOwnerId = orderedOwners[orderedOwners.length - 2];

    // Draco does not battle Ancients
    if (
      attackerOwnerId &&
      defenderOwnerId &&
      ((attackerOwnerId === 'ancient' && state.players.find((p) => p.id === defenderOwnerId)?.faction.id === 'descendants_of_draco') ||
       (defenderOwnerId === 'ancient' && state.players.find((p) => p.id === attackerOwnerId)?.faction.id === 'descendants_of_draco'))
    ) {
      const otherOpponent = orderedOwners
        .slice(0, orderedOwners.length - 2)
        .reverse()
        .find((o) => !(o === 'ancient' || state.players.find((p) => p.id === o)?.faction.id === 'descendants_of_draco'));
      if (otherOpponent) {
        defenderOwnerId = otherOpponent;
      }
    }

    const duelParticipants = [attackerOwnerId, defenderOwnerId].filter(Boolean) as string[];
    const combatUnits = buildCombatUnitsForSector(sector, state.players, duelParticipants);
    const hasMissiles = combatUnits.some((u) => u.weapons.some((w) => w.isMissile));

    state.activeCombat = {
      sectorId: sector.id,
      attackerOwnerId,
      defenderOwnerId: defenderOwnerId || getSectorDefenderOwnerId(sector),
      participatingPlayerIds: duelParticipants,
      roundNumber: 1,
      stage: hasMissiles ? 'missile' : 'regular',
      initiativeOrder: [],
      currentTurnIndex: 0,
      lastRolls: [],
      retreatDeclared: {},
      missileFiredShipIds: [],
    };
    state.phase = 'COMBAT_PHASE';
    return;
  }

  // 2. Sectors where a player has ships in an opponent controlled/populated sector without a fleet battle (Rulebook page 21)
  const hostileControlledSectors = state.sectors
    .filter((sec) => {
      if (state.resolvedCombatSectorIds!.includes(sec.id)) return false;
      const shipOwners = Array.from(new Set(sec.ships.map((s) => s.ownerId))).filter(
        (id) => id.startsWith('player_')
      );
      if (shipOwners.length === 0) return false;
      const hasHostileDisc = !!sec.discOwner && !shipOwners.includes(sec.discOwner);
      const hasHostileCubes = sec.planets.some(
        (p) => p.colonizedBy && !shipOwners.includes(p.colonizedBy)
      );
      return hasHostileDisc || hasHostileCubes;
    })
    .sort((a, b) => b.sectorNumber - a.sectorNumber);

  if (hostileControlledSectors.length > 0) {
    const sector = hostileControlledSectors[0];
    state.resolvedCombatSectorIds!.push(sector.id);
    const attackerId = sector.ships.find((s) => s.ownerId.startsWith('player_'))?.ownerId;
    state.phase = 'COMBAT_PHASE';
    resolveAttackingPopulationAndConquest(state, sector, attackerId);
    if (state.pendingCombatConquest) {
      return;
    }
    // If no conquest was pending (e.g. cubes survived), continue processing remaining sectors
    checkAndTriggerCombat(state);
    return;
  }

  // 3. Uncontested Discovery Tiles (Rulebook page 21)
  for (const sec of state.sectors) {
    if (sec.discoveryTile && !sec.discoveryClaimed) {
      const shipOwners = Array.from(new Set(sec.ships.map((s) => s.ownerId))).filter(
        (id) => id.startsWith('player_')
      );
      const hasHostiles = sec.ships.some((s) => !s.ownerId.startsWith('player_'));
      if (shipOwners.length === 1 && !hasHostiles) {
        state.pendingDiscovery = {
          sectorId: sec.id,
          discovery: sec.discoveryTile,
          playerId: shipOwners[0]!,
        };
        return;
      }
    }
  }

  // 3b. Conquest of Uncontrolled Sectors with Ships (Official Rules page 21)
  // At the end of the Combat Phase, a player may conquer an uncontrolled sector where they have ships and no hostiles
  const unconqueredSectors = state.sectors
    .filter((sec) => {
      if (state.resolvedCombatSectorIds!.includes(sec.id)) return false;
      if (sec.discOwner) return false; // Already controlled
      const playerShipOwners = Array.from(new Set(sec.ships.map((s) => s.ownerId))).filter(
        (id) => id.startsWith('player_')
      );
      if (playerShipOwners.length !== 1) return false; // Exactly one player has ships here
      const solePlayerId = playerShipOwners[0]!;
      const solePlayer = state.players.find((p) => p.id === solePlayerId);
      if (!solePlayer || solePlayer.isEliminated) return false;

      // Check if there are any hostile ships
      const isDraco = solePlayer.faction.id === 'descendants_of_draco';
      const hasHostiles = sec.ships.some((s) => {
        if (s.ownerId === solePlayerId) return false;
        if (isDraco && s.ownerId === 'ancient') return false;
        return true;
      });
      if (hasHostiles) return false;

      // Check if there are any hostile population cubes
      const hasOpponentCubes = sec.planets.some(
        (p) => p.colonizedBy && p.colonizedBy !== solePlayerId
      );
      if (hasOpponentCubes) return false;

      return true;
    })
    .sort((a, b) => b.sectorNumber - a.sectorNumber);

  if (unconqueredSectors.length > 0) {
    const sector = unconqueredSectors[0]!;
    state.resolvedCombatSectorIds!.push(sector.id);
    const winnerId = sector.ships.find((s) => s.ownerId.startsWith('player_'))!.ownerId;
    state.phase = 'COMBAT_PHASE';
    state.pendingCombatConquest = {
      sectorId: sector.id,
      winnerPlayerId: winnerId,
      discoveryToClaim: sector.discoveryTile && !sector.discoveryClaimed ? sector.discoveryTile : undefined,
      canClaimInfluence: true,
    };
    return;
  }

  // 4. Repair damage on all ships across the galaxy (Rulebook page 21)
  for (const sec of state.sectors) {
    for (const ship of sec.ships) {
      ship.damage = 0;
    }
  }

  // If no combat or hostile sector remaining, advance to UPKEEP_PHASE
  transitionToUpkeep(state);
}

export function transitionToUpkeep(state: GameState): void {
  state.phase = 'UPKEEP_PHASE';

  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i]!;
    if (p.isEliminated) continue;

    // 1. Add round Money production and deduct Upkeep
    const moneyIncome = getIncomeForTrack(p.population.money.cubesOnBoard);
    const upkeep = getUpkeepForDiscs(p.influenceTrack.discsOnTrack);
    p.resources.money += moneyIncome - upkeep;
    state.log.unshift({
      id: `log_${Date.now()}_upkeep_${p.id}`,
      timestamp: Date.now(),
      round: state.round,
      phase: 'UPKEEP_PHASE',
      playerId: p.id,
      message: `💰 UPKEEP: ${p.name} earned ${moneyIncome} Credits income, paid ${upkeep} Upkeep (Net: ${moneyIncome - upkeep >= 0 ? '+' : ''}${moneyIncome - upkeep}, Treasury: ${p.resources.money}).`,
      type: 'economy',
    });

    // 2. Ready colony ships
    p.colonyShips = {
      total: p.colonyShips.total,
      ready: p.colonyShips.total,
    };
  }

  // Check if any player entered tactical bankruptcy
  checkNextBankruptcyOrCleanup(state);
}

export function checkNextBankruptcyOrCleanup(state: GameState): void {
  const bankruptPlayer = state.players.find(
    (p) => !p.isEliminated && p.resources.money < 0
  );

  if (bankruptPlayer) {
    const controlledSectors = state.sectors.filter(
      (s) => s.discOwner === bankruptPlayer.id
    );

    if (controlledSectors.length > 0) {
      state.pendingBankruptcy = {
        playerId: bankruptPlayer.id,
        deficit: Math.abs(bankruptPlayer.resources.money),
      };
      state.log.unshift({
        id: `log_${Date.now()}_bankrupt_${bankruptPlayer.id}`,
        timestamp: Date.now(),
        round: state.round,
        phase: 'UPKEEP_PHASE',
        playerId: bankruptPlayer.id,
        message: `⚠️ TACTICAL BANKRUPTCY: ${bankruptPlayer.name} has a budget deficit of ${Math.abs(bankruptPlayer.resources.money)} Credits! Must abandon controlled sectors to balance the budget.`,
        type: 'economy',
      });
      return;
    } else {
      // Deficit persists after abandoning all sectors -> eliminate player immediately!
      bankruptPlayer.isEliminated = true;
      bankruptPlayer.resources.money = 0;
      for (const sec of state.sectors) {
        sec.ships = sec.ships.filter((s) => s.ownerId !== bankruptPlayer.id);
        if (sec.discOwner === bankruptPlayer.id) sec.discOwner = undefined;
      }
      state.log.unshift({
        id: `log_${Date.now()}_eliminated_${bankruptPlayer.id}`,
        timestamp: Date.now(),
        round: state.round,
        phase: 'UPKEEP_PHASE',
        playerId: bankruptPlayer.id,
        message: `🚨 CIVILIZATION COLLAPSE: ${bankruptPlayer.name} has no sectors remaining to abandon and is ELIMINATED from the galaxy!`,
        type: 'economy',
      });

      checkNextBankruptcyOrCleanup(state);
      return;
    }
  }

  state.pendingBankruptcy = null;

  // Official Eclipse Upkeep Sequence: Science and Materials production are collected
  // AFTER all budget deficits and bankruptcy/sector abandonments are resolved!
  for (const p of state.players) {
    if (p.isEliminated) continue;
    const scienceIncome = getIncomeForTrack(p.population.science.cubesOnBoard);
    const materialsIncome = getIncomeForTrack(p.population.material.cubesOnBoard);
    p.resources.science += scienceIncome;
    p.resources.materials += materialsIncome;
    state.log.unshift({
      id: `log_${Date.now()}_prod_${p.id}`,
      timestamp: Date.now(),
      round: state.round,
      phase: 'UPKEEP_PHASE',
      playerId: p.id,
      message: `🔬 PRODUCTION: ${p.name} collected +${scienceIncome} Science (Total: ${p.resources.science}) and +${materialsIncome} Materials (Total: ${p.resources.materials}).`,
      type: 'economy',
    });
  }

  transitionToCleanup(state);
}

export function transitionToCleanup(state: GameState): void {
  state.phase = 'CLEANUP_PHASE';

  if (state.round >= state.maxRounds) {
    state.phase = 'GAME_OVER';
    calculateFinalScores(state);
    return;
  }

  // Advance round
  state.round += 1;
  state.phase = 'ACTION_PHASE';
  state.passedPlayerIds = [];
  state.consecutivePasses = 0;
  state.resolvedCombatSectorIds = [];
  state.log.unshift({
    id: `log_${Date.now()}_round_${state.round}`,
    timestamp: Date.now(),
    round: state.round,
    phase: 'ACTION_PHASE',
    message: `🚀 ROUND ${state.round} has begun! Action Phase is now active. Influence discs refreshed.`,
    type: 'system',
  });

  // Reset players action discs and passing status
  for (const player of state.players) {
    player.hasPassed = false;
    // Discs used on actions return to the influence track!
    // Discs placed on sectors remain on sectors.
    const sectorsClaimed = state.sectors.filter((s) => s.discOwner === player.id).length;
    player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.totalDiscs - sectorsClaimed);
    player.actionsTakenThisRound = 0;
    // Turn all colony ships face up (refresh) during cleanup phase
    player.colonyShips.ready = player.colonyShips.total;
    // Return population cubes from the casualty graveyard back to the player board tracks
    if (player.graveyardCubes) {
      player.population.money.cubesOnBoard = Math.min(11, player.population.money.cubesOnBoard + (player.graveyardCubes.money || 0));
      player.population.science.cubesOnBoard = Math.min(11, player.population.science.cubesOnBoard + (player.graveyardCubes.science || 0));
      player.population.material.cubesOnBoard = Math.min(11, player.population.material.cubesOnBoard + (player.graveyardCubes.material || 0));
      player.graveyardCubes = { money: 0, science: 0, material: 0 };
    }
  }

  // Official Cleanup: Replenish tech supply from bag
  // Draw until (playerCount + 3) regular tiles are drawn (rare tiles do not count towards the limit)
  const { drawn: newTechs, remainingBag, regularDrawn, rareDrawn } = drawTechTilesForRound(
    state.techBag,
    state.players.length
  );
  state.techSupply.push(...newTechs);
  state.techBag = remainingBag;
  state.log.push({
    id: `log_${Date.now()}_tech_replenish`,
    timestamp: Date.now(),
    round: state.round,
    phase: 'CLEANUP_PHASE',
    message: `Tech Tray replenished: ${regularDrawn} regular and ${rareDrawn} rare tiles added (${state.techBag.length} left in bag).`,
    type: 'system',
  });

  // First passer becomes first player
  const firstPasserIndex = state.players.findIndex((p) => p.isFirstPasser);
  if (firstPasserIndex !== -1) {
    state.firstPlayerIndex = firstPasserIndex;
    state.activePlayerIndex = firstPasserIndex;
    for (const p of state.players) p.isFirstPasser = false;
  }
}

export interface PlayerScoreBreakdown {
  sectors: number;
  monoliths: number;
  reputation: number;
  techs: number;
  ambassadors: number;
  discoveries: number;
  speciesBonus: number;
  traitor?: number;
  total: number;
}

export function computeCurrentScores(state: GameState): {
  scores: Record<string, PlayerScoreBreakdown>;
  leaderPlayerId: string;
} {
  const scores: Record<string, PlayerScoreBreakdown> = {};
  let leaderPlayerId = state.players[0]?.id || '';
  let maxScore = -999;

  for (const p of state.players) {
    // 1. Controlled Sectors VP
    const controlledSectors = state.sectors.filter((s) => s.discOwner === p.id);
    const sectorVP = controlledSectors.reduce((sum, s) => sum + s.victoryPoints, 0);

    // 2. Monoliths VP (3 per monolith in controlled sectors per official Second Dawn rules)
    const monolithCount = controlledSectors.filter((s) => s.structures?.monolith || s.hasMonolith).length;
    const monolithVP = monolithCount * 3;

    // 3. Reputation tiles (sum of tiles)
    const repVP = p.reputationTiles.reduce((sum, val) => sum + val, 0);

    // 4. Technology VP: Track VP (1/2/3/5 VP for 4/5/6/7 techs per track) + printed tile VP
    const mCount = Math.max(
      p.techTrack.militaryCount || 0,
      p.techTrack.researched.filter((t) => (t.placedTrack || t.category) === 'military').length
    );
    const gCount = Math.max(
      p.techTrack.gridCount || 0,
      p.techTrack.researched.filter((t) => (t.placedTrack || t.category) === 'grid').length
    );
    const nCount = Math.max(
      p.techTrack.nanoCount || 0,
      p.techTrack.researched.filter((t) => (t.placedTrack || t.category) === 'nano').length
    );

    const getTrackVP = (cnt: number) => {
      if (cnt >= 7) return 5;
      if (cnt === 6) return 3;
      if (cnt === 5) return 2;
      if (cnt === 4) return 1;
      return 0;
    };

    const trackVP = getTrackVP(mCount) + getTrackVP(gCount) + getTrackVP(nCount);
    const tileVP = p.techTrack.researched.reduce((sum, t) => sum + (t.victoryPoints || 0), 0);
    const techVP = trackVP + tileVP;

    // 5. Ambassadors
    const ambassadorVP = p.ambassadorTiles.length;

    // 6. Kept Discovery Tiles (2 VP each)
    const discoveryVP = (p.keptDiscoveryTiles?.length || 0) * 2;

    // 7. Warp Portal VP:
    // Rare Tech warp portal in controlled sector: +1 VP
    // Discovery tile warp portal in controlled sector: +2 VP
    let warpPortalVP = 0;
    for (const s of controlledSectors) {
      if (s.hasRareWarpPortal) {
        warpPortalVP += 1;
      } else if (s.hasDiscoveryWarpPortal) {
        warpPortalVP += 2;
      } else if (s.hasWarpPortal && s.sectorNumber !== 281 && s.sectorNumber !== 381 && s.sectorNumber !== 382) {
        warpPortalVP += 2;
      }
    }

    // 8. Species Bonus VP
    let speciesBonus = 0;
    if (p.faction.id === 'planta') {
      speciesBonus += controlledSectors.length * 1;
    } else if (p.faction.id === 'descendants_of_draco') {
      const totalAncientsOnBoard = state.sectors.reduce((sum, s) => {
        const shipsCount = s.ships.filter((ship) => ship.ownerId === 'ancient' || ship.type === 'ancient').length;
        return sum + Math.max(s.ancientsCount, shipsCount);
      }, 0);
      speciesBonus += totalAncientsOnBoard;
    }

    // 9. Traitor Tile Penalty (-2 VP)
    const traitorVP = state.traitorPlayerId === p.id ? -2 : 0;

    const total = sectorVP + monolithVP + repVP + techVP + ambassadorVP + discoveryVP + warpPortalVP + speciesBonus + traitorVP;

    scores[p.id] = {
      sectors: sectorVP,
      monoliths: monolithVP,
      reputation: repVP,
      techs: techVP,
      ambassadors: ambassadorVP,
      discoveries: discoveryVP + warpPortalVP,
      speciesBonus,
      traitor: traitorVP,
      total,
    };

    if (total > maxScore) {
      maxScore = total;
      leaderPlayerId = p.id;
    }
  }

  return { scores, leaderPlayerId };
}

export function calculateFinalScores(state: GameState): void {
  const { scores, leaderPlayerId } = computeCurrentScores(state);
  state.finalScores = scores;
  state.winnerId = leaderPlayerId;
}

export function getMaxExploreActivations(player: PlayerState): number {
  return player.faction.exploreActivations ?? 1;
}

export function getMaxResearchActivations(player: PlayerState): number {
  return player.faction.researchActivations ?? 1;
}

export function getMaxUpgradeActivations(player: PlayerState): number {
  return player.faction.upgradeActivations ?? 2;
}

export function getMaxBuildActivations(player: PlayerState): number {
  const base = player.faction.buildActivations ?? 2;
  const hasNanorobots = player.techTrack.researched.some((t) => t.id === 'nanorobots');
  return base + (hasNanorobots ? 1 : 0);
}

export function getMaxMoveActivations(player: PlayerState): number {
  const base = player.faction.moveActivations ?? (player.faction.isHuman ? 3 : 2);
  const hasImprovedLogistics = player.techTrack.researched.some((t) => t.id === 'improved_logistics');
  return base + (hasImprovedLogistics ? 1 : 0);
}

export function getMaxInfluenceActivations(player: PlayerState): number {
  return player.faction.influenceActivations ?? 2;
}
