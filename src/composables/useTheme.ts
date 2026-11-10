import { ref, watch } from 'vue'

export type ThemePref = 'system' | 'light' | 'dark'

const read = (): ThemePref => {
  try {
    const v = localStorage.getItem('theme')
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

const pref = ref<ThemePref>(read())
const media = matchMedia('(prefers-color-scheme: dark)')

function apply() {
  const dark = pref.value === 'dark' || (pref.value === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0a0a0a' : '#ffffff')
}

media.addEventListener('change', apply)
watch(pref, (v) => {
  try {
    localStorage.setItem('theme', v)
  } catch {
    /* ignore */
  }
  apply()
}, { immediate: true })

export function useTheme() {
  return { pref }
}
