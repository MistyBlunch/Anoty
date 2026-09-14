import { useEffect } from "react"
import { api } from "@/lib/api"
import type { AuthenticatedUser } from "@/types/auth"

export function useNotifications(
  user: AuthenticatedUser | null,
  onNewData: () => void,
  intervalMs = 15000,
) {
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/board/my-notes/${user.username}/unseen-count`)
        const count = (data as unknown as Record<string, unknown>).unseenDrawingCount as number
        if (data.success && count > 0) onNewData()
      } catch (error) {
        console.error("Error al verificar dibujos nuevos:", error)
      }
    }, intervalMs)
    return () => clearInterval(interval)
  }, [user, onNewData, intervalMs])
}