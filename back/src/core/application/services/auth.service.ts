import type { UserRepositoryPort } from "../ports/out/user-repository.port.js"
import type { TokenVerifierPort } from "../ports/out/token-verifier.port.js"
import type { NoteRepositoryPort } from "../ports/out/note-repository.port.js"
import type { PublicBoardRepositoryPort } from "../ports/out/publicboard-repository.port.js"
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
    legacyUsernames?: string[]
  }
}

export interface ChangeUsernameResult {
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
    legacyUsernames?: string[]
  }
}

export type TokenSigner = (user: User) => Promise<string>

export function createAuthService(
  userRepo: UserRepositoryPort,
  verifier: TokenVerifierPort,
  signToken: TokenSigner,
  deps?: {
    noteRepo?: NoteRepositoryPort
    publicBoardRepo?: PublicBoardRepositoryPort
  },
) {
  const noteRepo = deps?.noteRepo
  const publicBoardRepo = deps?.publicBoardRepo

  const isUsernameAvailable = async (
    requested: string,
    currentUsername?: string,
    currentUserId?: string,
  ): Promise<{ available: boolean; reason?: string }> => {
    if (!requested || typeof requested !== "string") {
      return { available: false, reason: "El nombre de usuario es requerido" }
    }
    const normalized = requested.trim().toLowerCase()
    if (currentUsername && normalized === currentUsername.toLowerCase()) {
      return { available: true, reason: "Es tu nombre de usuario actual" }
    }
    if (!/^[a-z0-9_-]{3,20}$/.test(normalized)) {
      return {
        available: false,
        reason: "Solo letras, números, guiones y guiones bajos (3-20 caracteres)",
      }
    }
    const reserved = [
      "admin",
      "api",
      "auth",
      "dashboard",
      "send",
      "p",
      "login",
      "logout",
      "settings",
      "noty",
      "user",
      "board",
      "public",
    ]
    if (reserved.includes(normalized)) {
      return { available: false, reason: "Este nombre de usuario está reservado" }
    }
    const exists = userRepo.existsByUsernameOrLegacy
      ? await userRepo.existsByUsernameOrLegacy(normalized, currentUserId)
      : await userRepo.existsByUsername(normalized, currentUserId)
    if (exists) {
      return { available: false, reason: "Este nombre de usuario ya está en uso" }
    }
    return { available: true }
  }

  const changeUsername = async (
    userId: string,
    currentUsername: string,
    newUsernameInput: string,
  ): Promise<ChangeUsernameResult> => {
    if (!newUsernameInput || typeof newUsernameInput !== "string") {
      throw new AppError(400, "El nombre de usuario es requerido")
    }
    const newUsername = newUsernameInput.trim().toLowerCase()
    const oldUsername = currentUsername.trim().toLowerCase()

    if (newUsername === oldUsername) {
      const user = await userRepo.findByUsername(oldUsername)
      if (!user) throw new AppError(404, "Usuario no encontrado")
      return {
        success: true,
        message: "El nombre de usuario no ha cambiado",
        token: await signToken(user),
        user: {
          id: (user.id || user._id || userId) as string,
          username: user.username,
          name: user.name || user.username,
          email: user.email || "",
          avatar: user.avatar || "",
          locale: user.locale || "en",
          legacyUsernames: user.legacyUsernames || [],
        },
      }
    }

    if (!/^[a-z0-9_-]{3,20}$/.test(newUsername)) {
      throw new AppError(
        400,
        "El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números, guiones y guiones bajos",
      )
    }

    const reserved = [
      "admin",
      "api",
      "auth",
      "dashboard",
      "send",
      "p",
      "login",
      "logout",
      "settings",
      "noty",
      "user",
      "board",
      "public",
    ]
    if (reserved.includes(newUsername)) {
      throw new AppError(400, "Este nombre de usuario está reservado")
    }

    const isTaken = userRepo.existsByUsernameOrLegacy
      ? await userRepo.existsByUsernameOrLegacy(newUsername, userId)
      : await userRepo.existsByUsername(newUsername, userId)

    if (isTaken) {
      throw new AppError(409, "El nombre de usuario ya está en uso")
    }

    // 1. Actualizar usuario en repositorio y agregar el anterior a sus legacyUsernames
    let updatedUser: User | null = null
    if (userRepo.updateUsername) {
      updatedUser = await userRepo.updateUsername(userId, oldUsername, newUsername)
    } else {
      const user = await userRepo.findByUsername(oldUsername)
      if (user) {
        const legacy = new Set(user.legacyUsernames || [])
        if (oldUsername && oldUsername !== newUsername) {
          legacy.add(oldUsername)
        }
        legacy.delete(newUsername)
        user.legacyUsernames = Array.from(legacy)
        user.username = newUsername
        updatedUser = await userRepo.save(user)
      }
    }

    if (!updatedUser) {
      throw new AppError(404, "No se encontró el usuario para actualizar")
    }

    // 2. Migrar notas/dibujos existentes para conservar todo su historial sin perder nada
    if (noteRepo?.updateBoardUsername) {
      await noteRepo.updateBoardUsername(oldUsername, newUsername)
    }

    // 3. Migrar tablero público existente para conservar sus enlaces previos
    if (publicBoardRepo?.updateOwnerUsername) {
      await publicBoardRepo.updateOwnerUsername(oldUsername, newUsername)
    }

    // 4. Firmar nuevo token de sesión con el nuevo username
    const token = await signToken(updatedUser)

    return {
      success: true,
      message: "Nombre de usuario actualizado con éxito",
      token,
      user: {
        id: (updatedUser.id || updatedUser._id || userId) as string,
        username: updatedUser.username,
        name: updatedUser.name || updatedUser.username,
        email: updatedUser.email || "",
        avatar: updatedUser.avatar || "",
        locale: updatedUser.locale || "en",
        legacyUsernames: updatedUser.legacyUsernames || [],
      },
    }
  }

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
        legacyUsernames: user.legacyUsernames || [],
      },
    }
  }

  return { authenticate, changeUsername, isUsernameAvailable }
}
