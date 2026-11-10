<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const error = ref('')
const loading = ref(false)

async function login() {
  loading.value = true
  error.value = ''
  try {
    await auth.signInWithGoogle()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[80dvh] flex-col items-center justify-center gap-8 text-center">
    <img src="/icon.svg" alt="" class="h-20 w-20 rounded-2xl" />
    <div>
      <h1 class="text-2xl font-bold">Gym Log</h1>
      <p class="mt-1 text-neutral-500">記錄每一組的重量與次數</p>
    </div>
    <button class="btn-primary w-full max-w-xs" :disabled="loading" @click="login">
      {{ loading ? '前往 Google…' : '使用 Google 登入' }}
    </button>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
  </div>
</template>
