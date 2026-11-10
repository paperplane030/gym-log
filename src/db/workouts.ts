import { db, alive, deleteRow, insertRow, today, updateRow } from './local'
import type { WorkoutSet } from './types'

/** 建立空白訓練 */
export async function createWorkout(date = today()) {
  return insertRow('workouts', { date, template_id: null, note: null })
}

/** 從範本建立訓練：依目標組數先建立空白的組 */
export async function createWorkoutFromTemplate(templateId: string, date = today()) {
  const w = await insertRow('workouts', { date, template_id: templateId, note: null })
  const items = (await db.template_items.where('template_id').equals(templateId).filter(alive).toArray()).sort(
    (a, b) => a.sort_order - b.sort_order,
  )
  let order = 0
  for (const item of items) {
    const n = item.target_sets ?? 1
    for (let i = 1; i <= n; i++) {
      await insertRow('workout_sets', blankSet(w.id, item.exercise_id, order, i))
    }
    order++
  }
  return w
}

function blankSet(workoutId: string, exerciseId: string, exerciseOrder: number, setNo: number) {
  return {
    workout_id: workoutId,
    exercise_id: exerciseId,
    exercise_order: exerciseOrder,
    set_no: setNo,
    weight: null,
    reps: null,
    unit: 'kg' as const,
    note: null,
  }
}

const setsOf = (workoutId: string) => db.workout_sets.where('workout_id').equals(workoutId).filter(alive).toArray()

/** 在訓練中加入一個動作（先建立第 1 組） */
export async function addExercise(workoutId: string, exerciseId: string) {
  const sets = await setsOf(workoutId)
  const order = sets.reduce((m, s) => Math.max(m, s.exercise_order + 1), 0)
  await insertRow('workout_sets', blankSet(workoutId, exerciseId, order, 1))
}

/** 為某動作新增一組 */
export async function addSet(workoutId: string, exerciseId: string) {
  const sets = (await setsOf(workoutId)).filter((s) => s.exercise_id === exerciseId)
  const setNo = sets.reduce((m, s) => Math.max(m, s.set_no), 0) + 1
  const order = sets[0]?.exercise_order ?? 0
  await insertRow('workout_sets', blankSet(workoutId, exerciseId, order, setNo))
}

/** 刪除一組，後面的組號往前補 */
export async function removeSet(set: WorkoutSet) {
  await deleteRow('workout_sets', set.id)
  const rest = (await setsOf(set.workout_id))
    .filter((s) => s.exercise_id === set.exercise_id && s.set_no > set.set_no)
  for (const s of rest) await updateRow('workout_sets', s.id, { set_no: s.set_no - 1 })
}

/** 從訓練中移除整個動作 */
export async function removeExercise(workoutId: string, exerciseId: string) {
  const sets = (await setsOf(workoutId)).filter((s) => s.exercise_id === exerciseId)
  for (const s of sets) await deleteRow('workout_sets', s.id)
}

/** 動作上移／下移 */
export async function moveExercise(workoutId: string, exerciseId: string, dir: -1 | 1) {
  const sets = await setsOf(workoutId)
  const orders = [...new Set(sets.map((s) => s.exercise_order))].sort((a, b) => a - b)
  const mine = sets.find((s) => s.exercise_id === exerciseId)?.exercise_order
  if (mine === undefined) return
  const other = orders[orders.indexOf(mine) + dir]
  if (other === undefined) return
  for (const s of sets) {
    if (s.exercise_order === mine) await updateRow('workout_sets', s.id, { exercise_order: other })
    else if (s.exercise_order === other) await updateRow('workout_sets', s.id, { exercise_order: mine })
  }
}

/** 刪除整次訓練 */
export async function removeWorkout(workoutId: string) {
  for (const s of await setsOf(workoutId)) await deleteRow('workout_sets', s.id)
  await deleteRow('workouts', workoutId)
}

export interface PreviousRecord {
  date: string
  sets: WorkoutSet[]
}

/**
 * 找出每個動作「上一次」的紀錄（在這次訓練日期當天或之前、但不是這次訓練）。
 * 只算有填次數的組。
 */
export async function previousRecords(workoutId: string, exerciseIds: string[], beforeDate: string) {
  const result = new Map<string, PreviousRecord>()
  const workoutCache = new Map<string, { date: string; created_at: string } | null>()

  for (const exId of exerciseIds) {
    const sets = await db.workout_sets
      .where('exercise_id')
      .equals(exId)
      .filter((s) => alive(s) && s.workout_id !== workoutId && s.reps != null)
      .toArray()

    let best: { id: string; date: string; created_at: string } | null = null
    for (const wid of new Set(sets.map((s) => s.workout_id))) {
      if (!workoutCache.has(wid)) {
        const w = await db.workouts.get(wid)
        workoutCache.set(wid, w && alive(w) ? { date: w.date, created_at: w.created_at } : null)
      }
      const w = workoutCache.get(wid)
      if (!w || w.date > beforeDate) continue
      if (!best || w.date > best.date || (w.date === best.date && w.created_at > best.created_at)) {
        best = { id: wid, ...w }
      }
    }
    if (best) {
      const id = best.id
      result.set(exId, {
        date: best.date,
        sets: sets.filter((s) => s.workout_id === id).sort((a, b) => a.set_no - b.set_no),
      })
    }
  }
  return result
}
