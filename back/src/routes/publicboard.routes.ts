import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { PublicBoard } from "../models/publicboard.model.js"
import { User } from "../models/user.model.js"

const publicboard = new Hono()

const itemSchema = z.object({
  noteId: z.string().min(1),
  content: z.string().min(1),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  createdAt: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  z: z.number().optional(),
  transparent: z.boolean().optional(),
})

const createBoardSchema = z.object({
  title: z.string().min(1).max(80).optional(),
})

const updateBoardSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  isPublished: z.boolean().optional(),
  items: z.array(itemSchema).optional(),
  draftItems: z.array(itemSchema).optional(),
  draftTitle: z.string().max(80).optional(),
})

const mapItems = (items: z.infer<typeof itemSchema>[]) =>
  items.map((item) => ({
    noteId: item.noteId,
    content: item.content,
    authorName: item.authorName || "Amigo Anónimo",
    authorAvatar: item.authorAvatar,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation ?? 0,
    z: item.z ?? 0,
    transparent: item.transparent ?? false,
  }))

const ensureSlug = async (board: any, username: string) => {
  if (board.slug !== username) {
    if (board.slug && !(board.legacySlugs || []).includes(board.slug)) {
      board.legacySlugs = [...(board.legacySlugs || []), board.slug]
    }
    board.slug = username
    await board.save()
  }
}

// GET /public-boards/:username - Obtener el board público del dueño (Privado)
publicboard.get("/public-boards/:username", async (c) => {
  try {
    const username = c.req.param("username").toLowerCase()

    const userExists = await User.exists({ username })
    if (!userExists) {
      return c.json({ success: false, message: "Usuario no encontrado" }, 404)
    }

    const board = await PublicBoard.findOne({ ownerUsername: username })
    if (board) {
      await ensureSlug(board, username)
    }
    return c.json({
      success: true,
      board: board || null,
    })
  } catch (error) {
    console.error("Error al obtener el board público:", error)
    return c.json({ success: false, message: "Error al obtener el board público" }, 500)
  }
})

// POST /public-boards/:username - Crear el board público del dueño (Privado)
publicboard.post(
  "/public-boards/:username",
  zValidator("json", createBoardSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, errors: result.error.issues }, 400)
    }
  }),
  async (c) => {
    try {
      const username = c.req.param("username").toLowerCase()

      const userExists = await User.exists({ username })
      if (!userExists) {
        return c.json({ success: false, message: "Usuario no encontrado" }, 404)
      }

      const existing = await PublicBoard.findOne({ ownerUsername: username })
      if (existing) {
        await ensureSlug(existing, username)
        return c.json({ success: true, board: existing })
      }

      const { title } = c.req.valid("json") || {}
      const board = await PublicBoard.create({
        ownerUsername: username,
        slug: username,
        title: title || "Mi Muro Público",
        isPublished: true,
        items: [],
      })

      return c.json({ success: true, board })
    } catch (error) {
      console.error("Error al crear el board público:", error)
      return c.json({ success: false, message: "Error al crear el board público" }, 500)
    }
  },
)

// PATCH /public-boards/:boardId - Actualizar layout/título/privacidad del board (Privado)
publicboard.patch(
  "/public-boards/:boardId",
  zValidator("json", updateBoardSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, errors: result.error.issues }, 400)
    }
  }),
  async (c) => {
    try {
      const boardId = c.req.param("boardId")

      const board = await PublicBoard.findById(boardId)
      if (!board) {
        return c.json({ success: false, message: "Board público no encontrado" }, 404)
      }

      const updates = c.req.valid("json")
      if (typeof updates.title === "string") board.title = updates.title
      if (typeof updates.draftTitle === "string") board.draftTitle = updates.draftTitle
      if (typeof updates.isPublished === "boolean") board.isPublished = updates.isPublished
      if (Array.isArray(updates.items)) {
        board.items = mapItems(updates.items)
      }
      if (Array.isArray(updates.draftItems)) {
        board.draftItems = mapItems(updates.draftItems)
      }
      await board.save()

      return c.json({ success: true, board })
    } catch (error) {
      console.error("Error al actualizar el board público:", error)
      return c.json({ success: false, message: "Error al actualizar el board público" }, 500)
    }
  },
)

// DELETE /public-boards/:boardId - Eliminar el board público (Privado)
publicboard.delete("/public-boards/:boardId", async (c) => {
  try {
    const boardId = c.req.param("boardId")

    const deleted = await PublicBoard.findByIdAndDelete(boardId)
    if (!deleted) {
      return c.json({ success: false, message: "Board público no encontrado" }, 404)
    }

    return c.json({ success: true, message: "Board público eliminado" })
  } catch (error) {
    console.error("Error al eliminar el board público:", error)
    return c.json({ success: false, message: "Error al eliminar el board público" }, 500)
  }
})

// GET /public/:slug - Vista pública read-only del board (Público)
publicboard.get("/public/:slug", async (c) => {
  try {
    const slug = c.req.param("slug").toLowerCase()

    const board = await PublicBoard.findOne({ $or: [{ slug }, { legacySlugs: slug }] })
    if (!board || !board.isPublished) {
      return c.json({ success: false, message: "Muro público no encontrado" }, 404)
    }

    return c.json({
      success: true,
      title: board.title,
      items: board.items,
    })
  } catch (error) {
    console.error("Error al obtener el muro público:", error)
    return c.json({ success: false, message: "Error al obtener el muro público" }, 500)
  }
})

export default publicboard