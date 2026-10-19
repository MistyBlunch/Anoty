import { Hono, type Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createNoteSchema, updateNotePositionSchema } from "../schemas/board.schema.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { createRateLimiter, getClientIp } from "../middleware/rate-limiter.middleware.js"
import { AppError } from "../lib/error.js"
import { boardService } from "../infrastructure/config/container.js"

const board = new Hono()

const validationError = (result: { success: boolean; error?: any }, c: any) => {
  if (!result.success) {
    return c.json({ success: false, errors: result.error?.issues || [] }, 400)
  }
}

const sendNoteIpLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  cooldownMs: 1500,
  keyGenerator: (c) => `send_ip:${getClientIp(c)}`,
  message: "Has enviado notas demasiado rápido. Por favor, espera unos momentos antes de enviar otra.",
})

const sendNoteBoardLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyGenerator: (c) => `send_board:${(c.req.param("username") || "unknown").toLowerCase()}`,
  message: "Este tablero ha recibido muchas notas en poco tiempo. Por favor, espera un momento e intenta nuevamente.",
})

// GET /board/user/:username - Obtener info pública del dueño del tablero (Público)
board.get("/user/:username", async (c) => {
  const username = c.req.param("username").toLowerCase()
  return c.json(await boardService.getRecipientInfo(username))
})

// GET /board/my-notes/:username - Obtener las notas recibidas por el dueño del tablero (Privado)
board.get("/my-notes/:username", authMiddleware, async (c) => {
  const username = c.req.param("username").toLowerCase()
  assertOwnUsername(c, username)
  return c.json(await boardService.getMyNotes(username, c.get("authUser").sub))
})

// POST /board/my-notes/:username/seen - Marcar todos los dibujos recibidos como vistos (Privado)
board.post("/my-notes/:username/seen", authMiddleware, async (c) => {
  const username = c.req.param("username").toLowerCase()
  assertOwnUsername(c, username)
  return c.json(await boardService.markAllSeen(username, c.get("authUser").sub))
})

// POST /board/notes/:noteId/seen - Marcar un dibujo recibido como visto (Privado)
board.post("/notes/:noteId/seen", authMiddleware, async (c) => {
  const noteId = c.req.param("noteId")
  return c.json(await boardService.markNoteSeen(noteId, c.get("authUser").username, c.get("authUser").sub))
})

// POST /board/send/:username - Enviar una nota/dibujo anónimo a un amigo (Público)
board.post(
  "/send/:username",
  sendNoteIpLimiter,
  sendNoteBoardLimiter,
  zValidator("json", createNoteSchema, validationError),
  async (c) => {
    const username = c.req.param("username").toLowerCase()
    const noteData = c.req.valid("json")
    return c.json(await boardService.sendNote(username, noteData), 201)
  },
)

// PATCH /board/notes/:noteId - Actualizar posición/tamaño de una nota (Privado)
board.patch(
  "/notes/:noteId",
  authMiddleware,
  zValidator("json", updateNotePositionSchema, validationError),
  async (c) => {
    const noteId = c.req.param("noteId")
    const updates = c.req.valid("json")
    return c.json(await boardService.updateNote(noteId, c.get("authUser").username, updates, c.get("authUser").sub))
  },
)

// DELETE /board/notes/:noteId - Eliminar una nota recibida (Privado)
board.delete("/notes/:noteId", authMiddleware, async (c) => {
  const noteId = c.req.param("noteId")
  return c.json(await boardService.deleteNote(noteId, c.get("authUser").username, c.get("authUser").sub))
})

function assertOwnUsername(c: Context, username: string) {
  if (username !== c.get("authUser").username) {
    throw new AppError(403, "No tienes permiso para acceder a este tablero")
  }
}

export default board