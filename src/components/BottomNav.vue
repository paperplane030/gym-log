<script setup lang="ts">
const items = [
  { to: '/', label: '訓練', icon: 'M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11' },
  { to: '/history', label: '紀錄', icon: 'M12 7v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  { to: '/templates', label: '範本', icon: 'M9 5h10M9 12h10M9 19h10M5 5h.01M5 12h.01M5 19h.01' },
  { to: '/exercises', label: '動作', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/settings', label: '設定', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z' },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90"
  >
    <ul class="mx-auto flex max-w-lg">
      <li v-for="item in items" :key="item.to" class="flex-1">
        <RouterLink
          :to="item.to"
          class="flex flex-col items-center gap-1 py-2 text-xs text-neutral-500 dark:text-neutral-400"
          exact-active-class="!text-emerald-600 dark:!text-emerald-400"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
