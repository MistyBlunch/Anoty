import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createBoardSchema, updateBoardSchema } from "../schemas/publicboard.schema.js"
import { mongoUserRepository } from "../repositories/user.repository.js"
import { mongoPublicBoardRepository } from "../repositories/publicboard.repository.js"
import { createPublicBoardService } from "../services/publicboard.service.js"
import { wsHub, WS_BOARD_PREFIX } from "../lib/ws-hub.js"

const publicboard = new Hono()
const publicBoardService = createPublicBoardService({
  boardRepo: mongoPublicBoardRepository,
  userRepo: mongoUserRepository,
  notifier: {
    onBoardChange: (board) => {
      const channel = `${WS_BOARD_PREFIX}${board.slug}`
      if (board.isPublished) {
        wsHub.broadcast(channel, {
          type: "board-updated",
          slug: board.slug,
          updatedAt: board.updatedAt?.toISOString() ?? new Date().toISOString(),
        })
      } else {
        wsHub.broadcast(channel, { type: "board-hidden", slug: board.slug })
      }
    },
  },
})

const validationError = (result: { success: boolean; error?: any }, c: any) => {
  if (!result.success) {
    return c.json({ success: false, errors: result.error?.issues || [] }, 400)
  }
}

// GET /public-boards/:username - Obtener el board público del dueño (Privado)
publicboard.get("/public-boards/:username", async (c) => {
  const username = c.req.param("username").toLowerCase()
  return c.json(await publicBoardService.getOwnerBoard(username))
})

// POST /public-boards/:username - Crear el board público del dueño (Privado)
publicboard.post(
  "/public-boards/:username",
  zValidator("json", createBoardSchema, validationError),
  async (c) => {
    const username = c.req.param("username").toLowerCase()
    const { title } = c.req.valid("json") || {}
    return c.json(await publicBoardService.getOrCreate(username, title))
  },
)

// PATCH /public-boards/:boardId - Actualizar layout/título/privacidad del board (Privado)
publicboard.patch(
  "/public-boards/:boardId",
  zValidator("json", updateBoardSchema, validationError),
  async (c) => {
    const boardId = c.req.param("boardId")
    const updates = c.req.valid("json")
    return c.json(await publicBoardService.updateBoard(boardId, updates))
  },
)

// DELETE /public-boards/:boardId - Eliminar el board público (Privado)
publicboard.delete("/public-boards/:boardId", async (c) => {
  const boardId = c.req.param("boardId")
  return c.json(await publicBoardService.deleteBoard(boardId))
})

// GET /public/:slug - Vista pública read-only del board (Público)
publicboard.get("/public/:slug", async (c) => {
  const slug = c.req.param("slug").toLowerCase()
  return c.json(await publicBoardService.getPublicBySlug(slug))
})

export default publicboard