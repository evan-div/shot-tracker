/**
 * Exercises the real Firestore repository implementations — and the rules in
 * firestore.rules — against the local emulator.
 *
 *   npx firebase emulators:start --only firestore --project demo-shot-tracker
 *   npm run test:integration
 *
 * Skipped automatically when the emulator isn't running, so `npm test` stays
 * green without it.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReelRepository } from '../data/reelRepository';
import type { ShotRepository } from '../data/shotRepository';

const HOST = '127.0.0.1:8080';
const PROJECT = 'demo-shot-tracker';
const CLEAR_URL = `http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`;

async function emulatorRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://${HOST}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

const running = await emulatorRunning();

describe.skipIf(!running)('Firestore repositories (emulator)', () => {
  let shots: ShotRepository;
  let reels: ReelRepository;

  beforeAll(async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'demo-key');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', PROJECT);
    vi.stubEnv('VITE_FIREBASE_EMULATOR_HOST', HOST);

    // Imported after the env is stubbed, since the repositories pick their
    // implementation at module load.
    shots = (await import('../data/shotRepository')).shotRepository;
    reels = (await import('../data/reelRepository')).reelRepository;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await fetch(CLEAR_URL, { method: 'DELETE' });
  });

  it('assigns, changes and clears a shot', async () => {
    expect(await shots.list()).toEqual({});

    await shots.assign({
      affiliateId: 'amy-porterfield',
      shotTypeId: 'reveal-reaction',
      photographerId: 'evan',
      completedAt: new Date().toISOString(),
    });

    let state = await shots.list();
    expect(state['amy-porterfield::reveal-reaction']).toMatchObject({
      affiliateId: 'amy-porterfield',
      photographerId: 'evan',
    });

    await shots.assign({
      affiliateId: 'amy-porterfield',
      shotTypeId: 'reveal-reaction',
      photographerId: 'fran',
      completedAt: new Date().toISOString(),
    });

    state = await shots.list();
    expect(Object.keys(state)).toHaveLength(1); // reassigning replaces, not duplicates
    expect(state['amy-porterfield::reveal-reaction'].photographerId).toBe('fran');

    await shots.clear('amy-porterfield', 'reveal-reaction');
    expect(await shots.list()).toEqual({});
  });

  it('pushes shot changes to subscribers in real time', async () => {
    const seen: number[] = [];
    const unsubscribe = shots.subscribe((state) => seen.push(Object.keys(state).length));

    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(0));

    await shots.assign({
      affiliateId: 'jenna-kutcher',
      shotTypeId: 'testimonial',
      photographerId: 'serrano',
      completedAt: new Date().toISOString(),
    });

    await vi.waitFor(() => expect(seen.at(-1)).toBe(1));

    await shots.clear('jenna-kutcher', 'testimonial');
    await vi.waitFor(() => expect(seen.at(-1)).toBe(0));

    unsubscribe();
  });

  it('creates, updates and removes a reel idea', async () => {
    const idea = {
      id: 'idea-1',
      author: 'Evan',
      url: 'https://example.com/reel',
      description: 'Backstage b-roll',
      rating: 0,
      createdAt: new Date().toISOString(),
    };

    await reels.create(idea);
    expect(await reels.list()).toEqual([idea]);

    await reels.update('idea-1', { rating: 4, description: 'Backstage b-roll, faster cut' });
    const [updated] = await reels.list();
    expect(updated).toMatchObject({
      id: 'idea-1',
      rating: 4,
      description: 'Backstage b-roll, faster cut',
      author: 'Evan', // untouched fields survive a partial update
    });

    await reels.remove('idea-1');
    expect(await reels.list()).toEqual([]);
  });

  it('returns reel ideas oldest first', async () => {
    const base = {
      author: '',
      url: '',
      description: '',
      rating: 0,
    };
    await reels.create({ ...base, id: 'b', createdAt: '2026-01-02T00:00:00.000Z' });
    await reels.create({ ...base, id: 'a', createdAt: '2026-01-01T00:00:00.000Z' });

    expect((await reels.list()).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('rejects writes that violate the security rules', async () => {
    // rating must be an integer 0-5
    await expect(
      reels.create({
        id: 'bad-rating',
        author: 'Evan',
        url: '',
        description: '',
        rating: 9,
        createdAt: new Date().toISOString(),
      })
    ).rejects.toThrow(/PERMISSION_DENIED/i);

    await reels.create({
      id: 'ok',
      author: 'Evan',
      url: '',
      description: '',
      rating: 3,
      createdAt: new Date().toISOString(),
    });

    // unexpected fields are refused
    await expect(reels.update('ok', { sneaky: true } as never)).rejects.toThrow(
      /PERMISSION_DENIED/i
    );
  });
});
