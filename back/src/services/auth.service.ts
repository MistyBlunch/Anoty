import type { UserRepository } from "../repositories/user.repository.js"
import type { GoogleIdTokenVerifier } from "./google-token.service.js"
import { AppError } from "../lib/error.js"

export interface AuthResult {
  success: boolean
  message: string
  token: string
  user: {
    id: string
    username: string
    name: string
    email: string
    avatar: string
  }
}

export function createAuthService(
  userRepo: UserRepository,
  verifier: GoogleIdTokenVerifier,
) {
  const authenticate = async (idToken: string): Promise<AuthResult> => {
    const googleUser = await verifier.verify(idToken)
    if (!googleUser || !googleUser.sub) {
      throw new AppError(400, "No se pudieron obtener los datos de la cuenta de Google")
    }

    const { sub: googleId, email, name, picture: avatar } = googleUser

    let user = await userRepo.findByGoogleIdOrEmail(googleId, email)

    if (!user) {
      const baseUsername = (email ? email.split("@")[0] : name || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
      let uniqueUsername = baseUsername
      let counter = 1

      while (await userRepo.existsByUsername(uniqueUsername)) {
        uniqueUsername = `${baseUsername}${counter}`
        counter++
      }

      user = await userRepo.create({
        googleId,
        email,
        name,
        avatar,
        username: uniqueUsername,
      })
    } else {
      if (!user.googleId) user.googleId = googleId
      if (avatar) user.avatar = avatar
      if (name && !user.name) user.name = name
      await userRepo.save(user)
    }

    return {
      success: true,
      message: "Autenticación con Google exitosa",
      token: `jwt-google-token-${user._id}`,
      user: {
        id: user._id as string,
        username: user.username,
        name: user.name || user.username,
        email: user.email || "",
        avatar: user.avatar || "",
      },
    }
  }

  return { authenticate }
}