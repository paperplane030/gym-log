// 匯出／匯入：Excel 可直接貼上的表格格式
import { db, alive, insertRow, today } from '@/db/local'
import type { Unit } from '@/db/types'
import { categoryName, listCategories, nextCategoryOrder } from '@/db/categories'
import { num } from './format'

export const HEADERS = ['日期', '動作', '部位', '組', '重量', '單位', '次數', '備註', '訓練備註'] as const

// ───────── 匯出 ─────────

export async function exportTable(): Promise<string[][]> {
  const [workouts, sets, exercises, categories] = await Promise.all([
    db.workouts.filter(alive).toArray(),
    db.workout_sets.filter(alive).toArray(),
    db.exercises.toArray(),
    listCategories(),
  ])
  const ex = new Map(exercises.map((e) => [e.id, e]))
  const wk = new Map(workouts.map((w) => [w.id, w]))

  const rows = sets
    .filter((s) => wk.has(s.workout_id) && (s.reps != null || s.weight != null))
    .map((s) => ({ s, w: wk.get(s.workout_id)! }))
    .sort(
      (a, b) =>
        a.w.date.localeCompare(b.w.date) ||
        a.w.created_at.localeCompare(b.w.created_at) ||
        a.s.exercise_order - b.s.exercise_order ||
        a.s.set_no - b.s.set_no,
    )

  return [
    [...HEADERS],
    ...rows.map(({ s, w }) => {
      const e = ex.get(s.exercise_id)
      return [
        w.date,
        e?.name ?? '',
        e ? categoryName(categories, e.category_id) : '',
        String(s.set_no),
        num(s.weight),
        s.unit,
        num(s.reps),
        s.note ?? '',
        w.note ?? '',
      ]
    }),
  ]
}

