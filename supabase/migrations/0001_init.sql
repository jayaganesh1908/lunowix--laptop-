-- Lunowix — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`) before seeding.

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

create type public.graphics_preset as enum ('Low', 'Medium', 'High', 'Ultra');
create type public.game_tier as enum ('Flawless', 'Excellent', 'Playable', 'Struggles');
create type public.compat_status as enum (
  'Runs Smoothly', 'Runs Fine', 'Limited', 'Not Recommended'
);
create type public.user_role as enum ('member', 'editor', 'admin');

/* ------------------------------------------------------------------ */
/* Profiles — one row per auth.users row                              */
/* ------------------------------------------------------------------ */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'member',
  -- Set once the welcome mail goes out, so a second sign-in never re-sends it.
  welcome_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/**
 * Creates the profile row automatically. Doing this in a trigger rather than in
 * application code means the row exists no matter how the account was created —
 * OAuth, password, magic link, or straight from the Supabase dashboard.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/**
 * Role lookup used by every admin policy.
 *
 * `security definer` matters here: a policy on `profiles` that itself queries
 * `profiles` would recurse. Running as the definer bypasses RLS for this one
 * narrow lookup and breaks the cycle.
 */
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

/* ------------------------------------------------------------------ */
/* Catalogue                                                          */
/* ------------------------------------------------------------------ */

create table public.laptops (
  id text primary key,
  name text not null,
  brand text not null,
  price integer not null check (price >= 0),
  mrp integer not null check (mrp >= 0),
  summary text not null default '',
  -- Specs and performance stay as jsonb: they are always read as a whole
  -- object and never filtered field-by-field, so columns would add joins
  -- without buying anything.
  specs jsonb not null,
  performance jsonb not null,
  image text not null,
  images text[] not null default '{}',
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  reviews_count integer not null default 0,
  bestseller boolean not null default false,
  release_year integer not null,
  views integer not null default 0,
  tags text[] not null default '{}',
  affiliate_url text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index laptops_price_idx on public.laptops (price);
create index laptops_brand_idx on public.laptops (brand);
create index laptops_rating_idx on public.laptops (rating desc);
create index laptops_views_idx on public.laptops (views desc);

create table public.games (
  id text primary key,
  name text not null,
  genre text not null,
  release_year integer not null,
  icon text not null,
  demand integer not null,
  cpu_bound boolean not null default false,
  sort_order integer not null default 0
);

create table public.software (
  id text primary key,
  name text not null,
  category text not null,
  vendor text not null,
  icon text not null,
  req_cpu integer not null,
  req_gpu integer not null,
  req_ram integer not null,
  sort_order integer not null default 0
);

create table public.laptop_games (
  laptop_id text not null references public.laptops (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  fps integer not null,
  graphics public.graphics_preset not null,
  tier public.game_tier not null,
  primary key (laptop_id, game_id)
);

create table public.laptop_software (
  laptop_id text not null references public.laptops (id) on delete cascade,
  software_id text not null references public.software (id) on delete cascade,
  status public.compat_status not null,
  primary key (laptop_id, software_id)
);

/* ------------------------------------------------------------------ */
/* User-owned data                                                    */
/* ------------------------------------------------------------------ */

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  laptop_id text not null references public.laptops (id) on delete cascade,
  -- Null once the author deletes their account; the review text survives.
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  title text not null,
  comment text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index reviews_laptop_idx on public.reviews (laptop_id, created_at desc);

create table public.wishlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  laptop_id text not null references public.laptops (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, laptop_id)
);

create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  laptop_a text not null references public.laptops (id) on delete cascade,
  laptop_b text not null references public.laptops (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index comparisons_user_idx on public.comparisons (user_id, created_at desc);

/* ------------------------------------------------------------------ */
/* updated_at maintenance                                             */
/* ------------------------------------------------------------------ */

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger laptops_touch before update on public.laptops
  for each row execute function public.touch_updated_at();

/* ------------------------------------------------------------------ */
/* View counter                                                       */
/* ------------------------------------------------------------------ */

-- Bumping views through a definer function keeps `laptops` write-locked to
-- admins while still letting anonymous visitors register a page view.
create or replace function public.increment_laptop_views(p_laptop_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.laptops set views = views + 1 where id = p_laptop_id;
$$;

grant execute on function public.increment_laptop_views(text) to anon, authenticated;

/* ------------------------------------------------------------------ */
/* Row Level Security                                                 */
/* ------------------------------------------------------------------ */

alter table public.profiles enable row level security;
alter table public.laptops enable row level security;
alter table public.games enable row level security;
alter table public.software enable row level security;
alter table public.laptop_games enable row level security;
alter table public.laptop_software enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.comparisons enable row level security;

-- Profiles: you can see and edit your own; admins see everyone.
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Catalogue: world readable, admin writable.
create policy "laptops: public read" on public.laptops for select using (true);
create policy "laptops: admin write" on public.laptops
  for all using (public.is_admin()) with check (public.is_admin());

create policy "games: public read" on public.games for select using (true);
create policy "games: admin write" on public.games
  for all using (public.is_admin()) with check (public.is_admin());

create policy "software: public read" on public.software for select using (true);
create policy "software: admin write" on public.software
  for all using (public.is_admin()) with check (public.is_admin());

create policy "laptop_games: public read" on public.laptop_games for select using (true);
create policy "laptop_games: admin write" on public.laptop_games
  for all using (public.is_admin()) with check (public.is_admin());

create policy "laptop_software: public read" on public.laptop_software for select using (true);
create policy "laptop_software: admin write" on public.laptop_software
  for all using (public.is_admin()) with check (public.is_admin());

-- Reviews: anyone reads, signed-in users write their own, admins moderate.
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: insert own" on public.reviews
  for insert with check (auth.uid() = author_id);
create policy "reviews: update own" on public.reviews
  for update using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());
create policy "reviews: delete own" on public.reviews
  for delete using (auth.uid() = author_id or public.is_admin());

-- Wishlist and comparison history are strictly private to their owner.
create policy "wishlists: own rows" on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comparisons: own rows" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
