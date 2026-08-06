# Event Production

A mobile-friendly mini project manager for event production, with two tabs:

- **Shot Tracker** — a spreadsheet-style checklist. Each row is an affiliate,
  each column is a required shot type, and each cell records which
  photographer captured it.
- **Reel Ideas** — reel concepts as cards: who suggested it, the description as
  a pull quote, a 1–5 star rating, and a button through to the reel. A new card
  opens in edit mode and becomes a card once you hit Done.

Built with React + TypeScript + Vite and plain CSS. Data lives in Cloud
Firestore and is shared across devices in real time; without Firebase
credentials the app falls back to localStorage automatically.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run dev` uses localStorage by default, which is usually what you want while
developing. To run against the live Firestore data, copy the values from
[`.env.production`](.env.production) into `.env.local`.

Other scripts:

```bash
npm test              # vitest (shot tracker + reel ideas, localStorage)
npm run test:integration  # repositories + firestore.rules against the emulator
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
| Firestore collection | `shot_assignments` | `reel_ideas` |
| localStorage key | `shot-tracker:state:v1` | `shot-tracker:reels:v1` |

Which implementation is used is decided once, in
[`src/data/firebase.ts`](src/data/firebase.ts): if `VITE_FIREBASE_API_KEY` and
`VITE_FIREBASE_PROJECT_ID` are both set, the Firestore implementation is
exported; otherwise the localStorage one is. No component or hook knows the
difference.

A completed shot is one document per affiliate/shot pair, with id
`affiliateId__shotTypeId`, holding the affiliate id, shot type id,
photographer id and an ISO completion timestamp. That shape makes assigning an
idempotent `setDoc` and clearing a plain `deleteDoc`, with no read-modify-write
in between — two people tapping the same cell can't corrupt it, the later write
just wins. A reel idea is one document holding author, url, description,
rating (0 = unrated) and created-at.

Realtime comes from `onSnapshot`, which delivers the whole collection on every
change including the first, so there is nothing to merge by hand. Writes are
optimistic: the UI updates immediately and the write goes out behind it. Text
cells in the reel sheet keep their draft in local state and commit on a 600ms
debounce (and on blur), so an incoming update can't overwrite what someone is
mid-way through typing.

## Firebase setup

Already done for `shot-tracker-30ab7`: the Firestore database exists, the rules
in [`firestore.rules`](firestore.rules) are published, and the web config is
committed in [`.env.production`](.env.production). Nothing to do.

To point the app at a **different** Firebase project:

1. In the [Firebase console](https://console.firebase.google.com), create a
   **Cloud Firestore** database (production mode is fine — the rules replace
   the defaults).
2. Register a **Web app** under Project settings → General → Your apps and copy
   the config values.
3. Put them in `.env.production`, and update the project id in
   [`.firebaserc`](.firebaserc), [`firebase.json`](firebase.json)'s deploy
   targets, and the workflows in `.github/workflows/`.
4. Publish [`firestore.rules`](firestore.rules) — paste them into the Rules tab
   in the console, or run `npm run deploy:rules`.

No collections need creating by hand; they appear on first write. The subtitle
under the title reads "Shared with your team in real time" when Firebase is
active, and "Saved on this device" when it isn't.

### Testing against the emulator

`npm run test:integration` starts the Firestore emulator, runs the real
repository implementations against it, and checks that `firestore.rules`
rejects malformed writes. It needs Java installed (the emulator is a JVM
process). The default `npm test` skips these automatically when no emulator is
running.

### A note on access

There is no login, as requested. The Firebase web API key ships in the
JavaScript bundle and the rules allow anonymous read and write, so **anyone who
has the site URL can read and edit the data**. That is fine for a private link
shared with your crew during an event; it is not fine for anything
confidential. (The API key is not a secret — it identifies the project, it
doesn't authorise anything. The rules are what control access.)

The rules do constrain *shape*: only the expected fields, and ratings must be
integers 0–5. That stops a stray client from writing junk, but it does not stop
anyone from editing your data.

If you later want to lock it down, add Firebase Auth (email link is the least
friction on phones), then change the rule conditions to require
`request.auth != null`. No application code has to change apart from adding a
sign-in screen.

## Deploying

Pushing to `main` deploys automatically via GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). The workflow
type-checks, lints, tests, builds, verifies the Firebase config actually made
it into the bundle, and then deploys to
`https://shot-tracker-30ab7.web.app`.

Pull requests get a temporary preview URL posted as a comment
([`.github/workflows/preview.yml`](.github/workflows/preview.yml)). Preview
channels share the same Firestore data as production, so edits made in a
preview are real edits to the live checklist.

### One-time setup

The workflows need a service account secret. From a machine with the Firebase
CLI:

```bash
firebase init hosting:github
```

Pick this repo when prompted. It creates a service account scoped to this
project and stores it as the GitHub secret
`FIREBASE_SERVICE_ACCOUNT_SHOT_TRACKER_30AB7`. **Delete the two workflow files
it generates** (`firebase-hosting-merge.yml`, `firebase-hosting-pull-request.yml`)
— the ones already in this repo replace them and do more.

### Deploying by hand

```bash
npm run deploy         # build + deploy hosting
npm run deploy:rules   # security rules, deployed separately on purpose
```

Rules deploy separately so shipping the app can never silently change who can
read your data.

### About the config in `.env.production`

The Firebase web config is committed in
[`.env.production`](.env.production) rather than kept in secrets. Those values
are not secret — Vite bakes them into the bundle, so they are public on any
deployed build, and Google documents the web config as public. What protects
your data is `firestore.rules`.

Keeping them in the repo means CI builds a correctly configured bundle with one
secret instead of seven. The failure it avoids is a nasty one: a bundle built
without the config still works, silently falling back to localStorage, and you
only find out when two phones disagree mid-event. The workflow greps the built
bundle for the project id and fails the deploy if it is missing.

Caching is set so `/assets/**` (hashed filenames) is cached for a year while
`index.html` is never cached — push a fix mid-event and phones pick it up on
the next reload.

Any other static host works too: build command `npm run build`, output
directory `dist`.

## Mobile notes

The layout is built phone-first:

- Column headings wrap onto two lines so shot columns stay ~90px wide, which
  fits the affiliate column plus roughly three shot columns on a 390px screen.
- The affiliate column is sticky, so it stays visible while scrolling sideways.
- Below 640px the assignment popover becomes a bottom sheet with a backdrop —
  easier to reach one-handed, and it can't land half off-screen next to an edge
  column. The sheet names the cell being edited, since it covers the table.
- Touch targets are at least 48px (52px inside the sheet).
- Reel ideas render as cards, one per idea, in a grid that collapses to a
  single column below 700px. Editing happens in the card itself; inputs use a
  16px font on mobile so iOS Safari doesn't zoom on focus.