/** Tab 分隔：貼到 Excel／Google 試算表會自動分欄 */
export const toTSV = (rows: string[][]) =>
  rows.map((r) => r.map((c) => c.replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n')

/** CSV：開頭加 BOM，Excel 開中文才不會亂碼 */
export const toCSV = (rows: string[][]) =>
  '﻿' +
  rows.map((r) => r.map((c) => (/[",\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n')

export function downloadCSV(rows: string[][]) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gym-log-${today()}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ───────── 匯入 ─────────

/** 解析 TSV 或 CSV（支援引號、欄位內換行） */
export function parseTable(text: string): string[][] {
  text = text.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delim = firstLine.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delim) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c))
}

export interface ImportSet {
  line: number
  exercise: string
  /** 類別名稱，空字串 = 未分類 */
  category: string
  setNo: number | null
  weight: number | null
  unit: Unit
  reps: number | null
  note: string | null
}

export interface ImportWorkout {
  date: string
  note: string | null
  sets: ImportSet[]
  /** 這天本機已經有訓練紀錄 */
  exists: boolean
}

export interface ImportPlan {
  workouts: ImportWorkout[]
  newExercises: { name: string; category: string }[]
  newCategories: string[]
  errors: { line: number; message: string }[]
}

function normDate(v: string) {
  const m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  if (date.getMonth() !== Number(mo) - 1) return null
  return `${y}-${mo!.padStart(2, '0')}-${d!.padStart(2, '0')}`
}

function parseNum(v: string, int: boolean) {
  if (!v) return { ok: true, value: null }
  const n = Number(v.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0 || (int && !Number.isInteger(n))) return { ok: false, value: null }
  return { ok: true, value: n }
}


/** 檢查資料並整理成匯入計畫（還不寫入） */
export async function planImport(text: string): Promise<ImportPlan> {
  const table = parseTable(text)
  const errors: ImportPlan['errors'] = []

  // 有標題列就依標題對欄位，沒有就照預設順序
  let col: Record<string, number> = Object.fromEntries(HEADERS.map((h, i) => [h, i]))
  let start = 0
  if (table[0]?.includes('日期') && table[0]?.includes('動作')) {
    col = Object.fromEntries(table[0].map((h, i) => [h, i]))
    start = 1
  }
  const get = (r: string[], key: string) => (col[key] != null ? (r[col[key]!] ?? '') : '')

  const exercises = await db.exercises.filter(alive).toArray()
  const known = new Set(exercises.map((e) => e.name))
  const newEx = new Map<string, string>()
  const knownCats = new Set((await listCategories()).map((c) => c.name))
  const newCats = new Set<string>()

  const byDate = new Map<string, ImportWorkout>()
  for (let i = start; i < table.length; i++) {
    const r = table[i]!
    const line = i + 1
    const date = normDate(get(r, '日期'))
    const name = get(r, '動作')
    if (!date) {
      errors.push({ line, message: `日期格式不正確：「${get(r, '日期')}」（請用 2026-11-10）` })
      continue
    }
    if (!name) {
      errors.push({ line, message: '缺少動作名稱' })
      continue
    }
    const w = parseNum(get(r, '重量'), false)
    const reps = parseNum(get(r, '次數'), true)
    const setNo = parseNum(get(r, '組'), true)
    if (!w.ok) errors.push({ line, message: `重量不是數字：「${get(r, '重量')}」` })
    if (!reps.ok) errors.push({ line, message: `次數不是整數：「${get(r, '次數')}」` })
    if (!w.ok || !reps.ok) continue
    if (w.value == null && reps.value == null) {
      errors.push({ line, message: '重量和次數都是空的' })
      continue
    }
    const unitRaw = get(r, '單位').toLowerCase()
    const unit: Unit = unitRaw === 'lb' || unitRaw === 'lbs' || unitRaw === '磅' ? 'lb' : 'kg'
    // 「未分類」或空白都視為沒有類別；不存在的類別會在匯入時建立
    const rawCat = get(r, '部位')
    const category = rawCat === '未分類' ? '' : rawCat

    // 已存在的動作維持原本的類別，只有新動作才用這一欄的類別
    if (!known.has(name) && !newEx.has(name)) {
      newEx.set(name, category)
      if (category && !knownCats.has(category)) newCats.add(category)
    }

    const wk = byDate.get(date) ?? { date, note: null, sets: [], exists: false }
    wk.note ||= get(r, '訓練備註') || null
    wk.sets.push({
      line,
      exercise: name,
      category,
      setNo: setNo.ok && setNo.value ? setNo.value : null,
      weight: w.value,
      unit,
      reps: reps.value,
      note: get(r, '備註') || null,
    })
    byDate.set(date, wk)
  }

  const existingDates = new Set((await db.workouts.filter(alive).toArray()).map((w) => w.date))
  const workouts = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  for (const w of workouts) w.exists = existingDates.has(w.date)

  return {
    workouts,
    newExercises: [...newEx].map(([name, category]) => ({ name, category })),
    newCategories: [...newCats],
    errors,
  }
}

/** 寫入資料。skipExisting = 略過本機已有紀錄的日期（避免重複匯入） */
export async function applyImport(plan: ImportPlan, skipExisting: boolean) {
  const targets = plan.workouts.filter((w) => !(skipExisting && w.exists))
  let setCount = 0

  await db.transaction('rw', [db.categories, db.exercises, db.workouts, db.workout_sets], async () => {
    const exercises = await db.exercises.filter(alive).toArray()
    const idByName = new Map(exercises.map((e) => [e.name, e.id]))
    let order = exercises.length

    const cats = await listCategories()
    const catId = new Map(cats.map((c) => [c.name, c.id]))
    let catOrder = await nextCategoryOrder()

    // 只建立實際會用到的新動作（以及它們需要的新類別）
    const used = new Set(targets.flatMap((w) => w.sets.map((s) => s.exercise)))
    for (const ne of plan.newExercises) {
      if (!used.has(ne.name) || idByName.has(ne.name)) continue
      if (ne.category && !catId.has(ne.category)) {
        const c = await insertRow('categories', { name: ne.category, sort_order: catOrder++ })
        catId.set(ne.category, c.id)
      }
      const e = await insertRow('exercises', {
        name: ne.name,
        category_id: ne.category ? catId.get(ne.category)! : null,
        note: null,
        sort_order: order++,
      })
      idByName.set(ne.name, e.id)
    }

    for (const w of targets) {
      const wk = await insertRow('workouts', { date: w.date, template_id: null, note: w.note })
      const exOrder = new Map<string, number>()
      const nextSet = new Map<string, number>()
      for (const s of w.sets) {
        const exId = idByName.get(s.exercise)!
        if (!exOrder.has(exId)) exOrder.set(exId, exOrder.size)
        const setNo = s.setNo ?? (nextSet.get(exId) ?? 0) + 1
        nextSet.set(exId, Math.max(nextSet.get(exId) ?? 0, setNo))
        await insertRow('workout_sets', {
          workout_id: wk.id,
          exercise_id: exId,
          exercise_order: exOrder.get(exId)!,
          set_no: setNo,
          weight: s.weight,
          reps: s.reps,
          unit: s.unit,
          note: s.note,
        })
        setCount++
      }
    }
  })

  return { workouts: targets.length, sets: setCount }
}
