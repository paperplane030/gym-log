<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import SyncBadge from '@/components/SyncBadge.vue'
import { supabaseConfigured } from '@/lib/supabase'

const route = useRoute()
const showChrome = computed(() => !route.meta.public)
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-lg flex-col">
    <div
      v-if="!supabaseConfigured"
      class="bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
    >
      尚未設定 Supabase：請複製 <code>.env.example</code> 為 <code>.env</code> 並填入網址與金鑰。
    </div>

    <header
      v-if="showChrome"
      class="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85"
    >
      <h1 class="text-lg font-semibold">{{ route.meta.title }}</h1>
      <SyncBadge />
    </header>

    <main class="flex-1 px-4 py-4" :class="showChrome && 'pb-28'">
      <RouterView />
    </main>

    <BottomNav v-if="showChrome" />
  </div>
</template>
