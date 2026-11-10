<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * 輸入中不會被外部資料覆蓋的輸入框。
 * 離開輸入框（或按 Enter）才送出 commit。
 */
const props = withDefaults(
  defineProps<{
    value: number | string | null
    kind?: 'decimal' | 'int' | 'text'
    placeholder?: string
  }>(),
  { kind: 'text', placeholder: '' },
)
const emit = defineEmits<{ commit: [value: number | string | null] }>()

const fmt = (v: number | string | null) => (v == null ? '' : typeof v === 'number' ? String(Number(v)) : v)
const text = ref(fmt(props.value))
const focused = ref(false)

watch(
  () => props.value,
  (v) => {
    if (!focused.value) text.value = fmt(v)
  },
)

function parse(raw: string): number | string | null {
  const t = raw.trim()
  if (props.kind === 'text') return t || null
  if (!t) return null
  const n = props.kind === 'int' ? parseInt(t, 10) : parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function commit() {
  focused.value = false
  const v = parse(text.value)
  text.value = fmt(v)
  if (v !== (props.value ?? null)) emit('commit', v)
}

function onFocus(e: FocusEvent) {
  focused.value = true
  if (props.kind !== 'text') (e.target as HTMLInputElement).select()
}
</script>

<template>
  <input
    v-model="text"
    :inputmode="kind === 'text' ? 'text' : kind === 'int' ? 'numeric' : 'decimal'"
    :pattern="kind === 'int' ? '[0-9]*' : undefined"
    :placeholder="placeholder"
    @focus="onFocus"
    @blur="commit"
    @keydown.enter="($event.target as HTMLInputElement).blur()"
  />
</template>
