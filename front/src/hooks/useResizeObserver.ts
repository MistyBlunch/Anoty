import { useEffect, type DependencyList, type RefObject } from "react"

export function useResizeObserver<T extends Element>(
  ref: RefObject<T | null>,
  onResize: () => void,
  deps: DependencyList = [],
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}