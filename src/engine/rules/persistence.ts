import { GameState } from '../types/state';
import { TableMember, UserSession } from '../types/user';
import { isReplayAvailable } from './replay';

export interface SavedTableSummary {
  id: string;
  tableNumber: number;
  savedAt: number;
  round: number;
  maxRounds: number;
  phase: string;
  playerCount: number;
  playerNames: string[];
  activePlayerName: string;
  activePlayerIndex?: number;
  isGameStarted?: boolean;
  isLocalGame?: boolean;
  stateJson?: string;
  members?: TableMember[];
  hasReplay?: boolean;
  replayStepsCount?: number;
}

const ACTIVE_GAME_KEY = 'eclipse_active_game';
const SAVED_TABLES_KEY = 'eclipse_saved_tables';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, val: string): void {
    this.store.set(key, val);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const fallbackStorage = new MemoryStorage();

export function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {}
  return fallbackStorage;
}

/**
 * Computes a deterministic 3-digit table number from game ID.
 */
export function getTableNumber(stateOrId: GameState | string): number {
  if (typeof stateOrId === 'string') {
    const num = parseInt(stateOrId.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0) return num;
    let hash = 0;
    for (let i = 0; i < stateOrId.length; i++) {
      hash = (hash << 5) - hash + stateOrId.charCodeAt(i);
      hash |= 0;
    }
    return 100 + (Math.abs(hash) % 900);
  }
  if ((stateOrId as any)?.tableNumber) {
    return (stateOrId as any).tableNumber;
  }
  const idStr = stateOrId?.id || '';
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  return 100 + (Math.abs(hash) % 900);
}

/**
 * Strips heavy historical replay snapshots for localStorage to prevent QuotaExceededError (5MB browser limit),
 * while keeping hasReplay and replayStepsCount metadata intact.
 */
export function stripReplayForStorage(state: GameState): GameState {
  if (!state) return state;
  const hasReplay = isReplayAvailable(state);
  const replayStepsCount = state.replaySteps?.length || (state as any).replayStepsCount || 0;
  return {
    ...state,
    hasReplay,
    replayStepsCount,
    replaySteps: [],
  };
}

/**
 * Strips replay snapshots from existing saved table stateJsons to reclaim browser localStorage space.
 */
export function sanitizeTablesMapForStorage(tables: Record<string, SavedTableSummary>): Record<string, SavedTableSummary> {
  if (!tables) return {};
  for (const key of Object.keys(tables)) {
    const table = tables[key];
    if (table) {
      if (Array.isArray(table.members)) {
        table.members = table.members.filter((m) => m && m.seat !== 'spectator');
      }
      if (table.stateJson) {
        try {
          const parsed = JSON.parse(table.stateJson);
          if (parsed) {
            if (Array.isArray(parsed.members)) {
              parsed.members = parsed.members.filter((m: any) => m && m.seat !== 'spectator');
            }
            if (Array.isArray(parsed.replaySteps) && parsed.replaySteps.length > 0) {
              table.hasReplay = table.hasReplay ?? isReplayAvailable(parsed);
              table.replayStepsCount = table.replayStepsCount ?? parsed.replaySteps.length;
              table.stateJson = JSON.stringify(stripReplayForStorage(parsed));
            }
          }
        } catch {}
      }
    }
  }
  return tables;
}

/**
 * Safe wrapper for storage.setItem that gracefully catches QuotaExceededError and recovers
 * by pruning stateJson from older tables, ensuring localStorage operations never crash.
 */
export function safeSetStorageItem(storage: any, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`Storage setItem failed for key "${key}":`, err?.message || err);
    try {
      if (key === SAVED_TABLES_KEY) {
        const tables: Record<string, SavedTableSummary> = JSON.parse(value);
        const entries = Object.entries(tables).sort(
          ([, a], [, b]) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0)
        );
        for (let i = 1; i < entries.length; i++) {
          delete entries[i][1].stateJson;
        }
        storage.setItem(SAVED_TABLES_KEY, JSON.stringify(Object.fromEntries(entries)));
        return true;
      }
      const raw = storage.getItem(SAVED_TABLES_KEY);
      if (raw) {
        const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
        const entries = Object.entries(tables).sort(
          ([, a], [, b]) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0)
        );
        for (let i = 1; i < entries.length; i++) {
          delete entries[i][1].stateJson;
        }
        storage.setItem(SAVED_TABLES_KEY, JSON.stringify(Object.fromEntries(entries)));
        storage.setItem(key, value);
        return true;
      }
    } catch (retryErr) {
      console.error('Storage quota recovery failed:', retryErr);
    }
    return false;
  }
}

export function resolveApiUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return path;
  }
  if (typeof process !== 'undefined') {
    const base = process.env?.SERVER_BASE_URL || 'http://127.0.0.1:3000';
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
}

/**
 * Persists table state to the server storage API with keepalive: true so browser refreshes do not cancel it.
 */
