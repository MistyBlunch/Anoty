import { useEffect, useRef } from "react"
import { apiUrl } from "@/lib/api"
import { RealtimeClient, wsUrlFromApi, type RealtimeEvent } from "@/lib/realtime"

export const BOARD_CHANNEL_PREFIX = "board:"

interface UseRealtimeBoardOptions {
  slug: string | null
  enabled?: boolean
  onBoardUpdated: (updatedAt: string) => void
  onBoardHidden: () => void
  onOpen?: () => void
}

export function useRealtimeBoard({
  slug,
  enabled = true,
  onBoardUpdated,
  onBoardHidden,
  onOpen,
}: UseRealtimeBoardOptions) {
  const handlersRef = useRef({ onBoardUpdated, onBoardHidden, onOpen })
  handlersRef.current = { onBoardUpdated, onBoardHidden, onOpen }

  useEffect(() => {
    if (!enabled || !slug) return

    const handleEvent = (event: RealtimeEvent) => {
      if (event.slug !== slug) return
      if (event.type === "board-updated") {
        handlersRef.current.onBoardUpdated(typeof event.updatedAt === "string" ? event.updatedAt : "")
      } else if (event.type === "board-hidden") {
        handlersRef.current.onBoardHidden()
      }
    }

    const client = new RealtimeClient(`${wsUrlFromApi(apiUrl)}/ws`, {
      onEvent: handleEvent,
      onOpen: () => handlersRef.current.onOpen?.(),
    })
    client.subscribe(`${BOARD_CHANNEL_PREFIX}${slug}`)
    client.connect()
    return () => client.close()
  }, [enabled, slug])
}