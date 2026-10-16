import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { googleAuthSchema } from "../schemas/auth.schema.js"
import { mongoUserRepository } from "../infrastructure/adapters/out/persistence/mongo-user.repository.js"
import { authService } from "../infrastructure/config/container.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { verifySessionToken } from "../lib/auth.js"
import { AppError } from "../lib/error.js"

const auth = new Hono()

// POST /auth/google - Autenticación con Google OAuth (id_token o access_token)
auth.post(
  "/google",
  zValidator("json", googleAuthSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: result.error.issues,
        },
        400,
      )
    }
  }),
  async (c) => {
    try {
      const { idToken } = c.req.valid("json")
      const result = await authService.authenticate(idToken)
      return c.json(result)
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ success: false, message: error.message }, error.status as any)
      }
      console.error("❌ [Backend /auth/google] Error en la autenticación de Google:", error)
      return c.json({ success: false, message: "Error al verificar la cuenta de Google" }, 401)
    }
  },
)

// GET /auth/me - Valida la sesión del usuario autenticado
auth.get("/me", authMiddleware, async (c) => {
  const { sub: id, username } = c.get("authUser")
  const user = await mongoUserRepository.findByUsername(username)
  return c.json({
    success: true,
    user: {
      id,
      username,
      name: user?.name,
      avatar: user?.avatar,
      email: user?.email,
      locale: user?.locale || "en",
    },
  })
})

// PATCH /auth/preferences - Actualizar preferencias del usuario (ej. idioma)
auth.patch("/preferences", authMiddleware, async (c) => {
  const { username } = c.get("authUser")
  const body = (await c.req.json().catch(() => ({}))) as { locale?: string }
  const locale = body?.locale === "es" ? "es" : "en"
  const user = await mongoUserRepository.updateLocale(username, locale)

  return c.json({
    success: true,
    message: "Preferencias actualizadas",
    locale: user?.locale || locale,
  })
})

// GET /auth/check-username/:username - Verifica disponibilidad de un nombre de usuario
auth.get("/check-username/:username", async (c) => {
  const username = c.req.param("username")
  let currentUsername: string | undefined
  let currentUserId: string | undefined
  const header = c.req.header("Authorization")
  if (header?.startsWith("Bearer ")) {
    try {
      const token = header.slice("Bearer ".length).trim()
      const payload = await verifySessionToken(token)
      currentUsername = payload.username
      currentUserId = payload.sub
    } catch {
      // Ignorar token inválido
    }
  }
  const result = await authService.isUsernameAvailable(username, currentUsername, currentUserId)
  return c.json({ success: true, username, ...result })
})

// PATCH /auth/username - Cambia el nombre de usuario y migra todas sus referencias
auth.patch("/username", authMiddleware, async (c) => {
  const { sub: userId, username: currentUsername } = c.get("authUser")
  const body = (await c.req.json().catch(() => ({}))) as { username?: string }
  const newUsername = body?.username
  if (!newUsername) {
    return c.json({ success: false, message: "El nombre de usuario es requerido" }, 400)
  }

  try {
    const result = await authService.changeUsername(userId, currentUsername, newUsername)
    return c.json(result)
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.status as any)
    }
    console.error("❌ [Backend /auth/username] Error al cambiar username:", error)
    return c.json({ success: false, message: "Error interno al cambiar el nombre de usuario" }, 500)
  }
})

export default auth