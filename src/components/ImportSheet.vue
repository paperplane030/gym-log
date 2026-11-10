<script setup lang="ts">
import { computed, ref } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { applyImport, HEADERS, planImport, type ImportPlan } from '@/lib/exchange'
import { formatDate } from '@/lib/format'
import { useSyncStore } from '@/stores/sync'

const emit = defineEmits<{ close: [] }>()
const sync = useSyncStore()

const text = ref('')
const plan = ref<ImportPlan | null>(null)
const skipExisting = ref(true)
const busy = ref(false)
const done = ref<{ workouts: number; sets: number } | null>(null)

const toImport = computed(() => plan.value?.workouts.filter((w) => !(skipExisting.value && w.exists)) ?? [])
const setCount = computed(() => toImport.value.reduce((n, w) => n + w.sets.length, 0))
const existingCount = computed(() => plan.value?.workouts.filter((w) => w.exists).length ?? 0)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    text.value = await file.text()
    await preview()
  }
}

async function paste() {
  try {
    text.value = await navigator.clipboard.readText()
    await preview()
  } catch {
    alert('無法讀取剪貼簿，請直接貼到下方輸入框')
  }
}

async function preview() {
  plan.value = text.value.trim() ? await planImport(text.value) : null
}

async function confirmImport() {
  if (!plan.value) return
  busy.value = true
  try {
    done.value = await applyImport(plan.value, skipExisting.value)
    void sync.sync()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet title="匯入紀錄" @close="emit('close')">
    <div v-if="done" class="space-y-4 py-4 text-center">
      <p class="text-lg">✅ 已匯入 {{ done.workouts }} 次訓練、{{ done.sets }} 組</p>
      <button class="btn-primary w-full" @click="emit('close')">完成</button>
    </div>

    <div v-else class="space-y-3">
      <p class="text-sm text-neutral-500">
        從 Excel 複製（含或不含標題列）後貼上，或選擇 CSV 檔。欄位順序：<br />
        <code class="text-xs">{{ HEADERS.join('、') }}</code>
      </p>

      <div class="flex gap-2">
        <button class="btn-ghost flex-1 text-sm" @click="paste">從剪貼簿貼上</button>
        <label class="btn-ghost flex-1 cursor-pointer text-sm">
          選擇檔案
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" class="hidden" @change="onFile" />
        </label>
      </div>

      <textarea
        v-model="text"
        rows="5"
        class="input font-mono text-xs"
        placeholder="2026-11-10	槓鈴臥推	胸	1	60	kg	8"
        @change="preview"
      />
      <button class="btn-ghost w-full text-sm" @click="preview">檢查資料</button>

      <template v-if="plan">
        <div v-if="plan.errors.length" class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <p class="font-medium">{{ plan.errors.length }} 列有問題，會被略過：</p>
          <ul class="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs">
            <li v-for="e in plan.errors" :key="e.line + e.message">第 {{ e.line }} 列：{{ e.message }}</li>
          </ul>
        </div>

        <div class="space-y-1 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          <p>將匯入 <b>{{ toImport.length }}</b> 次訓練、<b>{{ setCount }}</b> 組</p>
          <p v-if="plan.newExercises.length" class="text-neutral-500">
            會新增 {{ plan.newExercises.length }} 個動作：{{ plan.newExercises.map((e) => e.name).join('、') }}
          </p>
          <p v-if="plan.newCategories.length" class="text-neutral-500">
            會新增 {{ plan.newCategories.length }} 個類別：{{ plan.newCategories.join('、') }}
          </p>
          <ul class="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-neutral-500">
            <li v-for="w in plan.workouts" :key="w.date" :class="w.exists && skipExisting && 'line-through opacity-50'">
              {{ formatDate(w.date, true) }} · {{ new Set(w.sets.map((s) => s.exercise)).size }} 個動作 · {{ w.sets.length }} 組
              <span v-if="w.exists">（已有紀錄）</span>
            </li>
          </ul>
        </div>

        <label v-if="existingCount" class="flex items-center gap-2 text-sm">
          <input v-model="skipExisting" type="checkbox" class="h-4 w-4 accent-emerald-500" />
          略過已有紀錄的 {{ existingCount }} 天（避免重複匯入）
        </label>

        <button class="btn-primary w-full" :disabled="busy || !toImport.length" @click="confirmImport">
          {{ busy ? '匯入中…' : `確認匯入` }}
        </button>
      </template>
    </div>
  </BottomSheet>
</template>
