<script setup lang="ts">
import { computed, ref } from 'vue'
import { db, alive, deleteRow, insertRow, updateRow } from '@/db/local'
import { UNCATEGORIZED, type Exercise } from '@/db/types'
import { useCategories } from '@/db/categories'
import { useLiveQuery } from '@/composables/useLiveQuery'
import CategoryChips from '@/components/CategoryChips.vue'
import CategoryManager from '@/components/CategoryManager.vue'

const exercises = useLiveQuery(() => db.exercises.filter(alive).sortBy('sort_order'), [] as Exercise[])
const categories = useCategories()

const filter = ref('all')
const managing = ref(false)

/** 有效的類別 id（已刪除的類別視為未分類） */
const validIds = computed(() => new Set(categories.value.map((c) => c.id)))
const catOf = (e: Exercise) => (e.category_id && validIds.value.has(e.category_id) ? e.category_id : 'none')
const hasNone = computed(() => exercises.value.some((e) => catOf(e) === 'none'))

const grouped = computed(() =>
  [...categories.value.map((c) => ({ id: c.id, name: c.name })), { id: 'none', name: UNCATEGORIZED }]
    .map((c) => ({ ...c, items: exercises.value.filter((e) => catOf(e) === c.id) }))
    .filter((g) => g.items.length && (filter.value === 'all' || filter.value === g.id)),
)

// 新增／編輯表單（category = '' 代表未分類）
const editing = ref<{ id?: string; name: string; category: string; note: string } | null>(null)

function openNew() {
  const cat = filter.value === 'all' ? (categories.value[0]?.id ?? '') : filter.value === 'none' ? '' : filter.value
  editing.value = { name: '', category: cat, note: '' }
}
function openEdit(e: Exercise) {
  const c = catOf(e)
  editing.value = { id: e.id, name: e.name, category: c === 'none' ? '' : c, note: e.note ?? '' }
}
async function save() {
  const f = editing.value
  if (!f || !f.name.trim()) return
  const data = { name: f.name.trim(), category_id: f.category || null, note: f.note.trim() || null }
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
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-neutral-500">{{ exercises.length }} 個動作</span>
        <button class="text-emerald-600 dark:text-emerald-400" @click="managing = true">管理類別</button>
      </div>
      <CategoryChips v-model="filter" :categories="categories" :show-none="hasNone" />
    </div>

    <section v-for="g in grouped" :key="g.id">
      <h2 class="mb-2 text-sm font-medium text-neutral-500">{{ g.name }}</h2>
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

    <p v-if="!grouped.length" class="py-10 text-center text-neutral-500">{{ exercises.length ? '這個類別還沒有動作' : '還沒有動作' }}</p>

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
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          <option value="">{{ UNCATEGORIZED }}</option>
        </select>
        <input v-model="editing.note" class="input" placeholder="備註（選填）" />
        <div class="flex gap-2 pt-2">
          <button v-if="editing.id" type="button" class="btn-ghost text-red-500" @click="remove">刪除</button>
          <button type="button" class="btn-ghost ml-auto" @click="editing = null">取消</button>
          <button type="submit" class="btn-primary">儲存</button>
        </div>
      </form>
    </div>

    <CategoryManager v-if="managing" @close="managing = false" />
  </div>
</template>
