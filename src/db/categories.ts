import { db, alive, deleteRow, insertRow, updateRow } from './local'
import { UNCATEGORIZED, type Category } from './types'
import { useLiveQuery } from '@/composables/useLiveQuery'

export const listCategories = () => db.categories.filter(alive).sortBy('sort_order')

/** 類別清單（依排序），本機資料變動時自動更新 */
export function useCategories() {
  return useLiveQuery(listCategories, [] as Category[])
}

/** 依 id 取得類別名稱，找不到或已刪除就是「未分類」 */
export function categoryName(cats: Category[], id: string | null | undefined) {
  return (id && cats.find((c) => c.id === id)?.name) || UNCATEGORIZED
}

/** 新類別排在最後 */
export async function nextCategoryOrder() {
  const cats = await listCategories()
  return cats.reduce((m, c) => Math.max(m, c.sort_order + 1), 0)
}

export async function createCategory(name: string) {
  return insertRow('categories', { name, code: null, sort_order: await nextCategoryOrder() })
}

/** 預設類別不能改名、刪除 */
export const isDefaultCategory = (c: Category | undefined) => Boolean(c?.code)

export async function renameCategory(id: string, name: string) {
  if (isDefaultCategory(await db.categories.get(id))) return
  await updateRow('categories', id, { name })
}

export async function reorderCategories(from: number, to: number) {
  const cats = await listCategories()
  const [moved] = cats.splice(from, 1)
  if (!moved) return
  cats.splice(to, 0, moved)
  await db.transaction('rw', db.categories, async () => {
    for (const [i, c] of cats.entries()) {
      if (c.sort_order !== i) await updateRow('categories', c.id, { sort_order: i })
    }
  })
}

/** 刪除類別：底下的動作改成未分類 */
export async function removeCategory(id: string) {
  if (isDefaultCategory(await db.categories.get(id))) return
  await db.transaction('rw', db.categories, db.exercises, async () => {
    const exs = await db.exercises.where('category_id').equals(id).toArray()
    for (const e of exs) await updateRow('exercises', e.id, { category_id: null })
    await deleteRow('categories', id)
  })
}

export const countExercisesIn = (id: string) =>
  db.exercises.where('category_id').equals(id).filter(alive).count()
