<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Base44 dev setup

- **Stack**: Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4 + Supabase (auth + data).
- **Run**: `docker compose -f docker-compose.base44.yml up -d` — node:22 image, source bind-mounted at /app, `next dev` on port 3000 with HMR.
- **Env**: `.env.base44-defaults` holds development placeholders (Supabase URL/key etc.) so the app boots without credentials. Real values land via `/run/base44/app.env` (Base44 secrets dashboard) and override the defaults.
- **Required at boot**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser client is created at module import on the homepage). Placeholders satisfy boot; the homepage renders but auth/data calls fail until real Supabase credentials are supplied.
- **Optional integrations** (only needed for specific features): Google Places API, Google OAuth, Meta/Instagram OAuth, admin passcode/emails/session-secret. All declared in `.base44/environment.json`.
- **next.config.ts**: `allowedDevOrigins` is wired to `3000-` + `BASE44_PUBLIC_HOST_SUFFIX` so the preview origin can load dev assets/HMR.
- **Verify**: `curl -s http://localhost:3000` should return the OpenStatus marketing page (200).
