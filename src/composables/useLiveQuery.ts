import { liveQuery } from 'dexie'
import { onScopeDispose, shallowRef, type Ref } from 'vue'

/** 訂閱 Dexie 查詢，本機資料變動時畫面自動更新 */
export function useLiveQuery<T>(query: () => T | Promise<T>, initial: T): Ref<T> {
  const value = shallowRef(initial) as Ref<T>
  const sub = liveQuery(query).subscribe({
    next: (v) => (value.value = v),
    error: (e) => console.error(e),
  })
  onScopeDispose(() => sub.unsubscribe())
  return value
}
