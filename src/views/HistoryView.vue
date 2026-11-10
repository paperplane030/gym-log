<script setup lang="ts">
import { computed } from 'vue'
import { db, alive } from '@/db/local'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { formatDate } from '@/lib/format'

interface Row {
  id: string
  date: string
  template: string | null
  note: string | null
  exercises: string[]
  sets: number
}

const rows = useLiveQuery(async (): Promise<Row[]> => {
  const [workouts, sets, exercises, templates] = await Promise.all([
    db.workouts.filter(alive).toArray(),
    db.workout_sets.filter(alive).toArray(),
    db.exercises.toArray(),
    db.templates.toArray(),
  ])
  const exName = new Map(exercises.map((e) => [e.id, e.name]))
  const tName = new Map(templates.map((t) => [t.id, t.name]))
  const byWorkout = new Map<string, typeof sets>()
  for (const s of sets) byWorkout.set(s.workout_id, [...(byWorkout.get(s.workout_id) ?? []), s])

  return workouts
    .sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at))
    .map((w) => {
      const ws = (byWorkout.get(w.id) ?? []).sort((a, b) => a.exercise_order - b.exercise_order)
      return {
        id: w.id,
        date: w.date,
        template: w.template_id ? (tName.get(w.template_id) ?? null) : null,
        note: w.note,
        exercises: [...new Set(ws.map((s) => exName.get(s.exercise_id) ?? '?'))],
        sets: ws.filter((s) => s.reps != null).length,
      }
    })
}, [] as Row[])

/** 依月份分組 */
const months = computed(() => {
  const m = new Map<string, Row[]>()
  for (const r of rows.value) {
    const k = r.date.slice(0, 7)
    m.set(k, [...(m.get(k) ?? []), r])
  }
  return [...m.entries()].map(([k, items]) => ({ label: `${k.slice(0, 4)} 年 ${Number(k.slice(5))} 月`, items }))
})
</script>

<template>
  <div class="space-y-5">
    <section v-for="m in months" :key="m.label">
      <h2 class="mb-2 text-sm font-medium text-neutral-500">{{ m.label }}</h2>
      <ul class="space-y-2">
        <li v-for="r in m.items" :key="r.id">
          <RouterLink :to="`/workouts/${r.id}`" class="card block space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ formatDate(r.date) }}</span>
              <span class="text-xs text-neutral-500">{{ r.exercises.length }} 個動作 · {{ r.sets }} 組</span>
            </div>
            <p v-if="r.template" class="text-xs text-emerald-700 dark:text-emerald-400">{{ r.template }}</p>
            <p class="truncate text-sm text-neutral-600 dark:text-neutral-400">{{ r.exercises.join('、') || '（空白）' }}</p>
            <p v-if="r.note" class="truncate text-xs text-neutral-500">{{ r.note }}</p>
          </RouterLink>
        </li>
      </ul>
    </section>
    <p v-if="!rows.length" class="py-10 text-center text-neutral-500">還沒有任何訓練紀錄</p>
  </div>
</template>
