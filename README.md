# Event Shot Tracker

A mobile-friendly, spreadsheet-style checklist for tracking event photography
coverage. Each row is an affiliate, each column is a required shot type, and
each cell records which photographer captured it.

Built with React + TypeScript + Vite and plain CSS — no UI framework, no
runtime dependencies beyond React.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm test         # vitest (assign / change / clear / save / restore)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
npm run lint
```

## Editing the checklist

Affiliates, shot types, and photographers live in plain arrays in
[`src/config.ts`](src/config.ts). Add, remove, or rename entries there — the
table, progress summary, and popover all derive from those arrays.

Note that a cell's saved state is keyed by `affiliateId::shotTypeId`, so
changing an existing `id` orphans any progress already recorded against it.
Changing a `name` is always safe.

## How data is stored

State is a flat map keyed by `` `${affiliateId}::${shotTypeId}` ``. Each
completed cell is stored as:

```ts
{
  affiliateId: 'amy-porterfield',
  shotTypeId: 'reveal-reaction',
  photographerId: 'evan',
  completedAt: '2026-08-06T14:12:25.000Z'
}
```

Cells with no entry are incomplete. The whole map is serialized to
`localStorage` under the key `shot-tracker:state:v1` on every change, so a
refresh restores progress.

Persistence is isolated behind the `ShotStore` interface in
[`src/storage.ts`](src/storage.ts):

```ts
interface ShotStore {
  load(): ShotState;
  save(state: ShotState): void;
  subscribe(callback: (state: ShotState) => void): () => void;
}
```

`useShotState` only talks to that interface, so components never touch storage
directly.

## Deploying

The build is fully static:

```bash
npm run build   # outputs dist/
```

Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, S3, Cloudflare
Pages). No server, environment variables, or authentication are required.

If deploying under a sub-path (e.g. GitHub Pages project sites), set `base` in
`vite.config.ts`.

## Enabling shared, real-time state

Today, `subscribe` uses the browser `storage` event, so two tabs in the *same*
browser stay in sync — but different devices do not share state.

To make it shared, implement `ShotStore` against a backend and swap the export
at the bottom of `src/storage.ts`. No component changes are needed. For
example, with Supabase:

1. Create a `shots` table with columns `affiliate_id`, `shot_type_id`,
   `photographer_id`, `completed_at`, and a composite primary key on
   (`affiliate_id`, `shot_type_id`).
2. `load()` selects all rows and folds them into a `ShotState`.
3. `save()` upserts changed rows / deletes cleared ones. (Consider changing the
   interface to per-cell `set`/`remove` methods rather than whole-state saves —
   the hook is small and easy to adapt.)
4. `subscribe()` opens a Realtime channel on the table and calls back with the
   updated state.
5. Enable row-level security appropriate for your team, or keep the table
   restricted to an anon key behind a private URL if no auth is wanted.

Firebase Realtime Database / Firestore work the same way: one document per cell
or a single document holding the map, with `onSnapshot` driving `subscribe`.
