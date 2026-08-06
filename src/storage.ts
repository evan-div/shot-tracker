import type { ShotState } from './types';

const STORAGE_KEY = 'shot-tracker:state:v1';

/**
 * Persistence layer, isolated behind a small interface so localStorage can
 * later be swapped for a real backend (e.g. a REST API or a realtime
 * database) without touching any component code — just implement the same
 * interface and swap the export below.
 */
export interface ShotStore {
  load(): ShotState;
  save(state: ShotState): void;
  /**
   * Subscribe to state changes made in other tabs/devices (if supported).
   * Returns an unsubscribe function. LocalStorage only supports cross-tab
   * sync on the same browser; a real backend implementation could push
   * updates from other devices here.
   */
  subscribe(callback: (state: ShotState) => void): () => void;
}

class LocalStorageShotStore implements ShotStore {
  load(): ShotState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as ShotState;
    } catch {
      return {};
    }
  }

  save(state: ShotState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private browsing, quota exceeded, etc).
      // Fail silently — in-memory state still works for the current session.
    }
  }

  subscribe(callback: (state: ShotState) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        callback(event.newValue ? (JSON.parse(event.newValue) as ShotState) : {});
      } catch {
        // ignore malformed payloads from other tabs
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

export const shotStore: ShotStore = new LocalStorageShotStore();
