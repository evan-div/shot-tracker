export interface ShotAssignment {
  affiliateId: string;
  shotTypeId: string;
  photographerId: string;
  completedAt: string; // ISO timestamp
}

/** Keyed by `${affiliateId}::${shotTypeId}` for O(1) lookup. */
export type ShotState = Record<string, ShotAssignment>;

export function cellKey(affiliateId: string, shotTypeId: string): string {
  return `${affiliateId}::${shotTypeId}`;
}
