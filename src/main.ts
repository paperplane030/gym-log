import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './style.css'
import { initPwa } from './lib/pwa'

createApp(App).use(createPinia()).use(router).mount('#app')
initPwa()

// 頁面檔案載入失敗（例如新版部署後舊檔案不見了）由 router.onError 處理，見 src/router.ts
