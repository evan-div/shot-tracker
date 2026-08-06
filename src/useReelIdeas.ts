import { useCallback, useEffect, useState } from 'react';
import { reelRepository } from './data/reelRepository';
import type { ReelIdea, ReelIdeaPatch } from './types';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `reel-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useReelIdeas() {
  const [ideas, setIdeas] = useState<ReelIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    reelRepository
      .list()
      .then((loaded) => {
        if (active) setIdeas(loaded);
      })
      .catch(() => {
        if (active) setError('Could not load reel ideas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = reelRepository.subscribe((next) => {
      if (active) setIdeas(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const addIdea = useCallback(() => {
    const idea: ReelIdea = {
      id: newId(),
      author: '',
      url: '',
      description: '',
      rating: 0,
      createdAt: new Date().toISOString(),
    };
    setIdeas((prev) => [...prev, idea]);
    reelRepository.create(idea).catch(() => setError('Could not add that row.'));
    return idea.id;
  }, []);

  const updateIdea = useCallback((id: string, patch: ReelIdeaPatch) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    reelRepository.update(id, patch).catch(() => setError('Could not save that change.'));
  }, []);

  const removeIdea = useCallback((id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    reelRepository.remove(id).catch(() => setError('Could not delete that row.'));
  }, []);

  return { ideas, loading, error, addIdea, updateIdea, removeIdea };
}
