import Sortable from 'sortablejs'
import type { Directive } from 'vue'

type OnMove = (from: number, to: number) => void

const instances = new WeakMap<HTMLElement, { sortable: Sortable; onMove: OnMove }>()

/**
 * 拖曳排序：v-sortable="(from, to) => ..."
 * 只能按住 .drag-handle 拖曳。DOM 會先還原，交給 Vue 依資料重新渲染。
 */
export const vSortable: Directive<HTMLElement, OnMove> = {
  mounted(el, binding) {
    const state = { onMove: binding.value } as { sortable: Sortable; onMove: OnMove }
    state.sortable = Sortable.create(el, {
      handle: '.drag-handle',
      draggable: '.sortable-item',
      animation: 150,
      ghostClass: 'opacity-30',
      onEnd(e) {
        const { oldDraggableIndex: from, newDraggableIndex: to, item } = e
        if (from == null || to == null || from === to) return
        // 還原 Sortable 對 DOM 的修改，避免和 Vue 的渲染衝突
        const parent = e.from
        parent.removeChild(item)
        parent.insertBefore(item, parent.querySelectorAll(':scope > .sortable-item')[from] ?? null)
        state.onMove(from, to)
      },
    })
    instances.set(el, state)
  },
  updated(el, binding) {
    const s = instances.get(el)
    if (s) s.onMove = binding.value
  },
  unmounted(el) {
    instances.get(el)?.sortable.destroy()
    instances.delete(el)
  },
}
