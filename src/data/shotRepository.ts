import { cellKey, type ShotAssignment, type ShotState } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'shot-tracker:state:v1';
const TABLE = 'shot_assignments';

/**
 * Persistence for the shot checklist. Two implementations satisfy this:
 * localStorage (single device) and Supabase (shared across devices, with
 * realtime updates). Nothing above this layer knows which one is in use.
 */
export interface ShotRepository {
  list(): Promise<ShotState>;
  assign(assignment: ShotAssignment): Promise<void>;
  clear(affiliateId: string, shotTypeId: string): Promise<void>;
  /** Push updates from other tabs/devices. Returns an unsubscribe function. */
  subscribe(onChange: (state: ShotState) => void): () => void;
}

interface ShotRow {
  affiliate_id: string;
  shot_type_id: string;
  photographer_id: string;
  completed_at: string;
}

function rowToAssignment(row: ShotRow): ShotAssignment {
  return {
    affiliateId: row.affiliate_id,
    shotTypeId: row.shot_type_id,
    photographerId: row.photographer_id,
    completedAt: row.completed_at,
  };
}

class LocalShotRepository implements ShotRepository {
  private read(): ShotState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ShotState) : {};
    } catch {
      return {};
    }
  }

  private write(state: ShotState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private browsing, quota). In-memory state
      // still works for this session.
    }
  }

  async list(): Promise<ShotState> {
    return this.read();
  }

  async assign(assignment: ShotAssignment): Promise<void> {
    const next = { ...this.read() };
    next[cellKey(assignment.affiliateId, assignment.shotTypeId)] = assignment;
    this.write(next);
  }

  async clear(affiliateId: string, shotTypeId: string): Promise<void> {
    const next = { ...this.read() };
    delete next[cellKey(affiliateId, shotTypeId)];
    this.write(next);
  }

  subscribe(onChange: (state: ShotState) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        onChange(event.newValue ? (JSON.parse(event.newValue) as ShotState) : {});
      } catch {
        // ignore malformed payloads from other tabs
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

class SupabaseShotRepository implements ShotRepository {
  async list(): Promise<ShotState> {
    const { data, error } = await supabase!.from(TABLE).select('*');
    if (error) throw error;
    const state: ShotState = {};
    for (const row of (data ?? []) as ShotRow[]) {
      state[cellKey(row.affiliate_id, row.shot_type_id)] = rowToAssignment(row);
    }
    return state;
  }

  async assign(assignment: ShotAssignment): Promise<void> {
    const { error } = await supabase!.from(TABLE).upsert(
      {
        affiliate_id: assignment.affiliateId,
        shot_type_id: assignment.shotTypeId,
        photographer_id: assignment.photographerId,
        completed_at: assignment.completedAt,
      },
      { onConflict: 'affiliate_id,shot_type_id' }
    );
    if (error) throw error;
  }

  async clear(affiliateId: string, shotTypeId: string): Promise<void> {
    const { error } = await supabase!
      .from(TABLE)
      .delete()
      .eq('affiliate_id', affiliateId)
      .eq('shot_type_id', shotTypeId);
    if (error) throw error;
  }

  subscribe(onChange: (state: ShotState) => void): () => void {
    // Any change refetches the whole table. It is at most a few hundred rows,
    // and it keeps every device converging on the same state without having to
    // merge individual insert/update/delete payloads by hand.
    const channel = supabase!
      .channel('shot_assignments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        void this.list().then(onChange).catch(() => {});
      })
      .subscribe();

    return () => {
      void supabase!.removeChannel(channel);
    };
  }
}

export const shotRepository: ShotRepository = isSupabaseConfigured
  ? new SupabaseShotRepository()
  : new LocalShotRepository();
