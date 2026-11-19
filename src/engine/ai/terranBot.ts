/**
 * Level 1 Heuristic AI Bot for Local Terran Play in Eclipse: Second Dawn
 *
 * Strategy grounded in Eclipse fundamentals:
 *  - Keep Influence Disc upkeep within projected money income + trade reserves.
 *  - Explore early toward rich inner/mid-ring tiles, skip dead-end empty tiles.
 *  - Attack Ancients / Guardians / players only when Monte Carlo combat odds favor winning.
 *  - Upgrade blueprints efficiently (targeting 2 meaningful part swaps per action).
 *  - Never leave any pending state, combat prompt, or upkeep check unaddressed.
 */

import { GameState, CombatDamageAssignment } from '../types/state';
import { GameAction, MoveStep } from '../types/actions';
import { PlayerState } from '../types/player';
import { SectorTile, HexEdge, ShipType, PlanetSlot } from '../types/galaxy';
import { ShipBlueprint, ShipPart } from '../types/blueprints';
import { Technology } from '../types/tech';
import { SHIP_PARTS } from '../rules/partData';
import { calculateTechCost } from '../rules/techData';
import {
  calculatePlayerRoundSummary,
  getIncomeForTrack,
  getUpkeepForDiscs,
} from '../rules/economyEngine';
import {
  countPlayerShips,
  SHIP_LIMITS,
  calculateBlueprintStats,
  getRemainingShipSupply,
} from '../rules/shipValidation';
import {
  areSectorsConnected,
  getExplorableHexes,
  findLegalExploreRotations,
  hasWormholeOnEdge,
  getNeighborCoord,
  areCoordsEqual,
  getRingFromCoord,
} from '../rules/hexMath';
import {
  buildCombatUnitsForSector,
  getSectorDefenderOwnerId,
  sortUnitsByInitiative,
  getCombatShipTypeGroups,
  getActiveCombatGroup,
} from '../rules/combatEngine';
import {
  runCombatSimulation,
  createDefaultSimulatorSide,
  SimulatorSideConfig,
} from '../rules/combatSimulator';
import { NeutralShipType } from '../rules/neutralShips';
import { getMaxReputationTilesForPlayer } from '../rules/setup';
import {
  validateAction,
  canColonizePlanetSlot,
  canExchangeAmbassadors,
  playerHasWormholeGenerator,
  computePinningState,
  getMaxBuildActivations,
  getMaxMoveActivations,
  getMaxUpgradeActivations,
  getColonizablePlanetsForPlayer,
} from '../rules/gameReducer';

export const TERRAN_FACTION_IDS = [
  'terran_directorate',
  'terran_federation',
  'terran_conglomerate',
  'terran_republic',
  'terran_union',
  'terran_alliance',
] as const;

const STANDARD_PART_IDS = [
  'nuclear_source',
  'nuclear_drive',
  'electron_computer',
  'ion_cannon',
  'hull',
] as const;

const TECH_PRIORITY_WEIGHTS: Record<string, number> = {
  // Core Terran Economy & Utility (BGG guides)
  advanced_robotics: 95,
  quantum_grid: 94,
  advanced_mining: 74,
  advanced_economy: 78,
  advanced_labs: 72,
  orbital: 66,
  monolith: 64, // boosted further in mid/late game
  wormhole_generator: 62,
  nanorobots: 58,
  artifact_key: 60,
  // Core Terran Combat Blueprint Upgrades
  improved_hull: 86,
  positron_computer: 84,
  plasma_cannon: 82,
  fusion_source: 76,
  plasma_missile: 75,
  gluon_computer: 74,
  gauss_shield: 65,
  fusion_drive: 63,
  tachyon_source: 68,
  antimatter_cannon: 70,
  sentient_hull: 74,
  phase_shield: 66,
  tachyon_drive: 61,
  starbase: 52,
  flux_missile: 65,
  ion_turret: 60,
  rift_cannon: 62,
  conifold_field: 66,
  absorption_shield: 58,
  warp_portal: 54,
};

const ANCIENT_PART_RANKING: Record<string, number> = {
  muon_source: 90,
  ion_missile: 82,
  antimatter_missile: 86,
  axion_computer: 84,
  plasma_turret: 85,
  ion_turret: 76,
  soliton_charger: 78,
  flux_shield: 75,
  conformal_drive: 74,
  nonlinear_drive: 72,
  shard_hull: 75,
  hypergrid_source: 80,
  morph_shield: 72,
  ion_disruptor: 68,
};

const RESOURCE_TRACKS: Array<'money' | 'science' | 'material'> = ['money', 'science', 'material'];

/**
 * Determines which player ID currently holds blocking priority in `state` (if any).
 * Used by local AI loops to decide when an `isBot` seat must act next.
 */
export function getPriorityActorId(state: GameState): string | null {
  if (!state || state.phase === 'GAME_OVER') return null;

  if (state.pendingAmbassadorCubeReturns && state.pendingAmbassadorCubeReturns.length > 0) {
    return state.pendingAmbassadorCubeReturns[0]!.playerId;
  }
  if (state.pendingDiplomacyProposal) {
    return state.pendingDiplomacyProposal.targetId;
  }
  if (state.pendingActionConfirmation) {
    return state.pendingActionConfirmation.playerId;
  }
  if (state.pendingExplore) {
    return state.pendingExplore.playerId;
  }
  if (state.pendingReputationDraw) {
    return state.pendingReputationDraw.playerId;
  }
  if (state.pendingCombatConquest) {
    return state.pendingCombatConquest.winnerPlayerId;
  }
  if (state.pendingDiscovery) {
    return state.pendingDiscovery.playerId;
  }
  if (state.pendingExploreControl) {
    return state.pendingExploreControl.playerId;
  }
  if (state.pendingArtifactReward) {
    return state.pendingArtifactReward.playerId;
  }
  if (state.pendingBankruptcy) {
    return state.pendingBankruptcy.playerId;
  }
  if (state.pendingExilesOrbitalSetup) {
    return state.pendingExilesOrbitalSetup.playerId;
  }
  if (state.phase === 'DRAFT_PHASE' && state.factionDraft) {
    return state.factionDraft.draftOrder[state.factionDraft.currentDraftIndex] || null;
  }

  if (state.phase === 'COMBAT_PHASE' && state.activeCombat) {
    const combat = state.activeCombat;
    if (combat.pendingDamageAssignment) {
      return combat.pendingDamageAssignment.attackerOwnerId;
    }

    const sec = state.sectors.find((s) => s.id === combat.sectorId);
    const activeSub = sec?.isNebula ? combat.subsector : undefined;
    const participantBots = (combat.participatingPlayerIds || []).filter((id) => {
      const p = state.players.find((pl) => pl.id === id);
      return Boolean(p?.isBot && !p.isEliminated);
    });
    const participantHumans = (combat.participatingPlayerIds || []).filter((id) => {
      const p = state.players.find((pl) => pl.id === id);
      return Boolean(p && !p.isBot && !p.isEliminated);
    });

    if (combat.stage === 'resolved') {
      // Conclude automatically only if no human is in this battle (so humans still inspect final salvo in PvP/PvE)
      if (participantHumans.length === 0 && participantBots.length > 0) {
        return participantBots[0]!;
      }
      return null;
    }

    if (sec) {
      const scopedSec =
        sec.isNebula && activeSub
          ? { ...sec, ships: sec.ships.filter((s) => (s.subsector ?? 1) === activeSub) }
          : sec;
      const units = buildCombatUnitsForSector(
        scopedSec,
        state.players,
        combat.participatingPlayerIds,
        state.neutralShipBlueprints,
        state.expansions
      );
      const defenderId = combat.defenderOwnerId || getSectorDefenderOwnerId(scopedSec, state.players);
      const aliveUnits = sortUnitsByInitiative(
        units.filter((u) => u.currentDamage < u.maxHull),
        defenderId
      );
      const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
      const activeGroup = getActiveCombatGroup(combat, groups);

      if (activeGroup) {
        const owner = state.players.find((p) => p.id === activeGroup.ownerId);
        if (owner?.isBot) return owner.id;
        if (owner && !owner.isBot) return owner.id;
        // Current active group is an NPC (ancient/guardian/gcds): advance if only bots are fighting, or if human has auto-resolve enabled
        if (participantBots.length > 0 && participantHumans.length === 0) {
          return participantBots[0]!;
        }
        if (participantHumans.length > 0) {
          const allHumansAuto = participantHumans.every((hid) => combat.autoResolvePlayerIds?.includes(hid));
          if (allHumansAuto && participantBots.length > 0) {
            return participantBots[0]!;
          }
          return participantHumans[0]!;
        }
      }
    }
    return participantBots[0] || participantHumans[0] || null;
  }

  if (state.phase === 'UPKEEP_PHASE') {
    const num = state.players.length;
    const startIdx = Math.max(0, state.activePlayerIndex || 0);
    for (let offset = 0; offset < num; offset++) {
      const p = state.players[(startIdx + offset) % num];
      if (p && !p.isEliminated && !state.upkeepReadyPlayers?.[p.id]) {
        return p.id;
      }
    }
    return null;
  }

  if (state.phase === 'ACTION_PHASE') {
    const active = state.players[state.activePlayerIndex];
    if (active && !active.isEliminated) return active.id;
  }

  return null;
}

/**
 * Computes the next legal heuristic action for an AI-controlled player.
 * Guarantees a valid `GameAction` whenever the bot holds priority (or `null` if not its turn).
 */
export function computeBotAction(state: GameState, targetPlayerId?: string): GameAction | null {
  const actorId = targetPlayerId || getPriorityActorId(state);
  if (!actorId) return null;

  const player = state.players.find((p) => p.id === actorId);
  if (!player || !player.isBot || player.isEliminated) return null;

  const candidate = pickCandidateAction(state, player);
  if (!candidate) return null;

  if (validateAction(state, candidate).valid) {
    return candidate;
  }

  // Deterministic safe fallback per phase/pending state so the bot can never stall a game
  return buildSafeFallbackAction(state, player);
}

