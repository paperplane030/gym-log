import Dexie, { type EntityTable } from 'dexie'
import type { BaseRow, Exercise, TableName, TableRows, Template, TemplateItem, Workout, WorkoutSet } from './types'

interface Meta {
  key: string
  value: string
}

export const db = new Dexie('gym-log') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  templates: EntityTable<Template, 'id'>
  template_items: EntityTable<TemplateItem, 'id'>
  workouts: EntityTable<Workout, 'id'>
  workout_sets: EntityTable<WorkoutSet, 'id'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  exercises: 'id, _dirty, category',
  templates: 'id, _dirty',
  template_items: 'id, _dirty, template_id',
  workouts: 'id, _dirty, date',
  workout_sets: 'id, _dirty, workout_id, exercise_id, [exercise_id+created_at]',
  meta: 'key',
})

export const nowIso = () => new Date().toISOString()

/** 本地日期 YYYY-MM-DD（不用 toISOString，避免時區跑掉一天） */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let currentUserId = ''
export const setLocalUser = (id: string) => (currentUserId = id)

type NewRow<T extends TableName> = Omit<TableRows[T], keyof BaseRow> & Partial<Pick<BaseRow, 'id'>>

/** 新增一筆並標記為待同步 */
export async function insertRow<T extends TableName>(table: T, data: NewRow<T>): Promise<TableRows[T]> {
  const t = nowIso()
  const row = {
    id: crypto.randomUUID(),
    user_id: currentUserId,
    created_at: t,
    updated_at: t,
    deleted_at: null,
    _dirty: 1,
    ...data,
  } as TableRows[T]
  await (db[table] as EntityTable<BaseRow, 'id'>).add(row)
  return row
}

/** 修改一筆並標記為待同步 */
export async function updateRow<T extends TableName>(
  table: T,
  id: string,
  changes: Partial<Omit<TableRows[T], keyof BaseRow>>,
) {
  await (db[table] as EntityTable<BaseRow, 'id'>).update(id, {
    ...changes,
    updated_at: nowIso(),
    _dirty: 1,
  })
}

/** 軟刪除 */
export async function deleteRow(table: TableName, id: string) {
  const t = nowIso()
  await (db[table] as EntityTable<BaseRow, 'id'>).update(id, { deleted_at: t, updated_at: t, _dirty: 1 })
}

export const alive = <T extends BaseRow>(r: T) => !r.deleted_at

/** 登出時清空本機資料 */
export async function clearLocal() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}
