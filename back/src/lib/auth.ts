import { sign, verify } from "hono/jwt"

export interface SessionPayload {
  sub: string
  username: string
}

const DEFAULT_SECRET = "noty-dev-insecure-secret"

export function jwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET
}

export async function signSessionToken(user: { _id?: string; id?: string; username: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: (user._id || user.id) as string,
      username: user.username,
      iat: now,
      exp: now + 7 * 24 * 60 * 60,
    },
    jwtSecret(),
    "HS256",
  )
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const payload = await verify(token, jwtSecret(), "HS256")
  return { sub: payload.sub as string, username: payload.username as string }
}