export async function persistTableToServer(state: GameState): Promise<boolean> {
  if (!state || !state.id || state.isLocalGame) return true;
  if (typeof fetch === 'undefined') return false;
  try {
    const body = JSON.stringify(state);
    const useKeepalive = body.length <= 64000;
    const res = await fetch(resolveApiUrl(`/api/tables/${state.id}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      ...(useKeepalive ? { keepalive: true } : {}),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

const SYNC_CHANNEL_NAME = 'eclipse_game_sync_v1';
let syncChannel: BroadcastChannel | null = null;

export function getSyncChannel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      if (!syncChannel) {
        syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      }
      return syncChannel;
    }
  } catch {}
  return null;
}

export function broadcastGameState(state: GameState, stateJson?: string): void {
  try {
    const channel = getSyncChannel();
    if (channel) {
      const tableNumber = getTableNumber(state);
      channel.postMessage({
        type: 'ECLIPSE_GAME_SYNC',
        tableId: state.id,
        tableNumber,
        timestamp: Date.now(),
        stateJson: stateJson ?? JSON.stringify(state),
      });
    }
  } catch (err) {
    console.error('Failed to broadcast game state:', err);
  }
}

/**
 * Persists current GameState to localStorage and broadcasts update to other tabs.
 */
export function saveGameState(state: GameState, skipBroadcast: boolean = false): void {
  // When an action is unconfirmed, keep it strictly isolated to the acting player's local React state.
  // Other players / tabs only see the action after the player has confirmed it.
  // Never persist unconfirmed actions to shared localStorage (which triggers storage events to other tabs)
  // or broadcast / upload them.
  if (state.pendingActionConfirmation) {
    return;
  }

  const tableNumber = getTableNumber(state);
  (state as any).tableNumber = tableNumber;

  const now = Date.now();
  state.savedAt = now;

  // 1. Safe localStorage persistence (prunes replay snapshots to prevent 5MB QuotaExceededError)
  try {
    const storage = getStorage();

    // Update saved tables collection
    const existingRaw = storage.getItem(SAVED_TABLES_KEY);
    let tables: Record<string, SavedTableSummary> = existingRaw ? JSON.parse(existingRaw) : {};
    tables = sanitizeTablesMapForStorage(tables);

    const existingTable = tables[state.id];
    let members: TableMember[] = [];
    if (Array.isArray(state.members)) {
      members = [...state.members];
    } else if (existingTable?.members && Array.isArray(existingTable.members)) {
      members = [...existingTable.members];
    }
    // Spectator is a temporary seat; who has been the spectator should not be stored.
    members = members.filter((m) => m && m.seat !== 'spectator');
    state.members = members;

    // Retain existing historical replaySteps if current state object had stripped replaySteps
    if (existingTable?.stateJson) {
      try {
        const parsed = JSON.parse(existingTable.stateJson);
        if (parsed.replaySteps && Array.isArray(parsed.replaySteps) && parsed.replaySteps.length > 0) {
          if (!state.replaySteps || state.replaySteps.length === 0) {
            state.replaySteps = parsed.replaySteps;
          } else {
            const parsedSetup =
              parsed.replaySteps[0]?.actionType === 'GAME_SETUP' ||
              parsed.replaySteps[0]?.actionType === 'DRAFT_INITIALIZED';
            const stateSetup =
              state.replaySteps[0]?.actionType === 'GAME_SETUP' ||
              state.replaySteps[0]?.actionType === 'DRAFT_INITIALIZED';
            if (parsedSetup && !stateSetup) {
              const merged = [...parsed.replaySteps];
              for (const step of state.replaySteps) {
                const already = merged.some(
                  (s: any) =>
                    (s.timestamp === step.timestamp && s.actionType === step.actionType) ||
                    (s.stepIndex === step.stepIndex && s.actionType === step.actionType && s.round === step.round)
                );
                if (!already && step.actionType !== 'GAME_SETUP' && step.actionType !== 'DRAFT_INITIALIZED') {
                  merged.push({ ...step, stepIndex: merged.length });
                }
              }
              state.replaySteps = merged;
            }
          }
        }
      } catch {}
    }

    const fullServerPayloadJson = JSON.stringify(state);

    const storageState = stripReplayForStorage(state);
    const storageStateJson = JSON.stringify(storageState);

    safeSetStorageItem(storage, ACTIVE_GAME_KEY, storageStateJson);
    const activePlayer = state.players[state.activePlayerIndex];
    let effectiveActiveIndex = typeof state.activePlayerIndex === 'number' ? state.activePlayerIndex : 0;
    if (state.phase === 'COMBAT_PHASE' && (state as any).combat?.activePlayerId) {
      const cIdx = state.players.findIndex((p) => p.id === (state as any).combat.activePlayerId);
      if (cIdx >= 0) effectiveActiveIndex = cIdx;
    }

    const hasReplay = isReplayAvailable(state);
    const replayStepsCount = state.replaySteps?.length || (state as any).replayStepsCount || 0;

    const isGameStarted =
      typeof (state as any).isGameStarted === 'boolean'
        ? (state as any).isGameStarted
        : (state.round > 1 || ((state as any).replaySteps && (state as any).replaySteps.length > 1) || replayStepsCount > 1);

    tables[state.id] = {
      id: state.id,
      tableNumber,
      savedAt: now,
      round: state.round,
      maxRounds: state.maxRounds,
      phase: state.phase,
      playerCount: state.players.length,
      playerNames: state.players.map((p) => `${p.name} (${p.faction.name})`),
      activePlayerName: activePlayer ? activePlayer.name : 'Unknown',
      activePlayerIndex: effectiveActiveIndex,
      isGameStarted,
      isLocalGame: Boolean(state.isLocalGame),
      stateJson: storageStateJson,
      members,
      hasReplay,
      replayStepsCount,
    };

    safeSetStorageItem(storage, SAVED_TABLES_KEY, JSON.stringify(tables));
  } catch (err) {
    console.error('Failed to update localStorage in saveGameState:', err);
  }

  // 2. Broadcast to other tabs (independent of localStorage)
  if (!skipBroadcast) {
    try {
      broadcastGameState(state);
    } catch (err) {
      console.warn('Failed to broadcast game state:', err);
    }
  }

  // 3. Persist to server API with keepalive: true if within 64KB limit (independent of localStorage)
  if (!skipBroadcast && typeof fetch !== 'undefined' && !state.isLocalGame) {
    try {
      const serverPayload = JSON.stringify(state);
      const useKeepalive = serverPayload.length <= 64000;
      fetch(resolveApiUrl(`/api/tables/${state.id}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serverPayload,
        ...(useKeepalive ? { keepalive: true } : {}),
      }).catch((err) => {
        console.warn('Failed to persist table to server:', err);
      });
    } catch (err) {
      console.warn('Failed to initiate server save:', err);
    }
  }
}

/**
 * Loads the active game state from localStorage or URL parameter ?table=XXX.
 */