function pickCandidateAction(state: GameState, player: PlayerState): GameAction | null {
  if (state.pendingAmbassadorCubeReturns && state.pendingAmbassadorCubeReturns[0]?.playerId === player.id) {
    return handleAmbassadorCubeReturn(player, state.pendingAmbassadorCubeReturns[0]);
  }
  if (state.pendingDiplomacyProposal?.targetId === player.id) {
    return handleDiplomacyProposal(state, player, state.pendingDiplomacyProposal.initiatorId);
  }
  if (state.pendingActionConfirmation?.playerId === player.id) {
    return { type: 'CONFIRM_TURN_ACTION', playerId: player.id };
  }
  if (state.pendingExplore?.playerId === player.id) {
    return handlePendingExplore(state, player);
  }
  if (state.pendingReputationDraw?.playerId === player.id) {
    return handlePendingReputationDraw(player, state.pendingReputationDraw.drawnTiles);
  }
  if (state.pendingCombatConquest?.winnerPlayerId === player.id) {
    return handlePendingCombatConquest(state, player);
  }
  if (state.pendingDiscovery?.playerId === player.id) {
    return handlePendingDiscovery(state, player);
  }
  if (state.pendingExploreControl?.playerId === player.id) {
    return handlePendingExploreControl(state, player);
  }
  if (state.pendingArtifactReward?.playerId === player.id) {
    return handlePendingArtifactReward(state, player, state.pendingArtifactReward.totalResources);
  }
  if (state.pendingBankruptcy?.playerId === player.id) {
    return handlePendingBankruptcy(state, player);
  }
  if (state.pendingExilesOrbitalSetup?.playerId === player.id) {
    return {
      type: 'CHOOSE_EXILES_ORBITAL_CUBE',
      playerId: player.id,
      resource: player.population.science.cubesOnBoard > 6 ? 'science' : 'money',
    };
  }
  if (state.phase === 'DRAFT_PHASE' && state.factionDraft) {
    return handleDraftFaction(state, player);
  }
  if (state.phase === 'COMBAT_PHASE' && state.activeCombat) {
    return handleActiveCombat(state, player);
  }
  if (state.phase === 'UPKEEP_PHASE') {
    return handleUpkeepPhase(state, player);
  }
  if (state.phase === 'ACTION_PHASE' && state.players[state.activePlayerIndex]?.id === player.id) {
    return handleActionPhase(state, player);
  }
  return null;
}

function buildSafeFallbackAction(state: GameState, player: PlayerState): GameAction | null {
  if (state.pendingActionConfirmation?.playerId === player.id) {
    return { type: 'CONFIRM_TURN_ACTION', playerId: player.id };
  }
  if (state.pendingExploreControl?.playerId === player.id) {
    return {
      type: 'EXPLORE_CONTROL',
      playerId: player.id,
      sectorId: state.pendingExploreControl.sectorId,
      claimInfluence: false,
    };
  }
  if (state.pendingDiscovery?.playerId === player.id) {
    return {
      type: 'DISCOVERY_CHOICE',
      playerId: player.id,
      sectorId: state.pendingDiscovery.sectorId,
      keepForVictoryPoints: true,
    };
  }
  if (state.pendingExplore?.playerId === player.id) {
    return {
      type: 'EXPLORE',
      playerId: player.id,
      fromCoord: state.pendingExplore.fromCoord,
      targetCoord: state.pendingExplore.targetCoord,
      rotation: 0,
      discard: true,
      claimInfluence: false,
      isSecondActivation: state.pendingExplore.isSecondActivation,
    };
  }
  if (state.pendingReputationDraw?.playerId === player.id) {
    return { type: 'CLAIM_REPUTATION_TILE', playerId: player.id, selectedTileIndex: -1 };
  }
  if (state.pendingCombatConquest?.winnerPlayerId === player.id) {
    return {
      type: 'COMBAT_CONQUEST',
      playerId: player.id,
      sectorId: state.pendingCombatConquest.sectorId,
      claimInfluence: false,
    };
  }
  if (state.phase === 'UPKEEP_PHASE') {
    return { type: 'READY_FOR_UPKEEP', playerId: player.id };
  }
  if (state.phase === 'ACTION_PHASE') {
    return { type: 'PASS', playerId: player.id, enableAutoPass: true };
  }
  return null;
}

// ============================================================================
// ECONOMY & TERRITORY SCORING HELPERS
// ============================================================================

function getTradeRatio(player: PlayerState): number {
  return player.faction.id === 'rho_indi_syndicate' ? 3 : (player.faction.tradeRatio || 2);
}

function getTradeableMoneyReserve(player: PlayerState): number {
  const ratio = getTradeRatio(player);
  return Math.floor(player.resources.materials / ratio) + Math.floor(player.resources.science / ratio);
}

/**
 * Checks whether spending `discsToSpend` additional Influence Discs leaves the bot solvent
 * after projected Money income and reasonable resource trading.
 */
function canSafelyAffordDiscs(
  state: GameState,
  player: PlayerState,
  discsToSpend: number,
  extraMoneyBuffer: number = 0
): boolean {
  if (player.influenceTrack.discsOnTrack < discsToSpend) return false;
  const remainingAfter = Math.max(0, player.influenceTrack.discsOnTrack - discsToSpend);
  const projectedUpkeep = getUpkeepForDiscs(remainingAfter);
  const summary = calculatePlayerRoundSummary(player);
  const projectedCash = player.resources.money + summary.income.money;
  const maxReserve = getTradeableMoneyReserve(player);
  return projectedCash + Math.floor(maxReserve * 0.5) >= projectedUpkeep + extraMoneyBuffer;
}

