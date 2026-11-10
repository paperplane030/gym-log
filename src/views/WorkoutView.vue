<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import WorkoutEditor from '@/components/WorkoutEditor.vue'

const route = useRoute()
const router = useRouter()
const back = () => (history.state?.back ? router.back() : router.push('/history'))
</script>

<template>
  <div class="space-y-4">
    <button class="text-sm text-emerald-600 dark:text-emerald-400" @click="back">‹ 返回</button>
    <WorkoutEditor :key="String(route.params.id)" :workout-id="String(route.params.id)" @deleted="router.replace('/history')" />
  </div>
</template>
