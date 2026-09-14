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
  return c.json({
    success: true,
    user: { id, username },
  })
})

export default auth