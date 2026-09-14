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

export const googleTokenVerifier: GoogleIdTokenVerifier = {
  async verify(idToken) {
    // Caso 1: Access Token de Google (inicia con "ya29.")
    if (idToken.startsWith("ya29.")) {
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!userInfoResponse.ok) {
        throw new AppError(401, "Token de Google inválido o expirado")
      }

      const userInfo = (await userInfoResponse.json()) as GoogleUserInfo
      return {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name,
        picture: userInfo.picture,
      }
    }

    // Caso 2: ID Token JWT de 3 partes verificado con Google Auth Library
    if (idToken.split(".").length === 3 && process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      if (!payload) {
        throw new AppError(400, "Token de Google inválido")
      }
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      }
    }

    throw new AppError(401, "Token de Google inválido o expirado")
  },
}