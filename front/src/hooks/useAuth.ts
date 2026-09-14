import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/router"
import type { AuthenticatedUser } from "@/types/auth"

interface UseAuthOptions {
  redirect?: boolean
}

export function useAuth({ redirect = true }: UseAuthOptions = {}) {
  const router = useRouter()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("user")
    if (!saved) {
      if (redirect) router.push("/")
      return
    }
    try {
      setUser(JSON.parse(saved) as AuthenticatedUser)
    } catch {
      if (redirect) router.push("/")
    }
  }, [router, redirect])

  const saveSession = useCallback(
    (u: AuthenticatedUser, token?: string) => {
      if (token) localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(u))
      setUser(u)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/")
  }, [router])

  return { user, setUser, saveSession, logout }
}