import { GameState, ReplayStep } from '../types/state.ts';

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
 * Checks whether a replay step should be captured as a full Keyframe snapshot.
 * Keyframes are stored at:
 * 1. Step 0 (Initial game setup / draft initialization)
 * 2. The start of each Round (whenever round increments)
 * 3. Final stage when the game ends (GAME_OVER phase)
 */
export function isStepKeyframe(
  state: GameState,
  previousState?: GameState,
  stepIndex: number = 0,
  actionType?: string
): boolean {
  // 1. Initial setup or draft start (Step 0) is always a Keyframe
  if (stepIndex === 0) {
    if (!previousState) return true;
    if (actionType === 'GAME_SETUP' || actionType === 'DRAFT_INITIALIZED') return true;
    if (state.round === 1 && state.phase === 'DRAFT_PHASE' && (!state.replaySteps || state.replaySteps.length <= 1)) return true;
    // If previousState is provided and in the same round, stepIndex 0 was only a local slice or missing history; don't force full keyframe
    if (previousState && state.round === previousState.round) return false;
  }

  // 2. Start of each new round
  if (previousState && state.round > previousState.round) return true;
  if (!previousState && state.replaySteps && state.replaySteps.length > 0) {
    const lastStep = state.replaySteps[state.replaySteps.length - 1];
    if (lastStep && state.round > lastStep.round) return true;
  }

  // 3. Final stage when game ends
  if (state.phase === 'GAME_OVER') return true;

  return false;
}

/**
 * Computes a structural deep difference delta between two clean state objects.
 * Intermediate steps store this delta instead of a full monolithic snapshot.
 */
export function computeStateDelta(prev: any, curr: any): any {
  if (prev === curr) return undefined;
  if (typeof prev !== 'object' || prev === null || typeof curr !== 'object' || curr === null) {
    return curr;
  }

  // Array handling: store sparse indexed items or replacements
  if (Array.isArray(curr)) {
    if (!Array.isArray(prev)) return curr;
    const items: Record<string, any> = {};
    let diffCount = 0;
    const maxLen = Math.max(prev.length, curr.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= curr.length) {
        items[`__del_${i}`] = true;
        diffCount++;
      } else if (i >= prev.length) {
        items[i] = curr[i];
        diffCount++;
      } else {
        const d = computeStateDelta(prev[i], curr[i]);
        if (d !== undefined) {
          items[i] = d;
          diffCount++;
        }
      }
    }
    if (diffCount === 0) return undefined;
    return { _t: 'arr', len: curr.length, items };
  }

  // Object handling: store modified and deleted keys
  const diff: Record<string, any> = {};
  let hasDiff = false;
  for (const k of Object.keys(curr)) {
    if (!(k in prev)) {
      diff[k] = curr[k];
      hasDiff = true;
    } else {
      const d = computeStateDelta(prev[k], curr[k]);
      if (d !== undefined) {
        diff[k] = d;
        hasDiff = true;
      }
    }
  }
  for (const k of Object.keys(prev)) {
    if (!(k in curr)) {
      diff[`__del_${k}`] = true;
      hasDiff = true;
    }
  }
  return hasDiff ? diff : undefined;
}

/**
 * Applies a structural state delta onto a base state to reconstruct the updated state.
 */
export function applyStateDelta(base: any, delta: any): any {
  if (delta === undefined) return base;
  if (typeof delta !== 'object' || delta === null) {
    return delta;
  }

  if (Array.isArray(delta)) {
    return delta;
  }

  if (delta._t === 'arr') {
    const res = Array.isArray(base) ? [...base] : [];
    res.length = delta.len;
    for (let i = 0; i < delta.len; i++) {
      if (i in delta.items) {
        res[i] = applyStateDelta(res[i], delta.items[i]);
      }
    }
    return res;
  }

  const res = typeof base === 'object' && base !== null && !Array.isArray(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(delta)) {
    if (k.startsWith('__del_')) {
      delete res[k.substring(6)];
    } else {
      res[k] = applyStateDelta(res[k], v);
    }
  }
  return res;
}

/**
 * Resolves the full GameState at a given replay step index.
 * If the step has a keyframe snapshot, it parses it directly.
 * Otherwise, it seeks to the nearest preceding keyframe and applies deltas sequentially.
 * An optional in-memory cache accelerates scrubbing/jumping to 0ms latency.
 */
export function resolveStepState(
  steps: ReplayStep[],
  targetIndex: number,
  cache?: Map<number, GameState>
): GameState {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('No replay steps available');
  }
  const safeIdx = Math.max(0, Math.min(targetIndex, steps.length - 1));

  if (cache && cache.has(safeIdx)) {
    return cache.get(safeIdx)!;
  }

  const targetStep = steps[safeIdx];
  if (targetStep.snapshot) {
    const parsed = JSON.parse(targetStep.snapshot) as GameState;
    if (cache) cache.set(safeIdx, parsed);
    return parsed;
  }

  // Find nearest preceding step with snapshot or cached state
  let nearestIdx = safeIdx - 1;
  while (nearestIdx >= 0) {
    if ((cache && cache.has(nearestIdx)) || steps[nearestIdx]?.snapshot) {
      break;
    }
    nearestIdx--;
  }

  if (nearestIdx < 0) {
    if (steps[0]?.snapshot) {
      nearestIdx = 0;
    } else {
      throw new Error(`No keyframe snapshot found before step ${safeIdx}`);
    }
  }

  let currentState: GameState =
    (cache && cache.get(nearestIdx)) ||
    (JSON.parse(steps[nearestIdx].snapshot!) as GameState);

  if (cache) cache.set(nearestIdx, currentState);

  for (let i = nearestIdx + 1; i <= safeIdx; i++) {
    const step = steps[i];
    if (step.snapshot) {
      currentState = JSON.parse(step.snapshot) as GameState;
    } else if (step.delta) {
      currentState = applyStateDelta(currentState, step.delta) as GameState;
    }
    if (cache) cache.set(i, currentState);
  }

  return currentState;
}

