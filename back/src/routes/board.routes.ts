import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createNoteSchema, updateNotePositionSchema } from "../schemas/board.schema.js"
import { mongoUserRepository } from "../repositories/user.repository.js"
import { mongoNoteRepository } from "../repositories/note.repository.js"
import { createBoardService } from "../services/board.service.js"

const board = new Hono()
const boardService = createBoardService({
  userRepo: mongoUserRepository,
  noteRepo: mongoNoteRepository,
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
board.get("/my-notes/:username", async (c) => {
  const username = c.req.param("username").toLowerCase()
  return c.json(await boardService.getMyNotes(username))
})

// GET /board/my-notes/:username/unseen-count - Conteo de dibujos nuevos sin ver (Privado)
board.get("/my-notes/:username/unseen-count", async (c) => {
  const username = c.req.param("username").toLowerCase()
  return c.json(await boardService.getUnseenCount(username))
})

// POST /board/my-notes/:username/seen - Marcar todos los dibujos recibidos como vistos (Privado)
board.post("/my-notes/:username/seen", async (c) => {
  const username = c.req.param("username").toLowerCase()
  return c.json(await boardService.markAllSeen(username))
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
  zValidator("json", updateNotePositionSchema, validationError),
  async (c) => {
    const noteId = c.req.param("noteId")
    const updates = c.req.valid("json")
    return c.json(await boardService.updateNote(noteId, updates))
  },
)

// DELETE /board/notes/:noteId - Eliminar una nota recibida
board.delete("/notes/:noteId", async (c) => {
  const noteId = c.req.param("noteId")
  return c.json(await boardService.deleteNote(noteId))
})

export default board