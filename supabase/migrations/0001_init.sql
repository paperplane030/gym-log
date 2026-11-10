-- Gym Log 初始資料表
-- 在 Supabase 後台 → SQL Editor 貼上整份執行一次即可。
--
-- 共通欄位說明：
--   id                 前端產生的 UUID，離線新增也不會撞號
--   user_id            資料擁有者，寫入時由資料庫自動設成目前登入者
--   updated_at         前端修改時間，用來判斷「誰比較新」
--   deleted_at         軟刪除標記（不真的刪，同步時其他裝置才知道被刪了）
--   server_updated_at  伺服器收到資料的時間，前端用它來拉取「上次同步後的變更」

-- ───────── 共用 trigger ─────────

create or replace function public.gym_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
  else
    -- 不允許改擁有者
    new.user_id := old.user_id;
    -- 收到的資料比伺服器上的舊 → 忽略這次寫入（last write wins）
    if new.updated_at < old.updated_at then
      return null;
    end if;
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;

-- ───────── 動作 ─────────

create table public.exercises (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  category          text not null default 'other'
                    check (category in ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'other')),
  note              text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- ───────── 課表範本 ─────────

create table public.templates (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  note              text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.template_items (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id       uuid not null references public.templates (id) on delete cascade,
  exercise_id       uuid not null references public.exercises (id) on delete cascade,
  sort_order        integer not null default 0,
  target_sets       integer check (target_sets > 0),
  target_reps       integer check (target_reps > 0),
  target_weight     numeric(6, 2) check (target_weight >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- ───────── 訓練紀錄 ─────────

create table public.workouts (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date              date not null,
  template_id       uuid references public.templates (id) on delete set null,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.workout_sets (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id        uuid not null references public.workouts (id) on delete cascade,
  exercise_id       uuid not null references public.exercises (id) on delete cascade,
  exercise_order    integer not null default 0,  -- 動作在這次訓練中的順序
  set_no            integer not null check (set_no > 0),
  weight            numeric(6, 2) check (weight >= 0),
  reps              integer check (reps >= 0),
  unit              text not null default 'kg' check (unit in ('kg', 'lb')),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- ───────── 索引、trigger、權限 ─────────

create index on public.workouts (user_id, date desc);
create index on public.workout_sets (workout_id);
create index on public.workout_sets (user_id, exercise_id);
create index on public.template_items (template_id);

do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'templates', 'template_items', 'workouts', 'workout_sets'] loop
    execute format('create index on public.%I (user_id, server_updated_at)', t);

    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.gym_before_write()',
      t || '_before_write', t);

    execute format('alter table public.%I enable row level security', t);

    -- 每個人只能讀寫自己的資料
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t);
  end loop;
end;
$$;
