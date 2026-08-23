-- ════════════════════════════════════════════════════════════════
-- Punja Bhattarai Portfolio — Supabase schema
-- Run this whole file in: Supabase Dashboard → SQL Editor
-- Safe to re-run (idempotent).
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── profiles (site owner / admin) ────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  display_name  text not null default 'Punja Bhattarai',
  role          text not null default 'admin',
  token_version integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── albums ───────────────────────────────────────────────────────
create table if not exists public.albums (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  visibility  text not null default 'guest' check (visibility in ('public','guest')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── photos ───────────────────────────────────────────────────────
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  album_id     uuid references public.albums(id) on delete set null,
  filename     text not null,
  storage_path text not null unique,
  thumb_path   text not null,
  title        text not null default '',
  description  text not null default '',
  visibility   text not null default 'private' check (visibility in ('public','private')),
  width        integer,
  height       integer,
  size_bytes   bigint,
  mime_type    text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.albums add column if not exists cover_photo_id uuid references public.photos(id) on delete set null;

create index if not exists photos_album_idx      on public.photos(album_id);
create index if not exists photos_visibility_idx on public.photos(visibility);
create index if not exists photos_created_idx    on public.photos(created_at desc);

-- ── guest access (album-scoped password access) ──────────────────
create table if not exists public.guest_access (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  password_hash text not null,
  album_ids    uuid[] not null default '{}',
  permissions  jsonb not null default '{"view":true,"download":false}',
  expires_at   timestamptz,
  revoked      boolean not null default false,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- ── shared gallery links (/share/<slug>) ─────────────────────────
create table if not exists public.gallery_links (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text,
  album_id         uuid references public.albums(id) on delete cascade,
  require_password boolean not null default true,
  password_hash    text,
  download_allowed boolean not null default false,
  expires_at       timestamptz,
  revoked          boolean not null default false,
  view_count       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ── active gallery sessions (enables instant revocation) ─────────
create table if not exists public.gallery_sessions (
  jti          uuid primary key,
  subject_type text not null check (subject_type in ('guest','link')),
  subject_id   uuid not null,
  permissions  jsonb not null default '{"view":true,"download":false}',
  expires_at   timestamptz not null,
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists gallery_sessions_subject_idx on public.gallery_sessions(subject_type, subject_id);

-- ── contact messages ────────────────────────────────────────────
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contact_created_idx on public.contact_messages(created_at desc);

-- ── projects & lab experiments ──────────────────────────────────
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  description      text not null default '',
  long_description text not null default '',
  technologies     text[] not null default '{}',
  features         text[] not null default '{}',
  github_url       text not null default '',
  demo_url         text not null default '',
  video_url        text not null default '',
  image_path       text not null default '',
  category         text not null default 'project' check (category in ('project','lab')),
  status           text not null default 'completed',
  featured         boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists projects_category_idx on public.projects(category, sort_order);

-- ── site settings (key/value) ───────────────────────────────────
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- The app talks to Postgres ONLY via the server-side service role
-- key (which bypasses RLS). RLS is enabled everywhere with NO
-- anon/authenticated policies → the database is fully closed to
-- browser clients. All authorization happens in the Next.js API.
-- ════════════════════════════════════════════════════════════════
alter table public.profiles         enable row level security;
alter table public.albums           enable row level security;
alter table public.photos           enable row level security;
alter table public.guest_access     enable row level security;
alter table public.gallery_links    enable row level security;
alter table public.gallery_sessions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.projects         enable row level security;
alter table public.site_settings    enable row level security;

-- ════════════════════════════════════════════════════════════════
-- Storage: private bucket for ALL media (public photos included —
-- they are served through short-lived signed URLs from the API).
-- ════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  false,
  26214400, -- 25 MB hard cap at storage layer
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- No policies on storage.objects → only service-role can read/write.
-- NOTE: we intentionally do NOT touch storage.objects directly — Supabase
-- already enables RLS on it, and only the service key will have access
-- because this bucket has zero policies.

-- Clean up expired gallery sessions occasionally (optional, harmless)
-- create index if not exists gallery_sessions_expiry_idx on public.gallery_sessions(expires_at);
-- appended helper functions
create or replace function public.increment_gallery_link_view(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.gallery_links set view_count = coalesce(view_count,0) + 1 where id = p_id;
$$;
