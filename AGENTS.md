<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Base44 dev environment

- **Stack**: Next.js 16.3.3 (Turbopack) + React 19 + Tailwind 4 + Supabase (auth + data).
- **Run**: `docker compose -f docker-compose.base44.yml up -d` — Node 22 image, source bind-mounted, `npm install && npm run dev` on port 3000.
- **Supabase**: Hosted external service (not local). Three env vars required at boot: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Dev placeholders are generated; replace with real Supabase project credentials for auth/data to work.
- **Supabase URL validation**: `src/lib/supabase.ts` falls back to `https://placeholder.supabase.co` when the env URL is missing or not `http(s)://`-prefixed, so the app boots without real credentials. All Supabase API calls will fail silently until real credentials are provided.
- **Middleware**: `src/middleware.ts` guards `/dashboard`, `/builder`, `/settings`, `/analytics`, `/setup` — redirects unauthenticated users to `/login`. Next.js 16 deprecates `middleware` in favor of `proxy` (warning only, still works).
- **Other optional integrations**: Google OAuth (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), Google Places (`GOOGLE_PLACES_API_KEY`), Meta/Facebook OAuth (`NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`), admin panel (`ADMIN_EMAILS`, `ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`). All optional — app boots without them.
- **Dev origin**: `allowedDevOrigins` in `next.config.ts` uses `BASE44_PUBLIC_HOST_SUFFIX` so the preview origin can access dev assets/HMR.
- **Migrations**: `supabase_migration_*.sql` files at repo root are for the hosted Supabase project — run them in the Supabase dashboard, not locally.
