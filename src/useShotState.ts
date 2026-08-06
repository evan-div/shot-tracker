import { useCallback, useEffect, useState } from 'react';
import { shotRepository } from './data/shotRepository';
import { cellKey, type ShotState } from './types';

export function useShotState() {
  const [state, setState] = useState<ShotState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    shotRepository
      .list()
      .then((loaded) => {
        if (active) setState(loaded);
      })
      .catch(() => {
        if (active) setError('Could not load the checklist.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = shotRepository.subscribe((next) => {
      if (active) setState(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const assignShot = useCallback(
    (affiliateId: string, shotTypeId: string, photographerId: string) => {
      const assignment = {
        affiliateId,
        shotTypeId,
        photographerId,
        completedAt: new Date().toISOString(),
      };
      // Optimistic: the cell updates instantly, then the write goes out. A
      // realtime echo (or the next load) reconciles if the write failed.
      setState((prev) => ({ ...prev, [cellKey(affiliateId, shotTypeId)]: assignment }));
      shotRepository.assign(assignment).catch(() => setError('Could not save that shot.'));
    },
    []
  );

  const clearShot = useCallback((affiliateId: string, shotTypeId: string) => {
    setState((prev) => {
      const next = { ...prev };
      delete next[cellKey(affiliateId, shotTypeId)];
      return next;
    });
    shotRepository
      .clear(affiliateId, shotTypeId)
      .catch(() => setError('Could not clear that shot.'));
  }, []);

  return { state, loading, error, assignShot, clearShot };
}
