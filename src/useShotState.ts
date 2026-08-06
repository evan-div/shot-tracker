import { useCallback, useEffect, useState } from 'react';
import { shotStore } from './storage';
import { cellKey, type ShotState } from './types';

export function useShotState() {
  const [state, setState] = useState<ShotState>(() => shotStore.load());

  useEffect(() => {
    return shotStore.subscribe(setState);
  }, []);

  const assignShot = useCallback(
    (affiliateId: string, shotTypeId: string, photographerId: string) => {
      setState((prev) => {
        const next: ShotState = {
          ...prev,
          [cellKey(affiliateId, shotTypeId)]: {
            affiliateId,
            shotTypeId,
            photographerId,
            completedAt: new Date().toISOString(),
          },
        };
        shotStore.save(next);
        return next;
      });
    },
    []
  );

  const clearShot = useCallback((affiliateId: string, shotTypeId: string) => {
    setState((prev) => {
      const next = { ...prev };
      delete next[cellKey(affiliateId, shotTypeId)];
      shotStore.save(next);
      return next;
    });
  }, []);

  return { state, assignShot, clearShot };
}
