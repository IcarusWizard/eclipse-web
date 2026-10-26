import { GameState, ReplayStep } from '../types/state';

/**
 * Creates a clean JSON snapshot of the game state, stripping replaySteps
 * and transient unconfirmed action snapshots to avoid exponential recursive nesting.
 */
export function createCleanSnapshot(state: GameState): string {
  const { replaySteps, pendingActionConfirmation, ...cleanState } = state;
  return JSON.stringify(cleanState);
}

/**
 * Commits a historical replay step into state.replaySteps.
 */
export function commitReplayStep(
  state: GameState,
  actionType: string,
  summary: string,
  actorPlayerId?: string
): void {
  if (!state.replaySteps) {
    state.replaySteps = [];
  }

  const actor = actorPlayerId ? state.players?.find((p) => p.id === actorPlayerId) : undefined;
  const stepIndex = state.replaySteps.length;
  const snapshot = createCleanSnapshot(state);

  state.replaySteps.push({
    stepIndex,
    timestamp: Date.now(),
    round: state.round,
    phase: state.phase,
    actionType,
    summary,
    actorPlayerId,
    actorPlayerName: actor?.name,
    snapshot,
  });
}

/**
 * Checks whether replay history is available for a given table state.
 */
export function isReplayAvailable(state?: GameState | null): boolean {
  return Boolean(state && Array.isArray(state.replaySteps) && state.replaySteps.length > 0);
}
