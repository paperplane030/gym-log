import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabaseConfigured } from '@/lib/supabase'
import { applyUpdateAndGo, hasPendingUpdate, isChunkLoadError, reloadTo } from '@/lib/pwa'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: () => import('@/views/TodayView.vue'), meta: { title: '今日訓練' } },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue'), meta: { title: '歷史紀錄' } },
    { path: '/exercises', name: 'exercises', component: () => import('@/views/ExercisesView.vue'), meta: { title: '動作庫' } },
    { path: '/templates', name: 'templates', component: () => import('@/views/TemplatesView.vue'), meta: { title: '課表範本' } },
    { path: '/templates/:id', name: 'template', component: () => import('@/views/TemplateEditView.vue'), meta: { title: '編輯範本' } },
    { path: '/workouts/:id', name: 'workout', component: () => import('@/views/WorkoutView.vue'), meta: { title: '訓練紀錄' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '設定' } },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to, from) => {
  // 有新版在等待 → 切換頁面時順便更新（第一次進入 App 時不處理）
  if (from.matched.length && hasPendingUpdate()) {
    applyUpdateAndGo(router.resolve(to).href)
    return false
  }
  if (!supabaseConfigured) return true // 還沒設定 Supabase 時先讓畫面能看
  const auth = useAuthStore()
  await auth.init()
  if (!to.meta.public && !auth.user) return { name: 'login' }
  if (to.name === 'login' && auth.user) return { name: 'today' }
  return true
})

// 頁面檔案載入失敗（例如新版部署後舊檔案已不存在）→ 重新整理到目標頁面
router.onError((err, to) => {
  if (isChunkLoadError(err)) reloadTo(to?.fullPath ?? location.href)
})
