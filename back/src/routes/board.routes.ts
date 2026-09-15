import { Hono, type Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createNoteSchema, updateNotePositionSchema } from "../schemas/board.schema.js"
import { mongoUserRepository } from "../repositories/user.repository.js"
import { mongoNoteRepository } from "../repositories/note.repository.js"
import { createBoardService } from "../services/board.service.js"
import { authMiddleware } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/error.js"
import { wsHub, WS_USER_PREFIX } from "../lib/ws-hub.js"

const board = new Hono()
const boardService = createBoardService({
  userRepo: mongoUserRepository,
  noteRepo: mongoNoteRepository,
  notifier: {
    onNewDrawing: (username) =>
      wsHub.broadcast(`${WS_USER_PREFIX}${username}`, { type: "new-drawing" }),
  },
})

const validationError = (result: { success: boolean; error?: any }, c: any) => {
  if (!result.success) {
    return c.json({ success: false, errors: result.error?.issues || [] }, 400)
  }
}

// GET /board/user/:username - Obtener info pública del dueño del muro (Público)
board.get("/user/:username", async (c) => {
  const username = c.req.param("username").toLowerCase()
  return c.json(await boardService.getRecipientInfo(username))
})

// GET /board/my-notes/:username - Obtener las notas recibidas por el dueño del muro (Privado)
board.get("/my-notes/:username", authMiddleware, async (c) => {
  const username = c.req.param("username").toLowerCase()
  assertOwnUsername(c, username)
  return c.json(await boardService.getMyNotes(username))
})

// POST /board/my-notes/:username/seen - Marcar todos los dibujos recibidos como vistos (Privado)
board.post("/my-notes/:username/seen", authMiddleware, async (c) => {
  const username = c.req.param("username").toLowerCase()
  assertOwnUsername(c, username)
  return c.json(await boardService.markAllSeen(username))
})

// POST /board/notes/:noteId/seen - Marcar un dibujo recibido como visto (Privado)
board.post("/notes/:noteId/seen", authMiddleware, async (c) => {
  const noteId = c.req.param("noteId")
  return c.json(await boardService.markNoteSeen(noteId, c.get("authUser").username))
})

// POST /board/send/:username - Enviar una nota/dibujo anónimo a un amigo (Público)
board.post(
  "/send/:username",
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
    return c.json(await boardService.updateNote(noteId, c.get("authUser").username, updates))
  },
)

// DELETE /board/notes/:noteId - Eliminar una nota recibida (Privado)
board.delete("/notes/:noteId", authMiddleware, async (c) => {
  const noteId = c.req.param("noteId")
  return c.json(await boardService.deleteNote(noteId, c.get("authUser").username))
})

function assertOwnUsername(c: Context, username: string) {
  if (username !== c.get("authUser").username) {
    throw new AppError(403, "No tienes permiso para acceder a este muro")
  }
}

export default board