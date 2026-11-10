<script setup lang="ts">
import { computed, ref } from 'vue'
import { db, alive, deleteRow, insertRow, updateRow } from '@/db/local'
import { CATEGORIES, type Category, type Exercise } from '@/db/types'
import { useLiveQuery } from '@/composables/useLiveQuery'

const exercises = useLiveQuery(() => db.exercises.filter(alive).sortBy('sort_order'), [] as Exercise[])

const filter = ref<Category | 'all'>('all')
const grouped = computed(() =>
  CATEGORIES.map((c) => ({
    ...c,
    items: exercises.value.filter((e) => e.category === c.value),
  })).filter((g) => g.items.length && (filter.value === 'all' || filter.value === g.value)),
)

// 新增／編輯表單
const editing = ref<{ id?: string; name: string; category: Category; note: string } | null>(null)

function openNew() {
  editing.value = { name: '', category: filter.value === 'all' ? 'chest' : filter.value, note: '' }
}
function openEdit(e: Exercise) {
  editing.value = { id: e.id, name: e.name, category: e.category, note: e.note ?? '' }
}
async function save() {
  const f = editing.value
  if (!f || !f.name.trim()) return
  const data = { name: f.name.trim(), category: f.category, note: f.note.trim() || null }
  if (f.id) await updateRow('exercises', f.id, data)
  else await insertRow('exercises', { ...data, sort_order: exercises.value.length })
  editing.value = null
}
async function remove() {
  const id = editing.value?.id
  if (!id || !confirm('確定刪除這個動作？過去的紀錄會保留。')) return
  await deleteRow('exercises', id)
  editing.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button
        v-for="c in [{ value: 'all', label: '全部' }, ...CATEGORIES]"
        :key="c.value"
        class="shrink-0 rounded-full px-3 py-1.5 text-sm"
        :class="filter === c.value ? 'bg-emerald-500 text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800'"
        @click="filter = c.value as Category | 'all'"
      >
        {{ c.label }}
      </button>
    </div>

    <section v-for="g in grouped" :key="g.value">
      <h2 class="mb-2 text-sm font-medium text-neutral-500">{{ g.label }}</h2>
      <ul class="card divide-y divide-neutral-200 p-0 dark:divide-neutral-800">
        <li v-for="e in g.items" :key="e.id">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left" @click="openEdit(e)">
            <span>
              {{ e.name }}
              <span v-if="e.note" class="block text-xs text-neutral-500">{{ e.note }}</span>
            </span>
            <span class="text-neutral-400">›</span>
          </button>
        </li>
      </ul>
    </section>

    <p v-if="!exercises.length" class="py-10 text-center text-neutral-500">還沒有動作</p>

    <button class="btn-primary fixed bottom-24 right-4 h-14 w-14 rounded-full p-0 text-2xl shadow-lg" @click="openNew">+</button>

    <!-- 編輯面板 -->
    <div v-if="editing" class="fixed inset-0 z-20 flex items-end bg-black/40" @click.self="editing = null">
      <form
        class="mx-auto w-full max-w-lg space-y-3 rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] dark:bg-neutral-900"
        @submit.prevent="save"
      >
        <h2 class="text-lg font-semibold">{{ editing.id ? '編輯動作' : '新增動作' }}</h2>
        <input v-model="editing.name" class="input" placeholder="動作名稱" required />
        <select v-model="editing.category" class="input">
          <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <input v-model="editing.note" class="input" placeholder="備註（選填）" />
        <div class="flex gap-2 pt-2">
          <button v-if="editing.id" type="button" class="btn-ghost text-red-500" @click="remove">刪除</button>
          <button type="button" class="btn-ghost ml-auto" @click="editing = null">取消</button>
          <button type="submit" class="btn-primary">儲存</button>
        </div>
      </form>
    </div>
  </div>
</template>
