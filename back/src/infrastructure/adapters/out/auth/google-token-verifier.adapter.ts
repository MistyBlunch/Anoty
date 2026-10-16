import { OAuth2Client } from "google-auth-library"
import type {
  TokenVerifierPort,
  GoogleUserData,
} from "../../../../core/application/ports/out/token-verifier.port.js"

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

async function fetchUserInfo(accessToken: string): Promise<any | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) return null
  const userInfo: any = await res.json()
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

export class GoogleTokenVerifierAdapter implements TokenVerifierPort {
  async verifyGoogleToken(token: string): Promise<GoogleUserData | null> {
    try {
      const userInfo = await fetchUserInfo(token)
      if (userInfo) {
        return {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name || userInfo.given_name,
          picture: userInfo.picture,
        }
      }
    } catch {
      // Continue to JWT fallback
    }

    if (isJwtLike(token) && process.env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        })
        const payload = ticket.getPayload()
        if (payload?.sub) {
          return {
            id: payload.sub,
            email: payload.email || "",
            name: payload.name || payload.given_name || "",
            picture: payload.picture || "",
          }
        }
      } catch {
        // Continue
      }
    }

    return null
  }
}

export const googleTokenVerifierAdapter = new GoogleTokenVerifierAdapter()
