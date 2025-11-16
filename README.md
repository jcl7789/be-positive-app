# Be Positive — Daily Positive Phrases

Be Positive is a small Next.js app that serves a daily dose of short, positive phrases. It demonstrates a simple full-stack flow using the Next.js App Router, a lightweight client component for fetching phrases, and a Postgres backing store (designed for Vercel Postgres).

## What this project does

- Serves a single-page UI that displays one positive phrase at a time.
- Provides an API endpoint that returns one phrase and rotates it by updating its last-used timestamp so phrases are reused in a round-robin fashion.
- Exposes a cron-style API route to seed or generate phrases (intended to be called by a scheduled job on the platform).

## Tech stack

- Next.js (App Router)
- React (client components)
- PostgreSQL (Vercel Postgres recommended)
- TypeScript
- Tailwind CSS (styles included via `globals.css`)

## Important files

- `src/components/PhraseDisplay.tsx` — Client component that fetches and displays phrases.
- `src/app/api/phrases/route.ts` — BFF endpoint that selects one phrase and updates its `fecha_ultimo_uso` to rotate phrases.
- `src/app/api/cron/phrase-gen/route.ts` — Route used to generate/seed phrases (for scheduled invocation).
- `src/lib/db.ts` — Database connection helper (Postgres client).
- `src/lib/types.ts` — Shared API types.

## Local development

1. Install dependencies:

   npm install

2. Add environment variables (example):

   - `DATABASE_URL` — Postgres connection string (Vercel Postgres connection recommended).

3. Run the dev server:

   npm run dev

Open http://localhost:3000 to view the app.

## Deployment

This project is ready to deploy to Vercel. If using Vercel Postgres, add the `DATABASE_URL` secret and configure a scheduled invocation (cron) to call the phrase generation route periodically if you want automatic seeding.

## Contributing

Contributions and improvements are welcome. Please open issues or pull requests.

---

Created with Next.js. See the source files in `src/` for implementation details.
