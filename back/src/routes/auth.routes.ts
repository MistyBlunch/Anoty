import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { googleAuthSchema } from "../schemas/auth.schema.js"
import { mongoUserRepository } from "../repositories/user.repository.js"
import { googleTokenVerifier } from "../services/google-token.service.js"
import { createAuthService } from "../services/auth.service.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/error.js"

const auth = new Hono()
const authService = createAuthService(mongoUserRepository, googleTokenVerifier)

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

export default auth