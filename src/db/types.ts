// 欄位命名和 Supabase 資料表一致（snake_case），同步時不用轉換

export type Category = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'other'

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'chest', label: '胸' },
  { value: 'back', label: '背' },
  { value: 'legs', label: '腿' },
  { value: 'shoulders', label: '肩' },
  { value: 'arms', label: '手臂' },
  { value: 'core', label: '核心' },
  { value: 'other', label: '其他' },
]

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c

export type Unit = 'kg' | 'lb'

/** 每張表都有的欄位 */
export interface BaseRow {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  server_updated_at?: string
  /** 只存在本機：1 = 還沒同步到雲端 */
  _dirty?: 0 | 1
}

export interface Exercise extends BaseRow {
  name: string
  category: Category
  note: string | null
  sort_order: number
}

export interface Template extends BaseRow {
  name: string
  note: string | null
  sort_order: number
}

export interface TemplateItem extends BaseRow {
  template_id: string
  exercise_id: string
  sort_order: number
  target_sets: number | null
  target_reps: number | null
  target_weight: number | null
}

export interface Workout extends BaseRow {
  /** YYYY-MM-DD（本地日期） */
  date: string
  template_id: string | null
  note: string | null
}

export interface WorkoutSet extends BaseRow {
  workout_id: string
  exercise_id: string
  exercise_order: number
  set_no: number
  weight: number | null
  reps: number | null
  unit: Unit
  note: string | null
}

export interface TableRows {
  exercises: Exercise
  templates: Template
  template_items: TemplateItem
  workouts: Workout
  workout_sets: WorkoutSet
}

export type TableName = keyof TableRows

/** 同步順序：被參照的表要先推上去，不然外鍵會失敗 */
export const SYNC_TABLES: TableName[] = [
  'exercises',
  'templates',
  'template_items',
  'workouts',
  'workout_sets',
]
