import { useEffect, useRef } from "react"
import { apiUrl } from "@/lib/api"
import { RealtimeClient, wsUrlFromApi } from "@/lib/realtime"
import type { AuthenticatedUser } from "@/types/auth"

export function useRealtimeNotifications(
  user: AuthenticatedUser | null,
  onNewData: () => void,
) {
  const onNewDataRef = useRef(onNewData)
  onNewDataRef.current = onNewData

  useEffect(() => {
    if (!user) return
    const client = new RealtimeClient(
      `${wsUrlFromApi(apiUrl)}/ws`,
      {
        onEvent: (event) => {
          if (event.type === "new-drawing") onNewDataRef.current()
        },
        onOpen: () => {
          // Catch-up: ante una conexión o reconexión se sincroniza el muro
          onNewDataRef.current()
        },
      },
      () => {
        if (typeof window === "undefined") return null
        return localStorage.getItem("token")
      },
    )
    client.connect()
    return () => client.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username])
}