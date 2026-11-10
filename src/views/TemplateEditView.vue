<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db, alive, deleteRow, updateRow } from '@/db/local'
import type { Exercise, Template, TemplateItem } from '@/db/types'
import { addTemplateItem, duplicateTemplate, removeTemplate, reorderTemplateItems } from '@/db/templates'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { vSortable } from '@/directives/sortable'
import ExercisePicker from '@/components/ExercisePicker.vue'
import LazyInput from '@/components/LazyInput.vue'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const template = useLiveQuery(() => db.templates.get(id), undefined as Template | undefined)
const items = useLiveQuery(
  async () => (await db.template_items.where('template_id').equals(id).filter(alive).toArray()).sort((a, b) => a.sort_order - b.sort_order),
  [] as TemplateItem[],
)
const exercises = useLiveQuery(
  async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])),
  new Map<string, Exercise>(),
)
const selected = computed(() => items.value.map((i) => i.exercise_id))
const picking = ref(false)

function setTarget(it: TemplateItem, field: 'target_sets' | 'target_reps' | 'target_weight', v: number | string | null) {
  let n = v as number | null
  if (n === 0 && field !== 'target_weight') n = null
  void updateRow('template_items', it.id, { [field]: n })
}

function updateTemplate(field: 'name' | 'note', v: number | string | null) {
  const t = (v as string | null) ?? null
  if (field === 'name' && t) void updateRow('templates', id, { name: t })
  if (field === 'note') void updateRow('templates', id, { note: t })
}

async function pick(exId: string) {
  picking.value = false
  if (!selected.value.includes(exId)) await addTemplateItem(id, exId)
}

async function onDelete() {
  if (!confirm('確定刪除這個範本？已記錄的訓練不受影響。')) return
  await removeTemplate(id)
  await router.replace('/templates')
}

async function onDuplicate() {
  const copy = await duplicateTemplate(id)
  if (copy) await router.replace(`/templates/${copy.id}`)
}
</script>

<template>
  <div v-if="template" class="space-y-4">
    <button class="text-sm text-emerald-600 dark:text-emerald-400" @click="router.push('/templates')">‹ 所有範本</button>

    <section class="card space-y-3">
      <LazyInput class="input text-lg font-semibold" :value="template.name" placeholder="範本名稱" @commit="updateTemplate('name', $event)" />
      <LazyInput class="input" :value="template.note" placeholder="備註（選填）" @commit="updateTemplate('note', $event)" />
    </section>

    <section class="card space-y-3">
      <div class="grid grid-cols-[1.25rem_1fr_3.25rem_3.25rem_3.75rem_1.75rem] items-center gap-x-1.5 text-xs text-neutral-500">
        <span /><span>動作</span><span class="text-center">組數</span><span class="text-center">次數</span><span class="text-center">kg</span><span />
      </div>

      <div v-sortable="(from: number, to: number) => reorderTemplateItems(id, from, to)" class="space-y-2">
        <div
          v-for="it in items"
          :key="it.id"
          class="sortable-item grid grid-cols-[1.25rem_1fr_3.25rem_3.25rem_3.75rem_1.75rem] items-center gap-x-1.5 rounded-xl bg-white dark:bg-neutral-900"
        >
          <span class="drag-handle flex h-10 cursor-grab touch-none select-none items-center justify-center text-neutral-400">
            <svg viewBox="0 0 10 16" class="h-4 w-2.5" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
          </span>
          <span class="truncate text-sm">{{ exercises.get(it.exercise_id)?.name ?? '（已刪除）' }}</span>
          <LazyInput class="input px-1 py-2 text-center" kind="int" :value="it.target_sets" @commit="setTarget(it, 'target_sets', $event)" />
          <LazyInput class="input px-1 py-2 text-center" kind="int" :value="it.target_reps" @commit="setTarget(it, 'target_reps', $event)" />
          <LazyInput class="input px-1 py-2 text-center" kind="decimal" placeholder="—" :value="it.target_weight" @commit="setTarget(it, 'target_weight', $event)" />
          <button class="h-9 text-neutral-400" title="移除" @click="deleteRow('template_items', it.id)">✕</button>
        </div>
      </div>

      <p v-if="!items.length" class="py-2 text-center text-sm text-neutral-500">還沒有動作</p>
      <button class="btn-ghost w-full py-2 text-sm" @click="picking = true">＋ 加入動作</button>
    </section>

    <p class="text-xs text-neutral-500">按住左側 ⠿ 可拖曳排序。目標重量可留空。從範本開始訓練時，會依「組數」先建立空白的組。</p>

    <div class="flex gap-2">
      <button class="btn-ghost flex-1" @click="onDuplicate">複製範本</button>
      <button class="btn-ghost flex-1 text-red-500" @click="onDelete">刪除範本</button>
    </div>

    <ExercisePicker v-if="picking" :selected="selected" @pick="pick" @close="picking = false" />
  </div>
</template>
