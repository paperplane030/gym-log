import { db, alive, deleteRow, insertRow, updateRow } from './local'

const itemsOf = async (templateId: string) =>
  (await db.template_items.where('template_id').equals(templateId).filter(alive).toArray()).sort(
    (a, b) => a.sort_order - b.sort_order,
  )

export async function createTemplate(name: string) {
  const count = await db.templates.filter(alive).count()
  return insertRow('templates', { name, note: null, sort_order: count })
}

export async function addTemplateItem(templateId: string, exerciseId: string) {
  const items = await itemsOf(templateId)
  const order = items.reduce((m, i) => Math.max(m, i.sort_order + 1), 0)
  await insertRow('template_items', {
    template_id: templateId,
    exercise_id: exerciseId,
    sort_order: order,
    target_sets: 3,
    target_reps: null,
    target_weight: null,
  })
}

export async function reorderTemplateItems(templateId: string, from: number, to: number) {
  const items = await itemsOf(templateId)
  const [moved] = items.splice(from, 1)
  if (!moved) return
  items.splice(to, 0, moved)
  await db.transaction('rw', db.template_items, async () => {
    for (const [i, it] of items.entries()) {
      if (it.sort_order !== i) await updateRow('template_items', it.id, { sort_order: i })
    }
  })
}

export async function removeTemplate(templateId: string) {
  for (const it of await itemsOf(templateId)) await deleteRow('template_items', it.id)
  await deleteRow('templates', templateId)
}

/** 複製一份範本 */
export async function duplicateTemplate(templateId: string) {
  const t = await db.templates.get(templateId)
  if (!t) return
  const copy = await createTemplate(`${t.name}（複製）`)
  for (const it of await itemsOf(templateId)) {
    await insertRow('template_items', {
      template_id: copy.id,
      exercise_id: it.exercise_id,
      sort_order: it.sort_order,
      target_sets: it.target_sets,
      target_reps: it.target_reps,
      target_weight: it.target_weight,
    })
  }
  return copy
}
