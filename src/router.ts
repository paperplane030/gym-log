import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabaseConfigured } from '@/lib/supabase'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: () => import('@/views/TodayView.vue'), meta: { title: '今日訓練' } },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue'), meta: { title: '歷史紀錄' } },
    { path: '/exercises', name: 'exercises', component: () => import('@/views/ExercisesView.vue'), meta: { title: '動作庫' } },
    { path: '/templates', name: 'templates', component: () => import('@/views/TemplatesView.vue'), meta: { title: '課表範本' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '設定' } },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  if (!supabaseConfigured) return true // 還沒設定 Supabase 時先讓畫面能看
  const auth = useAuthStore()
  await auth.init()
  if (!to.meta.public && !auth.user) return { name: 'login' }
  if (to.name === 'login' && auth.user) return { name: 'today' }
  return true
})
