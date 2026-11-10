import type { EntityTable } from 'dexie'
import { supabase } from '@/lib/supabase'
import { db, insertRow } from './local'
import { DEFAULT_EXERCISES } from './defaults'
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
    const payload = batch.map(({ _dirty, server_updated_at, ...rest }) => rest)
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

/** 第一次使用（本機與雲端都沒有動作）時，建立預設動作 */
async function seedIfEmpty() {
  if (await db.meta.get('seeded')) return
  const count = await db.exercises.count()
  if (count === 0) {
    let i = 0
    for (const [name, category] of DEFAULT_EXERCISES) {
      await insertRow('exercises', { name, category, note: null, sort_order: i++ })
    }
    for (const t of SYNC_TABLES) await push(t)
  }
  await db.meta.put({ key: 'seeded', value: '1' })
}
