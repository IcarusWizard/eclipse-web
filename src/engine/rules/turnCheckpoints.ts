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
