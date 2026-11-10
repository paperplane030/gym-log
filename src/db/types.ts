// 欄位命名和 Supabase 資料表一致（snake_case），同步時不用轉換

export const UNCATEGORIZED = '未分類'

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

export interface Category extends BaseRow {
  name: string
  sort_order: number
  /** 預設類別的代碼（chest、back…），自訂類別是 null。預設類別不能改名、刪除 */
  code: string | null
}

export interface Exercise extends BaseRow {
  name: string
  /** null = 未分類 */
  category_id: string | null
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
  categories: Category
  exercises: Exercise
  templates: Template
  template_items: TemplateItem
  workouts: Workout
  workout_sets: WorkoutSet
}

export type TableName = keyof TableRows

/** 同步順序：被參照的表要先推上去，不然外鍵會失敗 */
export const SYNC_TABLES: TableName[] = [
  'categories',
  'exercises',
  'templates',
  'template_items',
  'workouts',
  'workout_sets',
]
