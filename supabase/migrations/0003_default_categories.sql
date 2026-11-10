-- 預設類別鎖定
-- 在 Supabase 後台 → SQL Editor 貼上整份執行一次。
-- ⚠️ 請在更新前端程式「之前」執行（需先執行過 0002_categories.sql）。
--
-- 變更內容：
--   1. categories 新增 code 欄位：有值 = 預設類別（chest、back…），null = 自訂類別
--   2. 把現有的同名類別標記為預設類別；被刪掉的預設類別會還原
--   3. 缺少的預設類別自動補上
--   4. 資料庫端禁止預設類別被改名或刪除

alter table public.categories add column code text;

-- ───────── 標記現有的預設類別（同名的取一個，優先選沒刪除、最早建立的） ─────────

with defaults (code, name) as (
  values ('chest', '胸'), ('back', '背'), ('legs', '腿'), ('shoulders', '肩'),
         ('arms', '手臂'), ('core', '核心'), ('other', '其他')
),
picked as (
  select distinct on (c.user_id, d.code) c.id, d.code
  from public.categories c
  join defaults d on d.name = c.name
  order by c.user_id, d.code, (c.deleted_at is not null), c.created_at
)
update public.categories c
set code = p.code, deleted_at = null, updated_at = now()
from picked p
where c.id = p.id;

-- ───────── 補上缺少的預設類別 ─────────

with defaults (code, name, ord) as (
  values ('chest', '胸', 0), ('back', '背', 1), ('legs', '腿', 2), ('shoulders', '肩', 3),
         ('arms', '手臂', 4), ('core', '核心', 5), ('other', '其他', 6)
)
insert into public.categories (id, user_id, name, sort_order, code)
select gen_random_uuid(), u.user_id, d.name, d.ord, d.code
from (select user_id from public.categories union select user_id from public.exercises) u
cross join defaults d
where not exists (
  select 1 from public.categories c where c.user_id = u.user_id and c.code = d.code
);

-- 每個人的每個預設類別只會有一筆
create unique index categories_user_code on public.categories (user_id, code) where code is not null;

-- ───────── 禁止改名、刪除預設類別（可以調整排序） ─────────

create or replace function public.protect_default_category()
returns trigger
language plpgsql
as $$
begin
  if old.code is not null then
    new.code := old.code;
    new.name := old.name;
    new.deleted_at := null;
  end if;
  return new;
end;
$$;

create trigger categories_protect_default before update on public.categories
  for each row execute function public.protect_default_category();
