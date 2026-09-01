import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { User } from "../models/user.model.js"
import { Note } from "../models/note.model.js"
import { createNoteSchema } from "../schemas/board.schema.js"

const board = new Hono()

// GET /board/my-notes/:username - Obtener las notas recibidas por el dueño del muro (Privado)
board.get("/my-notes/:username", async (c) => {
  try {
    const username = c.req.param("username").toLowerCase()

    const userExists = await User.exists({ username })
    if (!userExists) {
      return c.json({ success: false, message: "Usuario no encontrado" }, 404)
    }

    // Obtener todas las notas recibidas ordenadas de más reciente a más antigua
    const notes = await Note.find({ boardUsername: username }).sort({ createdAt: -1 })

    return c.json({
      success: true,
      username,
      totalNotes: notes.length,
      notes,
    })
  } catch (error) {
    console.error("Error al obtener notas del muro:", error)
    return c.json({ success: false, message: "Error al cargar las notas" }, 500)
  }
})

// POST /board/send/:username - Enviar una nota/dibujo anónimo a un amigo (Público)
board.post(
  "/send/:username",
  zValidator("json", createNoteSchema, (result, c) => {
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
      const username = c.req.param("username").toLowerCase()

      const user = await User.findOne({ username }).select("username name avatar")
      if (!user) {
        return c.json(
          {
            success: false,
            message: "El usuario receptor no existe",
          },
          404,
        )
      }

      const noteData = c.req.valid("json")

      // Crear la nota en MongoDB
      const newNote = await Note.create({
        boardUsername: username,
        ...noteData,
      })

      return c.json(
        {
          success: true,
          message: `¡Tu nota anónima fue enviada con éxito al muro de @${username}! 🎉`,
          recipient: {
            username: user.username,
            name: user.name || user.username,
            avatar: user.avatar,
          },
          note: newNote,
        },
        201,
      )
    } catch (error) {
      console.error("Error al enviar nota anónima:", error)
      return c.json({ success: false, message: "Error al enviar la nota" }, 500)
    }
  },
)

// DELETE /board/notes/:noteId - Eliminar una nota recibida
board.delete("/notes/:noteId", async (c) => {
  try {
    const noteId = c.req.param("noteId")

    const deletedNote = await Note.findByIdAndDelete(noteId)
    if (!deletedNote) {
      return c.json({ success: false, message: "Nota no encontrada" }, 404)
    }

    return c.json({
      success: true,
      message: "Nota eliminada con éxito",
    })
  } catch (error) {
    console.error("Error al eliminar nota:", error)
    return c.json({ success: false, message: "Error al eliminar la nota" }, 500)
  }
})

export default board
