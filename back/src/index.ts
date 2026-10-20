import "dotenv/config"
import { WebSocketServer } from "ws"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import authRoutes from "./routes/auth.routes.js"
import boardRoutes from "./routes/board.routes.js"
import publicBoardRoutes from "./routes/publicboard.routes.js"
import { wsRoutes } from "./routes/ws.routes.js"
import mongoose from "mongoose"
import { connectDB } from "./lib/db.js"
import { AppError } from "./lib/error.js"
import { defaultEmailService } from "./services/email/index.js"

import { secureHeaders } from "hono/secure-headers"
import { bodyLimit } from "hono/body-limit"
import { createRateLimiter } from "./middleware/rate-limiter.middleware.js"

const app = new Hono()

// Middleware de Logs
app.use(logger())

// Cabeceras de seguridad HTTP (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
app.use("*", secureHeaders())

// Protección contra desbordamiento de memoria por payloads gigantes (DDoS / Memory Exhaustion)
app.use(
  "*",
  bodyLimit({
    maxSize: 1024 * 1024, // 1MB máximo por petición
    onError: (c) =>
      c.json(
        {
          success: false,
          message: "El tamaño del contenido excede el límite permitido (1MB).",
        },
        413,
      ),
  }),
)

// Habilitar CORS para permitir conexión desde el Frontend
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
)

// Rate Limiting Global por IP (Prevención de saturación y abuso)
app.use(
  "*",
  createRateLimiter({
    windowMs: 60_000,
    max: 150,
    skip: (c) => c.req.path === "/" || c.req.path === "/favicon.ico",
    message: "Has superado el límite global de peticiones. Por favor espera un momento.",
  }),
)

// Rate Limiting estricto para rutas de Autenticación (Prevención de ataques de fuerza bruta)
app.use(
  "/auth/*",
  createRateLimiter({
    windowMs: 60_000,
    max: 20,
    message: "Demasiados intentos hacia el servicio de autenticación. Por favor espera un minuto.",
  }),
)

// Middleware para garantizar que la conexión a MongoDB esté lista antes de procesar peticiones
app.use("*", async (c, next) => {
  if (c.req.path === "/" || c.req.path === "/favicon.ico") {
    return next()
  }
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB()
    } catch (err) {
      console.error("❌ [DB Middleware] Base de datos no disponible para:", c.req.path, err)
      return c.json({ success: false, message: "Base de datos temporalmente no disponible" }, 503)
    }
  }
  return next()
})

// Manejo centralizado de errores (reemplaza los try/catch de cada handler)
app.onError((error, c) => {
  if (error instanceof AppError) {
    return c.json({ success: false, message: error.message }, error.status as any)
  }

  // Manejo de condición de carrera en MongoDB (Duplicate Key Error E11000)
  const errAny = error as any
  const isDuplicateKey =
    errAny?.code === 11000 ||
    (errAny?.name === "MongoServerError" && errAny?.code === 11000) ||
    errAny?.message?.includes("E11000")

  if (isDuplicateKey) {
    return c.json(
      {
        success: false,
        message: "Conflicto de concurrencia: el recurso o identificador ya existe o fue reclamado.",
      },
      409,
    )
  }

  console.error("❌ Error no controlado:", error)
  return c.json({ success: false, message: "Error interno del servidor" }, 500)
})

// Inicializar conexión a la base de datos MongoDB al arrancar
connectDB().catch((err) => {
  console.error("Error al inicializar la base de datos:", err)
})

// Healthcheck endpoint
app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "Anoty Backend API running",
    timestamp: new Date().toISOString(),
  })
})

// Rutas de Autenticación (/auth/google)
app.route("/auth", authRoutes)

// Rutas de Tablero y Notas (/board/my-notes/:username, /board/send/:username, /board/notes/:noteId)
app.route("/board", boardRoutes)

// Rutas de Tableros Públicos (/public-boards/:username, /public/:slug)
app.route("/", publicBoardRoutes)

// WebSocket en tiempo real (/ws)
app.get("/ws", wsRoutes)

const port = Number(process.env.PORT) || 3000
const hostname = process.env.HOST || "0.0.0.0"

console.log(`🚀 Server is running on http://${hostname}:${port}`)
console.log(`🔑 GOOGLE_CLIENT_ID cargado: ${process.env.GOOGLE_CLIENT_ID ? "SÍ ✅ (" + process.env.GOOGLE_CLIENT_ID.substring(0, 15) + "...)" : "NO ❌"}`)
console.log(`📧 Notificaciones por correo: ${defaultEmailService.isConfigured() ? "ACTIVADAS ✅" : "DESACTIVADAS ❌ (proveedor de correo no configurado)"}`)

serve(
  {
    fetch: app.fetch,
    port,
    hostname,
    websocket: {
      server: new WebSocketServer({ noServer: true }),
    },
  },
  (info) => {
    console.log(`🚀 Server is listening on http://${info.address}:${info.port}`)
  },
)
