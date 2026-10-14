import type { UserRepositoryPort } from "../ports/out/user-repository.port.js"
import type { TokenVerifierPort } from "../ports/out/token-verifier.port.js"
import type { User } from "../../domain/index.js"
import { AppError } from "../../domain/index.js"

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
    locale?: "es" | "en"
  }
}

export type TokenSigner = (user: User) => Promise<string>

export function createAuthService(
  userRepo: UserRepositoryPort,
  verifier: TokenVerifierPort,
  signToken: TokenSigner,
) {
  const authenticate = async (idToken: string): Promise<AuthResult> => {
    const googleUser = await verifier.verifyGoogleToken(idToken)
    if (!googleUser || !googleUser.id) {
      throw new AppError(400, "No se pudieron obtener los datos de la cuenta de Google")
    }

    const { id: googleId, email, name, picture: avatar } = googleUser

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
      user = await userRepo.save(user)
    }

    return {
      success: true,
      message: "Autenticación con Google exitosa",
      token: await signToken(user),
      user: {
        id: (user.id || "") as string,
        username: user.username,
        name: user.name || user.username,
        email: user.email || "",
        avatar: user.avatar || "",
        locale: user.locale || "en",
      },
    }
  }

  return { authenticate }
}
