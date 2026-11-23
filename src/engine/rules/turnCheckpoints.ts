import {
  buildCombatUnitsForSector,
  getSectorDefenderOwnerId,
  sortUnitsByInitiative,
  getCombatShipTypeGroups,
  getActiveCombatGroup,
} from './combatEngine';

export interface AdminTurnCheckpointInfo {
  key: string;
  round: number;
  phase: string;
  activePlayerIndex: number;
  playerName: string;
  factionName: string;
  factionId?: string;
  savedAt?: number;
}

export interface TurnCheckpointEntry {
  key: string;
  meta: AdminTurnCheckpointInfo;
  state: any;
}

/**
 * Computes a stable turn-boundary key so mid-turn actions (START_EXPLORE, Diplomacy,
 * Discovery, Explore Control) do not overwrite the start-of-turn checkpoint.
 */
export function getTurnCheckpointKey(stateObj: any): string {
  if (!stateObj) return 'unknown';
  const round = Number(stateObj.round) || 1;
  const phase = String(stateObj.phase || 'ACTION_PHASE');
  if (phase === 'ACTION_PHASE') {
    const idx = typeof stateObj.activePlayerIndex === 'number' ? stateObj.activePlayerIndex : 0;
    return `${round}:ACTION:${idx}`;
  }
  if (phase === 'DRAFT_PHASE') {
    const draftIdx =
      typeof stateObj.factionDraft?.currentDraftIndex === 'number'
        ? stateObj.factionDraft.currentDraftIndex
        : typeof stateObj.activePlayerIndex === 'number'
        ? stateObj.activePlayerIndex
        : 0;
    return `${round}:DRAFT:${draftIdx}`;
  }
  if (phase === 'COMBAT_PHASE') {
    const sectorId = stateObj.activeCombat?.sectorId || 'phase';
    return `${round}:COMBAT:${sectorId}`;
  }
  return `${round}:${phase}`;
}

export function describeTurnCheckpoint(stateObj: any): AdminTurnCheckpointInfo {
  const round = Number(stateObj?.round) || 1;
  const phase = String(stateObj?.phase || 'ACTION_PHASE');
  const activePlayerIndex =
    typeof stateObj?.activePlayerIndex === 'number' ? stateObj.activePlayerIndex : 0;
  const player = Array.isArray(stateObj?.players) ? stateObj.players[activePlayerIndex] : undefined;
  return {
    key: getTurnCheckpointKey(stateObj),
    round,
    phase,
    activePlayerIndex,
    playerName: player?.name || `Player ${activePlayerIndex + 1}`,
    factionName: player?.faction?.name || player?.name || `Seat ${activePlayerIndex + 1}`,
    factionId: player?.faction?.id,
    savedAt: typeof stateObj?.savedAt === 'number' ? stateObj.savedAt : undefined,
  };
}

function deepCloneState<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function isTurnStartClean(stateObj: any): boolean {
  if (!stateObj) return false;
  return Boolean(
    !stateObj.pendingExplore &&
      !stateObj.pendingDiscovery &&
      !stateObj.pendingExploreControl &&
      !stateObj.pendingDiplomacyProposal &&
      !(stateObj.pendingActionConfirmation && stateObj.pendingActionConfirmation.canRevert !== false)
  );
}

/**
 * Appends a start-of-turn checkpoint whenever the saved state enters a new turn/phase boundary.
 * Retains only the most recent `maxEntries` checkpoints (default 3) so disk usage remains bounded.
 */
export function updateTurnCheckpointsOnSave(
  existingCheckpoints: TurnCheckpointEntry[],
  existingTableState: any | null,
  nextTableState: any,
  maxEntries: number = 3
): TurnCheckpointEntry[] {
  if (!nextTableState || nextTableState.chatOnly || nextTableState.phase === 'GAME_OVER') {
    return existingCheckpoints;
  }

  // Never snapshot transient unconfirmed previews
  if (
    nextTableState.pendingActionConfirmation &&
    nextTableState.pendingActionConfirmation.canRevert !== false
  ) {
    return existingCheckpoints;
  }

  const nextList = Array.isArray(existingCheckpoints) ? [...existingCheckpoints] : [];
  const nextKey = getTurnCheckpointKey(nextTableState);
  let modified = false;

  if (nextList.length === 0) {
    if (existingTableState) {
      const existingKey = getTurnCheckpointKey(existingTableState);
      if (existingKey !== nextKey || isTurnStartClean(existingTableState)) {
        nextList.push({
          key: existingKey,
          meta: describeTurnCheckpoint(existingTableState),
          state: deepCloneState(existingTableState),
        });
        modified = true;
      }
    }
  }

  const lastEntry = nextList[nextList.length - 1];
  if (!lastEntry || lastEntry.key !== nextKey) {
    if (nextList.length > 0 || isTurnStartClean(nextTableState) || !existingTableState) {
      nextList.push({
        key: nextKey,
        meta: describeTurnCheckpoint(nextTableState),
        state: deepCloneState(nextTableState),
      });
      modified = true;
    }
  }

  return modified ? nextList.slice(-maxEntries) : existingCheckpoints;
}

