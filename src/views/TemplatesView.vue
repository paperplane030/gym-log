<script setup lang="ts">
import { useRouter } from 'vue-router'
import { db, alive } from '@/db/local'
import type { Template, TemplateItem } from '@/db/types'
import { createTemplate } from '@/db/templates'
import { useLiveQuery } from '@/composables/useLiveQuery'

const router = useRouter()

const templates = useLiveQuery(() => db.templates.filter(alive).sortBy('sort_order'), [] as Template[])
const summary = useLiveQuery(async () => {
  const [items, exercises] = await Promise.all([db.template_items.filter(alive).toArray(), db.exercises.toArray()])
  const name = new Map(exercises.map((e) => [e.id, e.name]))
  const map = new Map<string, TemplateItem[]>()
  for (const i of items) map.set(i.template_id, [...(map.get(i.template_id) ?? []), i])
  return new Map(
    [...map].map(([tid, list]) => [
      tid,
      list.sort((a, b) => a.sort_order - b.sort_order).map((i) => name.get(i.exercise_id) ?? '?'),
    ]),
  )
}, new Map<string, string[]>())

async function create() {
  const name = prompt('範本名稱', '推日')?.trim()
  if (!name) return
  const t = await createTemplate(name)
  await router.push(`/templates/${t.id}`)
}
</script>

<template>
  <div class="space-y-2">
    <RouterLink v-for="t in templates" :key="t.id" :to="`/templates/${t.id}`" class="card block space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-medium">{{ t.name }}</span>
        <span class="text-xs text-neutral-500">{{ summary.get(t.id)?.length ?? 0 }} 個動作</span>
      </div>
      <p class="truncate text-sm text-neutral-600 dark:text-neutral-400">
        {{ summary.get(t.id)?.join('、') || '（還沒有動作）' }}
      </p>
    </RouterLink>

    <p v-if="!templates.length" class="py-10 text-center text-neutral-500">
      還沒有範本<br />
      <span class="text-sm">把常練的動作和目標組數存成範本，訓練時一鍵帶入</span>
    </p>

    <button class="btn-primary fixed bottom-24 right-4 h-14 w-14 rounded-full p-0 text-2xl shadow-lg" @click="create">+</button>
  </div>
</template>
