import { GameState } from '../types/state';

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
  stateJson: string;
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
    const tableNumber = getTableNumber(state);
    (state as any).tableNumber = tableNumber;

    const storage = getStorage();
    const stateJson = JSON.stringify(state);
    storage.setItem(ACTIVE_GAME_KEY, stateJson);

    // Update saved tables collection
    const existingRaw = storage.getItem(SAVED_TABLES_KEY);
    const tables: Record<string, SavedTableSummary> = existingRaw ? JSON.parse(existingRaw) : {};

    const activePlayer = state.players[state.activePlayerIndex];

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
      stateJson,
    };

    storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));

    if (!skipBroadcast) {
      broadcastGameState(state, stateJson);
    }

    // Persist to server API for cross-IP multi-device gameplay
    if (typeof fetch !== 'undefined') {
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
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to load active game state from localStorage:', err);
    return null;
  }
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

    const entry = Object.values(tables).find(
      (t) => t.id === idStr || (!isNaN(num) && t.tableNumber === num)
    );
    if (entry && entry.stateJson) {
      const parsed: GameState = JSON.parse(entry.stateJson);
      (parsed as any).tableNumber = entry.tableNumber;
      return parsed;
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
 */
export async function fetchTableFromServer(tableIdentifier: string | number): Promise<GameState | null> {
  try {
    if (typeof fetch === 'undefined') return null;
    const res = await fetch(`/api/tables/${encodeURIComponent(String(tableIdentifier))}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success && data.table) {
      return data.table as GameState;
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
  const { savedAt, ...rest } = state;
  return JSON.stringify(rest);
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

  // Initialize with currently saved state if present
  const initial = loadTable(tableIdentifier);
  if (initial) {
    lastKnownFingerprint = getStateFingerprint(initial);
  }

  // 1. Check server storage immediately on subscribe for fast multi-device join
  fetchTableFromServer(targetIdStr)
    .then((remote) => {
      if (remote) {
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
      const matches =
        data.tableId === targetIdStr ||
        (!isNaN(targetNum) && data.tableNumber === targetNum);
      if (matches && data.stateJson) {
        const parsed: GameState = JSON.parse(data.stateJson);
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
        const latest = loadTable(targetIdStr) || loadActiveGameState();
        if (latest) {
          const currentMatches =
            latest.id === targetIdStr ||
            (!isNaN(targetNum) && (latest as any).tableNumber === targetNum);
          if (currentMatches) {
            const fp = getStateFingerprint(latest);
            if (fp !== lastKnownFingerprint) {
              lastKnownFingerprint = fp;
              callback(latest);
            }
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

  // 3. Periodic fallback poll check (local storage + server-side polling for cross-IP multiplayer)
  const pollInterval = setInterval(async () => {
    try {
      // Check local storage first
      const local = loadTable(targetIdStr);
      if (local) {
        const fp = getStateFingerprint(local);
        if (fp !== lastKnownFingerprint) {
          lastKnownFingerprint = fp;
          callback(local);
          return;
        }
      }

      // Check server storage for updates from other IP addresses
      const remote = await fetchTableFromServer(targetIdStr);
      if (remote) {
        const fp = getStateFingerprint(remote);
        if (fp !== lastKnownFingerprint) {
          lastKnownFingerprint = fp;
          saveGameState(remote, true);
          callback(remote);
        }
      }
    } catch {}
  }, 1000);

  // Return unsubscribe cleanup handler
  return () => {
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    clearInterval(pollInterval);
  };
}

