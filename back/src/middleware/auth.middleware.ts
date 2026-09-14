import type { MiddlewareHandler } from "hono"
import { AppError } from "../lib/error.js"
import { verifySessionToken, type SessionPayload } from "../lib/auth.js"

declare module "hono" {
  interface ContextVariableMap {
    authUser: SessionPayload
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("Authorization")
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "No autorizado")
  }

  const token = header.slice("Bearer ".length).trim()
  if (!token) {
    throw new AppError(401, "No autorizado")
  }

  try {
    const payload = await verifySessionToken(token)
    c.set("authUser", payload)
  } catch {
    throw new AppError(401, "No autorizado")
  }

  await next()
}