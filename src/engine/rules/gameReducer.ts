/**
 * Game State Reducer and Action Validation Engine for Eclipse: Second Dawn
 */

import { GameState, GamePhase, GameLogEntry, CombatState } from '../types/state';
import { GameAction } from '../types/actions';
import { areCoordsEqual, areSectorsConnected, getEdgeBetween, getRingFromCoord, hasWormholeOnEdge } from './hexMath';
import { calculateTechCost, drawTechTilesForRound } from './techData';
import { calculateBlueprintStats, SHIP_LIMITS, countPlayerShips } from './shipValidation';
import { SHIP_PARTS } from './partData';
import { applyUpkeepPhase } from './economyEngine';
import { buildCombatUnitsForSector, executeCombatStep } from './combatEngine';
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
  if (planet.isAdvanced) {
    const hasMeta = player.techTrack.researched.some((t) => t.id === 'metasynthesis');
    if (planet.resource === 'money' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_economy')) {
      return { canColonize: false, reason: 'Requires Advanced Economy or Metasynthesis' };
    }
    if (planet.resource === 'material' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_mining')) {
      return { canColonize: false, reason: 'Requires Advanced Mining or Metasynthesis' };
    }
    if (planet.resource === 'science' && !hasMeta && !player.techTrack.researched.some((t) => t.id === 'advanced_labs')) {
      return { canColonize: false, reason: 'Requires Advanced Labs or Metasynthesis' };
    }
  }
  return { canColonize: true };
}

