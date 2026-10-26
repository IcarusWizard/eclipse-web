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
export function getTableNumber(state: GameState): number {
  if ((state as any).tableNumber) {
    return (state as any).tableNumber;
  }
  let hash = 0;
  for (let i = 0; i < state.id.length; i++) {
    hash = (hash << 5) - hash + state.id.charCodeAt(i);
    hash |= 0;
  }
  return 100 + (Math.abs(hash) % 900);
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
  try {
    // When an action is unconfirmed, keep it strictly isolated to the acting player's local React state.
    // Other players / tabs only see the action after the player has confirmed it.
    // Never persist unconfirmed actions to shared localStorage (which triggers storage events to other tabs)
    // or broadcast / upload them.
    if (state.pendingActionConfirmation) {
      return;
    }

    const tableNumber = getTableNumber(state);
    (state as any).tableNumber = tableNumber;

    const storage = getStorage();

    // Update saved tables collection
    const existingRaw = storage.getItem(SAVED_TABLES_KEY);
    const tables: Record<string, SavedTableSummary> = existingRaw ? JSON.parse(existingRaw) : {};

    const existingTable = tables[state.id];
    let members: TableMember[] = [];
    if (state.members && Array.isArray(state.members) && state.members.length > 0) {
      members = [...state.members];
      if (existingTable?.members && Array.isArray(existingTable.members)) {
        const memberMap = new Map<string, TableMember>();
        const getKey = (m: TableMember) => m.userId || `${m.username || m.name}:${m.seat}`;
        for (const m of existingTable.members) {
          if (m) memberMap.set(getKey(m), m);
        }
        for (const m of members) {
          if (m) memberMap.set(getKey(m), m);
        }
        members = Array.from(memberMap.values());
      }
    } else if (existingTable?.members && Array.isArray(existingTable.members) && existingTable.members.length > 0) {
      members = [...existingTable.members];
    }
    state.members = members;

    // Retain existing historical replaySteps if current state object had stripped replaySteps
    if ((!state.replaySteps || state.replaySteps.length === 0) && existingTable?.stateJson) {
      try {
        const parsed = JSON.parse(existingTable.stateJson);
        if (parsed.replaySteps && Array.isArray(parsed.replaySteps) && parsed.replaySteps.length > 0) {
          state.replaySteps = parsed.replaySteps;
        }
      } catch {}
    }

    const stateJson = JSON.stringify(state);
    storage.setItem(ACTIVE_GAME_KEY, stateJson);
    const activePlayer = state.players[state.activePlayerIndex];
    let effectiveActiveIndex = typeof state.activePlayerIndex === 'number' ? state.activePlayerIndex : 0;
    if (state.phase === 'COMBAT_PHASE' && (state as any).combat?.activePlayerId) {
      const cIdx = state.players.findIndex((p) => p.id === (state as any).combat.activePlayerId);
      if (cIdx >= 0) effectiveActiveIndex = cIdx;
    }

    const hasReplay = isReplayAvailable(state);
    const replayStepsCount = state.replaySteps?.length || 0;

    tables[state.id] = {
      id: state.id,
      tableNumber,
      savedAt: Date.now(),
      round: state.round,
      maxRounds: state.maxRounds,
      phase: state.phase,
      playerCount: state.players.length,
      playerNames: state.players.map((p) => `${p.name} (${p.faction.name})`),
      activePlayerName: activePlayer ? activePlayer.name : 'Unknown',
      activePlayerIndex: effectiveActiveIndex,
      stateJson,
      members,
      hasReplay,
      replayStepsCount,
    };

    storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));

    if (!skipBroadcast) {
      broadcastGameState(state, stateJson);
    }

    // Persist to server API for cross-IP multi-device gameplay (only for local confirmed actions, not incoming sync)
    if (!skipBroadcast && typeof fetch !== 'undefined') {
      fetch(`/api/tables/${state.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: stateJson,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save game state:', err);
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
    if (!raw) return null;
    const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
    const idStr = String(tableIdentifier);
    const num = parseInt(idStr, 10);

    // 1. Direct ID match
    if (tables[idStr]?.stateJson) {
      const parsed: GameState = JSON.parse(tables[idStr].stateJson!);
      (parsed as any).tableNumber = tables[idStr].tableNumber;
      if ((!parsed.members || parsed.members.length === 0) && tables[idStr].members) {
        parsed.members = tables[idStr].members;
      }
      return sanitizeLoadedGameState(parsed);
    }

    // 2. Direct galaxy- prefix match
    const galaxyId = `galaxy-${idStr}`;
    if (tables[galaxyId]?.stateJson) {
      const parsed: GameState = JSON.parse(tables[galaxyId].stateJson!);
      (parsed as any).tableNumber = tables[galaxyId].tableNumber;
      if ((!parsed.members || parsed.members.length === 0) && tables[galaxyId].members) {
        parsed.members = tables[galaxyId].members;
      }
      return sanitizeLoadedGameState(parsed);
    }

    // 3. Search matching candidates, prioritized by exact id, galaxy- prefix, and newest savedAt
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
        if ((!parsed.members || parsed.members.length === 0) && best.members) {
          parsed.members = best.members;
        }
        return sanitizeLoadedGameState(parsed);
      }
    }
    return null;
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
    const url = `/api/tables/${encodeURIComponent(String(tableIdentifier))}${includeReplay ? '?includeReplay=true' : ''}`;
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
    const res = await fetch('/api/tables');
    if (!res.ok) return [];
    const data = await res.json();
    if (data && data.success && Array.isArray(data.tables)) {
      return data.tables as SavedTableSummary[];
    }
  } catch {}
  return [];
}

/**
 * Removes a table from localStorage and server storage.
 */
export function deleteSavedTable(tableId: string): void {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    if (!raw) return;
    const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
    delete tables[tableId];
    storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));

    if (typeof fetch !== 'undefined') {
      fetch(`/api/tables/${encodeURIComponent(tableId)}`, { method: 'DELETE' }).catch(() => {});
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

  // 1. Check server storage immediately on subscribe for fast multi-device join
  fetchTableFromServer(targetIdStr, false, lastKnownSavedAt)
    .then((remote) => {
      if (remote) {
        if (remote.savedAt) lastKnownSavedAt = remote.savedAt;
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
        if (remote.savedAt) lastKnownSavedAt = remote.savedAt;
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
 * Only administrators are allowed to use hotseat.
 */
export function canUserUseHotseat(role?: UserRole | string | null): boolean {
  return role === 'admin';
}

export async function registerTableMember(
  tableId: string,
  member: TableMember
): Promise<{ success: boolean; error?: string; members?: TableMember[] }> {
  try {
    // Only administrators are allowed to use the hotseat function
    if (member.seat === 'all' && !canUserUseHotseat(member.role)) {
      return {
        success: false,
        error: 'Only administrators are allowed to use the hotseat function.',
      };
    }

    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    const tables: Record<string, SavedTableSummary> = raw ? JSON.parse(raw) : {};

    const table = tables[tableId];
    let curMembers: TableMember[] = table?.members ? [...table.members] : [];

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
      table.members = curMembers;
      storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
    } else {
      tables[tableId] = {
        id: tableId,
        tableNumber: parseInt(tableId.replace(/\D/g, ''), 10) || 101,
        savedAt: Date.now(),
        round: 1,
        maxRounds: 8,
        phase: 'ACTION_PHASE',
        playerCount: 2,
        playerNames: [],
        activePlayerName: 'Unknown',
        members: [{ ...member, joinedAt: Date.now() }],
      };
      curMembers = tables[tableId].members!;
      storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
    }

    if (typeof fetch !== 'undefined') {
      const res = await fetch(`/api/tables/${encodeURIComponent(tableId)}/join`, {
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
            curMembers = data.members;
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
    return t.members.some((m) => m.userId === user.id);
  });
}

export type TableStatusCategory = 'need_players' | 'running' | 'done';

/**
 * Returns the set of occupied player seats (0-indexed) for a table.
 */
export function getTableOccupiedSeats(table: SavedTableSummary): Set<number> {
  const occupied = new Set<number>();
  const pCount = table.playerCount || 2;
  if (Array.isArray(table.members)) {
    for (const m of table.members) {
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
  const occupied = getTableOccupiedSeats(table);
  const pCount = table.playerCount || 2;
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

  const myMembership = (table.members || []).find((m) => m.userId === user.id);
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



