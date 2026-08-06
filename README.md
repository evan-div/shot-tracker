# Event Production

A mobile-friendly mini project manager for event production, with two tabs:

- **Shot Tracker** — a spreadsheet-style checklist. Each row is an affiliate,
  each column is a required shot type, and each cell records which
  photographer captured it.
- **Reel Ideas** — an editable sheet of reel concepts: name, link, description
  and a 1–5 star rating.

Built with React + TypeScript + Vite and plain CSS. Data lives in Cloud
Firestore and is shared across devices in real time; without Firebase
credentials the app falls back to localStorage automatically.

## Running locally

```bash
npm install
cp .env.example .env.local   # optional: add Firebase credentials
npm run dev                  # http://localhost:5173
```

With `.env.local` left blank the app runs entirely on localStorage — useful for
development. Fill it in to share data across devices (see
[Firebase setup](#firebase-setup)).

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

The app works without this, but nothing is shared between devices until you do
it.

1. In the [Firebase console](https://console.firebase.google.com), open your
   project and create a **Cloud Firestore** database (production mode is fine —
   the rules below replace the defaults).
2. Register a **Web app** under Project settings → General → Your apps, and
   copy the config values it shows you.
3. Put them in `.env.local`:

   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
   VITE_FIREBASE_APP_ID=1:000000000000:web:abc123
   ```

4. Publish the security rules in [`firestore.rules`](firestore.rules) — either
   paste them into the Rules tab in the console, or run
   `firebase deploy --only firestore:rules` if you use the CLI.
5. Restart `npm run dev`. The subtitle under the title changes to "Shared with
   your team in real time" when Firebase is active.

No collections need creating by hand; they appear on first write.

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

Any static host works — the build output is plain files in `dist/`.

```bash
npm run build
```

On Firebase Hosting: `firebase init hosting` with `dist` as the public
directory and single-page-app rewrites on, then `firebase deploy`. Vercel,
Netlify, and Cloudflare Pages work equally well with build command
`npm run build` and output directory `dist`.

Wherever you deploy, set the six `VITE_FIREBASE_*` values as environment
variables in the host's dashboard. Vite bakes them into the bundle at build
time, so you must redeploy after changing them.

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