export function loadActiveGameState(): GameState | null {
  try {
    // 1. Check URL query params for ?table=XXX
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table');
      if (tableParam) {
        const fromTable = loadTable(tableParam);
        if (fromTable) return fromTable;
        // Do not fall back to unrelated ACTIVE_GAME_KEY if URL explicitly requested a specific table
        return null;
      }
    }

    // 2. Check active game key
    const storage = getStorage();
    const raw = storage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;

    const parsed: GameState = JSON.parse(raw);
    if (parsed && parsed.players && parsed.sectors && parsed.id) {
      if (!(parsed as any).tableNumber) {
        (parsed as any).tableNumber = getTableNumber(parsed);
      }
      if (!parsed.members || parsed.members.length === 0) {
        try {
          const savedRaw = storage.getItem(SAVED_TABLES_KEY);
          if (savedRaw) {
            const tables = JSON.parse(savedRaw);
            if (tables[parsed.id]?.members && tables[parsed.id].members.length > 0) {
              parsed.members = tables[parsed.id].members;
            }
          }
        } catch {}
      }
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to load active game state from localStorage:', err);
    return null;
  }
}

/**
 * Sanitizes game state upon load to resolve any corrupted/deadlocked edge cases (Bug 114).
 * If a game was saved with pendingExploreActivations but the active player has already passed,
 * clear pendingExploreActivations and advance activePlayerIndex if not all players have passed.
 */
export function sanitizeLoadedGameState(state: GameState): GameState {
  if (!state || !state.players) return state;
  // Spectator is a temporary seat; who has been the spectator should not be stored.
  if (Array.isArray(state.members)) {
    state.members = state.members.filter((m) => m && m.seat !== 'spectator');
  }
  if (state.phase === 'ACTION_PHASE' && state.pendingExploreActivations && state.pendingExploreActivations > 0) {
    const activeP = state.players[state.activePlayerIndex];
    if (activeP?.hasPassed || state.passedPlayerIds?.includes(activeP?.id)) {
      state.pendingExploreActivations = 0;
      const activePlayers = state.players.filter((p) => !p.isEliminated);
      const allPassed = (state.consecutivePasses || 0) >= activePlayers.length;
      if (!allPassed) {
        let nextIdx = (state.activePlayerIndex + 1) % state.players.length;
        let loops = 0;
        while (state.players[nextIdx]!.isEliminated && loops < state.players.length) {
          nextIdx = (nextIdx + 1) % state.players.length;
          loops++;
        }
        state.activePlayerIndex = nextIdx;
      }
    }
  }
  return state;
}

/**
 * Retrieves a saved table by its ID or 3-digit table number.
 */
export function loadTable(tableIdentifier: string | number): GameState | null {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    const tables: Record<string, SavedTableSummary> = raw ? JSON.parse(raw) : {};
    const idStr = String(tableIdentifier);
    const num = parseInt(idStr, 10);

    // 0. Also check ACTIVE_GAME_KEY in case SAVED_TABLES_KEY was empty or ACTIVE_GAME_KEY has a newer state for this table
    let activeState: GameState | null = null;
    const activeRaw = storage.getItem(ACTIVE_GAME_KEY);
    if (activeRaw) {
      try {
        const p = JSON.parse(activeRaw);
        if (
          p &&
          (p.id === idStr ||
            p.id === `galaxy-${idStr}` ||
            (!isNaN(num) && (p.tableNumber === num || (p as any).tableNumber === num)))
        ) {
          activeState = sanitizeLoadedGameState(p);
        }
      } catch {}
    }

    let resultFromSummary: GameState | null = null;

    // 1. Direct ID match
    if (tables[idStr]?.stateJson) {
      const parsed: GameState = JSON.parse(tables[idStr].stateJson!);
      (parsed as any).tableNumber = tables[idStr].tableNumber;
      if (tables[idStr].members) {
        parsed.members = tables[idStr].members;
      }
      resultFromSummary = sanitizeLoadedGameState(parsed);
    }

    // 2. Direct galaxy- prefix match
    const galaxyId = `galaxy-${idStr}`;
    if (!resultFromSummary && tables[galaxyId]?.stateJson) {
      const parsed: GameState = JSON.parse(tables[galaxyId].stateJson!);
      (parsed as any).tableNumber = tables[galaxyId].tableNumber;
      if (tables[galaxyId].members) {
        parsed.members = tables[galaxyId].members;
      }
      resultFromSummary = sanitizeLoadedGameState(parsed);
    }

    // 3. Search matching candidates, prioritized by exact id, galaxy- prefix, and newest savedAt
    if (!resultFromSummary) {
      const candidates = Object.values(tables).filter(
        (t) => t.id === idStr || (!isNaN(num) && t.tableNumber === num)
      );
      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          if (a.id === idStr) return -1;
          if (b.id === idStr) return 1;
          if (a.id === galaxyId) return -1;
          if (b.id === galaxyId) return 1;
          return (b.savedAt || 0) - (a.savedAt || 0);
        });
        const best = candidates[0];
        if (best?.stateJson) {
          const parsed: GameState = JSON.parse(best.stateJson);
          (parsed as any).tableNumber = best.tableNumber;
          if (best.members) {
            parsed.members = best.members;
          }
          resultFromSummary = sanitizeLoadedGameState(parsed);
        }
      }
    }

    if (activeState) {
      const summaryMembers = tables[idStr]?.members || tables[galaxyId]?.members;
      if (summaryMembers && (!activeState.members || activeState.members.length === 0)) {
        activeState.members = summaryMembers;
      }
    }

    if (activeState && resultFromSummary) {
      const activeSavedAt = Number(activeState.savedAt) || 0;
      const summarySavedAt = Number(resultFromSummary.savedAt) || 0;
      return activeSavedAt >= summarySavedAt ? activeState : resultFromSummary;
    }

    return activeState || resultFromSummary || null;
  } catch (err) {
    console.error(`Failed to load table ${tableIdentifier}:`, err);
    return null;
  }
}

/**
 * Retrieves a saved table by its 3-digit table number.
 */
export function loadTableByNumber(tableNumber: number): GameState | null {
  return loadTable(tableNumber);
}

/**
 * Lists all saved table summaries sorted by latest activity.
 */
export function listSavedTables(): SavedTableSummary[] {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    if (!raw) return [];
    const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
    return Object.values(tables).sort((a, b) => b.savedAt - a.savedAt);
  } catch (err) {
    console.error('Failed to list saved tables:', err);
    return [];
  }
}

/**
 * Fetches a table from the server storage API by ID or tableNumber.
 * Supports conditional HTTP 304 caching via If-None-Match header.
 */
