import { cellKey, type ShotAssignment, type ShotState } from '../types';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, SHOTS_COLLECTION } from './firebase';

const STORAGE_KEY = 'shot-tracker:state:v1';

/**
 * Persistence for the shot checklist. Two implementations satisfy this:
 * localStorage (single device) and Firestore (shared across devices, with
 * realtime updates). Nothing above this layer knows which one is in use.
 */
export interface ShotRepository {
  list(): Promise<ShotState>;
  assign(assignment: ShotAssignment): Promise<void>;
  clear(affiliateId: string, shotTypeId: string): Promise<void>;
  /** Push updates from other tabs/devices. Returns an unsubscribe function. */
  subscribe(onChange: (state: ShotState) => void): () => void;
}

/**
 * Firestore document id for a cell. One document per affiliate/shot pair
 * makes assigning an idempotent write and clearing a plain delete, with no
 * read-modify-write in between.
 */
function docId(affiliateId: string, shotTypeId: string): string {
  return `${affiliateId}__${shotTypeId}`;
}

function docsToState(docs: { data(): unknown }[]): ShotState {
  const state: ShotState = {};
  for (const d of docs) {
    const a = d.data() as ShotAssignment;
    if (!a?.affiliateId || !a?.shotTypeId) continue;
    state[cellKey(a.affiliateId, a.shotTypeId)] = a;
  }
  return state;
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

class FirestoreShotRepository implements ShotRepository {
  async list(): Promise<ShotState> {
    const snapshot = await getDocs(collection(db!, SHOTS_COLLECTION));
    return docsToState(snapshot.docs);
  }

  async assign(assignment: ShotAssignment): Promise<void> {
    await setDoc(
      doc(db!, SHOTS_COLLECTION, docId(assignment.affiliateId, assignment.shotTypeId)),
      assignment
    );
  }

  async clear(affiliateId: string, shotTypeId: string): Promise<void> {
    await deleteDoc(doc(db!, SHOTS_COLLECTION, docId(affiliateId, shotTypeId)));
  }

  subscribe(onChange: (state: ShotState) => void): () => void {
    // onSnapshot delivers the whole collection on every change, including the
    // first, so there is nothing to merge by hand.
    return onSnapshot(
      collection(db!, SHOTS_COLLECTION),
      (snapshot) => onChange(docsToState(snapshot.docs)),
      () => {}
    );
  }
}

export const shotRepository: ShotRepository = isFirebaseConfigured
  ? new FirestoreShotRepository()
  : new LocalShotRepository();
