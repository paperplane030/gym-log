<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { db, alive, today } from '@/db/local'
import type { Template, Workout } from '@/db/types'
import { createWorkout, createWorkoutFromTemplate } from '@/db/workouts'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { formatDate } from '@/lib/format'
import WorkoutEditor from '@/components/WorkoutEditor.vue'

const router = useRouter()
const date = today()

const todays = useLiveQuery(
  () => db.workouts.where('date').equals(date).filter(alive).sortBy('created_at'),
  [] as Workout[],
)
const current = computed(() => todays.value[todays.value.length - 1])
const templates = useLiveQuery(() => db.templates.filter(alive).sortBy('sort_order'), [] as Template[])

const startBlank = () => createWorkout(date)
const startFrom = (t: Template) => createWorkoutFromTemplate(t.id, date)
</script>

<template>
  <WorkoutEditor v-if="current" :key="current.id" :workout-id="current.id" />

  <div v-else class="space-y-6">
    <p class="text-neutral-500">{{ formatDate(date, true) }}，還沒有訓練紀錄</p>

    <button class="btn-primary w-full py-4 text-lg" @click="startBlank">開始空白訓練</button>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-neutral-500">從範本開始</h2>
      <ul v-if="templates.length" class="card divide-y divide-neutral-200 p-0 dark:divide-neutral-800">
        <li v-for="t in templates" :key="t.id">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left" @click="startFrom(t)">
            <span>{{ t.name }}</span><span class="text-neutral-400">›</span>
          </button>
        </li>
      </ul>
      <p v-else class="text-sm text-neutral-500">
        還沒有範本，
        <button class="text-emerald-600 underline dark:text-emerald-400" @click="router.push('/templates')">去建立</button>
      </p>
    </section>
  </div>
</template>
