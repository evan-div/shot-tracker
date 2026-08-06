# Event Production

A mobile-friendly mini project manager for event production, with two tabs:

- **Shot Tracker** — a spreadsheet-style checklist. Each row is an affiliate,
  each column is a required shot type, and each cell records which
  photographer captured it.
- **Reel Ideas** — an editable sheet of reel concepts: name, link, description
  and a 1–5 star rating.

Built with React + TypeScript + Vite and plain CSS. Data lives in Supabase and
is shared across devices in real time; without Supabase credentials the app
falls back to localStorage automatically.

## Running locally

```bash
npm install
cp .env.example .env.local   # optional: add Supabase credentials
npm run dev                  # http://localhost:5173
```

With `.env.local` left blank the app runs entirely on localStorage — useful for
development. Fill it in to share data across devices (see
[Supabase setup](#supabase-setup)).

Other scripts:

```bash
npm test         # vitest (shot tracker + reel ideas)
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

There are two persistence layers behind one interface each, in `src/data/`:

| | Shot tracker | Reel ideas |
|---|---|---|
| Interface | `ShotRepository` | `ReelRepository` |
| Supabase table | `shot_assignments` | `reel_ideas` |
| localStorage key | `shot-tracker:state:v1` | `shot-tracker:reels:v1` |

Which implementation is used is decided once, in
[`src/data/supabase.ts`](src/data/supabase.ts): if `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are both set, the Supabase implementation is exported;
otherwise the localStorage one is. No component or hook knows the difference.

A completed shot is stored as the affiliate id, shot type id, photographer id
and an ISO completion timestamp, keyed by `affiliateId::shotTypeId` (so one
shot type per affiliate can have exactly one photographer). A reel idea is a
row with an id, author, url, description, rating (0 = unrated) and created-at
timestamp.

Writes are optimistic: the UI updates immediately and the write goes out
behind it. Realtime changes from other devices refetch the table and replace
local state. Text cells in the reel sheet keep their draft in local state and
commit on a 600ms debounce (and on blur), so an incoming update can't overwrite
what someone is mid-way through typing.

## Supabase setup

The app works without this, but nothing is shared between devices until you do
it.

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   It creates both tables, enables row-level security, adds the anon-access
   policies, and adds both tables to the realtime publication.
3. In **Project Settings → API**, copy the project URL and the `anon` public
   key.
4. Put them in `.env.local`:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

5. Restart `npm run dev`. The subtitle under the title changes to "Shared with
   your team in real time" when Supabase is active.

### A note on access

There is no login, as requested. The anon key ships in the JavaScript bundle
and the policies allow anonymous read and write, so **anyone who has the site
URL can read and edit the data**. That is fine for a private link shared with
your crew during an event; it is not fine for anything confidential.

If you later want to lock it down, add Supabase Auth (magic link is the least
friction on phones), then change both policies from `to anon` to
`to authenticated`. No application code has to change apart from adding a
sign-in screen.

## Deploying

Any static host works — the build output is plain files in `dist/`.

```bash
npm run build
```

On Vercel, Netlify, or Cloudflare Pages: build command `npm run build`, output
directory `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
environment variables in the host's dashboard. They are baked into the bundle
at build time, so you must redeploy after changing them.

## Mobile notes

The layout is built phone-first:

- Column headings wrap onto two lines so shot columns stay ~90px wide, which
  fits the affiliate column plus roughly three shot columns on a 390px screen.
- The affiliate column is sticky, so it stays visible while scrolling sideways.
- Below 640px the assignment popover becomes a bottom sheet with a backdrop —
  easier to reach one-handed, and it can't land half off-screen next to an edge
  column. The sheet names the cell being edited, since it covers the table.
- Touch targets are at least 48px (52px inside the sheet).
- The Reel Ideas sheet is a table on desktop but becomes one card per idea
  below 700px — typing into a 200px cell you have to scroll sideways to reach
  is miserable on a touch keyboard. Inputs use a 16px font there so iOS Safari
  doesn't zoom on focus.