export async function fetchTableFromServer(
  tableIdentifier: string | number,
  includeReplay: boolean = false,
  ifNoneMatch?: string | number
): Promise<GameState | null> {
  try {
    if (typeof fetch === 'undefined') return null;
    const replayParam = includeReplay ? 'includeReplay=true' : 'includeReplay=false';
    const url = resolveApiUrl(`/api/tables/${encodeURIComponent(String(tableIdentifier))}?${replayParam}`);
    const headers: Record<string, string> = {};
    if (ifNoneMatch) {
      headers['If-None-Match'] = String(ifNoneMatch);
    }
    const res = await fetch(url, { headers });
    if (res.status === 304) {
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success && data.table) {
      return sanitizeLoadedGameState(data.table as GameState);
    }
  } catch {}
  return null;
}

/**
 * Fetches all saved table summaries from the server storage API.
 */
export async function fetchSavedTablesFromServer(): Promise<SavedTableSummary[]> {
  try {
    if (typeof fetch === 'undefined') return [];
    const res = await fetch(resolveApiUrl('/api/tables'));
    if (!res.ok) return [];
    const data = await res.json();
    if (data && data.success && Array.isArray(data.tables)) {
      return data.tables as SavedTableSummary[];
    }
  } catch {}
  return [];
}

/**
 * Merges local and remote table summaries, giving precedence to whichever has the newer savedAt timestamp,
 * while preserving vital local properties (e.g. stateJson, isGameStarted) and updating localStorage.
 */
export function mergeTableSummaries(
  localList: SavedTableSummary[],
  remoteList: SavedTableSummary[]
): SavedTableSummary[] {
  const map = new Map<string, SavedTableSummary>();
  for (const local of localList) {
    if (local && local.id) {
      map.set(local.id, local);
    }
  }

  for (const remote of remoteList) {
    if (!remote || !remote.id) continue;
    const local = map.get(remote.id);
    if (!local) {
      map.set(remote.id, remote);
      continue;
    }

    const localSavedAt = Number(local.savedAt) || 0;
    const remoteSavedAt = Number(remote.savedAt) || 0;

    const isGameStarted =
      remote.isGameStarted === true ||
      local.isGameStarted === true ||
      (remote.round || 1) > 1 ||
      (local.round || 1) > 1
        ? true
        : remote.isGameStarted === false || local.isGameStarted === false
        ? false
        : undefined;

    // Merge members by user ID and seat so players from both server and local are retained (spectators are never stored)
    const memberMap = new Map<string, TableMember>();
    for (const m of remote.members || []) {
      if (m && m.seat !== 'spectator') {
        const key = m.userId ? `user:${m.userId}` : `seat:${m.seat}`;
        memberMap.set(key, m);
      }
    }
    for (const m of local.members || []) {
      if (m && m.seat !== 'spectator') {
        const key = m.userId ? `user:${m.userId}` : `seat:${m.seat}`;
        const existing = memberMap.get(key);
        if (!existing || (Number(m.joinedAt) || 0) >= (Number(existing.joinedAt) || 0)) {
          memberMap.set(key, { ...(existing || {}), ...m });
        }
      }
    }
    const members = Array.from(memberMap.values()).filter((m) => m && m.seat !== 'spectator');

    const winner = remoteSavedAt >= localSavedAt ? remote : local;
    const base = remoteSavedAt >= localSavedAt ? local : remote;

    const remoteRound = Number(remote.round) || 1;
    const localRound = Number(local.round) || 1;
    const roundAhead =
      remoteRound > localRound
        ? remote
        : localRound > remoteRound
        ? local
        : winner;

    const round = Math.max(remoteRound, localRound);
    const maxRounds = Math.max(Number(remote.maxRounds) || 8, Number(local.maxRounds) || 8);
    const phase = roundAhead.phase || winner.phase || base.phase;
    const playerCount = Math.max(
      Number(remote.playerCount) || 0,
      Number(local.playerCount) || 0,
      (remote as any).players?.length || 0,
      (local as any).players?.length || 0
    );
    const playerNames =
      roundAhead.playerNames && roundAhead.playerNames.length > 0
        ? roundAhead.playerNames
        : winner.playerNames && winner.playerNames.length > 0
        ? winner.playerNames
        : base.playerNames && base.playerNames.length > 0
        ? base.playerNames
        : [];
    const activePlayerName =
      roundAhead.activePlayerName && roundAhead.activePlayerName !== 'Unknown'
        ? roundAhead.activePlayerName
        : winner.activePlayerName && winner.activePlayerName !== 'Unknown'
        ? winner.activePlayerName
        : base.activePlayerName && base.activePlayerName !== 'Unknown'
        ? base.activePlayerName
        : 'Unknown';
    const activePlayerIndex =
      typeof roundAhead.activePlayerIndex === 'number'
        ? roundAhead.activePlayerIndex
        : typeof winner.activePlayerIndex === 'number'
        ? winner.activePlayerIndex
        : typeof base.activePlayerIndex === 'number'
        ? base.activePlayerIndex
        : 0;

    const hasReplay = Boolean(remote.hasReplay || local.hasReplay);
    const replayStepsCount = Math.max(
      Number(remote.replayStepsCount) || 0,
      Number(local.replayStepsCount) || 0
    );

    const isLocalGame = Boolean(local.isLocalGame || remote.isLocalGame);

    map.set(remote.id, {
      ...base,
      ...winner,
      round,
      maxRounds,
      phase,
      playerCount,
      playerNames,
      activePlayerName,
      activePlayerIndex,
      isGameStarted,
      isLocalGame,
      members,
      hasReplay,
      replayStepsCount,
      stateJson: winner.stateJson || base.stateJson || local.stateJson || remote.stateJson,
    });
  }

  const merged = Array.from(map.values()).sort((a, b) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0));

  // Sync merged summaries back into localStorage so local cache is never stale
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    const storedMap: Record<string, SavedTableSummary> = raw ? JSON.parse(raw) : {};
    let updated = false;
    for (const item of merged) {
      const existing = storedMap[item.id];
      if (!existing || (Number(item.savedAt) || 0) >= (Number(existing.savedAt) || 0)) {
        storedMap[item.id] = {
          ...(existing || {}),
          ...item,
          stateJson: item.stateJson || existing?.stateJson,
        };
        updated = true;
      }
    }
    if (updated) {
      sanitizeTablesMapForStorage(storedMap);
      safeSetStorageItem(storage, SAVED_TABLES_KEY, JSON.stringify(storedMap));
    }
  } catch {}

  return merged;
}

