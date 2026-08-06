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

export interface ReelIdea {
  id: string;
  author: string;
  url: string;
  description: string;
  /** 0 means unrated; otherwise 1-5. */
  rating: number;
  createdAt: string;
}

/** Fields a user can edit inline in the Reel Ideas sheet. */
export type ReelIdeaPatch = Partial<Pick<ReelIdea, 'author' | 'url' | 'description' | 'rating'>>;
