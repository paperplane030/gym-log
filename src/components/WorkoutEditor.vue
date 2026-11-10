<script setup lang="ts">
import { computed, ref } from 'vue'
import { db, alive, updateRow } from '@/db/local'
import type { Exercise, TemplateItem, Workout, WorkoutSet } from '@/db/types'
import {
  addExercise,
  addSet,
  moveExercise,
  previousRecords,
  removeExercise,
  removeSet,
  removeWorkout,
  reorderSets,
  type PreviousRecord,
} from '@/db/workouts'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { formatDate, num, setText } from '@/lib/format'
import ExercisePicker from './ExercisePicker.vue'
import LazyInput from './LazyInput.vue'
import { vSortable } from '@/directives/sortable'

const props = defineProps<{ workoutId: string }>()
const emit = defineEmits<{ deleted: [] }>()
const id = props.workoutId

const workout = useLiveQuery(() => db.workouts.get(id), undefined as Workout | undefined)
const sets = useLiveQuery(
  () => db.workout_sets.where('workout_id').equals(id).filter(alive).toArray(),
  [] as WorkoutSet[],
)
// 含已刪除的動作，舊紀錄才顯示得出名稱
const exercises = useLiveQuery(
  async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])),
  new Map<string, Exercise>(),
)
const template = useLiveQuery(async () => {
  const w = await db.workouts.get(id)
  if (!w?.template_id) return null
  const t = await db.templates.get(w.template_id)
  const items = await db.template_items.where('template_id').equals(w.template_id).filter(alive).toArray()
  return { name: t?.name ?? '', items: new Map(items.map((i) => [i.exercise_id, i])) }
}, null as { name: string; items: Map<string, TemplateItem> } | null)

const previous = useLiveQuery(async () => {
  const w = await db.workouts.get(id)
  if (!w) return new Map<string, PreviousRecord>()
  const s = await db.workout_sets.where('workout_id').equals(id).filter(alive).toArray()
  return previousRecords(id, [...new Set(s.map((x) => x.exercise_id))], w.date)
}, new Map<string, PreviousRecord>())

/** 依動作分組，維持動作順序與組號 */
const groups = computed(() => {
  const map = new Map<string, { exerciseId: string; order: number; sets: WorkoutSet[] }>()
  for (const s of sets.value) {
    const g = map.get(s.exercise_id) ?? { exerciseId: s.exercise_id, order: s.exercise_order, sets: [] }
    g.sets.push(s)
    map.set(s.exercise_id, g)
  }
  return [...map.values()]
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ ...g, sets: g.sets.sort((a, b) => a.set_no - b.set_no) }))
})

const picking = ref(false)
const noteOpen = ref(new Set<string>())
const menuFor = ref<string | null>(null)

function saveSet(s: WorkoutSet, field: 'weight' | 'reps' | 'note', v: number | string | null) {
  void updateRow('workout_sets', s.id, { [field]: v })
}
function applyPrev(s: WorkoutSet, p: WorkoutSet) {
  void updateRow('workout_sets', s.id, { weight: p.weight, reps: p.reps })
}
function toggleNote(sid: string) {
  const n = new Set(noteOpen.value)
  if (n.has(sid)) n.delete(sid)
  else n.add(sid)
  noteOpen.value = n
}

function updateDate(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw) void updateRow('workouts', id, { date: raw })
}
function updateNote(v: number | string | null) {
  void updateRow('workouts', id, { note: (v as string | null) ?? null })
}

async function pick(exId: string) {
  picking.value = false
  if (groups.value.some((g) => g.exerciseId === exId)) return
  await addExercise(id, exId)
}

async function onRemoveExercise(exId: string) {
  menuFor.value = null
  const name = exercises.value.get(exId)?.name
  if (confirm(`從這次訓練移除「${name}」和它的所有組？`)) await removeExercise(id, exId)
}

async function onDeleteWorkout() {
  if (!confirm('確定刪除這次訓練？')) return
  await removeWorkout(id)
  emit('deleted')
}

function targetText(t: TemplateItem | undefined) {
  if (!t) return ''
  const parts = []
  if (t.target_sets && t.target_reps) parts.push(`${t.target_sets} 組 × ${t.target_reps} 下`)
  else if (t.target_sets) parts.push(`${t.target_sets} 組`)
  else if (t.target_reps) parts.push(`每組 ${t.target_reps} 下`)
  if (t.target_weight != null) parts.push(`${num(t.target_weight)}kg`)
  return parts.join(' · ')
}
</script>

