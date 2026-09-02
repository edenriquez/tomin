# Tomin landing

Standalone marketing site for Tomin. Next.js 14 + Tailwind 3, no backend, no
Supabase. Deployed on Vercel as its own project with **Root Directory =
`landing`**.

The design is "Señal oscura": a Night ground, a drifting cyan mesh in the
hero, and the product as six drawn readings in a bento grid. `/b` and `/d`
(the two drafts compared before choosing) redirect to `/`.

## Run

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_APP_URL = where "Comenzar" sends people
npm run dev                        # http://localhost:3001
npm run build && npm run lint
```

## Design tokens

`src/design/tokens.ts` is a verbatim copy of `frontend/src/design/tokens.ts`.
Refresh it with `npm run tokens:sync`. Dark-surface additions live in
`src/design/dark.ts` and are never merged back.

## Vercel

1. Add New → Project → repo `edenriquez/tomin`.
2. Root Directory: `landing`. Framework: Next.js (auto).
3. Environment variables: `NEXT_PUBLIC_APP_URL` (the deployed app). Optional
   `NEXT_PUBLIC_SITE_URL` for a custom domain; otherwise
   `VERCEL_PROJECT_PRODUCTION_URL` is used for `metadataBase`.
4. Deploy. `vercel.json` carries the ignore rule so commits that only touch
   `backend/` or `frontend/` do not rebuild the landing.
