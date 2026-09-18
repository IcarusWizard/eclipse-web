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

/**
 * Persists current GameState to localStorage.
 */
export function saveGameState(state: GameState): void {
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
  } catch (err) {
    console.error('Failed to save game state to localStorage:', err);
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
        const tableNum = parseInt(tableParam, 10);
        if (!isNaN(tableNum)) {
          const fromTable = loadTableByNumber(tableNum);
          if (fromTable) return fromTable;
        }
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
 * Retrieves a saved table by its 3-digit table number.
 */
export function loadTableByNumber(tableNumber: number): GameState | null {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    if (!raw) return null;
    const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
    const entry = Object.values(tables).find((t) => t.tableNumber === tableNumber);
    if (entry && entry.stateJson) {
      const parsed: GameState = JSON.parse(entry.stateJson);
      (parsed as any).tableNumber = entry.tableNumber;
      return parsed;
    }
    return null;
  } catch (err) {
    console.error(`Failed to load table #${tableNumber}:`, err);
    return null;
  }
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
 * Removes a table from localStorage.
 */
export function deleteSavedTable(tableId: string): void {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SAVED_TABLES_KEY);
    if (!raw) return;
    const tables: Record<string, SavedTableSummary> = JSON.parse(raw);
    delete tables[tableId];
    storage.setItem(SAVED_TABLES_KEY, JSON.stringify(tables));
  } catch (err) {
    console.error('Failed to delete saved table:', err);
  }
}
