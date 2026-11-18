import type { GameState } from '../types/state.ts';

export interface AppVersionInfo {
  version: string;
  entryScript?: string | null;
  mode?: 'preview' | 'dev';
}

const RELOADED_VERSION_STORAGE_KEY = 'eclipse_auto_reloaded_version';

/**
 * Extracts the hashed main module script pathname from built HTML (`dist/index.html`).
 */
export function extractEntryScriptFromHtml(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<script[^>]+src=["']([^"']*\/assets\/index-[^"']+\.js)["']/i);
  if (!match || !match[1]) return null;
  try {
    return match[1].startsWith('http') ? new URL(match[1]).pathname : match[1];
  } catch {
    return match[1];
  }
}

/**
 * Reads the currently loaded production entry bundle path from DOM <script> tags.
 * Returns null in Vite dev mode (`/src/main.tsx`).
 */
export function getLoadedEntryScriptFromDom(doc?: Document | null): string | null {
  if (!doc || typeof doc.querySelectorAll !== 'function') return null;
  const scripts = doc.querySelectorAll('script[src]');
  for (const el of Array.from(scripts)) {
    const rawSrc = el.getAttribute('src') || '';
    if (rawSrc.includes('/assets/index-') && rawSrc.endsWith('.js')) {
      try {
        return rawSrc.startsWith('http') ? new URL(rawSrc).pathname : rawSrc;
      } catch {
        return rawSrc;
      }
    }
  }
  return null;
}

/**
 * Compares the browser tab's loaded bundle / initial boot version against `/api/version`.
 */
export function isClientOutdated(
  loaded: { bootVersion?: string | null; loadedEntryScript?: string | null },
  serverInfo: { version?: string | null; entryScript?: string | null }
): boolean {
  if (
    loaded.loadedEntryScript &&
    serverInfo.entryScript &&
    loaded.loadedEntryScript !== serverInfo.entryScript
  ) {
    return true;
  }
  if (loaded.bootVersion && serverInfo.version && loaded.bootVersion !== serverInfo.version) {
    return true;
  }
  return false;
}

/**
 * Determines whether the client can safely auto-reload right now without interrupting
 * an active mid-action flow or triggering a reload loop.
 */
export function canPerformSafeAutoReload(
  state: GameState | null | undefined,
  targetVersion: string,
  alreadyReloadedVersion?: string | null,
  uiBusy: boolean = false
): boolean {
  if (!targetVersion) return false;
  if (alreadyReloadedVersion && alreadyReloadedVersion === targetVersion) {
    return false;
  }
  if (uiBusy) return false;
  if (!state) return true;

  if (
    state.pendingExplore ||
    state.pendingDiscovery ||
    state.pendingExploreControl ||
    state.pendingCombatConquest ||
    state.pendingArtifactReward ||
    state.pendingReputationDraw ||
    state.pendingDiplomacyProposal ||
    state.pendingActionConfirmation
  ) {
    return false;
  }
  return true;
}

/**
 * Builds a cache-busting reload URL that preserves all existing query params (`?table=...&seat=...`).
 */
export function buildCacheBustedReloadUrl(currentHref: string, targetVersion: string): string {
  try {
    const url = new URL(currentHref);
    url.searchParams.set('_v', targetVersion);
    return url.toString();
  } catch {
    return currentHref;
  }
}

export function getAutoReloadedVersion(): string | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(RELOADED_VERSION_STORAGE_KEY);
    }
  } catch {}
  return null;
}

export function markAutoReloadedVersion(version: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage && version) {
      window.sessionStorage.setItem(RELOADED_VERSION_STORAGE_KEY, version);
    }
  } catch {}
}
