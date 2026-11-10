import type { EntityTable } from 'dexie'
import { supabase } from '@/lib/supabase'
import { db, insertRow } from './local'
import { DEFAULT_CATEGORIES, DEFAULT_EXERCISES } from './defaults'
import { SYNC_TABLES, type BaseRow, type TableName } from './types'

const PAGE = 1000

const tbl = (t: TableName) => db[t] as unknown as EntityTable<BaseRow, 'id'>
const cursorKey = (t: TableName) => `cursor:${t}`

/** 把本機尚未同步的資料推上 Supabase */
async function push(table: TableName) {
  const dirty = await tbl(table).where('_dirty').equals(1).toArray()
  if (!dirty.length) return

  for (let i = 0; i < dirty.length; i += PAGE) {
    const batch = dirty.slice(i, i + PAGE)
    // user_id 不送，由資料庫 trigger 設成目前登入者（本機的值可能是空的）
    const payload = batch.map(({ _dirty, server_updated_at, user_id, ...rest }) => rest)
    const { error } = await supabase.from(table).upsert(payload)
    if (error) throw new Error(`${table} 上傳失敗：${error.message}`)

    // 只清掉「上傳後沒有再被改過」的標記，避免同步途中的修改被漏掉
    await db.transaction('rw', tbl(table), async () => {
      for (const sent of batch) {
        const cur = await tbl(table).get(sent.id)
        if (cur && cur.updated_at === sent.updated_at) await tbl(table).update(sent.id, { _dirty: 0 })
      }
    })
  }
}

/** 從 Supabase 拉下上次同步之後的變更 */
async function pull(table: TableName) {
  let cursor = (await db.meta.get(cursorKey(table)))?.value ?? '1970-01-01T00:00:00Z'

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('server_updated_at', cursor)
      .order('server_updated_at', { ascending: true })
      .limit(PAGE)
    if (error) throw new Error(`${table} 下載失敗：${error.message}`)
    if (!data?.length) break

    await db.transaction('rw', [tbl(table), db.meta], async () => {
      for (const remote of data as BaseRow[]) {
        const local = await tbl(table).get(remote.id)
        // 本機有更新的未同步修改 → 保留本機版本
        if (local?._dirty && local.updated_at > remote.updated_at) continue
        await tbl(table).put({ ...remote, _dirty: 0 })
      }
      cursor = (data[data.length - 1] as BaseRow).server_updated_at!
      await db.meta.put({ key: cursorKey(table), value: cursor })
    })

    if (data.length < PAGE) break
  }
}

let running: Promise<void> | null = null

/** 完整同步一次（推 → 拉）。同時只會跑一個。 */
export function syncAll(): Promise<void> {
  if (!running) {
    running = (async () => {
      for (const t of SYNC_TABLES) await push(t)
      for (const t of SYNC_TABLES) await pull(t)
      await seedIfEmpty()
    })().finally(() => (running = null))
  }
  return running
}

/** 第一次使用時，建立預設類別與動作（本機與雲端都沒有時才建立） */
async function seedIfEmpty() {
  let changed = false

  // 類別：連已刪除的都沒有，才建立預設值
  if ((await db.categories.count()) === 0) {
    for (const [i, name] of DEFAULT_CATEGORIES.entries()) {
      await insertRow('categories', { name, sort_order: i })
    }
    changed = true
  }

  if (!(await db.meta.get('seeded'))) {
    if ((await db.exercises.count()) === 0) {
      const cats = await db.categories.toArray()
      const idByName = new Map(cats.filter((c) => !c.deleted_at).map((c) => [c.name, c.id]))
      for (const [i, [name, cat]] of DEFAULT_EXERCISES.entries()) {
        await insertRow('exercises', { name, category_id: idByName.get(cat) ?? null, note: null, sort_order: i })
      }
      changed = true
    }
    await db.meta.put({ key: 'seeded', value: '1' })
  }

  if (changed) for (const t of SYNC_TABLES) await push(t)
}
