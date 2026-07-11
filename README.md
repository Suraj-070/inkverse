# InkVerse — Phase 0

Mobile-first PWA journaling app. Stack: Next.js 16, React 19, NextAuth v5 (Google), Supabase, Tailwind v4, Framer Motion.

## Setup

1. **Install**
   ```
   npm install
   ```

2. **Supabase**
   - New project at supabase.com
   - SQL editor → paste `supabase/schema.sql` → run
   - Copy Project URL, anon key, service_role key

3. **Google OAuth**
   - console.cloud.google.com → new project → OAuth consent screen
   - Credentials → OAuth client ID → Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-APP.vercel.app/api/auth/callback/google`

4. **Env**
   ```
   cp .env.example .env.local
   ```
   Fill all values. `AUTH_SECRET`: run `npx auth secret` or `openssl rand -base64 32`.

5. **Icons**
   - Drop `icon-192.png` and `icon-512.png` into `public/icons/` (any square PNG works for now).

6. **Run**
   ```
   npm run dev
   ```

## Vercel deploy

- Import repo → add all env vars from `.env.example` → deploy.
- Set `AUTH_TRUST_HOST=true` on Vercel.
- Add production callback URL to Google OAuth (step 3).

## Phase 0 contents

- Google sign-in → `/journal` (protected by middleware)
- Full DB schema (all phases) with RLS locked to service role
- PWA: manifest + app-shell service worker (Phase 6 replaces with offline queue)
- Design tokens in `globals.css` (`@theme`): paper/ink/leather/brass palette, Fraunces + Spectral fonts, CSS paper grain (no image assets)

## Structure

```
src/
  auth.ts                 NextAuth v5 config, Supabase user upsert on sign-in
  middleware.ts           /journal route guard
  app/
    page.tsx              landing = closed notebook cover + sign in
    journal/page.tsx      open page placeholder (Phase 1 target)
    api/auth/[...nextauth]/route.ts
  lib/supabase.ts         server-only admin client
  components/RegisterSW.tsx
public/
  manifest.json, sw.js, icons/
supabase/schema.sql
```

## Next: Phase 1

Notebook core — page CRUD, typed entries, autosave, page flip animation, bottom nav.