export function validateAction(state: GameState, action: GameAction): { valid: boolean; error?: string } {
  if (state.phase === 'GAME_OVER') {
    return { valid: false, error: 'The game has ended.' };
  }

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) {
    return { valid: false, error: 'Player not found.' };
  }

  // Active player check (except combat, colonization, trade, conquest, or discovery choices)
  if (state.phase === 'ACTION_PHASE') {
    const activePlayer = state.players[state.activePlayerIndex];
    if (
      activePlayer?.id !== action.playerId &&
      action.type !== 'COLONIZE' &&
      action.type !== 'TRADE' &&
      action.type !== 'DISCOVERY_CHOICE' &&
      action.type !== 'COMBAT_CONQUEST'
    ) {
      return { valid: false, error: `It is not player ${action.playerId}'s turn.` };
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

      // 3. Must have available disc to take action
      if (player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Explore.' };
      }
      return { valid: true };
    }

    case 'RESEARCH': {
      const tech = state.techSupply.find((t) => t.id === action.techId);
      if (!tech) {
        return { valid: false, error: 'Technology is not available in the tech supply.' };
      }
      if (player.techTrack.researched.some((t) => t.id === tech.id)) {
        return { valid: false, error: 'Player has already researched this technology.' };
      }

      let count = 0;
      if (tech.category === 'military') {
        count = player.techTrack.militaryCount;
      } else if (tech.category === 'grid') {
        count = player.techTrack.gridCount;
      } else if (tech.category === 'nano') {
        count = player.techTrack.nanoCount;
      } else {
        // Rare tech: discount based on chosen target track (or track with highest discount)
        const targetTrack =
          action.targetTrack ||
          (player.techTrack.militaryCount >= player.techTrack.gridCount &&
          player.techTrack.militaryCount >= player.techTrack.nanoCount
            ? 'military'
            : player.techTrack.gridCount >= player.techTrack.nanoCount
            ? 'grid'
            : 'nano');
        count =
          targetTrack === 'military'
            ? player.techTrack.militaryCount
            : targetTrack === 'grid'
            ? player.techTrack.gridCount
            : player.techTrack.nanoCount;
      }

      const cost = calculateTechCost(tech, count);
      if (player.resources.science < cost) {
        return { valid: false, error: `Insufficient science. Cost is ${cost}, but player has ${player.resources.science}.` };
      }
      if (player.influenceTrack.discsOnTrack <= 0) {
        return { valid: false, error: 'No influence discs remaining on track to activate Research.' };
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

      const maxUpgrade = getMaxUpgradeActivations(player);
      if (modifiedCount > maxUpgrade) {
        return {
          valid: false,
          error: `Cannot make more than ${maxUpgrade} component upgrades in a single Upgrade action. (Attempted ${modifiedCount})`,
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

      const maxBuild = getMaxBuildActivations(player);
      if (action.items.length > maxBuild) {
        return {
          valid: false,
          error: `Cannot build more than ${maxBuild} items in a single Build action.`,
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
      const sectorsWithStarbase = new Set<string>();
      for (const s of state.sectors) {
        if (s.ships.some((ship) => ship.ownerId === action.playerId && ship.type === 'starbase')) {
          sectorsWithStarbase.add(s.id);
        }
      }

      let totalMaterialsCost = 0;
      for (const item of action.items) {
        const sector = state.sectors.find((s) => s.id === item.sectorId);
        if (!sector) {
          return { valid: false, error: `Sector ${item.sectorId} not found.` };
        }
        if (sector.discOwner !== action.playerId) {
          return { valid: false, error: `Must control sector ${item.sectorId} with an influence disc to build here.` };
        }
        // Enemy ships cannot be present to build
        const hasEnemies = sector.ships.some((s) => s.ownerId !== action.playerId);
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

        // Validate Starbase Limit: At most 1 Starbase per controlled sector
        if (item.itemType === 'starbase') {
          if (sectorsWithStarbase.has(item.sectorId)) {
            return {
              valid: false,
              error: `Sector ${sector.sectorNumber} already contains a Starbase. You may only have one Starbase per sector.`,
            };
          }
          sectorsWithStarbase.add(item.sectorId);
        }

        let cost = 3;
        if (item.itemType === 'cruiser') cost = 5;
        else if (item.itemType === 'dreadnought') cost = 8;
        else if (item.itemType === 'starbase') cost = 3;
        else if (item.itemType === 'orbital') cost = 5;
        else if (item.itemType === 'monolith') cost = 10;

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

      const maxMoveActivations = getMaxMoveActivations(player);
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
          error: `Cannot make more than ${maxMoveActivations} ship movements (move activations) in a single Move action (attempted ${activations.length}).`,
        };
      }

      // 3. Validate paths, drive speed limits, and pinning
      const pinnedShips = new Set<string>();

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

        for (const step of act.steps) {
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

          // Advance ship's simulated location
          shipInfo.currentSectorId = step.toSectorId;

          // Check if destination has hostiles -> pinned!
          const hasHostiles =
            toSec.ancientsCount > 0 ||
            toSec.hasGCDS ||
            toSec.ships.some((s) => s.ownerId !== action.playerId);
          if (hasHostiles) {
            pinnedShips.add(act.shipId);
          }
        }
      }

      return { valid: true };
    }

    case 'INFLUENCE': {
      if (player.influenceTrack.discsOnTrack <= 0 && (!action.abandonSectors || action.abandonSectors.length === 0)) {
        return { valid: false, error: 'No influence discs remaining on track.' };
      }
      if (action.claimSectors) {
        for (const secId of action.claimSectors) {
          const sec = state.sectors.find((s) => s.id === secId);
          if (!sec) return { valid: false, error: `Sector ${secId} not found.` };
          if (sec.discOwner && sec.discOwner !== player.id) {
            return { valid: false, error: `Sector ${sec.sectorNumber} is already controlled by another player.` };
          }
          if (sec.ancientsCount > 0 || sec.hasGCDS || sec.ships.some((s) => s.ownerId !== player.id)) {
            return { valid: false, error: `Cannot claim Sector ${sec.sectorNumber} while hostile forces are present.` };
          }
          const hasShips = sec.ships.some((s) => s.ownerId === player.id);
          if (!hasShips) {
            return { valid: false, error: `Must have a stationed ship in Sector ${sec.sectorNumber} to claim influence.` };
          }
        }
      }
      if (action.abandonSectors) {
        for (const secId of action.abandonSectors) {
          const sec = state.sectors.find((s) => s.id === secId);
          if (!sec) return { valid: false, error: `Sector ${secId} not found.` };
          if (sec.discOwner !== player.id) {
            return { valid: false, error: `You do not control Sector ${sec.sectorNumber}.` };
          }
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

      // Check advanced planet tech requirement
      if (planet.isAdvanced) {
        if (planet.resource === 'money' && !player.techTrack.researched.some((t) => t.id === 'advanced_economy' || t.id === 'metasynthesis')) {
          return { valid: false, error: 'Requires Advanced Economy tech to colonize this gray slot.' };
        }
        if (planet.resource === 'material' && !player.techTrack.researched.some((t) => t.id === 'advanced_mining' || t.id === 'metasynthesis')) {
          return { valid: false, error: 'Requires Advanced Mining tech to colonize this gray slot.' };
        }
        if (planet.resource === 'science' && !player.techTrack.researched.some((t) => t.id === 'advanced_labs' || t.id === 'metasynthesis')) {
          return { valid: false, error: 'Requires Advanced Labs tech to colonize this gray slot.' };
        }
      }
      return { valid: true };
    }

    case 'PASS':
      return { valid: true };

    case 'TRADE': {
      const ratio = player.faction.tradeRatio || 2;
      if (action.amount <= 0 || action.amount % ratio !== 0) {
        return { valid: false, error: `Trade amount must be a positive multiple of ${ratio}.` };
      }
      const available = action.fromResource === 'science' ? player.resources.science : player.resources.materials;
      if (available < action.amount) {
        return { valid: false, error: `Not enough ${action.fromResource} to trade.` };
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

  switch (action.type) {
    case 'EXPLORE': {
      // Deduct disc
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      const ring = getRingFromCoord(action.targetCoord);
      const deck = ring === 1 ? newState.sectorDecks.ring1 : ring === 2 ? newState.sectorDecks.ring2 : newState.sectorDecks.ring3;
      const drawnTile = deck.pop();

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
        // Place on map
        if (drawnTile.ancientsCount === 0 && action.claimInfluence && player.influenceTrack.discsOnTrack > 0) {
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
        addLog(`${player.name} discarded explored sector tile from Ring ${ring} to the bottom of the stack.`);
      }

      break;
    }

    case 'RESEARCH': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      const techIndex = newState.techSupply.findIndex((t) => t.id === action.techId);
      const tech = newState.techSupply[techIndex]!;

      let targetTrack: 'military' | 'grid' | 'nano' = 'nano';
      if (tech.category === 'military' || tech.category === 'grid' || tech.category === 'nano') {
        targetTrack = tech.category;
      } else {
        if (action.targetTrack) {
          targetTrack = action.targetTrack;
        } else {
          if (
            player.techTrack.militaryCount >= player.techTrack.gridCount &&
            player.techTrack.militaryCount >= player.techTrack.nanoCount
          ) {
            targetTrack = 'military';
          } else if (player.techTrack.gridCount >= player.techTrack.nanoCount) {
            targetTrack = 'grid';
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
      if (tech.id === 'quantum_grid' || tech.id === 'advanced_robotics') {
        player.influenceTrack.totalDiscs += 2;
        player.influenceTrack.discsOnTrack += 2;
        addLog(`${player.name} gained 2 bonus Influence Discs from ${tech.name}.`);
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
        const reward = controlledArtifacts * 5;
        player.resources.materials += reward;
        addLog(
          `${player.name} activated Artifact Key across ${controlledArtifacts} controlled Artifact(s) and received ${reward} Materials!`
        );
      }

      newState.techSupply.splice(techIndex, 1);
      addLog(`${player.name} researched ${tech.name} for ${cost} Science (${targetTrack.toUpperCase()} track).`);
      break;
    }

    case 'UPGRADE': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      for (const up of action.upgrades) {
        const bp = player.blueprints[up.shipType]!;
        const part = up.partId ? SHIP_PARTS[up.partId] || null : null;
        bp.slots[up.slotIndex] = part;
      }
      addLog(`${player.name} upgraded ship blueprints.`);
      break;
    }

    case 'BUILD': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      for (const item of action.items) {
        const sector = newState.sectors.find((s) => s.id === item.sectorId)!;
        let cost = 3;
        if (item.itemType === 'cruiser') cost = 5;
        else if (item.itemType === 'dreadnought') cost = 8;
        else if (item.itemType === 'starbase') cost = 3;
        else if (item.itemType === 'orbital') cost = 5;
        else if (item.itemType === 'monolith') cost = 10;

        player.resources.materials -= cost;

        if (item.itemType === 'monolith') {
          sector.structures = sector.structures || {};
          sector.structures.monolith = true;
          addLog(`${player.name} built a Monolith in Sector ${sector.sectorNumber}.`);
        } else if (item.itemType === 'orbital') {
          sector.structures = sector.structures || {};
          sector.structures.orbital = true;
          sector.planets.push({
            id: `orbital_${sector.id}_${Date.now()}`,
            resource: 'science',
            isAdvanced: false,
            isOrbital: true,
          });
          addLog(`${player.name} built an Orbital in Sector ${sector.sectorNumber}.`);
        } else {
          sector.ships.push({
            id: `ship_${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ownerId: player.id,
            type: item.itemType as ShipType,
            damage: 0,
          });
          addLog(`${player.name} constructed a ${item.itemType.toUpperCase()} in Sector ${sector.sectorNumber}.`);
        }
      }
      break;
    }

    case 'MOVE': {
      player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
      player.actionsTakenThisRound += 1;

      for (const m of action.moves) {
        const fromSec = newState.sectors.find((s) => s.id === m.fromSectorId)!;
        const toSec = newState.sectors.find((s) => s.id === m.toSectorId)!;
        const shipIdx = fromSec.ships.findIndex((s) => s.id === m.shipId);
        const [movedShip] = fromSec.ships.splice(shipIdx, 1);
        if (movedShip) {
          toSec.ships.push(movedShip);
          addLog(`${player.name} moved ship from Sector ${fromSec.sectorNumber} to Sector ${toSec.sectorNumber}.`);
        }
      }
      break;
    }

    case 'INFLUENCE': {
      if (newState.phase === 'ACTION_PHASE') {
        player.influenceTrack.discsOnTrack = Math.max(0, player.influenceTrack.discsOnTrack - 1);
        player.actionsTakenThisRound += 1;
      }

      if (action.refreshColonyShips) {
        player.colonyShips.ready = Math.min(player.colonyShips.total, player.colonyShips.ready + 2);
        addLog(`${player.name} refreshed 2 Colony Ships via Influence.`);
      }

      if (action.claimSectors) {
        for (const secId of action.claimSectors) {
          const sec = newState.sectors.find((s) => s.id === secId);
          if (sec && !sec.discOwner && player.influenceTrack.discsOnTrack > 0) {
            player.influenceTrack.discsOnTrack -= 1;
            sec.discOwner = player.id;
            addLog(`${player.name} claimed control of Sector ${sec.sectorNumber} with an Influence Disc!`);
          }
        }
      }

      if (action.abandonSectors) {
        for (const secId of action.abandonSectors) {
          const sec = newState.sectors.find((s) => s.id === secId);
          if (sec && sec.discOwner === player.id) {
            sec.discOwner = undefined;
            player.influenceTrack.discsOnTrack = Math.min(
              player.influenceTrack.totalDiscs,
              player.influenceTrack.discsOnTrack + 1
            );
            addLog(`${player.name} removed their Influence Disc from Sector ${sec.sectorNumber}.`);
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

      // Remove 1 cube from board (uncovering higher income)
      if (planet.resource === 'money') {
        player.population.money.cubesOnBoard = Math.max(0, player.population.money.cubesOnBoard - 1);
      } else if (planet.resource === 'science') {
        player.population.science.cubesOnBoard = Math.max(0, player.population.science.cubesOnBoard - 1);
      } else if (planet.resource === 'material') {
        player.population.material.cubesOnBoard = Math.max(0, player.population.material.cubesOnBoard - 1);
      }
      addLog(`${player.name} colonized a ${planet.resource.toUpperCase()} planet in Sector ${sector.sectorNumber}.`);
      return { success: true, newState }; // Colonize does not pass the turn
    }

    case 'TRADE': {
      const ratio = player.faction.tradeRatio || 2;
      const creditsGained = action.amount / ratio;
      if (action.fromResource === 'science') {
        player.resources.science -= action.amount;
      } else {
        player.resources.materials -= action.amount;
      }
      player.resources.money += creditsGained;
      addLog(`${player.name} traded ${action.amount} ${action.fromResource} for ${creditsGained} Credits.`);
      return { success: true, newState };
    }

    case 'PASS': {
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
          if (!player.unlockedAncientParts.includes(disc.shipPartId)) {
            player.unlockedAncientParts.push(disc.shipPartId);
          }

          if (action.equipShipType && action.equipSlotIndex !== undefined) {
            const bp = player.blueprints[action.equipShipType];
            const part = SHIP_PARTS[disc.shipPartId];
            if (bp && part && action.equipSlotIndex >= 0 && action.equipSlotIndex < bp.maxSlots) {
              bp.slots[action.equipSlotIndex] = part;
              addLog(`${player.name} equipped Ancient Tech "${part.name}" directly to their ${action.equipShipType.toUpperCase()} blueprint (Slot ${action.equipSlotIndex + 1})!`);
            }
          } else {
            addLog(`${player.name} claimed Ancient Tech module "${disc.name}" for future ship upgrades!`);
          }
        }
        addLog(`${player.name} claimed Discovery Reward: ${disc.name} (${disc.description})!`);
      }
      newState.pendingDiscovery = null;
      if (newState.phase === 'COMBAT_PHASE' && !newState.pendingCombatConquest && !newState.activeCombat) {
        checkAndTriggerCombat(newState);
      }
      return { success: true, newState };
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
            if (planet.resource === 'money') {
              player.population.money.cubesOnBoard = Math.max(0, player.population.money.cubesOnBoard - 1);
            } else if (planet.resource === 'science') {
              player.population.science.cubesOnBoard = Math.max(0, player.population.science.cubesOnBoard - 1);
            } else if (planet.resource === 'material') {
              player.population.material.cubesOnBoard = Math.max(0, player.population.material.cubesOnBoard - 1);
            }
            addLog(`${player.name} colonized a ${planet.resource.toUpperCase()} planet in Sector ${sector.sectorNumber} using a Colony Ship!`, 'action');
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
          const units = buildCombatUnitsForSector(sector, newState.players);
          const combatRes = executeCombatStep(units, newState.activeCombat);

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

          if (combatRes.isCombatOver) {
            // Repair damage on surviving ships at the end of engagement
            for (const ship of sector.ships) {
              ship.damage = 0;
            }

            // If defender lost all ships, remove overthrown influence disc
            if (combatRes.winnerOwnerId && sector.discOwner && sector.discOwner !== combatRes.winnerOwnerId) {
              const loserPlayer = newState.players.find((p) => p.id === sector.discOwner);
              if (loserPlayer) {
                loserPlayer.influenceTrack.discsOnTrack = Math.min(
                  loserPlayer.influenceTrack.totalDiscs,
                  loserPlayer.influenceTrack.discsOnTrack + 1
                );
                addLog(`${loserPlayer.name}'s Influence Disc in Sector ${sector.sectorNumber} was overthrown!`, 'combat');
              }
              sector.discOwner = undefined;
            }

            addLog(`Combat in Sector ${sector.sectorNumber} has concluded! Winner: ${combatRes.winnerOwnerId || 'None'}.`, 'combat');
            newState.activeCombat = null;

            // If player won the battle with surviving ships, initiate conquest decision
            if (combatRes.winnerOwnerId && combatRes.winnerOwnerId.startsWith('player_')) {
              newState.pendingCombatConquest = {
                sectorId: sector.id,
                winnerPlayerId: combatRes.winnerOwnerId,
                discoveryToClaim: (sector.discoveryTile && !sector.discoveryClaimed) ? sector.discoveryTile : undefined,
              };
            } else {
              // Non-player victory or mutual destruction: check for more combat sectors
              checkAndTriggerCombat(newState);
            }
          }
        }
      }
      return { success: true, newState };
    }
  }

  // Turn management during ACTION_PHASE
  if (newState.phase === 'ACTION_PHASE') {
    // Check if all players have passed
    if (newState.passedPlayerIds.length === newState.players.length) {
      addLog(`All commanders have passed! Proceeding to Combat Phase.`, 'system');
      newState.phase = 'COMBAT_PHASE';
      checkAndTriggerCombat(newState);
    } else {
      // Advance to next active player who hasn't passed
      let nextIdx = (newState.activePlayerIndex + 1) % newState.players.length;
      while (newState.passedPlayerIds.includes(newState.players[nextIdx]!.id)) {
        nextIdx = (nextIdx + 1) % newState.players.length;
      }
      newState.activePlayerIndex = nextIdx;
    }
  }

  return { success: true, newState };
}

function checkAndTriggerCombat(state: GameState): void {
  // If a player still has a pending conquest or discovery decision, wait for resolution
  if (state.pendingCombatConquest || state.pendingDiscovery) {
    return;
  }

  // Find any sector with hostile forces (more than one faction present)
  for (const sector of state.sectors) {
    const owners = Array.from(new Set(sector.ships.map((s) => s.ownerId)));
    if (owners.length > 1) {
      state.activeCombat = {
        sectorId: sector.id,
        roundNumber: 1,
        stage: 'regular',
        initiativeOrder: [],
        currentTurnIndex: 0,
        lastRolls: [],
        retreatDeclared: {},
      };
      state.phase = 'COMBAT_PHASE';
      return;
    }
  }

  // If no combat, advance to UPKEEP_PHASE
  transitionToUpkeep(state);
}

export function transitionToUpkeep(state: GameState): void {
  state.phase = 'UPKEEP_PHASE';

  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i]!;
    const { updatedPlayer, bankrupt } = applyUpkeepPhase(p);
    state.players[i] = updatedPlayer;

    if (bankrupt) {
      state.log.unshift({
        id: `log_${Date.now()}_bankrupt_${p.id}`,
        timestamp: Date.now(),
        round: state.round,
        phase: 'UPKEEP_PHASE',
        playerId: p.id,
        message: `${p.name} faced bankruptcy during Upkeep!`,
        type: 'economy',
      });
    }
  }

  // Advance to CLEANUP_PHASE
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

export function calculateFinalScores(state: GameState): void {
  const scores: Record<string, any> = {};
  let winningId = state.players[0]!.id;
  let maxScore = -999;

  for (const p of state.players) {
    // 1. Controlled Sectors VP
    const controlledSectors = state.sectors.filter((s) => s.discOwner === p.id);
    const sectorVP = controlledSectors.reduce((sum, s) => sum + s.victoryPoints, 0);

    // 2. Monoliths VP (2 per monolith in controlled sectors)
    const monolithCount = controlledSectors.filter((s) => s.structures?.monolith).length;
    const monolithVP = monolithCount * 2;

    // 3. Reputation tiles (sum of tiles)
    const repVP = p.reputationTiles.reduce((sum, val) => sum + val, 0);

    // 4. Technology VP
    const techVP = p.techTrack.researched.reduce((sum, t) => sum + (t.victoryPoints || 0), 0);

    // 5. Ambassadors
    const ambassadorVP = p.ambassadorTiles.length;

    // 6. Kept Discovery Tiles (2 VP each)
    const discoveryVP = (p.keptDiscoveryTiles?.length || 0) * 2;

    const total = sectorVP + monolithVP + repVP + techVP + ambassadorVP + discoveryVP;

    scores[p.id] = {
      sectors: sectorVP,
      monoliths: monolithVP,
      reputation: repVP,
      techs: techVP,
      ambassadors: ambassadorVP,
      discoveries: discoveryVP,
      speciesBonus: 0,
      total,
    };

    if (total > maxScore) {
      maxScore = total;
      winningId = p.id;
    }
  }

  state.finalScores = scores;
  state.winnerId = winningId;
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
