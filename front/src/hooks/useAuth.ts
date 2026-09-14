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

    const saved = localStorage.getItem("user")
    if (!saved) {
      setIsReady(true)
      if (redirect) router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(saved) as AuthenticatedUser
      api.get<{ success: boolean }>("/auth/me").then(({ success }) => {
        if (cancelled) return
        if (success) {
          setUser(parsedUser)
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

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    setIsReady(true)
    router.push("/")
  }, [router])

  return { user, setUser, saveSession, logout, isReady }
}