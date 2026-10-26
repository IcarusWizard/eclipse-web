import { GameState, ReplayStep } from '../types/state';

/**
 * Creates a clean JSON snapshot of the game state, stripping replaySteps,
 * transient unconfirmed action snapshots, and duplicate bulky bags/logs
 * to keep snapshots compact and prevent exponential recursive nesting.
 */
export function createCleanSnapshot(state: GameState): string {
  const {
    replaySteps,
    pendingActionConfirmation,
    log,
    techBag,
    discoveryBag,
    sectorDecks,
    reputationBag,
    ...cleanState
  } = state;
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
 * Checks whether full replay history is available for a given table state.
 * Validates that tracking captured the game from setup rather than an isolated mid-game action.
 */
export function isReplayAvailable(state?: GameState | null): boolean {
  if (!state || !Array.isArray(state.replaySteps) || state.replaySteps.length === 0) {
    return false;
  }

  const firstStep = state.replaySteps[0];
  if (!firstStep) return false;

  // Legacy games started before replay tracking may have isolated steps recorded mid-game (e.g. Round 5)
  if (state.round > 1 && (firstStep.round > 1 || firstStep.actionType !== 'GAME_SETUP')) {
    return false;
  }

  return true;
}
