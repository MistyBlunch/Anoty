import { OAuth2Client } from "google-auth-library"
import { AppError } from "../lib/error.js"

export interface GoogleUserInfo {
  sub: string
  email?: string
  name?: string
  given_name?: string
  picture?: string
}

export interface GoogleIdTokenVerifier {
  verify(idToken: string): Promise<GoogleUserInfo | null>
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) return null
  const userInfo = (await res.json()) as GoogleUserInfo
  if (!userInfo?.sub) return null
  return userInfo
}

function isJwtLike(token: string): boolean {
  const segments = token.split(".")
  if (segments.length !== 3) return false
  try {
    const envelope = JSON.parse(Buffer.from(segments[0], "base64url").toString("utf8"))
    return !!envelope && typeof envelope === "object"
  } catch {
    return false
  }
}

export const googleTokenVerifier: GoogleIdTokenVerifier = {
  async verify(idToken) {
    // Caso 1: Access Token de Google. El endpoint userinfo acepta cualquier access
    // token válido (formatos ya29., JWT u opacos) sin depender del prefijo.
    try {
      const userInfo = await fetchUserInfo(idToken)
      if (userInfo) {
        return {
          sub: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name || userInfo.given_name,
          picture: userInfo.picture,
        }
      }
    } catch {
      // Error de red u otro: se continúa con la verificación de ID token
    }

    // Caso 2: ID Token JWT de 3 partes verificado con Google Auth Library
    if (isJwtLike(idToken) && process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      if (payload) {
        return {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        }
      }
    }

    throw new AppError(401, "Token de Google inválido o expirado")
  },
}