export function getTurnCheckpointsSummary(checkpoints: TurnCheckpointEntry[]): {
  currentTurn: AdminTurnCheckpointInfo | null;
  previousTurn: AdminTurnCheckpointInfo | null;
} {
  const list = Array.isArray(checkpoints) ? checkpoints : [];
  const currentTurn = list.length >= 1 ? list[list.length - 1]!.meta : null;
  const previousTurn = list.length >= 2 ? list[list.length - 2]!.meta : null;
  return { currentTurn, previousTurn };
}

function mergeChatsForRestore(currentMsgs: any[], restoredMsgs: any[]): any[] {
  const map = new Map<string, any>();
  for (const list of [restoredMsgs, currentMsgs]) {
    if (!Array.isArray(list)) continue;
    for (const msg of list) {
      if (!msg || !msg.text) continue;
      const key = msg.id || `${msg.senderPlayerId || 'sys'}:${msg.timestamp}:${msg.text}`;
      if (!map.has(key)) {
        map.set(key, msg);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

export function revertToTurnCheckpoint(
  checkpoints: TurnCheckpointEntry[],
  currentTableState: any,
  target: 'current' | 'previous',
  nowTs: number = Date.now()
): {
  success: boolean;
  error?: string;
  restoredState?: any;
  updatedCheckpoints?: TurnCheckpointEntry[];
  summary?: {
    currentTurn: AdminTurnCheckpointInfo | null;
    previousTurn: AdminTurnCheckpointInfo | null;
  };
} {
  const list = Array.isArray(checkpoints) ? [...checkpoints] : [];
  const targetIdx = target === 'current' ? list.length - 1 : list.length - 2;
  if (targetIdx < 0 || !list[targetIdx]) {
    return {
      success: false,
      error:
        target === 'current'
          ? 'No start-of-current-turn checkpoint has been recorded yet for this table.'
          : 'No start-of-previous-turn checkpoint is available to revert to.',
    };
  }

  const chosen = list[targetIdx]!;
  const restored = deepCloneState(chosen.state);

  // Always preserve all live chat messages & table membership across rollbacks
  restored.chatMessages = mergeChatsForRestore(
    currentTableState?.chatMessages,
    restored.chatMessages
  );
  if (Array.isArray(currentTableState?.members)) {
    restored.members = deepCloneState(
      currentTableState.members.filter((m: any) => m && m.seat !== 'spectator')
    );
  }
  restored.pendingActionConfirmation = null;
  restored.savedAt = Math.max(nowTs, (Number(currentTableState?.savedAt) || 0) + 1000);
  restored.adminRestoredAt = nowTs;

  const updatedCheckpoints = target === 'previous' ? list.slice(0, targetIdx + 1) : list;
  return {
    success: true,
    restoredState: restored,
    updatedCheckpoints,
    summary: getTurnCheckpointsSummary(updatedCheckpoints),
  };
}

/**
 * Resolves the seat index (0-based in `stateObj.players`) of the player who must currently
 * make a decision or act next — accounting for pending prompts, draft order, `activeCombat`
 * initiative/participants during COMBAT_PHASE, upkeep, and action-phase turns.
 */
export function getEffectiveDecisionSeat(stateObj: any): number {
  if (!stateObj || !Array.isArray(stateObj.players) || stateObj.players.length === 0) return -1;

  const seatOfPlayerId = (playerId?: string | null): number => {
    if (!playerId) return -1;
    return stateObj.players.findIndex((p: any) => p && p.id === playerId);
  };

  // 1. Immediate blocking pending prompts
  if (Array.isArray(stateObj.pendingAmbassadorCubeReturns) && stateObj.pendingAmbassadorCubeReturns.length > 0) {
    const idx = seatOfPlayerId(stateObj.pendingAmbassadorCubeReturns[0]?.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingDiplomacyProposal?.targetId) {
    const idx = seatOfPlayerId(stateObj.pendingDiplomacyProposal.targetId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingActionConfirmation?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingActionConfirmation.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingExplore?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingExplore.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingReputationDraw?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingReputationDraw.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingCombatConquest?.winnerPlayerId) {
    const idx = seatOfPlayerId(stateObj.pendingCombatConquest.winnerPlayerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingDiscovery?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingDiscovery.playerId);
    if (idx >= 0) return idx;
  }
  if (Array.isArray(stateObj.pendingPopulationReturnChoices) && stateObj.pendingPopulationReturnChoices.length > 0) {
    const idx = seatOfPlayerId(stateObj.pendingPopulationReturnChoices[0]?.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingExploreControl?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingExploreControl.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingArtifactReward?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingArtifactReward.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingBankruptcy?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingBankruptcy.playerId);
    if (idx >= 0) return idx;
  }
  if (stateObj.pendingExilesOrbitalSetup?.playerId) {
    const idx = seatOfPlayerId(stateObj.pendingExilesOrbitalSetup.playerId);
    if (idx >= 0) return idx;
  }

  // 2. Draft Phase
  if (stateObj.phase === 'DRAFT_PHASE' && stateObj.factionDraft) {
    const draftOrder = stateObj.factionDraft.draftOrder;
    const draftIdx = stateObj.factionDraft.currentDraftIndex;
    if (Array.isArray(draftOrder) && typeof draftIdx === 'number') {
      const idx = seatOfPlayerId(draftOrder[draftIdx]);
      if (idx >= 0) return idx;
    }
  }

  // 3. Combat Phase (inspect `activeCombat`, NOT Action Phase `activePlayerIndex`)
  if (stateObj.phase === 'COMBAT_PHASE' && stateObj.activeCombat) {
    const combat = stateObj.activeCombat;

    const explicitIdx = seatOfPlayerId(combat.activePlayerId || stateObj.combat?.activePlayerId);
    if (explicitIdx >= 0) return explicitIdx;

    if (combat.pendingDamageAssignment?.attackerOwnerId) {
      const idx = seatOfPlayerId(combat.pendingDamageAssignment.attackerOwnerId);
      if (idx >= 0) return idx;
    }

    if (combat.stage === 'resolved') {
      const winnerIdx = seatOfPlayerId(combat.winnerOwnerId);
      if (winnerIdx >= 0) return winnerIdx;
    } else if (Array.isArray(stateObj.sectors)) {
      const sec = stateObj.sectors.find((s: any) => s && s.id === combat.sectorId);
      if (sec) {
        try {
          const scopedSec =
            sec.isNebula && combat.subsector
              ? { ...sec, ships: (sec.ships || []).filter((s: any) => (s.subsector ?? 1) === combat.subsector) }
              : sec;
          const units = buildCombatUnitsForSector(
            scopedSec,
            stateObj.players,
            combat.participatingPlayerIds,
            stateObj.neutralShipBlueprints,
            stateObj.expansions
          );
          const defenderId = combat.defenderOwnerId || getSectorDefenderOwnerId(scopedSec, stateObj.players);
          const aliveUnits = sortUnitsByInitiative(
            units.filter((u) => u.currentDamage < u.maxHull),
            defenderId
          );
          const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
          const activeGroup = getActiveCombatGroup(combat, groups);
          if (activeGroup) {
            const groupOwnerIdx = seatOfPlayerId(activeGroup.ownerId);
            if (groupOwnerIdx >= 0) return groupOwnerIdx;
          }
        } catch {
          // Fall through to participant resolution below
        }
      }
    }

    // Active group is an NPC (ancient/guardian/gcds) or combat resolved without an explicit player winner:
    // resolve to a combat participant (preferring non-bot attackerOwnerId, then participatingPlayerIds).
    const fallbackIds: string[] = [];
    if (combat.attackerOwnerId) fallbackIds.push(combat.attackerOwnerId);
    if (Array.isArray(combat.participatingPlayerIds)) {
      for (const pid of combat.participatingPlayerIds) {
        if (!fallbackIds.includes(pid)) fallbackIds.push(pid);
      }
    }
    if (combat.defenderOwnerId && !fallbackIds.includes(combat.defenderOwnerId)) {
      fallbackIds.push(combat.defenderOwnerId);
    }

    for (const pid of fallbackIds) {
      const idx = seatOfPlayerId(pid);
      if (idx >= 0 && !stateObj.players[idx]?.isBot) return idx;
    }
    for (const pid of fallbackIds) {
      const idx = seatOfPlayerId(pid);
      if (idx >= 0) return idx;
    }
  }

  // 4. Upkeep Phase: first non-eliminated player who has not completed upkeep
  if (stateObj.phase === 'UPKEEP_PHASE') {
    const num = stateObj.players.length;
    const startIdx = Math.max(0, typeof stateObj.activePlayerIndex === 'number' ? stateObj.activePlayerIndex : 0);
    for (let offset = 0; offset < num; offset++) {
      const idx = (startIdx + offset) % num;
      const p = stateObj.players[idx];
      if (p && !p.isEliminated && !stateObj.upkeepReadyPlayers?.[p.id]) {
        return idx;
      }
    }
  }

  return typeof stateObj.activePlayerIndex === 'number' ? stateObj.activePlayerIndex : -1;
}

const PHASE_PROGRESS_RANK: Record<string, number> = {
  DRAFT_PHASE: 0,
  ACTION_PHASE: 1,
  COMBAT_PHASE: 2,
  UPKEEP_PHASE: 3,
  CLEANUP_PHASE: 4,
  GAME_OVER: 5,
};

function getReplayStepsProgressCount(s: any): number {
  const arrLen = Array.isArray(s?.replaySteps) ? s.replaySteps.length : 0;
  const countNum = Number(s?.replayStepsCount) || 0;
  return Math.max(arrLen, countNum);
}

/**
 * Compares monotonic game progress between two states (positive if `a` is ahead of `b`,
 * negative if `a` is strictly behind `b`, 0 if equivalent).
 */
export function compareGameStateProgress(a: any, b: any): number {
  const rA = Number(a?.round) || 1;
  const rB = Number(b?.round) || 1;
  if (rA !== rB) return rA - rB;

  const pA = PHASE_PROGRESS_RANK[String(a?.phase || 'ACTION_PHASE')] ?? 1;
  const pB = PHASE_PROGRESS_RANK[String(b?.phase || 'ACTION_PHASE')] ?? 1;
  if (pA !== pB) return pA - pB;

  const sA = getReplayStepsProgressCount(a);
  const sB = getReplayStepsProgressCount(b);
  if (sA > 0 && sB > 0 && sA !== sB) return sA - sB;

  if (String(a?.phase) === 'ACTION_PHASE') {
    const passA = Array.isArray(a?.passedPlayerIds) ? a.passedPlayerIds.length : 0;
    const passB = Array.isArray(b?.passedPlayerIds) ? b.passedPlayerIds.length : 0;
    if (passA !== passB) return passA - passB;

    const actA = Array.isArray(a?.players)
      ? a.players.reduce((sum: number, p: any) => sum + (Number(p?.actionsTakenThisRound) || 0), 0)
      : 0;
    const actB = Array.isArray(b?.players)
      ? b.players.reduce((sum: number, p: any) => sum + (Number(p?.actionsTakenThisRound) || 0), 0)
      : 0;
    if (actA !== actB) return actA - actB;
  }

  const tsA = Number(a?.lastConfirmedAction?.timestamp || 0);
  const tsB = Number(b?.lastConfirmedAction?.timestamp || 0);
  if (tsA > 0 && tsB > 0 && tsA !== tsB) return tsA - tsB;

  return 0;
}

/**
 * Returns true if `incoming` represents an older/stale snapshot compared to `existing`
 * without a newer `adminRestoredAt` epoch — preventing sleeping phones/tabs from reverting live tables.
 */
export function isIncomingStateStale(existing: any, incoming: any): boolean {
  if (!existing || !incoming || incoming.chatOnly) return false;
  const incomingAdmin = Number(incoming.adminRestoredAt || 0);
  const existingAdmin = Number(existing.adminRestoredAt || 0);
  if (incomingAdmin > existingAdmin) return false;
  return compareGameStateProgress(incoming, existing) < 0;
}