<template>
  <div v-if="workout" class="space-y-4">
    <!-- 訓練資訊 -->
    <section class="card space-y-3">
      <div class="flex items-center gap-3">
        <input
          type="date"
          class="input w-auto"
          :value="workout.date"
          @change="updateDate"
        />
        <span v-if="template" class="truncate rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          {{ template.name }}
        </span>
      </div>
      <LazyInput class="input" placeholder="這次訓練的備註（選填）" :value="workout.note" @commit="updateNote" />
    </section>

    <!-- 動作 -->
    <section v-for="(g, gi) in groups" :key="g.exerciseId" class="card space-y-3">
      <header class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-semibold">{{ exercises.get(g.exerciseId)?.name ?? '（已刪除的動作）' }}</h3>
          <p v-if="targetText(template?.items.get(g.exerciseId))" class="text-xs text-sky-600 dark:text-sky-400">
            目標 {{ targetText(template?.items.get(g.exerciseId)) }}
          </p>
          <p v-if="previous.get(g.exerciseId)" class="text-xs text-neutral-500">
            上次 {{ formatDate(previous.get(g.exerciseId)!.date) }}：
            {{ previous.get(g.exerciseId)!.sets.map((s) => setText(s.weight, s.reps)).join('、') }}
          </p>
        </div>
        <div class="relative shrink-0">
          <button class="px-2 text-xl leading-none text-neutral-400" @click="menuFor = menuFor === g.exerciseId ? null : g.exerciseId">⋯</button>
          <div
            v-if="menuFor === g.exerciseId"
            class="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <button class="block w-full px-4 py-2.5 text-left disabled:opacity-40" :disabled="gi === 0" @click="moveExercise(id, g.exerciseId, -1); menuFor = null">上移</button>
            <button class="block w-full px-4 py-2.5 text-left disabled:opacity-40" :disabled="gi === groups.length - 1" @click="moveExercise(id, g.exerciseId, 1); menuFor = null">下移</button>
            <button class="block w-full px-4 py-2.5 text-left text-red-500" @click="onRemoveExercise(g.exerciseId)">移除動作</button>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-[1.25rem_1.25rem_1fr_1fr_auto] items-center gap-x-2 text-xs text-neutral-500">
        <span /><span>組</span><span>重量 (kg)</span><span>次數</span><span class="w-16" />
      </div>

      <div v-sortable="(from: number, to: number) => reorderSets(id, g.exerciseId, from, to)" class="space-y-3">
      <div v-for="s in g.sets" :key="s.id" class="sortable-item space-y-1 rounded-xl bg-white dark:bg-neutral-900">
        <div class="grid grid-cols-[1.25rem_1.25rem_1fr_1fr_auto] items-center gap-x-2">
          <span class="drag-handle flex h-10 cursor-grab touch-none select-none items-center justify-center text-neutral-400" title="拖曳排序">
            <svg viewBox="0 0 10 16" class="h-4 w-2.5" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
          </span>
          <span class="text-center text-sm font-medium text-neutral-500">{{ s.set_no }}</span>
          <LazyInput class="input py-2 text-center" kind="decimal" :value="s.weight" @commit="saveSet(s, 'weight', $event)" />
          <LazyInput class="input py-2 text-center" kind="int" :value="s.reps" @commit="saveSet(s, 'reps', $event)" />
          <div class="flex w-16 justify-end gap-1">
            <button
              class="h-9 w-7 rounded-lg text-sm"
              :class="s.note || noteOpen.has(s.id) ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'"
              title="備註"
              @click="toggleNote(s.id)"
            >✎</button>
            <button class="h-9 w-7 rounded-lg text-neutral-400" title="刪除這組" @click="removeSet(s)">✕</button>
          </div>
        </div>

        <!-- 上次同組的紀錄：只當參考，點一下才套用 -->
        <button
          v-if="previous.get(g.exerciseId)?.sets[s.set_no - 1]"
          class="ml-14 text-xs text-neutral-500 underline decoration-dotted underline-offset-2"
          @click="applyPrev(s, previous.get(g.exerciseId)!.sets[s.set_no - 1]!)"
        >
          上次 {{ setText(previous.get(g.exerciseId)!.sets[s.set_no - 1]!.weight, previous.get(g.exerciseId)!.sets[s.set_no - 1]!.reps) }} · 套用
        </button>

        <LazyInput
          v-if="s.note || noteOpen.has(s.id)"
          class="input ml-14 w-[calc(100%-3.5rem)] py-2 text-sm"
          placeholder="這組的備註"
          :value="s.note"
          @commit="saveSet(s, 'note', $event)"
        />
      </div>
      </div>

      <button class="btn-ghost w-full py-2 text-sm" @click="addSet(id, g.exerciseId)">＋ 新增一組</button>
    </section>

    <button class="btn-primary w-full" @click="picking = true">＋ 加入動作</button>
    <button class="btn w-full text-sm text-red-500" @click="onDeleteWorkout">刪除這次訓練</button>

    <ExercisePicker
      v-if="picking"
      :selected="groups.map((g) => g.exerciseId)"
      @pick="pick"
      @close="picking = false"
    />
  </div>
</template>
