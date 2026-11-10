<script setup lang="ts">
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { db, alive, insertRow } from '@/db/local'
import type { Exercise } from '@/db/types'
import { categoryName, useCategories } from '@/db/categories'
import CategoryChips from './CategoryChips.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'

const props = defineProps<{ selected?: string[] }>()
const emit = defineEmits<{ pick: [id: string]; close: [] }>()

const exercises = useLiveQuery(() => db.exercises.filter(alive).sortBy('sort_order'), [] as Exercise[])
const q = ref('')
const categories = useCategories()
const cat = ref('all')
const validIds = computed(() => new Set(categories.value.map((c) => c.id)))
const catOf = (e: Exercise) => (e.category_id && validIds.value.has(e.category_id) ? e.category_id : 'none')
const hasNone = computed(() => exercises.value.some((e) => catOf(e) === 'none'))

const list = computed(() => {
  const k = q.value.trim().toLowerCase()
  return exercises.value.filter(
    (e) => (cat.value === 'all' || catOf(e) === cat.value) && (!k || e.name.toLowerCase().includes(k)),
  )
})
const canCreate = computed(() => {
  const k = q.value.trim()
  return k && !exercises.value.some((e) => e.name === k)
})

async function create() {
  const e = await insertRow('exercises', {
    name: q.value.trim(),
    category_id: cat.value === 'all' || cat.value === 'none' ? null : cat.value,
    note: null,
    sort_order: exercises.value.length,
  })
  emit('pick', e.id)
}
</script>

<template>
  <BottomSheet title="選擇動作" @close="emit('close')">
    <div class="sticky top-0 space-y-2 bg-white pb-2 dark:bg-neutral-900">
      <input v-model="q" class="input" placeholder="搜尋或輸入新動作名稱" />
      <div class="-mx-1">
        <CategoryChips v-model="cat" :categories="categories" :show-none="hasNone" />
      </div>
    </div>

    <button v-if="canCreate" class="btn-ghost mt-2 w-full" @click="create">
      ＋ 新增「{{ q.trim() }}」{{ cat === 'all' ? '' : `（${categoryName(categories, cat)}）` }}
    </button>

    <ul class="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
      <li v-for="e in list" :key="e.id">
        <button class="flex w-full items-center justify-between py-3 text-left" @click="emit('pick', e.id)">
          <span>{{ e.name }}</span>
          <span v-if="props.selected?.includes(e.id)" class="text-xs text-emerald-600 dark:text-emerald-400">已加入</span>
        </button>
      </li>
    </ul>
    <p v-if="!list.length && !canCreate" class="py-6 text-center text-neutral-500">沒有符合的動作</p>
  </BottomSheet>
</template>
