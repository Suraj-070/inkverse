-- ============================================
-- InkVerse schema — run in Supabase SQL editor
-- Covers Phase 0-6. Safe to run once on fresh project.
-- Access model: service-role key from Next.js API routes only.
-- RLS enabled with no policies = anon/client access fully blocked.
-- ============================================

create extension if not exists "pgcrypto";

-- ---------- users (NextAuth Google, upserted by email) ----------
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  image       text,
  pin_hash    text,                         -- Phase 6 PIN lock (bcrypt)
  pin_attempts int not null default 0,
  pin_locked_until timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- notebooks ----------
create table public.notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null default 'My Journal',
  cover       text not null default 'oxblood',   -- oxblood | black | brown | white | glass | custom
  cover_image text,                              -- storage URL when cover = custom
  paper_style text not null default 'lined',     -- plain | lined | grid | dotted | vintage
  ink_color   text not null default '#1c1b18',
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_notebooks_user on public.notebooks(user_id);

-- ---------- pages ----------
create table public.pages (
  id          uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  page_no     int not null,
  kind        text not null default 'text' check (kind in ('text','ink','mixed')),
  created_at  timestamptz not null default now(),
  unique (notebook_id, page_no)
);
create index idx_pages_notebook on public.pages(notebook_id);

-- ---------- entries (one journal moment on a page) ----------
create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid not null references public.pages(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  body          text,                 -- typed text (nullable if pure ink page)
  transcript    text,                 -- Phase 3: OCR of handwriting, searchable
  mood          text check (mood in ('happy','calm','sad','angry','tired','motivated')),
  location_name text,                 -- opt-in
  weather       text,
  entry_date    date not null default current_date,
  locked_until  timestamptz,          -- time capsule; null = open
  is_encrypted  boolean not null default false,  -- Phase 6 client-side AES
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_entries_user_date on public.entries(user_id, entry_date desc);
create index idx_entries_page on public.entries(page_id);

-- ---------- strokes (handwriting data, one row per page) ----------
-- data format: { version:1, strokes:[{ tool, color, size,
--   points:[[x,y,pressure,t_ms], ...] }] }
-- Replay = redraw points ordered by t_ms.
create table public.strokes (
  page_id     uuid primary key references public.pages(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  data        jsonb not null default '{"version":1,"strokes":[]}',
  duration_ms int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------- attachments ----------
create table public.attachments (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  kind       text not null check (kind in ('image','audio')),
  url        text not null,            -- Supabase Storage path
  created_at timestamptz not null default now()
);
create index idx_attachments_entry on public.attachments(entry_id);

-- ---------- moods (standalone daily check-in, entry optional) ----------
create table public.moods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  mood       text not null check (mood in ('happy','calm','sad','angry','tired','motivated')),
  note       text,
  mood_date  date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, mood_date)
);

-- ---------- settings ----------
create table public.settings (
  user_id        uuid primary key references public.users(id) on delete cascade,
  ambient_sound  text not null default 'none',  -- none|coffee|rain|library|fireplace|forest|ocean
  writing_sounds boolean not null default true,
  theme          text not null default 'ink',
  updated_at     timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();
create trigger trg_strokes_touch before update on public.strokes
  for each row execute function public.touch_updated_at();
create trigger trg_settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------- lock down: RLS on, zero policies ----------
-- Service-role key bypasses RLS; anon key gets nothing.
alter table public.users       enable row level security;
alter table public.notebooks   enable row level security;
alter table public.pages       enable row level security;
alter table public.entries     enable row level security;
alter table public.strokes     enable row level security;
alter table public.attachments enable row level security;
alter table public.moods       enable row level security;
alter table public.settings    enable row level security;
