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
import { connectDB } from "./lib/db.js"
import { AppError } from "./lib/error.js"

const app = new Hono()

// Middleware de Logs
app.use(logger())

// Habilitar CORS para permitir conexión desde el Frontend
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
)

// Manejo centralizado de errores (reemplaza los try/catch de cada handler)
app.onError((error, c) => {
  if (error instanceof AppError) {
    return c.json({ success: false, message: error.message }, error.status as any)
  }
  console.error("❌ Error no controlado:", error)
  return c.json({ success: false, message: "Error interno del servidor" }, 500)
})

// Inicializar conexión a la base de datos MongoDB
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

// Rutas de Muros Públicos (/public-boards/:username, /public/:slug)
app.route("/", publicBoardRoutes)

// WebSocket en tiempo real (/ws)
app.get("/ws", wsRoutes)

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Server is running on http://localhost:${port}`)
console.log(`🔑 GOOGLE_CLIENT_ID cargado: ${process.env.GOOGLE_CLIENT_ID ? "SÍ ✅ (" + process.env.GOOGLE_CLIENT_ID.substring(0, 15) + "...)" : "NO ❌"}`)

serve({
  fetch: app.fetch,
  port,
  websocket: {
    server: new WebSocketServer({ noServer: true }),
  },
})
