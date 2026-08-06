import type { ReelIdea, ReelIdeaPatch } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'shot-tracker:reels:v1';
const TABLE = 'reel_ideas';

export interface ReelRepository {
  list(): Promise<ReelIdea[]>;
  create(idea: ReelIdea): Promise<void>;
  update(id: string, patch: ReelIdeaPatch): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(onChange: (ideas: ReelIdea[]) => void): () => void;
}

interface ReelRow {
  id: string;
  author: string;
  url: string;
  description: string;
  rating: number;
  created_at: string;
}

function rowToIdea(row: ReelRow): ReelIdea {
  return {
    id: row.id,
    author: row.author ?? '',
    url: row.url ?? '',
    description: row.description ?? '',
    rating: row.rating ?? 0,
    createdAt: row.created_at,
  };
}

function patchToRow(patch: ReelIdeaPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.author !== undefined) row.author = patch.author;
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.rating !== undefined) row.rating = patch.rating;
  return row;
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

class SupabaseReelRepository implements ReelRepository {
  async list(): Promise<ReelIdea[]> {
    const { data, error } = await supabase!
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ReelRow[]).map(rowToIdea);
  }

  async create(idea: ReelIdea): Promise<void> {
    const { error } = await supabase!.from(TABLE).insert({
      id: idea.id,
      author: idea.author,
      url: idea.url,
      description: idea.description,
      rating: idea.rating,
      created_at: idea.createdAt,
    });
    if (error) throw error;
  }

  async update(id: string, patch: ReelIdeaPatch): Promise<void> {
    const { error } = await supabase!.from(TABLE).update(patchToRow(patch)).eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase!.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }

  subscribe(onChange: (ideas: ReelIdea[]) => void): () => void {
    const channel = supabase!
      .channel('reel_ideas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        void this.list().then(onChange).catch(() => {});
      })
      .subscribe();

    return () => {
      void supabase!.removeChannel(channel);
    };
  }
}

export const reelRepository: ReelRepository = isSupabaseConfigured
  ? new SupabaseReelRepository()
  : new LocalReelRepository();