function getBestColonizableResource(
  state: GameState,
  player: PlayerState,
  planet: PlanetSlot
): 'money' | 'science' | 'material' {
  if (planet.isOrbital) {
    const moneyInc = getIncomeForTrack(player.population.money.cubesOnBoard);
    const sciInc = getIncomeForTrack(player.population.science.cubesOnBoard);
    if (player.population.money.cubesOnBoard <= 0) return 'science';
    if (player.population.science.cubesOnBoard <= 0) return 'money';
    return moneyInc <= sciInc + 2 ? 'money' : 'science';
  }
  if (planet.resource !== 'any') {
    return planet.resource as 'money' | 'science' | 'material';
  }

  // Wild planet priority: Economy & Science/Materials early -> Money mid/late
  const candidates: Array<{ res: 'money' | 'science' | 'material'; score: number }> = [];
  const moneyInc = getIncomeForTrack(player.population.money.cubesOnBoard);
  const sciInc = getIncomeForTrack(player.population.science.cubesOnBoard);
  const matInc = getIncomeForTrack(player.population.material.cubesOnBoard);
  const upkeep = calculatePlayerRoundSummary(player).upkeep;

  if (player.population.money.cubesOnBoard > 0) {
    const upkeepPressure = upkeep >= moneyInc - 2 ? 12 : 4;
    candidates.push({ res: 'money', score: 20 + upkeepPressure + (state.round >= 4 ? 8 : 0) });
  }
  if (player.population.science.cubesOnBoard > 0) {
    candidates.push({ res: 'science', score: 18 + (sciInc < 8 ? 6 : 0) + (state.round <= 4 ? 5 : 0) });
  }
  if (player.population.material.cubesOnBoard > 0) {
    candidates.push({ res: 'material', score: 19 + (matInc < 8 ? 6 : 0) + (state.round <= 5 ? 4 : 0) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.res || 'money';
}

function scoreSectorControlValue(state: GameState, player: PlayerState, sector: SectorTile): number {
  let score = (sector.victoryPoints || 0) * 6;
  if (sector.sectorNumber === 1) score += 20;
  if (sector.hasArtifact) score += 5;
  if (sector.hasWarpPortal) score += 4;
  if (sector.isPulsar) score += 8;

  for (const planet of sector.planets || []) {
    const check = canColonizePlanetSlot(player, planet);
    const hasCubes =
      planet.resource === 'any' || planet.isOrbital
        ? player.population.money.cubesOnBoard > 0 || player.population.science.cubesOnBoard > 0
        : (player.population[planet.resource as 'money' | 'science' | 'material']?.cubesOnBoard ?? 0) > 0;
    if (check.canColonize && hasCubes) {
      if (planet.resource === 'money' || planet.resource === 'any') score += 10;
      else if (planet.resource === 'material') score += state.round <= 5 ? 9 : 5;
      else score += state.round <= 5 ? 8 : 5;
    } else if (!planet.isAdvanced) {
      score += 3;
    } else {
      score += 1;
    }
  }
  return score;
}

// ============================================================================
// BLOCKING & OFF-TURN SUB-STATE HANDLERS
// ============================================================================

function handleDraftFaction(state: GameState, player: PlayerState): GameAction | null {
  const draft = state.factionDraft;
  if (!draft || draft.availableFactionIds.length === 0) return null;
  const preferredTerran = TERRAN_FACTION_IDS.find((id) => draft.availableFactionIds.includes(id));
  const chosenId = preferredTerran || draft.availableFactionIds[0]!;
  return {
    type: 'DRAFT_FACTION',
    playerId: player.id,
    factionId: chosenId,
  };
}

function handleAmbassadorCubeReturn(
  player: PlayerState,
  pending: { formerAllyId: string; preferredTrack?: 'money' | 'science' | 'material' }
): GameAction {
  const order: Array<'money' | 'science' | 'material'> = pending.preferredTrack
    ? [pending.preferredTrack, 'money', 'science', 'material']
    : ['money', 'science', 'material'];
  const track = order.find((t) => player.population[t].cubesOnBoard < 11) || 'money';
  return {
    type: 'RETURN_AMBASSADOR_CUBE',
    playerId: player.id,
    formerAllyId: pending.formerAllyId,
    resource: track,
  };
}

function handleDiplomacyProposal(state: GameState, player: PlayerState, initiatorId: string): GameAction {
  const maxSlots = player.faction.ambassadorSlots ?? 3;
  const currentAllies = player.ambassadorTiles?.length || 0;
  const freeTrack = RESOURCE_TRACKS.find((t) => player.population[t].cubesOnBoard < 11);
  const check = canExchangeAmbassadors(state, initiatorId, player.id);

  // Accept diplomacy in rounds 1-6 if slots/tracks allow and initiator isn't currently fighting us
  const inCombatTogether = state.sectors.some(
    (s) => s.ships.some((sh) => sh.ownerId === player.id) && s.ships.some((sh) => sh.ownerId === initiatorId)
  );
  const shouldAccept =
    check.canExchange &&
    Boolean(freeTrack) &&
    currentAllies < maxSlots &&
    !inCombatTogether &&
    state.round <= (state.maxRounds || 8) - 1;

  // Prefer gifting from highest income track with < 11 cubes (science/material before money)
  const sortedTracks = [...RESOURCE_TRACKS]
    .filter((t) => player.population[t].cubesOnBoard < 11)
    .sort((a, b) => player.population[b].cubesOnBoard - player.population[a].cubesOnBoard);

  return {
    type: 'RESPOND_DIPLOMACY',
    playerId: player.id,
    accept: shouldAccept,
    targetCube: shouldAccept ? (sortedTracks[0] || freeTrack || 'science') : undefined,
  };
}

function handlePendingExplore(state: GameState, player: PlayerState): GameAction {
  const pe = state.pendingExplore!;
  const tile = pe.tile;
  const sourceSector = state.sectors.find((s) => areCoordsEqual(s.coord, pe.fromCoord));
  const hasWormholeGen = playerHasWormholeGenerator(player);

  if (!tile || !sourceSector) {
    return {
      type: 'EXPLORE',
      playerId: player.id,
      fromCoord: pe.fromCoord,
      targetCoord: pe.targetCoord,
      rotation: 0,
      discard: true,
      claimInfluence: false,
      isSecondActivation: pe.isSecondActivation,
    };
  }

  const legalRotations = findLegalExploreRotations(
    sourceSector,
    tile,
    pe.targetCoord,
    hasWormholeGen,
    state.sectors,
    player.id,
    state.warpedUniverse?.conduits
  );

  if (legalRotations.length === 0) {
    return {
      type: 'EXPLORE',
      playerId: player.id,
      fromCoord: pe.fromCoord,
      targetCoord: pe.targetCoord,
      rotation: 0,
      discard: true,
      claimInfluence: false,
      isSecondActivation: pe.isSecondActivation,
    };
  }

  // Evaluate whether tile is worth keeping vs discarding (avoid weak 0-planet Ancient traps if unready)
  const sectorVal = scoreSectorControlValue(state, player, tile);
  const hasAncients = (tile.ancientsCount || 0) > 0;
  const myFleetCount = state.sectors.reduce(
    (sum, s) => sum + s.ships.filter((sh) => sh.ownerId === player.id).length,
    0
  );
  if (hasAncients && myFleetCount < 2 && tile.ancientsCount >= 2 && state.round >= 3) {
    // Still okay to place and simply not claim unless completely barren
  }
  if (sectorVal <= 2 && !tile.hasDiscovery && (tile.planets?.length || 0) === 0 && !tile.isPulsar) {
    return {
      type: 'EXPLORE',
      playerId: player.id,
      fromCoord: pe.fromCoord,
      targetCoord: pe.targetCoord,
      rotation: legalRotations[0]!,
      discard: true,
      claimInfluence: false,
      isSecondActivation: pe.isSecondActivation,
    };
  }

  // Pick rotation maximizing wormhole connections into unexplored space and minimizing back-door exposure to enemies
  let bestRot = legalRotations[0]!;
  let bestRotScore = -Infinity;

  for (const rot of legalRotations) {
    let score = 0;
    const rotatedTile: SectorTile = { ...tile, rotation: rot as HexEdge };
    for (let edge = 0; edge < 6; edge++) {
      if (!hasWormholeOnEdge(rotatedTile, edge as HexEdge)) continue;
      const nbrCoord = getNeighborCoord(pe.targetCoord, edge as HexEdge);
      const ring = getRingFromCoord(nbrCoord);
      if (ring === 0) {
        score += 1; // points toward Galactic Center
      } else if (ring >= 1 && ring <= 3) {
        const nbrSec = state.sectors.find((s) => areCoordsEqual(s.coord, nbrCoord));
        if (!nbrSec) {
          score += 3; // opens new exploration frontier
        } else if (nbrSec.discOwner === player.id) {
          score += 2; // reinforces own network
        } else if (nbrSec.discOwner && nbrSec.discOwner !== player.id) {
          score -= 1; // avoids opening free highways into opponent territory early
        }
      }
    }
    if (score > bestRotScore) {
      bestRotScore = score;
      bestRot = rot;
    }
  }

  const willClaimInfluence =
    !hasAncients &&
    !tile.hasDiscovery &&
    !tile.isNebula &&
    !tile.isBlackHole &&
    sectorVal >= 10 &&
    canSafelyAffordDiscs(state, player, 1);

  return {
    type: 'EXPLORE',
    playerId: player.id,
    fromCoord: pe.fromCoord,
    targetCoord: pe.targetCoord,
    rotation: bestRot,
    discard: false,
    claimInfluence: willClaimInfluence,
    isSecondActivation: pe.isSecondActivation,
  };
}

function findLegalEquipSlotForPart(
  state: GameState,
  player: PlayerState,
  part: ShipPart
): { shipType: ShipType; slotIndex: number } | null {
  const shipOrder: ShipType[] = ['cruiser', 'interceptor', 'dreadnought'];
  for (const st of shipOrder) {
    const bp = player.blueprints[st];
    if (!bp) continue;
    if (part.id === 'muon_source') {
      if (bp.externalParts?.some((p) => p.id === 'muon_source')) continue;
      const testBp: ShipBlueprint = {
        ...bp,
        slots: [...bp.slots],
        externalParts: [...(bp.externalParts || []), part],
      };
      if (calculateBlueprintStats(testBp, state.expansions).isValid) {
        return { shipType: st, slotIndex: -1 };
      }
      continue;
    }
    // Try empty slot first, then replacing weakest redundant hull/nuclear_source/ion_cannon slot
    const candidateIndices: number[] = [];
    for (let i = 0; i < bp.maxSlots; i++) {
      if (!bp.slots[i]) candidateIndices.push(i);
    }
    for (let i = 0; i < bp.maxSlots; i++) {
      const existing = bp.slots[i];
      if (existing && (existing.id === 'ion_cannon' || existing.id === 'hull' || existing.id === 'electron_computer')) {
        candidateIndices.push(i);
      }
    }
    for (const idx of candidateIndices) {
      const testBp: ShipBlueprint = { ...bp, slots: [...bp.slots] };
      testBp.slots[idx] = part;
      const stats = calculateBlueprintStats(testBp, state.expansions);
      if (stats.isValid) {
        return { shipType: st, slotIndex: idx };
      }
    }
  }
  return null;
}

function handlePendingDiscovery(state: GameState, player: PlayerState): GameAction {
  const pd = state.pendingDiscovery!;
  const disc = pd.discovery;
  const sec = state.sectors.find((s) => s.id === pd.sectorId);
  const reward = disc.immediateReward;

  let claimInfluence: boolean | undefined = undefined;
  if (pd.fromExplore && sec && !sec.discOwner && !sec.ancientsCount && !sec.isNebula && !sec.isBlackHole) {
    const val = scoreSectorControlValue(state, player, sec);
    claimInfluence = val >= 10 && canSafelyAffordDiscs(state, player, 1);
  }

  // Check ship limit for free ships
  const grantShip = reward?.grantShipType || (disc.id === 'disc_ancient_cruiser' ? 'cruiser' : undefined);
  if (grantShip) {
    const deployed = countPlayerShips(state.sectors, player.id);
    if (deployed[grantShip] >= SHIP_LIMITS[grantShip]) {
      return {
        type: 'DISCOVERY_CHOICE',
        playerId: player.id,
        sectorId: pd.sectorId,
        keepForVictoryPoints: true,
        claimInfluence,
      };
    }
    return {
      type: 'DISCOVERY_CHOICE',
      playerId: player.id,
      sectorId: pd.sectorId,
      keepForVictoryPoints: false,
      claimInfluence,
    };
  }

  // Late game: keep marginal discoveries for 2 VP unless high immediate yield (Monolith = 3 VP, Orbital)
  const lateGameKeepVP =
    state.round >= (state.maxRounds || 8) &&
    reward?.grantStructure !== 'monolith' &&
    reward?.grantStructure !== 'orbital';

  if (lateGameKeepVP) {
    return {
      type: 'DISCOVERY_CHOICE',
      playerId: player.id,
      sectorId: pd.sectorId,
      keepForVictoryPoints: true,
      claimInfluence,
    };
  }

  if (reward?.ancientTech) {
    const minCost = state.techSupply
      .filter((t) => t.category !== 'rare' && !player.techTrack.researched.some((r) => r.id === t.id))
      .sort((a, b) => a.baseCost - b.baseCost)[0]?.baseCost;
    const tied = state.techSupply
      .filter((t) => t.category !== 'rare' && t.baseCost === minCost && !player.techTrack.researched.some((r) => r.id === t.id))
      .sort((a, b) => (TECH_PRIORITY_WEIGHTS[b.id] || 40) - (TECH_PRIORITY_WEIGHTS[a.id] || 40));

    if (tied.length > 0) {
      return {
        type: 'DISCOVERY_CHOICE',
        playerId: player.id,
        sectorId: pd.sectorId,
        keepForVictoryPoints: false,
        chosenTechId: tied[0]!.id,
        claimInfluence,
      };
    }
  }

  if (disc.shipPartId) {
    const part = SHIP_PARTS[disc.shipPartId];
    const partRank = ANCIENT_PART_RANKING[disc.shipPartId] ?? 50;
    if (part && partRank >= 70) {
      const equipSlot = findLegalEquipSlotForPart(state, player, part);
      return {
        type: 'DISCOVERY_CHOICE',
        playerId: player.id,
        sectorId: pd.sectorId,
        keepForVictoryPoints: false,
        equipShipType: equipSlot?.shipType,
        equipSlotIndex: equipSlot && equipSlot.slotIndex >= 0 ? equipSlot.slotIndex : undefined,
        claimInfluence,
      };
    }
    return {
      type: 'DISCOVERY_CHOICE',
      playerId: player.id,
      sectorId: pd.sectorId,
      keepForVictoryPoints: true,
      claimInfluence,
    };
  }

  if (reward?.grantStructure === 'orbital') {
    const canCol =
      (claimInfluence || sec?.discOwner === player.id) &&
      player.colonyShips.ready > 0 &&
      (player.population.money.cubesOnBoard > 0 || player.population.science.cubesOnBoard > 0);
    const orbRes: 'money' | 'science' | undefined = canCol
      ? (player.population.money.cubesOnBoard > 0 ? 'money' : 'science')
      : undefined;
    return {
      type: 'DISCOVERY_CHOICE',
      playerId: player.id,
      sectorId: pd.sectorId,
      keepForVictoryPoints: false,
      colonizeOrbitalResource: orbRes,
      claimInfluence,
    };
  }

  if (reward?.grantStructure === 'monolith' || reward?.warpPortal || reward?.money || reward?.choose3Resource) {
    const chosenRes: 'money' | 'science' | 'material' =
      player.resources.money < 6 ? 'money' : player.resources.materials < 5 ? 'material' : 'science';
    return {
      type: 'DISCOVERY_CHOICE',
      playerId: player.id,
      sectorId: pd.sectorId,
      keepForVictoryPoints: false,
      chosenResource: reward?.choose3Resource ? chosenRes : undefined,
      claimInfluence,
    };
  }

  // Fallback for VP-oriented discoveries
  return {
    type: 'DISCOVERY_CHOICE',
    playerId: player.id,
    sectorId: pd.sectorId,
    keepForVictoryPoints: true,
    claimInfluence,
  };
}

function handlePendingExploreControl(state: GameState, player: PlayerState): GameAction {
  const pec = state.pendingExploreControl!;
  const sec = state.sectors.find((s) => s.id === pec.sectorId);
  const shouldClaim =
    Boolean(sec) &&
    !sec!.isNebula &&
    !sec!.isBlackHole &&
    !sec!.discOwner &&
    scoreSectorControlValue(state, player, sec!) >= 10 &&
    canSafelyAffordDiscs(state, player, 1);

  return {
    type: 'EXPLORE_CONTROL',
    playerId: player.id,
    sectorId: pec.sectorId,
    claimInfluence: shouldClaim,
  };
}

function handlePendingCombatConquest(state: GameState, player: PlayerState): GameAction {
  const pcq = state.pendingCombatConquest!;
  const sec = state.sectors.find((s) => s.id === pcq.sectorId);
  if (!sec) {
    return {
      type: 'COMBAT_CONQUEST',
      playerId: player.id,
      sectorId: pcq.sectorId,
      claimInfluence: false,
    };
  }

  const secValue = scoreSectorControlValue(state, player, sec);
  const alreadyOwned = sec.discOwner === player.id;
  const claimInfluence =
    !alreadyOwned &&
    !sec.isNebula &&
    !sec.isBlackHole &&
    !sec.isSupernovaExploded &&
    player.influenceTrack.discsOnTrack > 0 &&
    (sec.sectorNumber === 1 || secValue >= 10 || state.round >= (state.maxRounds || 8)) &&
    canSafelyAffordDiscs(state, player, 1, 0);

  const willControl = alreadyOwned || claimInfluence;
  const colonizeIndices: number[] = [];
  const planetChoices: Record<number, 'money' | 'science' | 'material'> = {};

  if (willControl && player.colonyShips.ready > 0) {
    let shipsLeft = player.colonyShips.ready;
    const planetOrder = sec.planets
      .map((pl, idx) => ({ pl, idx }))
      .filter(({ pl }) => !pl.colonizedBy && canColonizePlanetSlot(player, pl).canColonize)
      .sort((a, b) => {
        const w = (p: PlanetSlot) => (p.resource === 'money' ? 3 : p.resource === 'any' ? 2.5 : p.resource === 'material' ? 2 : 1.5);
        return w(b.pl) - w(a.pl);
      });

    for (const { pl, idx } of planetOrder) {
      if (shipsLeft <= 0) break;
      const chosen = getBestColonizableResource(state, player, pl);
      if (player.population[chosen].cubesOnBoard > 0) {
        colonizeIndices.push(idx);
        if (pl.resource === 'any' || pl.isOrbital) {
          planetChoices[idx] = chosen;
        }
        shipsLeft -= 1;
      }
    }
  }

  return {
    type: 'COMBAT_CONQUEST',
    playerId: player.id,
    sectorId: pcq.sectorId,
    claimInfluence,
    colonizePlanetIndices: colonizeIndices.length > 0 ? colonizeIndices : undefined,
    planetResourceChoices: Object.keys(planetChoices).length > 0 ? planetChoices : undefined,
  };
}

function handlePendingReputationDraw(player: PlayerState, drawnTiles: number[]): GameAction {
  if (!drawnTiles || drawnTiles.length === 0) {
    return { type: 'CLAIM_REPUTATION_TILE', playerId: player.id, selectedTileIndex: -1 };
  }
  let bestIdx = 0;
  for (let i = 1; i < drawnTiles.length; i++) {
    if (drawnTiles[i]! > drawnTiles[bestIdx]!) bestIdx = i;
  }
  const bestVal = drawnTiles[bestIdx]!;
  const maxRep = getMaxReputationTilesForPlayer(player);

  if (player.reputationTiles.length < maxRep) {
    return { type: 'CLAIM_REPUTATION_TILE', playerId: player.id, selectedTileIndex: bestIdx };
  }

  if (player.reputationTiles.length > 0 && maxRep > 0) {
    let worstExistingIdx = 0;
    for (let i = 1; i < player.reputationTiles.length; i++) {
      if (player.reputationTiles[i]! < player.reputationTiles[worstExistingIdx]!) worstExistingIdx = i;
    }
    if (bestVal > player.reputationTiles[worstExistingIdx]!) {
      return {
        type: 'CLAIM_REPUTATION_TILE',
        playerId: player.id,
        selectedTileIndex: bestIdx,
        replaceTrackIndex: worstExistingIdx,
      };
    }
  }

  return { type: 'CLAIM_REPUTATION_TILE', playerId: player.id, selectedTileIndex: -1 };
}

function handlePendingArtifactReward(
  state: GameState,
  player: PlayerState,
  totalResources: number
): GameAction {
  const chunks = Math.floor(totalResources / 5);
  let m = 0;
  let sc = 0;
  let mat = 0;
  const summary = calculatePlayerRoundSummary(player);
  const needsMoney = summary.netMoneyDelta < 0 || player.resources.money < 6;

  for (let i = 0; i < chunks; i++) {
    if (needsMoney && i === 0) m += 5;
    else if (i % 2 === 0) mat += 5;
    else sc += 5;
  }
  return {
    type: 'ALLOCATE_ARTIFACT_REWARD',
    playerId: player.id,
    resources: { money: m, science: sc, materials: mat },
  };
}

function handlePendingBankruptcy(state: GameState, player: PlayerState): GameAction {
  const ratio = getTradeRatio(player);
  if (player.resources.materials >= ratio) {
    return {
      type: 'TRADE',
      playerId: player.id,
      fromResource: 'material',
      toResource: 'money',
      amount: ratio,
    };
  }
  if (player.resources.science >= ratio) {
    return {
      type: 'TRADE',
      playerId: player.id,
      fromResource: 'science',
      toResource: 'money',
      amount: ratio,
    };
  }

  // Abandon weakest controlled sector (avoid home sector while outer sectors remain)
  const ownedSectors = state.sectors
    .filter((s) => s.discOwner === player.id)
    .sort((a, b) => {
      const aHome = a.id.includes(`home_sector_${player.id}`) || (a.sectorNumber >= 221 && a.sectorNumber <= 238) ? 100 : 0;
      const bHome = b.id.includes(`home_sector_${player.id}`) || (b.sectorNumber >= 221 && b.sectorNumber <= 238) ? 100 : 0;
      return (scoreSectorControlValue(state, player, a) + aHome) - (scoreSectorControlValue(state, player, b) + bHome);
    });

  return {
    type: 'ABANDON_SECTOR_BANKRUPTCY',
    playerId: player.id,
    sectorId: ownedSectors[0]?.id,
  };
}

function handleUpkeepPhase(state: GameState, player: PlayerState): GameAction {
  const colonizeAct = findBestColonizeAction(state, player);
  if (colonizeAct) return colonizeAct;
  return { type: 'READY_FOR_UPKEEP', playerId: player.id };
}

function handleActiveCombat(state: GameState, player: PlayerState): GameAction {
  const combat = state.activeCombat!;
  if (combat.stage === 'resolved') {
    return {
      type: 'RESOLVE_COMBAT_STEP',
      playerId: player.id,
      sectorId: combat.sectorId,
      concludeCombat: true,
    };
  }

  if (combat.pendingDamageAssignment && combat.pendingDamageAssignment.attackerOwnerId === player.id) {
    const pending = combat.pendingDamageAssignment;
    const sec = state.sectors.find((s) => s.id === combat.sectorId);
    const activeSub = sec?.isNebula ? combat.subsector : undefined;
    const scopedSec = sec && sec.isNebula && activeSub
      ? { ...sec, ships: sec.ships.filter((s) => (s.subsector ?? 1) === activeSub) }
      : sec;
    const units = scopedSec
      ? buildCombatUnitsForSector(
          scopedSec,
          state.players,
          combat.participatingPlayerIds,
          state.neutralShipBlueprints,
          state.expansions
        )
      : [];
    const enemyUnits = units
      .filter((u) => u.ownerId !== player.id && u.currentDamage < u.maxHull)
      .map((u) => ({ ...u }))
      .sort((a, b) => {
        // Focus killable high-value targets first
        const aLeft = a.maxHull - a.currentDamage;
        const bLeft = b.maxHull - b.currentDamage;
        if (aLeft !== bLeft) return aLeft - bLeft;
        return b.maxHull - a.maxHull;
      });

    const assignments: CombatDamageAssignment[] = [];
    pending.rolls.forEach((roll, idx) => {
      if (!roll.isHit || roll.damage <= 0) return;
      const target = enemyUnits.find((u) => u.currentDamage < u.maxHull);
      if (target) {
        assignments.push({ rollIndex: idx, targetShipId: target.id });
        target.currentDamage += roll.damage;
      }
    });
    if (assignments.length > 0) {
      return {
        type: 'RESOLVE_COMBAT_STEP',
        playerId: player.id,
        sectorId: combat.sectorId,
        damageAssignments: assignments,
        autoAssign: true,
      };
    }
  }

  return {
    type: 'RESOLVE_COMBAT_STEP',
    playerId: player.id,
    sectorId: combat.sectorId,
    autoAssign: true,
  };
}

// ============================================================================
// ACTION PHASE HEURISTICS (TERRAN)
// ============================================================================

function findBestColonizeAction(state: GameState, player: PlayerState): GameAction | null {
  if (player.colonyShips.ready <= 0) return null;
  const colonizables = getColonizablePlanetsForPlayer(state, player.id);
  if (colonizables.length === 0) return null;

  const scored: Array<{ sectorId: string; planetIndex: number; chosenResource?: 'money' | 'science' | 'material'; score: number }> = [];
  for (const item of colonizables) {
    const sector = state.sectors.find((s) => s.id === item.sectorId);
    const planet = sector?.planets[item.planetIndex];
    if (!sector || !planet) continue;
    const bestRes = getBestColonizableResource(state, player, planet);
    if (player.population[bestRes].cubesOnBoard <= 0) continue;
    let val = bestRes === 'money' ? 20 : bestRes === 'material' ? 18 : 17;
    if (planet.isAdvanced) val += 4;
    if (sector.sectorNumber === 1) val += 4;
    scored.push({
      sectorId: sector.id,
      planetIndex: item.planetIndex,
      chosenResource: planet.resource === 'any' || planet.isOrbital ? bestRes : undefined,
      score: val,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;

  const best = scored[0]!;
  return {
    type: 'COLONIZE',
    playerId: player.id,
    sectorId: best.sectorId,
    planetIndex: best.planetIndex,
    chosenResource: best.chosenResource,
  };
}

function findBestExploreAction(state: GameState, player: PlayerState): { action: GameAction; score: number } | null {
  if (!canSafelyAffordDiscs(state, player, 1)) return null;
  const hasWormholeGen = playerHasWormholeGenerator(player);
  const explorable = getExplorableHexes(
    state.sectors,
    player.id,
    hasWormholeGen,
    state.sectorDecks,
    state.warpedUniverse?.conduits,
    state.warpedUniverse?.warpSectors
  );
  if (explorable.length === 0) return null;

  const controlledCount = state.sectors.filter((s) => s.discOwner === player.id).length;
  // Prioritize Ring 1 -> Ring 2 -> Ring 3, favoring inner growth early and stopping bloated Ring 3 pushes when tight on discs
  const candidates = explorable
    .map((t) => {
      const deckSize =
        t.ring === 1
          ? state.sectorDecks.ring1.length
          : t.ring === 2
          ? state.sectorDecks.ring2.length
          : state.sectorDecks.ring3.length;
      if (deckSize <= 0) return null;
      let score = t.ring === 1 ? 66 : t.ring === 2 ? 60 : 48;
      if (state.round <= 3 && controlledCount < 5) score += 16;
      if (controlledCount >= 7) score -= 22;
      if (player.influenceTrack.discsOnTrack <= 2) score -= 20;
      if (t.ring === 3 && state.round <= 2) score -= 10;
      return { target: t, score };
    })
    .filter((x): x is { target: (typeof explorable)[number]; score: number } => Boolean(x))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;
  const top = candidates[0]!;
  const action: GameAction = {
    type: 'START_EXPLORE',
    playerId: player.id,
    fromCoord: top.target.from,
    targetCoord: top.target.target,
  };
  return validateAction(state, action).valid ? { action, score: top.score } : null;
}

function findBestResearchAction(state: GameState, player: PlayerState): { action: GameAction; score: number } | null {
  if (!canSafelyAffordDiscs(state, player, 1)) return null;

  const ownedIds = new Set(player.techTrack.researched.map((t) => t.id));
  const uniqueSupply: Technology[] = [];
  const seen = new Set<string>();
  for (const t of state.techSupply) {
    if (!ownedIds.has(t.id) && !seen.has(t.id)) {
      seen.add(t.id);
      uniqueSupply.push(t);
    }
  }

  let bestTech: Technology | null = null;
  let bestTargetTrack: 'military' | 'grid' | 'nano' | undefined;
  let bestScore = -Infinity;

  for (const tech of uniqueSupply) {
    const trackForCalc: 'military' | 'grid' | 'nano' =
      tech.category === 'rare'
        ? (player.techTrack.militaryCount >= player.techTrack.gridCount && player.techTrack.militaryCount >= player.techTrack.nanoCount
            ? 'military'
            : player.techTrack.gridCount >= player.techTrack.nanoCount
            ? 'grid'
            : 'nano')
        : tech.category;
    const cost = calculateTechCost(
      tech,
      trackForCalc === 'military'
        ? player.techTrack.militaryCount
        : trackForCalc === 'grid'
        ? player.techTrack.gridCount
        : player.techTrack.nanoCount
    );
    if (cost > player.resources.science) continue;

    // Respect Warp Portal requirement if applicable
    if (tech.id === 'warp_portal' && !state.sectors.some((s) => s.discOwner === player.id)) continue;

    let score = TECH_PRIORITY_WEIGHTS[tech.id] ?? 40;
    if (tech.id === 'monolith') {
      score += state.round >= 5 ? 25 : -18;
    }
    if (tech.id === 'advanced_robotics' || tech.id === 'quantum_grid') {
      score += player.influenceTrack.discsOnTrack <= 4 ? 22 : 10;
    }
    // Slight bonus for hitting higher VP bracket on a track
    const currentTrackLen =
      trackForCalc === 'military'
        ? player.techTrack.militaryCount
        : trackForCalc === 'grid'
        ? player.techTrack.gridCount
        : player.techTrack.nanoCount;
    if (currentTrackLen === 3 || currentTrackLen === 4 || currentTrackLen === 5) score += 8;

    // Penalize spending 0 science on junk when better techs are affordable next round unless round 7-8 VP push
    if (state.round >= (state.maxRounds || 8) - 1 && currentTrackLen >= 3) score += 12;

    if (score > bestScore) {
      bestScore = score;
      bestTech = tech;
      bestTargetTrack = tech.category === 'rare' ? trackForCalc : undefined;
    }
  }

  if (!bestTech) return null;

  const warpSectorId =
    bestTech.id === 'warp_portal'
      ? state.sectors.find((s) => s.discOwner === player.id)?.id
      : undefined;

  const action: GameAction = {
    type: 'RESEARCH',
    playerId: player.id,
    techId: bestTech.id,
    targetTrack: bestTargetTrack,
    warpPortalSectorId: warpSectorId,
  };
  return validateAction(state, action).valid ? { action, score: bestScore } : null;
}

function getUnlockedPartIds(player: PlayerState): string[] {
  const ids = new Set<string>(STANDARD_PART_IDS);
  for (const t of player.techTrack.researched) {
    if (t.unlocksPartId) ids.add(t.unlocksPartId);
  }
  for (const ancientId of player.unlockedAncientParts || []) {
    ids.add(ancientId);
  }
  return Array.from(ids);
}

function scoreBlueprintCombatPower(bp: ShipBlueprint, shipType: ShipType): number {
  const s = calculateBlueprintStats(bp);
  const allParts = [...bp.slots, ...(bp.externalParts || [])].filter((p): p is ShipPart => Boolean(p));
  let cannonScore = 0;
  let missileScore = 0;
  for (const part of allParts) {
    if (part.dice && part.dice.length > 0) {
      for (const d of part.dice) {
        const dmgPotential = d.count * d.damagePerHit;
        if (d.isMissile || part.category === 'missile') {
          missileScore += dmgPotential * 1.4;
        } else {
          cannonScore += dmgPotential * (1 + s.computerBonus * 0.25);
        }
      }
    }
  }
  const speedWeight = shipType === 'starbase' ? 0 : Math.min(2, s.totalDriveSpeed) * 3;
  return (
    cannonScore * 6.5 +
    missileScore * 5 +
    s.totalHull * 4.5 +
    s.computerBonus * 5 +
    s.shieldBonus * 3.5 +
    s.totalInitiative * 1.6 +
    speedWeight
  );
}

type CandidateBlueprintUpgrade = {
  shipType: ShipType;
  slotIndex: number;
  partId: string | null;
  isExternal?: boolean;
};

function applyBlueprintUpgrade(
  bp: ShipBlueprint,
  up: Pick<CandidateBlueprintUpgrade, 'slotIndex' | 'partId' | 'isExternal'>
): ShipBlueprint | null {
  const part = up.partId ? SHIP_PARTS[up.partId] || null : null;
  if (up.partId !== null && !part) return null;
  if (up.isExternal || up.slotIndex === -1) {
    if (part && part.id !== 'muon_source') return null;
    return {
      ...bp,
      slots: [...bp.slots],
      externalParts: part ? [part] : [],
    };
  }
  if (up.slotIndex < 0 || up.slotIndex >= bp.maxSlots) return null;
  const nextSlots = [...bp.slots];
  nextSlots[up.slotIndex] = part;
  return {
    ...bp,
    slots: nextSlots,
    externalParts: bp.externalParts ? [...bp.externalParts] : undefined,
  };
}

function findBestUpgradeAction(
  state: GameState,
  player: PlayerState,
  isReaction: boolean
): { action: GameAction; score: number } | null {
  if (!isReaction && !canSafelyAffordDiscs(state, player, 1)) return null;

  const unlockedParts = getUnlockedPartIds(player)
    .map((id) => SHIP_PARTS[id])
    .filter((p): p is ShipPart => Boolean(p));

  const deployed = countPlayerShips(state.sectors, player.id);
  const maxUpgrades = isReaction ? 1 : getMaxUpgradeActivations(player);

  // Target Cruiser and Interceptor (or Dreadnought if deployed / affordable)
  const shipTypes: ShipType[] = ['cruiser', 'interceptor', 'dreadnought'];
  const bestSingleSwaps: Array<CandidateBlueprintUpgrade & { gain: number; weightByFleet: number }> = [];

  for (const st of shipTypes) {
    const bp = player.blueprints[st];
    if (!bp) continue;
    const weightByFleet = (deployed[st] || 0) > 0 ? 1 + (deployed[st] || 0) * 0.25 : st === 'cruiser' ? 0.9 : 0.6;
    const baseScore = scoreBlueprintCombatPower(bp, st);

    // Muon Source must be placed outside the blueprint grid (external slot)
    const muonPart = unlockedParts.find((p) => p.id === 'muon_source');
    if (muonPart && !bp.externalParts?.some((p) => p.id === 'muon_source')) {
      const testBp = applyBlueprintUpgrade(bp, { slotIndex: -1, partId: 'muon_source', isExternal: true });
      if (testBp && calculateBlueprintStats(testBp, state.expansions).isValid) {
        const gain = (scoreBlueprintCombatPower(testBp, st) - baseScore) * weightByFleet;
        if (gain > 2.5) {
          bestSingleSwaps.push({ shipType: st, slotIndex: -1, partId: 'muon_source', isExternal: true, gain, weightByFleet });
        }
      }
    }

    for (let slotIdx = 0; slotIdx < bp.maxSlots; slotIdx++) {
      const existing = bp.slots[slotIdx];
      for (const part of unlockedParts) {
        if (part.id === 'muon_source') continue;
        if (existing?.id === part.id) continue;
        // Skip duplicate non-stackable drives when one already exists unless replacing the existing drive
        if (part.category === 'drive' && existing?.category !== 'drive' && bp.slots.some((sl) => sl?.category === 'drive')) {
          continue;
        }
        const testBp = applyBlueprintUpgrade(bp, { slotIndex: slotIdx, partId: part.id });
        if (!testBp) continue;
        const stats = calculateBlueprintStats(testBp, state.expansions);
        if (!stats.isValid) continue;

        const gain = (scoreBlueprintCombatPower(testBp, st) - baseScore) * weightByFleet;
        if (gain > 2.5) {
          bestSingleSwaps.push({ shipType: st, slotIndex: slotIdx, partId: part.id, gain, weightByFleet });
        }
      }
    }
  }

  // Also test 2-part combo on the SAME ship (e.g., Reactor upgrade + Weapon/Hull upgrade!)
  let bestCombo: { upgrades: CandidateBlueprintUpgrade[]; gain: number } | null = null;
  if (maxUpgrades >= 2) {
    const reactors = unlockedParts.filter((p) => p.powerProduced > 3 && p.id !== 'muon_source');
    const heavyConsumers = unlockedParts.filter((p) => p.id !== 'muon_source' && (p.powerConsumed > 0 || p.hullBonus >= 2 || p.computerBonus >= 2));
    for (const st of ['cruiser', 'interceptor', 'dreadnought'] as ShipType[]) {
      const bp = player.blueprints[st];
      if (!bp) continue;
      const baseScore = scoreBlueprintCombatPower(bp, st);
      const weightByFleet = (deployed[st] || 0) > 0 ? 1 + (deployed[st] || 0) * 0.25 : st === 'cruiser' ? 0.9 : 0.6;

      for (let rIdx = 0; rIdx < bp.maxSlots; rIdx++) {
        for (const reactor of reactors) {
          if (bp.slots[rIdx]?.id === reactor.id) continue;
          for (let pIdx = 0; pIdx < bp.maxSlots; pIdx++) {
            if (pIdx === rIdx) continue;
            for (const part of heavyConsumers) {
              if (part.id === reactor.id || bp.slots[pIdx]?.id === part.id) continue;
              const testBp: ShipBlueprint = { ...bp, slots: [...bp.slots], externalParts: bp.externalParts ? [...bp.externalParts] : undefined };
              testBp.slots[rIdx] = reactor;
              testBp.slots[pIdx] = part;
              const stats = calculateBlueprintStats(testBp, state.expansions);
              if (!stats.isValid) continue;
              const gain = (scoreBlueprintCombatPower(testBp, st) - baseScore) * weightByFleet;
              if (gain > 4 && (!bestCombo || gain > bestCombo.gain)) {
                bestCombo = {
                  upgrades: [
                    { shipType: st, slotIndex: rIdx, partId: reactor.id },
                    { shipType: st, slotIndex: pIdx, partId: part.id },
                  ],
                  gain,
                };
              }
            }
          }
        }
      }
    }
  }

  bestSingleSwaps.sort((a, b) => b.gain - a.gain);

  // Pick up to `maxUpgrades` non-overlapping swaps, re-validating combined legality on each ship blueprint after every swap
  const chosenUpgrades: CandidateBlueprintUpgrade[] = [];
  let chosenGain = 0;
  const usedAncientOnce = new Set<string>();
  const workingBlueprints: Partial<Record<ShipType, ShipBlueprint>> = {};

  for (const sw of bestSingleSwaps) {
    if (chosenUpgrades.length >= maxUpgrades) break;
    if (chosenUpgrades.some((u) => u.shipType === sw.shipType && u.slotIndex === sw.slotIndex && Boolean(u.isExternal) === Boolean(sw.isExternal))) {
      continue;
    }
    if (sw.partId && player.unlockedAncientParts?.includes(sw.partId) && usedAncientOnce.has(sw.partId)) continue;

    const currentBp = workingBlueprints[sw.shipType] || player.blueprints[sw.shipType];
    if (!currentBp) continue;
    const nextBp = applyBlueprintUpgrade(currentBp, sw);
    if (!nextBp) continue;
    if (!calculateBlueprintStats(nextBp, state.expansions).isValid) continue;

    const stepGain = (scoreBlueprintCombatPower(nextBp, sw.shipType) - scoreBlueprintCombatPower(currentBp, sw.shipType)) * sw.weightByFleet;
    if (stepGain <= 0.5) continue;

    workingBlueprints[sw.shipType] = nextBp;
    chosenUpgrades.push({
      shipType: sw.shipType,
      slotIndex: sw.slotIndex,
      partId: sw.partId,
      ...(sw.isExternal ? { isExternal: true } : {}),
    });
    if (sw.partId && player.unlockedAncientParts?.includes(sw.partId)) usedAncientOnce.add(sw.partId);
    chosenGain += stepGain;
  }

  if (bestCombo && bestCombo.gain > chosenGain) {
    chosenUpgrades.length = 0;
    chosenUpgrades.push(...bestCombo.upgrades);
    chosenGain = bestCombo.gain;
  }

  if (chosenUpgrades.length === 0) return null;

  // BGG rule: avoid wasting an Upgrade action on 1 tiny tweak unless it's a Reaction or huge jump
  const action: GameAction = {
    type: 'UPGRADE',
    playerId: player.id,
    upgrades: chosenUpgrades,
  };
  if (!validateAction(state, action).valid) return null;

  const baseActionScore = isReaction
    ? (chosenGain >= 10 ? 52 : 0)
    : chosenUpgrades.length >= 2
    ? 48 + Math.min(35, chosenGain * 1.4)
    : 32 + Math.min(25, chosenGain);

  return { action, score: baseActionScore };
}

function getBuildCost(itemType: ShipType | 'orbital' | 'monolith'): number {
  if (itemType === 'cruiser') return 5;
  if (itemType === 'dreadnought') return 8;
  if (itemType === 'orbital') return 4;
  if (itemType === 'monolith') return 10;
  return 3; // interceptor / starbase
}

function findBestBuildAction(
  state: GameState,
  player: PlayerState,
  isReaction: boolean
): { action: GameAction; score: number } | null {
  if (!isReaction && !canSafelyAffordDiscs(state, player, 1)) return null;

  const ownedSectors = state.sectors.filter((s) => s.discOwner === player.id);
  if (ownedSectors.length === 0) return null;

  // Pick safest frontline / home sector to build ships in
  const shipyards = [...ownedSectors].sort((a, b) => {
    const aShips = a.ships.filter((s) => s.ownerId === player.id).length;
    const bShips = b.ships.filter((s) => s.ownerId === player.id).length;
    return bShips - aShips;
  });
  const primaryYard = shipyards[0]!;

  const supply = getRemainingShipSupply(state.sectors, player.id, player.faction.id);
  const deployed = countPlayerShips(state.sectors, player.id);
  const maxBuild = isReaction ? 1 : getMaxBuildActivations(player);
  const mats = player.resources.materials;
  const items: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith' }[] = [];
  let spent = 0;

  // Late game VP priority: Monolith if researched & affordable & safe sector
  const hasMonolith = player.techTrack.researched.some((t) => t.id === 'monolith');
  if (!isReaction && state.round >= 5 && hasMonolith && mats >= 10) {
    const monoSector = ownedSectors.find(
      (s) =>
        !s.structures?.monolith &&
        !s.ships.some((sh) => sh.ownerId !== player.id)
    );
    if (monoSector) {
      items.push({ sectorId: monoSector.id, itemType: 'monolith' });
      spent += getBuildCost('monolith');
    }
  }

  // Fill remaining build activations with Dreadnoughts / Cruisers / Interceptors / Orbitals
  while (items.length < maxBuild) {
    const remMats = mats - spent;
    const dreadRemaining = supply.dreadnought - items.filter((i) => i.itemType === 'dreadnought').length;
    const cruiserRemaining = supply.cruiser - items.filter((i) => i.itemType === 'cruiser').length;
    const intRemaining = supply.interceptor - items.filter((i) => i.itemType === 'interceptor').length;

    const totalFleet = deployed.interceptor + deployed.cruiser + deployed.dreadnought + items.length;

    if (dreadRemaining > 0 && remMats >= 8 && (totalFleet >= 3 || state.round >= 4)) {
      items.push({ sectorId: primaryYard.id, itemType: 'dreadnought' });
      spent += 8;
    } else if (cruiserRemaining > 0 && remMats >= 5) {
      items.push({ sectorId: primaryYard.id, itemType: 'cruiser' });
      spent += 5;
    } else if (intRemaining > 0 && remMats >= 3 && (totalFleet < 5 || isReaction)) {
      items.push({ sectorId: primaryYard.id, itemType: 'interceptor' });
      spent += 3;
    } else if (
      !isReaction &&
      player.techTrack.researched.some((t) => t.id === 'orbital') &&
      remMats >= 4
    ) {
      const orbSec = ownedSectors.find(
        (s) =>
          !s.structures?.orbital &&
          !s.planets.some((p) => p.isOrbital) &&
          !s.ships.some((sh) => sh.ownerId !== player.id) &&
          !items.some((it) => it.sectorId === s.id && it.itemType === 'orbital')
      );
      if (orbSec) {
        items.push({ sectorId: orbSec.id, itemType: 'orbital' });
        spent += 4;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (items.length === 0) return null;

  const action: GameAction = { type: 'BUILD', playerId: player.id, items };
  if (!validateAction(state, action).valid) return null;

  const hasThreatenedSector = ownedSectors.some((s) => s.ships.some((sh) => sh.ownerId !== player.id));
  const totalShipsInYard = primaryYard.ships.filter((s) => s.ownerId === player.id).length;

  let score = 46 + items.length * 11;
  if (items.some((i) => i.itemType === 'monolith')) score += 18;
  if (totalShipsInYard <= 2) score += 10;
  if (hasThreatenedSector) score += 22;
  if (isReaction && !hasThreatenedSector) score = 0;

  return { action, score };
}

function findBestInfluenceAction(state: GameState, player: PlayerState): { action: GameAction; score: number } | null {
  const waitingPlanets = getColonizablePlanetsForPlayer(state, player.id);
  const needsColonyRefresh =
    player.colonyShips.ready === 0 && player.colonyShips.total > 0 && waitingPlanets.length > 0;

  // Claim up to 2 unclaimed non-hostile sectors where we have ships (or empty adjacent space if safe)
  const unownedTargets = state.sectors
    .filter((s) => {
      if (s.discOwner || s.isNebula || s.isBlackHole || s.isSupernovaExploded) return false;
      const hasHostiles = s.ships.some((sh) => sh.ownerId !== player.id);
      if (hasHostiles) return false;
      const hasOwnShip = s.ships.some((sh) => sh.ownerId === player.id);
      return hasOwnShip;
    })
    .map((s) => ({ sector: s, val: scoreSectorControlValue(state, player, s) }))
    .filter((x) => x.val >= 10)
    .sort((a, b) => b.val - a.val);

  if (!needsColonyRefresh && unownedTargets.length === 0) return null;

  const claimSectors: string[] = [];
  for (const cand of unownedTargets.slice(0, 2)) {
    if (canSafelyAffordDiscs(state, player, 1 + claimSectors.length + 1)) {
      claimSectors.push(cand.sector.id);
    }
  }

  if (!needsColonyRefresh && claimSectors.length === 0) return null;
  if (!canSafelyAffordDiscs(state, player, 1 + claimSectors.length)) return null;

  const action: GameAction = {
    type: 'INFLUENCE',
    playerId: player.id,
    refreshColonyShips: needsColonyRefresh || undefined,
    claimSectors: claimSectors.length > 0 ? claimSectors : undefined,
  };
  if (!validateAction(state, action).valid) return null;

  const score = 45 + claimSectors.length * 14 + (needsColonyRefresh ? 14 : 0);
  return { action, score };
}

// ============================================================================
// COMBAT & MOVEMENT HEURISTICS
// ============================================================================

function findShortestWormholePath(
  state: GameState,
  player: PlayerState,
  fromSectorId: string,
  toSectorId: string,
  maxSteps: number,
  blockedSectorIds: Set<string>
): SectorTile[] | null {
  if (fromSectorId === toSectorId) return [];
  const hasWormholeGen = playerHasWormholeGenerator(player);
  const visited = new Set<string>([fromSectorId]);
  const queue: { id: string; path: SectorTile[] }[] = [{ id: fromSectorId, path: [] }];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.path.length >= maxSteps) continue;
    const curSec = state.sectors.find((s) => s.id === cur.id);
    if (!curSec) continue;

    for (const nextSec of state.sectors) {
      if (visited.has(nextSec.id)) continue;
      if (nextSec.isBlackHole) continue;
      if (blockedSectorIds.has(nextSec.id) && nextSec.id !== toSectorId) continue;

      const conn = areSectorsConnected(
        curSec,
        nextSec,
        hasWormholeGen,
        state.warpedUniverse?.conduits
      );
      if (!conn) continue;

      const nextPath = [...cur.path, nextSec];
      if (nextSec.id === toSectorId) return nextPath;

      // Cannot fly THROUGH a sector that pins us if it contains hostiles
      const hasHostiles = nextSec.ships.some(
        (sh) =>
          sh.ownerId !== player.id &&
          !(player.faction.id === 'descendants_of_draco' && (sh.ownerId === 'ancient' || sh.type === 'ancient'))
      );
      if (!hasHostiles) {
        visited.add(nextSec.id);
        queue.push({ id: nextSec.id, path: nextPath });
      }
    }
  }
  return null;
}

function buildAttackerSimSide(player: PlayerState, movedShips: { type: ShipType }[]): SimulatorSideConfig {
  const counts: Record<string, number> = { interceptor: 0, cruiser: 0, dreadnought: 0, starbase: 0 };
  for (const sh of movedShips) {
    counts[sh.type] = (counts[sh.type] || 0) + 1;
  }
  return {
    factionId: player.faction.id,
    name: player.name,
    isNpc: false,
    shipCounts: counts,
    blueprints: player.blueprints,
    hasAntimatterSplitter: player.techTrack.researched.some((t) => t.id === 'antimatter_splitter'),
  };
}

function buildEnemySimDefenders(
  state: GameState,
  sector: SectorTile,
  myPlayerId: string
): SimulatorSideConfig[] {
  const defenders: SimulatorSideConfig[] = [];
  const enemyOwners = Array.from(
    new Set(sector.ships.map((s) => s.ownerId).filter((id) => id !== myPlayerId))
  );
  if ((sector.ancientsCount || 0) > 0 && !enemyOwners.includes('ancient')) enemyOwners.push('ancient');
  if (sector.hasGCDS && !enemyOwners.includes('gcds')) enemyOwners.push('gcds');

  for (const ownerId of enemyOwners) {
    if (['ancient', 'guardian', 'gcds'].includes(ownerId)) {
      const npcType = ownerId as NeutralShipType;
      const count =
        npcType === 'ancient'
          ? Math.max(sector.ships.filter((s) => s.ownerId === 'ancient' || s.type === 'ancient').length, sector.ancientsCount || 0, 1)
          : 1;
      defenders.push(
        createDefaultSimulatorSide(npcType, {
          isNpc: true,
          npcVariant: state.neutralShipBlueprints?.[npcType] || 'default',
          shipCounts: { [npcType]: count },
        })
      );
      continue;
    }

    const opp = state.players.find((p) => p.id === ownerId);
    if (!opp) continue;
    const counts: Record<string, number> = { interceptor: 0, cruiser: 0, dreadnought: 0, starbase: 0 };
    for (const sh of sector.ships.filter((s) => s.ownerId === opp.id)) {
      counts[sh.type] = (counts[sh.type] || 0) + 1;
    }
    defenders.push({
      factionId: opp.faction.id,
      name: opp.name,
      isNpc: false,
      shipCounts: counts,
      blueprints: opp.blueprints,
      hasAntimatterSplitter: Boolean(opp.techTrack.researched.some((t) => t.id === 'antimatter_splitter')),
    });
  }
  return defenders;
}

function findBestMoveAction(
  state: GameState,
  player: PlayerState,
  isReaction: boolean
): { action: GameAction; score: number } | null {
  if (!isReaction && !canSafelyAffordDiscs(state, player, 1)) return null;

  const allies = new Set(
    (player.ambassadorTiles || []).filter((id) => !id.startsWith('minor_species_') && id !== player.id)
  );
  const maxActs = isReaction ? 1 : getMaxMoveActivations(player);
  const pinning = computePinningState(state, player.id);

  // Collect all unpinned mobile ships
  const unpinnedShips: { id: string; type: ShipType; sector: SectorTile; speed: number }[] = [];
  for (const sec of state.sectors) {
    for (const sh of sec.ships) {
      if (
        sh.ownerId !== player.id ||
        (sh.type !== 'interceptor' && sh.type !== 'cruiser' && sh.type !== 'dreadnought')
      ) continue;
      if (pinning.isShipPinned(sh.id)) continue;
      const bp = player.blueprints[sh.type];
      const stats = bp ? calculateBlueprintStats(bp) : null;
      const speed = (stats ? stats.totalDriveSpeed : 1) + (stats?.hasJumpDrive ? 1 : 0);
      if (speed <= 0) continue;
      unpinnedShips.push({ id: sh.id, type: sh.type, sector: sec, speed });
    }
  }
  if (unpinnedShips.length === 0) return null;

  const alliedSectorIds = new Set(
    state.sectors
      .filter(
        (s) =>
          (s.discOwner && allies.has(s.discOwner)) ||
          s.ships.some((sh) => allies.has(sh.ownerId))
      )
      .map((s) => s.id)
  );

  // Score potential destination sectors
  const targetCandidates: { sector: SectorTile; baseScore: number; minWinRate: number; isDefense: boolean }[] = [];
  for (const sec of state.sectors) {
    if (sec.isBlackHole || sec.isNebula || sec.isSupernovaExploded) continue;
    // Level 1 AI avoids accidentally breaking alliances via Act of Aggression
    if (alliedSectorIds.has(sec.id)) continue;

    const myShipsAlready = sec.ships.filter((s) => s.ownerId === player.id).length;
    const hasEnemies = sec.ships.some((s) => s.ownerId !== player.id);

    // 1. Defend controlled sectors under attack
    if (sec.discOwner === player.id && hasEnemies) {
      targetCandidates.push({ sector: sec, baseScore: 95, minWinRate: 45, isDefense: true });
      continue;
    }

    // Never attack non-threatened empty own sector
    if (sec.discOwner === player.id && !hasEnemies) continue;

    // 2. Neutral/Ancient sectors or unclaimed discovery/planet sectors
    const hasNpc = sec.ships.some((s) => ['ancient', 'guardian', 'gcds'].includes(s.ownerId));
    const hasRivalPlayer = sec.ships.some((s) => s.ownerId.startsWith('player_') && s.ownerId !== player.id);
    const val = scoreSectorControlValue(state, player, sec);

    if (sec.sectorNumber === 1 && hasEnemies) {
      // BGG Rule #2: Don't rush GCDS in Rounds 1-3 unless overwhelmingly strong
      if (state.round >= 4) {
        targetCandidates.push({ sector: sec, baseScore: 76, minWinRate: 70, isDefense: false });
      }
      continue;
    }

    if (hasNpc && !hasRivalPlayer) {
      targetCandidates.push({
        sector: sec,
        baseScore: 54 + Math.min(24, val) + (sec.hasDiscovery && !sec.discoveryClaimed ? 12 : 0),
        minWinRate: 65,
        isDefense: false,
      });
    } else if (hasRivalPlayer || (sec.discOwner && sec.discOwner !== player.id)) {
      if (state.round >= 3 || !hasEnemies) {
        targetCandidates.push({
          sector: sec,
          baseScore: 50 + Math.min(28, val) + (state.round >= 6 ? 12 : 0),
          minWinRate: 62,
          isDefense: false,
        });
      }
    } else if (!sec.discOwner && val >= 10 && myShipsAlready === 0) {
      // Walk into empty neutral valuable sector to claim next or with Influence
      targetCandidates.push({ sector: sec, baseScore: 44 + Math.min(18, val), minWinRate: 0, isDefense: false });
    }
  }

  targetCandidates.sort((a, b) => b.baseScore - a.baseScore);

  for (const target of targetCandidates.slice(0, 6)) {
    const dest = target.sector;
    // Find up to `maxActs` unpinned ships that can reach `dest`
    const shipPaths: { ship: (typeof unpinnedShips)[number]; path: SectorTile[] }[] = [];
    for (const sh of unpinnedShips) {
      if (sh.sector.id === dest.id) continue;
      // Prefer keeping at least 1 defender in homeworld unless defending or Round 7-8 push
      const isHomeSec = sh.sector.id.includes(`home_sector_${player.id}`);
      const ownHere = sh.sector.ships.filter((x) => x.ownerId === player.id).length;
      if (isHomeSec && ownHere <= 1 && !target.isDefense && state.round < (state.maxRounds || 8)) continue;

      const path = findShortestWormholePath(
        state,
        player,
        sh.sector.id,
        dest.id,
        sh.speed,
        new Set<string>()
      );
      if (path && path.length > 0) {
        shipPaths.push({ ship: sh, path });
      }
    }

    if (shipPaths.length === 0) continue;

    // Sort strongest ships first (dreadnought > cruiser > interceptor)
    const rankShip = (t: ShipType) => (t === 'dreadnought' ? 3 : t === 'cruiser' ? 2 : 1);
    shipPaths.sort((a, b) => rankShip(b.ship.type) - rankShip(a.ship.type));

    const chosenShips = shipPaths.slice(0, maxActs);

    // Check combat win rate via combatSimulator if enemies are present in destination
    if (dest.ships.some((s) => s.ownerId !== player.id) || (dest.ancientsCount || 0) > 0 || dest.hasGCDS) {
      const existingFriendly = dest.ships.filter((s) => s.ownerId === player.id) as { type: ShipType }[];
      const attackingSide = buildAttackerSimSide(player, [
        ...chosenShips.map((c) => ({ type: c.ship.type })),
        ...existingFriendly,
      ]);
      const defenders = buildEnemySimDefenders(state, dest, player.id);
      if (defenders.length > 0) {
        const sim = runCombatSimulation(attackingSide, defenders, 60, {
          allowIllegalBlueprints: true,
          activeExpansions: state.expansions,
        });
        if (sim.attackerWinRate < target.minWinRate) {
          continue;
        }
      }
    }

    const moves: MoveStep[] = [];
    chosenShips.forEach((entry, actIdx) => {
      let curFromId = entry.ship.sector.id;
      for (const hop of entry.path) {
        moves.push({
          shipId: entry.ship.id,
          fromSectorId: curFromId,
          toSectorId: hop.id,
          activationIndex: actIdx,
        });
        curFromId = hop.id;
      }
    });

    const action: GameAction = { type: 'MOVE', playerId: player.id, moves };
    if (validateAction(state, action).valid) {
      return { action, score: target.baseScore };
    }
  }

  return null;
}

// ============================================================================
// MAIN ACTION PHASE SELECTOR
// ============================================================================

function handleActionPhase(state: GameState, player: PlayerState): GameAction {
  const isReaction = player.hasPassed || state.passedPlayerIds.includes(player.id);

  if (isReaction) {
    const candidates: { action: GameAction; score: number }[] = [];
    const col = findBestColonizeAction(state, player);
    if (col) return col;
    const mv = findBestMoveAction(state, player, true);
    if (mv && mv.score >= 80) candidates.push(mv);
    const bld = findBestBuildAction(state, player, true);
    if (bld && bld.score >= 55) candidates.push(bld);
    const upg = findBestUpgradeAction(state, player, true);
    if (upg && upg.score >= 50) candidates.push(upg);

    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0]) return candidates[0].action;
    return { type: 'PASS', playerId: player.id, enableAutoPass: true };
  }

  // Free opportunistic colonize before committing an Influence disc
  const freeColonize = findBestColonizeAction(state, player);
  if (freeColonize && validateAction(state, freeColonize).valid) {
    return freeColonize;
  }

  // Emergency economy check: trade surplus mats/science -> money if upkeep threatens next pass
  const summary = calculatePlayerRoundSummary(player);
  const ratio = getTradeRatio(player);
  if (player.resources.money + summary.income.money < summary.upkeep) {
    if (player.resources.materials >= ratio && (player.resources.materials >= 6 || summary.income.materials >= 6)) {
      const tr: GameAction = {
        type: 'TRADE',
        playerId: player.id,
        fromResource: 'material',
        toResource: 'money',
        amount: ratio,
      };
      if (validateAction(state, tr).valid) return tr;
    }
    if (player.resources.science >= ratio && player.resources.science >= 6) {
      const tr: GameAction = {
        type: 'TRADE',
        playerId: player.id,
        fromResource: 'science',
        toResource: 'money',
        amount: ratio,
      };
      if (validateAction(state, tr).valid) return tr;
    }
  }

  const options: { action: GameAction; score: number }[] = [];

  const expOpt = findBestExploreAction(state, player);
  if (expOpt) options.push(expOpt);

  const resOpt = findBestResearchAction(state, player);
  if (resOpt) options.push(resOpt);

  const upgOpt = findBestUpgradeAction(state, player, false);
  if (upgOpt) options.push(upgOpt);

  const bldOpt = findBestBuildAction(state, player, false);
  if (bldOpt) options.push(bldOpt);

  const mvOpt = findBestMoveAction(state, player, false);
  if (mvOpt) options.push(mvOpt);

  const infOpt = findBestInfluenceAction(state, player);
  if (infOpt) options.push(infOpt);

  // Compute PASS threshold: reward claiming First Passer (+2 money) once tempo slows or upkeep tightens
  const nobodyPassedYet = state.passedPlayerIds.length === 0;
  let passScore = 28;
  if (nobodyPassedYet && player.actionsTakenThisRound >= 3) passScore += 14;
  if (player.influenceTrack.discsOnTrack <= 2) passScore += 25;
  if (!canSafelyAffordDiscs(state, player, 1)) passScore += 60;

  options.push({
    action: { type: 'PASS', playerId: player.id, enableAutoPass: false },
    score: passScore,
  });

  options.sort((a, b) => b.score - a.score);
  return options[0]!.action;
}
