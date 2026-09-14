import type { ApiResult } from "@/types/api"

export const apiUrl = (typeof process === "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL) || "http://localhost:3000"

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function initWithBody(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      ...authHeaders(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }
}

export async function apiFetch<T = ApiResult>(path: string, init?: RequestInit): Promise<T> {
  const merged = {
    ...init,
    headers: {
      ...authHeaders(),
      ...init?.headers,
    },
  }
  const res = await fetch(`${apiUrl}${path}`, merged)
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return (data as T) ?? ({} as T)
}

export const api = {
  get: <T = ApiResult>(path: string) => apiFetch<T>(path),
  post: <T = ApiResult>(path: string, body?: unknown) => apiFetch<T>(path, initWithBody("POST", body)),
  patch: <T = ApiResult>(path: string, body?: unknown) => apiFetch<T>(path, initWithBody("PATCH", body)),
  delete: <T = ApiResult>(path: string) => apiFetch<T>(path, { method: "DELETE", headers: authHeaders() }),
}