<script setup lang="ts">
import { useSyncStore } from '@/stores/sync'

const s = useSyncStore()
</script>

<template>
  <button class="flex items-center gap-1.5 text-xs text-neutral-500" @click="s.sync()">
    <span
      class="h-2 w-2 rounded-full"
      :class="!s.online ? 'bg-neutral-400' : s.error ? 'bg-red-500' : s.syncing ? 'animate-pulse bg-amber-400' : 'bg-emerald-500'"
    />
    {{ !s.online ? '離線' : s.error ? '同步失敗' : s.syncing ? '同步中' : '已同步' }}
  </button>
</template>
