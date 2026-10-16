import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/router"
import type { AuthenticatedUser } from "@/types/auth"
import { api } from "@/lib/api"

interface UseAuthOptions {
  redirect?: boolean
}

export function useAuth({ redirect = true }: UseAuthOptions = {}) {
  const router = useRouter()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (process.env.NODE_ENV !== "production") {
      let qToken = router.query.__dev_token as string | undefined
      let qUser = router.query.__dev_user as string | undefined
      if ((!qToken || !qUser) && typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search)
        qToken = qToken || sp.get("__dev_token") || undefined
        qUser = qUser || sp.get("__dev_user") || undefined
      }
      if (qToken && qUser) {
        localStorage.setItem("token", qToken)
        localStorage.setItem("user", qUser)
      }
    }

    const saved = localStorage.getItem("user")
    if (!saved) {
      setIsReady(true)
      if (redirect) router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(saved) as AuthenticatedUser
      api.get<{ success: boolean; user?: AuthenticatedUser }>("/auth/me").then(({ success, user: meUser }) => {
        if (cancelled) return
        if (success) {
          const activeUser = meUser || parsedUser
          setUser(activeUser)
          localStorage.setItem("user", JSON.stringify(activeUser))
        } else {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          if (redirect) router.push("/")
        }
        setIsReady(true)
      }).catch(() => {
        if (cancelled) return
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        if (redirect) router.push("/")
        setIsReady(true)
      })
    } catch {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (redirect) router.push("/")
      setIsReady(true)
    }

    return () => { cancelled = true }
  }, [router, redirect])

  const saveSession = useCallback(
    (u: AuthenticatedUser, token?: string) => {
      if (token) localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(u))
      setUser(u)
      setIsReady(true)
    },
    [],
  )

  const updateUsername = useCallback(
    async (newUsername: string) => {
      const res = await api.patch<{
        success: boolean
        message: string
        token?: string
        user?: AuthenticatedUser
      }>("/auth/username", { username: newUsername })

      if (res.success && res.user && res.token) {
        saveSession(res.user, res.token)
        return { success: true, message: res.message }
      }
      return { success: false, message: res.message || "Error al actualizar" }
    },
    [saveSession],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    setIsReady(true)
    router.push("/")
  }, [router])

  return { user, setUser, saveSession, updateUsername, logout, isReady }
}