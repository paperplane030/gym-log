<script setup lang="ts">
defineProps<{ title?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-30 flex items-end bg-black/40" @click.self="emit('close')">
      <div
        class="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] dark:bg-neutral-900"
      >
        <div class="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button class="text-sm text-neutral-500" @click="emit('close')">關閉</button>
        </div>
        <div class="overflow-y-auto px-5 pb-5">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