/**
 * Commits a historical replay step into state.replaySteps.
 * Uses Keyframe snapshots at Round starts and Game Over, and compact state deltas
 * for all intermediate actions.
 */
export function commitReplayStep(
  state: GameState,
  actionType: string,
  summary: string,
  actorPlayerId?: string,
  previousState?: GameState,
  actionData?: any
): void {
  if (!state.replaySteps) {
    state.replaySteps = [];
  }

  const actor = actorPlayerId ? state.players?.find((p) => p.id === actorPlayerId) : undefined;
  const stepIndex = state.replaySteps.length;
  const isKeyframe = isStepKeyframe(state, previousState, stepIndex, actionType);

  const step: ReplayStep = {
    stepIndex,
    timestamp: Date.now(),
    round: state.round,
    phase: state.phase,
    actionType,
    summary,
    actorPlayerId,
    actorPlayerName: actor?.name,
    isKeyframe,
  };

  if (isKeyframe) {
    step.snapshot = createCleanSnapshot(state);
  } else {
    // Intermediate step: store lightweight state delta against previous state
    const cleanCurrent = JSON.parse(createCleanSnapshot(state));
    const cleanPrevious = previousState
      ? JSON.parse(createCleanSnapshot(previousState))
      : undefined;

    if (cleanPrevious) {
      step.delta = computeStateDelta(cleanPrevious, cleanCurrent);
    } else {
      // Fallback if previousState was not provided: keyframe snapshot
      step.isKeyframe = true;
      step.snapshot = createCleanSnapshot(state);
    }
  }

  if (actionData) {
    step.actionData = actionData;
  }

  state.replaySteps.push(step);
}

/**
 * Compacts replay steps into the lightweight Keyframe + Delta architecture.
 * Keyframes are preserved ONLY at:
 * 1. Step 0 (Game setup / draft initialization)
 * 2. Start of each new Round (whenever round increments)
 * 3. Final game conclusion (GAME_OVER phase)
 * All other intermediate steps store a minimal structural delta against the preceding state.
 */
export function compactReplaySteps(steps: ReplayStep[]): ReplayStep[] {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  const compacted: ReplayStep[] = [];

  let currentState: GameState;
  try {
    currentState = steps[0].snapshot
      ? JSON.parse(steps[0].snapshot)
      : resolveStepState(steps, 0);
  } catch {
    return steps;
  }

  compacted.push({
    stepIndex: 0,
    timestamp: steps[0].timestamp,
    round: steps[0].round,
    phase: steps[0].phase,
    actionType: steps[0].actionType,
    summary: steps[0].summary,
    actorPlayerId: steps[0].actorPlayerId,
    actorPlayerName: steps[0].actorPlayerName,
    isKeyframe: true,
    snapshot: createCleanSnapshot(currentState),
    actionData: steps[0].actionData,
  });

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    let nextState: GameState;
    if (step.snapshot) {
      try {
        nextState = JSON.parse(step.snapshot);
      } catch {
        nextState = resolveStepState(steps, i);
      }
    } else if (step.delta) {
      nextState = applyStateDelta(currentState, step.delta);
    } else {
      nextState = resolveStepState(steps, i);
    }

    const isRoundStart = nextState.round > currentState.round;
    const isGameOverTransition = nextState.phase === 'GAME_OVER' && currentState.phase !== 'GAME_OVER';
    const isKeyframe = isRoundStart || isGameOverTransition;

    if (isKeyframe) {
      compacted.push({
        stepIndex: i,
        timestamp: step.timestamp,
        round: step.round,
        phase: step.phase,
        actionType: step.actionType,
        summary: step.summary,
        actorPlayerId: step.actorPlayerId,
        actorPlayerName: step.actorPlayerName,
        isKeyframe: true,
        snapshot: createCleanSnapshot(nextState),
        actionData: step.actionData,
      });
    } else {
      const delta = computeStateDelta(currentState, nextState) || {};
      compacted.push({
        stepIndex: i,
        timestamp: step.timestamp,
        round: step.round,
        phase: step.phase,
        actionType: step.actionType,
        summary: step.summary,
        actorPlayerId: step.actorPlayerId,
        actorPlayerName: step.actorPlayerName,
        isKeyframe: false,
        delta,
        actionData: step.actionData,
      });
    }
    currentState = nextState;
  }

  return compacted;
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

  const isSetupAction =
    firstStep.actionType === 'GAME_SETUP' ||
    firstStep.actionType === 'DRAFT_INITIALIZED';

  // Legacy games started before replay tracking may have isolated steps recorded mid-game (e.g. Round 5)
  if (state.round > 1 && (firstStep.round > 1 || !isSetupAction)) {
    return false;
  }

  return true;
}
