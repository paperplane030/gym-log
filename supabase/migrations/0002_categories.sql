-- 自訂動作類別
-- 在 Supabase 後台 → SQL Editor 貼上整份執行一次。
-- ⚠️ 請在更新前端程式「之前」執行。
--
-- 變更內容：
--   1. 新增 categories 資料表（每個人有自己的類別清單）
--   2. exercises 新增 category_id，參照 categories
--   3. 為現有使用者建立 7 個預設類別，並把現有動作對應過去
--   4. 舊的 exercises.category 欄位保留但不再使用（移除限制，避免舊版 App 同步失敗）

-- ───────── 1. trigger：在 SQL Editor 執行時 auth.uid() 是 null，保留原本的 user_id ─────────

create or replace function public.gym_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(auth.uid(), new.user_id);
  else
    new.user_id := old.user_id;
    if new.updated_at < old.updated_at then
      return null;
    end if;
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;

-- ───────── 2. 類別資料表 ─────────

create table public.categories (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

create index on public.categories (user_id, server_updated_at);

create trigger categories_before_write before insert or update on public.categories
  for each row execute function public.gym_before_write();

alter table public.categories enable row level security;

create policy "own rows" on public.categories for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ───────── 3. exercises 改為參照類別 ─────────

alter table public.exercises add column category_id uuid references public.categories (id) on delete set null;
alter table public.exercises alter column category drop not null;
alter table public.exercises drop constraint if exists exercises_category_check;

-- ───────── 4. 搬移現有資料 ─────────

with defaults (code, name, ord) as (
  values ('chest', '胸', 0), ('back', '背', 1), ('legs', '腿', 2), ('shoulders', '肩', 3),
         ('arms', '手臂', 4), ('core', '核心', 5), ('other', '其他', 6)
)
insert into public.categories (id, user_id, name, sort_order)
select gen_random_uuid(), u.user_id, d.name, d.ord
from (select distinct user_id from public.exercises) u
cross join defaults d
where not exists (select 1 from public.categories c where c.user_id = u.user_id);

with defaults (code, name) as (
  values ('chest', '胸'), ('back', '背'), ('legs', '腿'), ('shoulders', '肩'),
         ('arms', '手臂'), ('core', '核心'), ('other', '其他')
)
update public.exercises e
set category_id = c.id
from public.categories c, defaults d
where e.category_id is null
  and d.code = e.category
  and c.user_id = e.user_id
  and c.name = d.name
  and c.deleted_at is null;