/**
 * Checks whether two lists of table summaries are structurally and semantically identical
 * regarding properties that affect lobby rendering (turn count, phase, round, players, members).
 */
export function areTableSummariesEqual(a: SavedTableSummary[], b: SavedTableSummary[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const tA = a[i];
    const tB = b[i];
    if (tA.id !== tB.id) return false;
    if (tA.savedAt !== tB.savedAt) return false;
    if (tA.round !== tB.round) return false;
    if (tA.phase !== tB.phase) return false;
    if (tA.activePlayerIndex !== tB.activePlayerIndex) return false;
    if (tA.activePlayerName !== tB.activePlayerName) return false;
    if (tA.isGameStarted !== tB.isGameStarted) return false;
    if (tA.playerCount !== tB.playerCount) return false;
    const memA = (tA.members || []).filter((m) => m && m.seat !== 'spectator');
    const memB = (tB.members || []).filter((m) => m && m.seat !== 'spectator');
    if (memA.length !== memB.length) return false;
    for (let j = 0; j < memA.length; j++) {
      if (memA[j].userId !== memB[j].userId || memA[j].seat !== memB[j].seat) return false;
    }
  }
  return true;
}

/**
 * Broadcasts table cancellation event across tabs via BroadcastChannel.
 */
export function broadcastTableCancelled(tableId: string): void {
  const channel = getSyncChannel();
  if (channel) {
    channel.postMessage({
      type: 'ECLIPSE_TABLE_CANCELLED',
      tableId,
      timestamp: Date.now(),
    });
  }
}

/**
 * Removes a table from localStorage and server storage.
 */
