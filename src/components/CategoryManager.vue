<script setup lang="ts">
import { ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import LazyInput from './LazyInput.vue'
import { vSortable } from '@/directives/sortable'
import {
  countExercisesIn,
  createCategory,
  removeCategory,
  renameCategory,
  reorderCategories,
  useCategories,
} from '@/db/categories'
import type { Category } from '@/db/types'

const emit = defineEmits<{ close: [] }>()
const categories = useCategories()
const newName = ref('')

async function add() {
  const name = newName.value.trim()
  if (!name) return
  if (categories.value.some((c) => c.name === name)) {
    alert(`已經有「${name}」這個類別`)
    return
  }
  await createCategory(name)
  newName.value = ''
}

function rename(c: Category, v: number | string | null) {
  const name = String(v ?? '').trim()
  if (!name || name === c.name) return
  if (categories.value.some((x) => x.id !== c.id && x.name === name)) {
    alert(`已經有「${name}」這個類別`)
    return
  }
  void renameCategory(c.id, name)
}

async function remove(c: Category) {
  const n = await countExercisesIn(c.id)
  const msg = n ? `刪除「${c.name}」？底下的 ${n} 個動作會變成未分類。` : `刪除「${c.name}」？`
  if (confirm(msg)) await removeCategory(c.id)
}
</script>

<template>
  <BottomSheet title="管理類別" @close="emit('close')">
    <div class="space-y-3">
      <div v-sortable="(from: number, to: number) => reorderCategories(from, to)" class="space-y-2">
        <div
          v-for="c in categories"
          :key="c.id"
          class="sortable-item grid grid-cols-[1.25rem_1fr_2rem] items-center gap-2 rounded-xl bg-white dark:bg-neutral-900"
        >
          <span class="drag-handle flex h-10 cursor-grab touch-none select-none items-center justify-center text-neutral-400">
            <svg viewBox="0 0 10 16" class="h-4 w-2.5" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
          </span>
          <LazyInput class="input py-2" :value="c.name" @commit="rename(c, $event)" />
          <button class="h-9 text-neutral-400" title="刪除" @click="remove(c)">✕</button>
        </div>
      </div>

      <form class="flex gap-2" @submit.prevent="add">
        <input v-model="newName" class="input py-2" placeholder="新類別名稱，例如：有氧" />
        <button type="submit" class="btn-primary shrink-0 py-2" :disabled="!newName.trim()">新增</button>
      </form>

      <p class="text-xs text-neutral-500">按住 ⠿ 拖曳排序，點名稱可直接修改。刪除類別不會刪除動作，動作會變成「未分類」。</p>
    </div>
  </BottomSheet>
</template>
