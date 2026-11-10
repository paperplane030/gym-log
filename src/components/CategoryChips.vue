<script setup lang="ts">
import type { Category } from '@/db/types'
import { UNCATEGORIZED } from '@/db/types'

/** 類別篩選。值：'all' = 全部、'none' = 未分類、其他 = 類別 id */
defineProps<{ categories: Category[]; showNone?: boolean }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
    <button
      v-for="c in [{ id: 'all', name: '全部' }, ...categories, ...(showNone ? [{ id: 'none', name: UNCATEGORIZED }] : [])]"
      :key="c.id"
      class="shrink-0 rounded-full px-3 py-1.5 text-sm"
      :class="model === c.id ? 'bg-emerald-500 text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800'"
      @click="model = c.id"
    >
      {{ c.name }}
    </button>
  </div>
</template>
