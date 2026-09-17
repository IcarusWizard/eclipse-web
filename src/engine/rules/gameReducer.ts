/**
 * Game State Reducer and Action Validation Engine for Eclipse: Second Dawn
 */

import { GameState, GamePhase, GameLogEntry, CombatState } from '../types/state';
import { GameAction } from '../types/actions';
import { areCoordsEqual, areSectorsConnected, getEdgeBetween, getRingFromCoord, hasWormholeOnEdge } from './hexMath';
import { calculateTechCost, drawTechTilesForRound } from './techData';
import { calculateBlueprintStats } from './shipValidation';
import { SHIP_PARTS } from './partData';
import { applyUpkeepPhase } from './economyEngine';
import { buildCombatUnitsForSector, executeCombatStep } from './combatEngine';
import { SectorTile, ShipType } from '../types/galaxy';

export interface ActionResult {
  success: boolean;
  newState: GameState;
  error?: string;
}

export function validateAction(state: GameState, action: GameAction): { valid: boolean; error?: string } {
  if (state.phase === 'GAME_OVER') {
    return { valid: false, error: 'The game has ended.' };
  }

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) {
    return { valid: false, error: 'Player not found.' };
  }

  // Active player check (except combat, colonization, trade, or discovery choices)
  if (state.phase === 'ACTION_PHASE') {
    const activePlayer = state.players[state.activePlayerIndex];
    if (activePlayer?.id !== action.playerId && action.type !== 'COLONIZE' && action.type !== 'TRADE' && action.type !== 'DISCOVERY_CHOICE') {
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
      for (const up of action.upgrades) {
        const bp = player.blueprints[up.shipType];
        if (!bp) return { valid: false, error: `Unknown ship type ${up.shipType}.` };
        if (up.slotIndex < 0 || up.slotIndex >= bp.maxSlots) {
          return { valid: false, error: `Invalid slot index ${up.slotIndex} for ${up.shipType}.` };
        }
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

      const maxMoves = getMaxMoveActivations(player);
      if (action.moves.length > maxMoves) {
        return {
          valid: false,
          error: `Cannot make more than ${maxMoves} ship movements in a single Move action.`,
        };
      }

      // Simulate ship locations across sequential moves so a ship can move multiple steps
      const simShipLocation = new Map<string, string>(); // shipId -> sectorId
      for (const s of state.sectors) {
        for (const ship of s.ships) {
          if (ship.ownerId === action.playerId) {
            simShipLocation.set(ship.id, s.id);
          }
        }
      }

      const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');

      for (const m of action.moves) {
        const currentLoc = simShipLocation.get(m.shipId);
        if (!currentLoc) {
          return { valid: false, error: `Ship ${m.shipId} not found or not owned by player.` };
        }
        if (currentLoc !== m.fromSectorId) {
          return { valid: false, error: `Ship is currently in Sector ${currentLoc}, cannot move from ${m.fromSectorId}.` };
        }

        const fromSec = state.sectors.find((s) => s.id === m.fromSectorId);
        const toSec = state.sectors.find((s) => s.id === m.toSectorId);
        if (!fromSec || !toSec) return { valid: false, error: 'Sector not found for movement.' };

        if (!areSectorsConnected(fromSec, toSec, hasWormholeGen)) {
          return { valid: false, error: `Wormhole does not connect Sector ${fromSec.sectorNumber} and Sector ${toSec.sectorNumber}.` };
        }

        // Update simulated location for next move in this batch
        simShipLocation.set(m.shipId, m.toSectorId);
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
      player.techTrack.researched.push(tech);

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
          sector.ships.push({
            id: `ship_${player.id}_discovery_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ownerId: player.id,
            type: grantShip,
            damage: 0,
          });
          addLog(`${player.name} deployed a free ${grantShip.toUpperCase()} to Sector ${sector.sectorNumber}!`);
        }
        if (disc.shipPartId) {
          player.unlockedAncientParts = player.unlockedAncientParts || [];
          if (!player.unlockedAncientParts.includes(disc.shipPartId)) {
            player.unlockedAncientParts.push(disc.shipPartId);
          }
        }
        addLog(`${player.name} claimed Discovery Reward: ${disc.name} (${disc.description})!`);
      }
      newState.pendingDiscovery = null;
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

            // If player won and there is an unclaimed discovery tile in this sector:
            if (combatRes.winnerOwnerId && combatRes.winnerOwnerId.startsWith('player_')) {
              if (sector.discoveryTile && !sector.discoveryClaimed) {
                newState.pendingDiscovery = {
                  sectorId: sector.id,
                  discovery: sector.discoveryTile,
                  playerId: combatRes.winnerOwnerId,
                };
                const winnerPlayer = newState.players.find((p) => p.id === combatRes.winnerOwnerId);
                addLog(`${winnerPlayer?.name || combatRes.winnerOwnerId} secured Sector ${sector.sectorNumber} and discovered the guarded Ancient cache!`);
              }
            }

            // Check for more combat sectors
            checkAndTriggerCombat(newState);
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
