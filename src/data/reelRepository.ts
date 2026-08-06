import type { ReelIdea, ReelIdeaPatch } from '../types';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, REELS_COLLECTION } from './firebase';

const STORAGE_KEY = 'shot-tracker:reels:v1';

export interface ReelRepository {
  list(): Promise<ReelIdea[]>;
  create(idea: ReelIdea): Promise<void>;
  update(id: string, patch: ReelIdeaPatch): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(onChange: (ideas: ReelIdea[]) => void): () => void;
}

function docsToIdeas(docs: { id: string; data(): unknown }[]): ReelIdea[] {
  return docs
    .map((d) => {
      const v = d.data() as Partial<ReelIdea>;
      return {
        id: d.id,
        author: v.author ?? '',
        url: v.url ?? '',
        description: v.description ?? '',
        rating: v.rating ?? 0,
        createdAt: v.createdAt ?? '',
      };
    })
    .sort(byCreatedAt);
}

/** Oldest first, so rows don't jump around while people are typing. */
function byCreatedAt(a: ReelIdea, b: ReelIdea): number {
  return a.createdAt.localeCompare(b.createdAt);
}

class LocalReelRepository implements ReelRepository {
  private read(): ReelIdea[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ReelIdea[]) : [];
    } catch {
      return [];
    }
  }

  private write(ideas: ReelIdea[]): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
    } catch {
      // see LocalShotRepository.write
    }
  }

  async list(): Promise<ReelIdea[]> {
    return this.read().sort(byCreatedAt);
  }

  async create(idea: ReelIdea): Promise<void> {
    this.write([...this.read(), idea]);
  }

  async update(id: string, patch: ReelIdeaPatch): Promise<void> {
    this.write(this.read().map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((i) => i.id !== id));
  }

  subscribe(onChange: (ideas: ReelIdea[]) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        onChange(event.newValue ? (JSON.parse(event.newValue) as ReelIdea[]).sort(byCreatedAt) : []);
      } catch {
        // ignore malformed payloads
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

class FirestoreReelRepository implements ReelRepository {
  async list(): Promise<ReelIdea[]> {
    const snapshot = await getDocs(collection(db!, REELS_COLLECTION));
    return docsToIdeas(snapshot.docs);
  }

  async create(idea: ReelIdea): Promise<void> {
    const { id, ...fields } = idea;
    await setDoc(doc(db!, REELS_COLLECTION, id), fields);
  }

  async update(id: string, patch: ReelIdeaPatch): Promise<void> {
    await updateDoc(doc(db!, REELS_COLLECTION, id), { ...patch });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db!, REELS_COLLECTION, id));
  }

  subscribe(onChange: (ideas: ReelIdea[]) => void): () => void {
    // Sorting client-side in docsToIdeas keeps this free of a composite index.
    return onSnapshot(
      collection(db!, REELS_COLLECTION),
      (snapshot) => onChange(docsToIdeas(snapshot.docs)),
      () => {}
    );
  }
}

export const reelRepository: ReelRepository = isFirebaseConfigured
  ? new FirestoreReelRepository()
  : new LocalReelRepository();