export function deleteSavedTable(tableId: string): void {
  try {
    const storage = getStorage();
    let wasLocalGame = false;
    const raw = storage.getItem(SAVED_TABLES_KEY);
    if (raw) {
      const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
      if (tables[tableId]?.isLocalGame) {
        wasLocalGame = true;
      }
      delete tables[tableId];
      for (const k of Object.keys(tables)) {
        if (tables[k]?.id === tableId) {
          if (tables[k]?.isLocalGame) wasLocalGame = true;
          delete tables[k];
        }
      }
      storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
    }

    const activeRaw = storage.getItem(ACTIVE_GAME_KEY);
    if (activeRaw) {
      try {
        const parsedActive = JSON.parse(activeRaw);
        if (parsedActive?.id === tableId) {
          if (parsedActive?.isLocalGame) wasLocalGame = true;
          storage.removeItem(ACTIVE_GAME_KEY);
        }
      } catch {}
    }

    broadcastTableCancelled(tableId);

    if (typeof fetch !== 'undefined' && !wasLocalGame) {
      fetch(resolveApiUrl(`/api/tables/${encodeURIComponent(tableId)}`), { method: 'DELETE' }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to delete saved table:', err);
  }
}

/**
 * Returns a stable state fingerprint by stripping transient timestamps and metadata.
 */
export function getStateFingerprint(state: any): string {
  if (!state) return '';
  const { savedAt, replaySteps, hasReplay, replayStepsCount, members, ...rest } = state;
  const membersFp = (members || [])
    .map((m: any) => `${m.userId}:${m.seat}:${m.role}`)
    .sort()
    .join(';');
  const replayCount = replaySteps?.length ?? (replayStepsCount || 0);
  return `${JSON.stringify(rest)}|${membersFp}|${replayCount}`;
}

/**
 * Subscribes to real-time game state synchronization across tabs/windows and different IP addresses.
 * Combines BroadcastChannel (instant in-memory broadcast) with StorageEvent and server polling for multi-IP support.
 */
export function subscribeToGameSync(
  tableIdentifier: string | number,
  callback: (remoteState: GameState) => void
): () => void {
  const targetIdStr = String(tableIdentifier);
  const targetNum = parseInt(targetIdStr, 10);
  let lastKnownFingerprint: string | null = null;
  let lastKnownSavedAt: string | number | undefined = undefined;

  // Initialize with currently saved state if present
  const initial = loadTable(tableIdentifier);
  if (initial) {
    lastKnownFingerprint = getStateFingerprint(initial);
    lastKnownSavedAt = initial.savedAt;
  }

  // 1. Check server storage immediately on subscribe for fast multi-device join (lightweight live state without 1MB+ replay history)
  fetchTableFromServer(targetIdStr, false, lastKnownSavedAt)
    .then((remote) => {
      if (remote) {
        const currentLocal = loadTable(targetIdStr);
        const remoteTime = Number(remote.savedAt) || 0;
        const localTime = Math.max(Number(currentLocal?.savedAt) || 0, Number(initial?.savedAt) || 0);

        // Anti-Regression Protection: Never overwrite newer local confirmed state with older server state!
        if (localTime > remoteTime) {
          if (currentLocal) {
            persistTableToServer(currentLocal).catch(() => {});
          }
          return;
        }

        if (remote.savedAt) lastKnownSavedAt = remote.savedAt;
        if ((!remote.replaySteps || remote.replaySteps.length === 0) && (currentLocal?.replaySteps?.length || initial?.replaySteps?.length)) {
          remote.replaySteps = currentLocal?.replaySteps || initial?.replaySteps || [];
        }
        const fp = getStateFingerprint(remote);
        if (fp !== lastKnownFingerprint) {
          lastKnownFingerprint = fp;
          saveGameState(remote, true);
          callback(remote);
        }
      }
    })
    .catch(() => {});

  // 2. BroadcastChannel message listener (0ms instant cross-tab sync)
  const channel = getSyncChannel();
  const handleChannelMessage = (event: MessageEvent) => {
    try {
      const data = event.data;
      if (!data || data.type !== 'ECLIPSE_GAME_SYNC') return;
      const isExactId = targetIdStr.includes('-') || isNaN(targetNum);
      const matches = isExactId
        ? data.tableId === targetIdStr
        : data.tableId === targetIdStr ||
          data.tableId === `galaxy-${targetIdStr}` ||
          (!isNaN(targetNum) && data.tableNumber === targetNum);
      if (matches && data.stateJson) {
        const parsed: GameState = sanitizeLoadedGameState(JSON.parse(data.stateJson));
        if (parsed.savedAt) lastKnownSavedAt = parsed.savedAt;
        const fp = getStateFingerprint(parsed);
        if (fp !== lastKnownFingerprint) {
          lastKnownFingerprint = fp;
          callback(parsed);
        }
      }
    } catch (err) {
      console.error('Error handling sync message:', err);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  // 2. Storage event listener (cross-tab localStorage change event)
  const handleStorageEvent = (event: StorageEvent) => {
    try {
      if (event.key === SAVED_TABLES_KEY || event.key === ACTIVE_GAME_KEY) {
        const latest = loadTable(targetIdStr);
        if (latest) {
          if (latest.savedAt) lastKnownSavedAt = latest.savedAt;
          const fp = getStateFingerprint(latest);
          if (fp !== lastKnownFingerprint) {
            lastKnownFingerprint = fp;
            callback(latest);
          }
        }
      }
    } catch (err) {
      console.error('Error handling storage sync:', err);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // 3. Periodic fallback poll check (server-side polling with 304 conditional caching)
  let isPolling = false;
  const poll = async () => {
    if (isPolling) return;
    // When the browser tab is hidden in the background, pause polling to conserve CPU/network
    if (typeof document !== 'undefined' && document.hidden) return;
    isPolling = true;
    try {
      const remote = await fetchTableFromServer(targetIdStr, false, lastKnownSavedAt);
      if (remote) {
        const currentLocal = loadTable(targetIdStr);
        const remoteTime = Number(remote.savedAt) || 0;
        const localTime = Math.max(Number(currentLocal?.savedAt) || 0, Number(initial?.savedAt) || 0);

        // Anti-Regression Protection
        if (localTime > remoteTime) {
          if (currentLocal) {
            persistTableToServer(currentLocal).catch(() => {});
          }
          return;
        }

        if (remote.savedAt) lastKnownSavedAt = remote.savedAt;
        if ((!remote.replaySteps || remote.replaySteps.length === 0) && (currentLocal?.replaySteps?.length || initial?.replaySteps?.length)) {
          remote.replaySteps = currentLocal?.replaySteps || initial?.replaySteps || [];
        }
        const fp = getStateFingerprint(remote);
        if (fp !== lastKnownFingerprint) {
          lastKnownFingerprint = fp;
          saveGameState(remote, true);
          callback(remote);
        }
      }
    } catch {} finally {
      isPolling = false;
    }
  };

  // Poll every 3 seconds for active players instead of aggressive 1000ms
  const pollInterval = setInterval(poll, 3000);

  // Resume check immediately whenever user switches back to this tab
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      poll();
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Return unsubscribe cleanup handler
  return () => {
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    clearInterval(pollInterval);
  };
}

/**
 * Checks if a specific table seat is already taken by another user.
 */
export function isSeatTaken(
  members: TableMember[] | undefined,
  seat: number | 'all' | 'spectator',
  currentUserId?: string
): { isTaken: boolean; occupant?: TableMember } {
  if (typeof seat !== 'number' || !members || !Array.isArray(members)) {
    return { isTaken: false };
  }
  const occupant = members.find((m) => m.seat === seat && m.userId !== currentUserId);
  return {
    isTaken: !!occupant,
    occupant,
  };
}

/**
 * Registers a user or guest as a member of a table (with their seat and role),
 * persisting to both local storage and server.
 * Returns { success: false, error } if the seat is already taken by another user.
 */
/**
 * Checks if a user role is authorized to use the hotseat function.
 * Only administrators are allowed to use hotseat in online games.
 * In local games, hotseat is enabled for all users.
 */
export function canUserUseHotseat(role?: UserRole | string | null, isLocalGame?: boolean): boolean {
  if (isLocalGame) return true;
  return role === 'admin';
}

export async function registerTableMember(
  tableId: string,
  member: TableMember,
  isLocalGame?: boolean,
  enforceGuestRestriction?: boolean
): Promise<{ success: boolean; error?: string; members?: TableMember[] }> {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    const tables: Record<string, SavedTableSummary> = raw ? JSON.parse(raw) : {};

    const table = tables[tableId];
    const isLocal = Boolean(isLocalGame || table?.isLocalGame);

    // Only administrators are allowed to use the hotseat function in online games
    if (member.seat === 'all' && !canUserUseHotseat(member.role, isLocal)) {
      return {
        success: false,
        error: 'Only administrators are allowed to use the hotseat function.',
      };
    }

    if (enforceGuestRestriction && !isLocal && member.role === 'guest' && member.seat !== 'spectator') {
      return {
        success: false,
        error: 'Guest players can only join online multiplayer games as a spectator. Please log in or register to take a player seat.',
      };
    }

    const isGameRunning = Boolean(
      table?.isGameStarted === true ||
      (table && table.round > 1) ||
      (table && (table as any).replayStepsCount > 1)
    );

    // Lock seats once an online game has started
    if (isGameRunning && !isLocal && member.role !== 'admin') {
      const curMembers = table?.members || [];
      const existing = curMembers.find((m) => m.userId === member.userId);

      if (member.seat === 'spectator') {
        if (existing && typeof existing.seat === 'number') {
          let isEliminated = false;
          if (table?.stateJson) {
            try {
              const parsed = JSON.parse(table.stateJson);
              if (parsed.players?.[existing.seat]?.isEliminated) {
                isEliminated = true;
              }
            } catch {}
          }
          if (!isEliminated) {
            return {
              success: false,
              error: 'Seats are locked once the game has started.',
            };
          }
        }
      } else if (typeof member.seat === 'number') {
        if (!existing || existing.seat !== member.seat) {
          return {
            success: false,
            error: 'Seats are locked once the game has started.',
          };
        }
      }
    }

    // A spectator is a temporary seat; who has been the spectator should not be stored.
    // If the user previously occupied a permanent player seat, vacate it; otherwise, do not store them.
    if (member.seat === 'spectator') {
      let curMembers: TableMember[] = (table?.members ? [...table.members] : []).filter(
        (m) => m && m.seat !== 'spectator'
      );
      const prevIdx = curMembers.findIndex((m) => m.userId === member.userId);
      if (prevIdx >= 0) {
        const leavingMember = curMembers[prevIdx];
        curMembers.splice(prevIdx, 1);
        if (table) {
          table.members = curMembers;
          table.savedAt = Date.now();
          if (table.stateJson) {
            try {
              const parsed = JSON.parse(table.stateJson);
              parsed.members = curMembers;
              if (leavingMember && typeof leavingMember.seat === 'number' && parsed.players?.[leavingMember.seat]) {
                parsed.players[leavingMember.seat].name =
                  parsed.players[leavingMember.seat].faction?.name || `Player ${leavingMember.seat + 1}`;
              }
              table.stateJson = JSON.stringify(parsed);
              saveGameState(parsed, true);
            } catch {}
          }
          storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
        }
      }

      if (!isLocal && typeof fetch !== 'undefined') {
        const res = await fetch(resolveApiUrl(`/api/tables/${encodeURIComponent(tableId)}/join`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member }),
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.members && Array.isArray(data.members)) {
            curMembers = data.members.filter((m: any) => m && m.seat !== 'spectator');
            if (tables[tableId]) {
              tables[tableId].members = curMembers;
              storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
            }
          }
        }
      }

      return { success: true, members: curMembers };
    }

    let curMembers: TableMember[] = (table?.members ? [...table.members] : []).filter(
      (m) => m && m.seat !== 'spectator'
    );

    // Check if the requested seat is already taken by another user
    if (typeof member.seat === 'number') {
      const seatCheck = isSeatTaken(curMembers, member.seat, member.userId);
      if (seatCheck.isTaken && seatCheck.occupant) {
        const occName = seatCheck.occupant.username || seatCheck.occupant.name || 'another player';
        return {
          success: false,
          error: `Seat ${member.seat + 1} is already occupied by ${occName}.`,
        };
      }
    }

    if (table) {
      const existingIdx = curMembers.findIndex((m) => m.userId === member.userId);
      if (existingIdx >= 0) {
        curMembers[existingIdx] = {
          ...curMembers[existingIdx],
          ...member,
          joinedAt: curMembers[existingIdx].joinedAt || Date.now(),
        };
      } else {
        curMembers.push({
          ...member,
          joinedAt: Date.now(),
        });
      }
      table.members = curMembers.filter((m) => m && m.seat !== 'spectator');
      if (table.stateJson) {
        try {
          const parsed = JSON.parse(table.stateJson);
          parsed.members = table.members;
          table.stateJson = JSON.stringify(parsed);
        } catch {}
      }
      storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
      const activeRaw = storage.getItem(ACTIVE_GAME_KEY);
      if (activeRaw) {
        try {
          const active = JSON.parse(activeRaw);
          if (active && (active.id === tableId || active.id === `galaxy-${tableId}`)) {
            active.members = table.members;
            storage.setItem(ACTIVE_GAME_KEY, JSON.stringify(active));
          }
        } catch {}
      }
    } else {
      const loaded = loadTable(tableId);
      tables[tableId] = {
        id: tableId,
        tableNumber: parseInt(tableId.replace(/\D/g, ''), 10) || 101,
        savedAt: loaded?.savedAt || Date.now(),
        round: loaded?.round || 1,
        maxRounds: loaded?.maxRounds || 8,
        phase: loaded?.phase || 'ACTION_PHASE',
        playerCount: loaded?.players?.length || 2,
        playerNames: loaded?.players?.map((p) => `${p.name} (${p.faction?.name || ''})`) || [],
        activePlayerName: loaded?.players?.[loaded?.activePlayerIndex]?.name || 'Unknown',
        activePlayerIndex: loaded?.activePlayerIndex ?? 0,
        isGameStarted: loaded ? (loaded as any).isGameStarted : undefined,
        members: [{ ...member, joinedAt: Date.now() }],
      };
      curMembers = tables[tableId].members!;
      storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
    }

    if (!isLocal && typeof fetch !== 'undefined') {
      const res = await fetch(resolveApiUrl(`/api/tables/${encodeURIComponent(tableId)}/join`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member }),
      }).catch(() => null);

      if (res) {
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}));
          return {
            success: false,
            error:
              data.error ||
              `Seat ${typeof member.seat === 'number' ? member.seat + 1 : member.seat} is already occupied.`,
          };
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.members && Array.isArray(data.members)) {
            curMembers = data.members.filter((m: any) => m && m.seat !== 'spectator');
            if (tables[tableId]) {
              tables[tableId].members = curMembers;
              storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
            }
          }
        }
      }
    }

    return { success: true, members: curMembers };
  } catch (err: any) {
    console.error('Failed to register table member:', err);
    return { success: false, error: err?.message || 'Failed to register table member' };
  }
}

