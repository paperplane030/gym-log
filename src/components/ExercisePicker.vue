<script setup lang="ts">
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { db, alive, insertRow } from '@/db/local'
import { CATEGORIES, type Category, type Exercise } from '@/db/types'
import { useLiveQuery } from '@/composables/useLiveQuery'

const props = defineProps<{ selected?: string[] }>()
const emit = defineEmits<{ pick: [id: string]; close: [] }>()

const exercises = useLiveQuery(() => db.exercises.filter(alive).sortBy('sort_order'), [] as Exercise[])
const q = ref('')
const cat = ref<Category | 'all'>('all')

const list = computed(() => {
  const k = q.value.trim().toLowerCase()
  return exercises.value.filter(
    (e) => (cat.value === 'all' || e.category === cat.value) && (!k || e.name.toLowerCase().includes(k)),
  )
})
const canCreate = computed(() => {
  const k = q.value.trim()
  return k && !exercises.value.some((e) => e.name === k)
})

async function create() {
  const e = await insertRow('exercises', {
    name: q.value.trim(),
    category: cat.value === 'all' ? 'other' : cat.value,
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
      <div class="-mx-5 flex gap-2 overflow-x-auto px-5">
        <button
          v-for="c in [{ value: 'all', label: '全部' }, ...CATEGORIES]"
          :key="c.value"
          class="shrink-0 rounded-full px-3 py-1 text-sm"
          :class="cat === c.value ? 'bg-emerald-500 text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800'"
          @click="cat = c.value as Category | 'all'"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

    <button v-if="canCreate" class="btn-ghost mt-2 w-full" @click="create">
      ＋ 新增「{{ q.trim() }}」{{ cat === 'all' ? '' : `（${CATEGORIES.find((c) => c.value === cat)?.label}）` }}
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
