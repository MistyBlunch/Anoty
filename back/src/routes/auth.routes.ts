import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { OAuth2Client } from "google-auth-library"
import { googleAuthSchema } from "../schemas/auth.schema.js"
import { User } from "../models/user.model.js"

const auth = new Hono()

// Inicializar cliente OAuth de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

interface GoogleUserInfo {
  sub: string
  email?: string
  name?: string
  given_name?: string
  picture?: string
}

// POST /auth/google - Autenticación con Google OAuth (id_token o access_token)
auth.post(
  "/google",
  zValidator("json", googleAuthSchema, (result, c) => {
    if (!result.success) {
      console.error("❌ [Backend /auth/google] Error de validación Zod:", result.error.issues)
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
      const googleClientId = process.env.GOOGLE_CLIENT_ID

      console.log("--------------------------------------------------")
      console.log("🔑 [Backend /auth/google] Petición recibida.")
      console.log("🔑 [Backend /auth/google] Token recibido (inicio):", idToken ? `${idToken.substring(0, 25)}...` : "VACÍO")
      console.log("⚙️ [Backend /auth/google] GOOGLE_CLIENT_ID activo:", googleClientId ? `${googleClientId.substring(0, 20)}...` : "NO CONFIGURADO")

      let googleUser: { sub: string; email?: string; name?: string; picture?: string } | undefined

      // Caso 1: El token recibido es un Access Token de Google (inicia con "ya29.")
      if (idToken.startsWith("ya29.")) {
        console.log("🌐 [Backend /auth/google] Detectado Access Token de Google (ya29). Consultando UserInfo API de Google...")
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (!userInfoResponse.ok) {
          console.error("❌ [Backend /auth/google] Error al consultar Google UserInfo API:", await userInfoResponse.text())
          return c.json({ success: false, message: "Token de Google inválido o expirado" }, 401)
        }

        const userInfo = (await userInfoResponse.json()) as GoogleUserInfo
        console.log("✅ [Backend /auth/google] Información REAL de tu cuenta obtenida de Google:")
        console.log(JSON.stringify(userInfo, null, 2))

        googleUser = {
          sub: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name || userInfo.given_name,
          picture: userInfo.picture,
        }
      } 
      // Caso 2: Es un ID Token de 3 partes (JWT)
      else if (idToken.split(".").length === 3 && googleClientId) {
        console.log("⏳ [Backend /auth/google] Detectado ID Token (JWT). Verificando con Google Auth Library...")
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: googleClientId,
        })
        const payload = ticket.getPayload()
        if (!payload) {
          return c.json({ success: false, message: "Token de Google inválido" }, 400)
        }
        console.log("✅ [Backend /auth/google] Payload oficial de Google obtenido:")
        console.log(JSON.stringify(payload, null, 2))
        googleUser = {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        }
      } 
      // Caso 3: Fallback modo desarrollo
      else {
        console.warn("⚠️ [Backend /auth/google] Token desconocido o sin Client ID. Ejecutando fallback de pruebas.")
        const parts = idToken.split(".")
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"))
          googleUser = {
            sub: payload.sub || "mock_google_id_" + Date.now(),
            email: payload.email || "user@gmail.com",
            name: payload.name || "Usuario Google",
            picture: payload.picture || "",
          }
        } else {
          googleUser = {
            sub: "google_user_" + idToken.substring(0, 10),
            email: `google_${idToken.substring(0, 5)}@gmail.com`,
            name: "Usuario Google",
          }
        }
      }

      if (!googleUser || !googleUser.sub) {
        return c.json({ success: false, message: "No se pudieron obtener los datos de la cuenta de Google" }, 400)
      }

      const { sub: googleId, email, name, picture: avatar } = googleUser

      // Buscar si el usuario existe en MongoDB por googleId o email
      let user = await User.findOne({
        $or: [{ googleId }, ...(email ? [{ email }] : [])],
      })

      if (!user) {
        const baseUsername = (email ? email.split("@")[0] : name || "user")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
        let uniqueUsername = baseUsername
        let counter = 1

        while (await User.findOne({ username: uniqueUsername })) {
          uniqueUsername = `${baseUsername}${counter}`
          counter++
        }

        user = await User.create({
          googleId,
          email,
          name,
          avatar,
          username: uniqueUsername,
        })
        console.log("✨ [Backend /auth/google] ¡NUEVO usuario guardado en MongoDB con éxito!:", {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
        })
      } else {
        if (!user.googleId) user.googleId = googleId
        if (avatar) user.avatar = avatar
        if (name && !user.name) user.name = name
        await user.save()
        console.log("👤 [Backend /auth/google] Usuario existente encontrado y actualizado en MongoDB:", {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
        })
      }

      console.log("--------------------------------------------------")

      return c.json({
        success: true,
        message: "Autenticación con Google exitosa",
        token: `jwt-google-token-${user._id}`,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      })
    } catch (error) {
      console.error("❌ [Backend /auth/google] Error en la autenticación de Google:", error)
      return c.json(
        {
          success: false,
          message: "Error al verificar la cuenta de Google",
        },
        401,
      )
    }
  },
)

export default auth
