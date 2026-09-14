import { useCallback, useEffect, useRef, useState } from "react"
import { copyText } from "@/lib/clipboard"

export function useClipboard(timeoutMs = 1500) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  const copy = useCallback(
    async (text: string) => {
      await copyText(text)
      setCopied(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), timeoutMs)
    },
    [timeoutMs],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  return { copied, copy }
}