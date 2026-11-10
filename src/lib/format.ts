const WEEK = ['日', '一', '二', '三', '四', '五', '六']

/** 2026-11-10 → 11/10（二） */
export function formatDate(date: string, withYear = false) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const wd = WEEK[new Date(y, m - 1, d).getDay()]
  return `${withYear ? `${y}/` : ''}${m}/${d}（${wd}）`
}

/** 數字去掉多餘的 0：60.00 → 60、62.50 → 62.5 */
export const num = (n: number | null | undefined) => (n == null ? '' : String(Number(n)))

/** 60kg × 8 */
export function setText(weight: number | null, reps: number | null, unit = 'kg') {
  if (reps == null) return '—'
  return weight == null ? `${reps} 下` : `${num(weight)}${unit} × ${reps}`
}