/**
 * Vacates a user's seat and detaches them from the table members list.
 */
export async function leaveTable(
  tableId: string,
  userId: string
): Promise<{ success: boolean; members?: TableMember[]; error?: string }> {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    const tables: Record<string, SavedTableSummary> = raw ? JSON.parse(raw) : {};
    const table = tables[tableId];

    const isGameRunning = Boolean(
      table?.isGameStarted === true ||
      (table && table.round > 1) ||
      (table && (table as any).replayStepsCount > 1)
    );

    if (isGameRunning && !tables[tableId]?.isLocalGame) {
      const curMembers = table?.members || [];
      const leavingMember = curMembers.find((m) => m.userId === userId);
      let isEliminated = false;
      if (leavingMember && typeof leavingMember.seat === 'number' && table?.stateJson) {
        try {
          const parsed = JSON.parse(table.stateJson);
          if (parsed.players?.[leavingMember.seat]?.isEliminated) {
            isEliminated = true;
          }
        } catch {}
      }
      if (!isEliminated) {
        return {
          success: false,
          error: 'Seats are locked once the game has started.',
        };
      }
    }

    let updatedMembers: TableMember[] = [];
    if (table) {
      const curMembers = table.members || [];
      const leavingMember = curMembers.find((m) => m.userId === userId);
      updatedMembers = curMembers.filter((m) => m.userId !== userId);
      table.members = updatedMembers;
      table.savedAt = Date.now();

      if (table.stateJson) {
        try {
          const parsed = JSON.parse(table.stateJson);
          parsed.members = updatedMembers;
          if (leavingMember && typeof leavingMember.seat === 'number' && parsed.players?.[leavingMember.seat]) {
            parsed.players[leavingMember.seat].name =
              parsed.players[leavingMember.seat].faction?.name || `Player ${leavingMember.seat + 1}`;
          }
          table.stateJson = JSON.stringify(parsed);
          saveGameState(parsed);
        } catch {}
      }
      storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
    }

    // Call server endpoint if available
    if (typeof fetch !== 'undefined' && !tables[tableId]?.isLocalGame) {
      try {
        const res = await fetch(resolveApiUrl(`/api/tables/${encodeURIComponent(tableId)}/leave`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.members) {
            updatedMembers = data.members;
            if (tables[tableId]) {
              tables[tableId].members = updatedMembers;
              storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
            }
          }
        }
      } catch {}
    }

    const channel = getSyncChannel();
    if (channel) {
      channel.postMessage({
        type: 'ECLIPSE_GAME_SYNC',
        tableId,
        timestamp: Date.now(),
      });
    }

    return { success: true, members: updatedMembers };
  } catch (err: any) {
    console.error('Failed to leave table:', err);
    return { success: false, error: err?.message || 'Failed to leave table' };
  }
}

/**
 * Filters a list of tables based on the current user's role:
 * - Admin sees all tables.
 * - Regular users & guests see only tables where they are a registered member.
 */
export function filterTablesForUser(
  tables: SavedTableSummary[],
  user: UserSession
): SavedTableSummary[] {
  if (user.role === 'admin') {
    return tables;
  }
  return tables.filter((t) => {
    if (!t.members || t.members.length === 0) {
      return false;
    }
    return t.members.some((m) => m.userId === user.id && m.seat !== 'spectator');
  });
}

export const getUserTables = filterTablesForUser;

export type TableStatusCategory = 'need_players' | 'running' | 'done';

/**
 * Returns the set of occupied player seats (0-indexed) for a table.
 */
export function getTableOccupiedSeats(table: SavedTableSummary): Set<number> {
  const occupied = new Set<number>();
  const pCount = table.playerCount || (table as any).players?.length || 2;
  if (Array.isArray(table.members)) {
    for (const m of table.members) {
      if (!m || m.seat === 'spectator') continue;
      if (m.seat === 'all') {
        for (let i = 0; i < pCount; i++) occupied.add(i);
      } else if (typeof m.seat === 'number' && m.seat >= 0 && m.seat < pCount) {
        occupied.add(m.seat);
      }
    }
  }
  return occupied;
}

/**
 * Categorizes a table into:
 * - 'need_players': Game not over and has 1 or more open player seats
 * - 'running': Game not over and all player seats are occupied
 * - 'done': Game is completed (phase === 'GAME_OVER')
 */
export function getTableStatusCategory(table: SavedTableSummary): TableStatusCategory {
  if (table.phase === 'GAME_OVER') {
    return 'done';
  }
  if ((table as any).isGameStarted === false) {
    return 'need_players';
  }
  if ((table as any).isGameStarted === true) {
    return 'running';
  }
  if (table.round > 1 || ((table as any).replayStepsCount && (table as any).replayStepsCount > 1)) {
    return 'running';
  }
  const occupied = getTableOccupiedSeats(table);
  const pCount = table.playerCount || (table as any).players?.length || 2;
  if (occupied.size < pCount) {
    return 'need_players';
  }
  return 'running';
}

/**
 * Checks if it is currently the specified user's turn to take an action at this table.
 */
export function isPlayerTurnAtTable(
  table: SavedTableSummary,
  user: UserSession | null
): boolean {
  if (!user || !table) return false;
  if (table.phase === 'GAME_OVER') return false;
  if (table.isGameStarted === false) return false;
  if (getTableStatusCategory(table) === 'need_players') return false;

  const myMembership = (table.members || []).find((m) => m.userId === user.id && m.seat !== 'spectator');
  if (!myMembership) return false;

  const mySeat = myMembership.seat;
  if (mySeat === 'all') {
    return true; // Admin in hotseat mode controls all active seats
  }
  if (typeof mySeat !== 'number' || mySeat < 0) {
    return false; // Spectator or unassigned seat
  }

  // 1. If in combat phase and stateJson is available, check combat activePlayerId
  if (table.phase === 'COMBAT_PHASE' && table.stateJson) {
    try {
      const parsed = JSON.parse(table.stateJson);
      if (parsed.combat?.activePlayerId) {
        const cIdx = parsed.players?.findIndex((p: any) => p.id === parsed.combat.activePlayerId);
        if (typeof cIdx === 'number' && cIdx >= 0) {
          return cIdx === mySeat;
        }
      }
    } catch {}
  }

  // 2. If activePlayerIndex is directly stored on summary
  if (typeof table.activePlayerIndex === 'number') {
    return table.activePlayerIndex === mySeat;
  }

  // 3. If stateJson is available, read active player index from state
  if (table.stateJson) {
    try {
      const parsed = JSON.parse(table.stateJson);
      let effectiveSeat = parsed.activePlayerIndex;
      if (parsed.phase === 'COMBAT_PHASE' && parsed.combat?.activePlayerId) {
        const cIdx = parsed.players?.findIndex((p: any) => p.id === parsed.combat.activePlayerId);
        if (typeof cIdx === 'number' && cIdx >= 0) effectiveSeat = cIdx;
      }
      if (typeof effectiveSeat === 'number') {
        return effectiveSeat === mySeat;
      }
    } catch {}
  }

  // 3. Fallback: compare activePlayerName with playerNames[mySeat]
  if (table.activePlayerName && Array.isArray(table.playerNames) && table.playerNames[mySeat]) {
    const seatPlayerName = table.playerNames[mySeat].trim().toLowerCase();
    const cleanActive = table.activePlayerName.trim().toLowerCase();
    return seatPlayerName.includes(cleanActive) || cleanActive.includes(seatPlayerName.split(' ')[0]);
  }

  return false;
}



