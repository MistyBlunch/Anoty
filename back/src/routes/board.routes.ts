import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { User } from "../models/user.model.js"
import { Note } from "../models/note.model.js"
import { createNoteSchema, updateNotePositionSchema } from "../schemas/board.schema.js"

const board = new Hono()

// GET /board/user/:username - Obtener info pública del dueño del muro (avatar, nombre) (Público)
board.get("/user/:username", async (c) => {
  try {
    const username = c.req.param("username").toLowerCase()

    const user = await User.findOne({ username }).select("username name avatar")
    if (!user) {
      return c.json({ success: false, message: "Usuario no encontrado" }, 404)
    }

    return c.json({
      success: true,
      user: {
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    console.error("Error al obtener información del usuario:", error)
    return c.json({ success: false, message: "Error al cargar la información del usuario" }, 500)
  }
})

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

    if (!notes.length) {
      return c.json({
        success: true,
        username,
        totalNotes: 0,
        unseenDrawingCount: 0,
        notes: [],
      })
    }

    const unseenDrawingCount = await Note.countDocuments({
      boardUsername: username,
      type: "drawing",
      isSeen: false,
    })

    return c.json({
      success: true,
      username,
      totalNotes: notes.length,
      unseenDrawingCount,
      notes,
    })
  } catch (error) {
    console.error("Error al obtener notas del muro:", error)
    return c.json({ success: false, message: "Error al cargar las notas" }, 500)
  }
})

// GET /board/my-notes/:username/unseen-count - Conteo de dibujos nuevos sin ver (Privado)
board.get("/my-notes/:username/unseen-count", async (c) => {
  try {
    const username = c.req.param("username").toLowerCase()

    const userExists = await User.exists({ username })
    if (!userExists) {
      return c.json({ success: false, message: "Usuario no encontrado" }, 404)
    }

    const unseenDrawingCount = await Note.countDocuments({
      boardUsername: username,
      type: "drawing",
      isSeen: false,
    })

    return c.json({
      success: true,
      username,
      unseenDrawingCount,
    })
  } catch (error) {
    console.error("Error al obtener dibujos no vistos:", error)
    return c.json({ success: false, message: "Error al cargar la cantidad de dibujos nuevos" }, 500)
  }
})

// POST /board/my-notes/:username/seen - Marcar todos los dibujos recibidos como vistos (Privado)
board.post("/my-notes/:username/seen", async (c) => {
  try {
    const username = c.req.param("username").toLowerCase()

    const userExists = await User.exists({ username })
    if (!userExists) {
      return c.json({ success: false, message: "Usuario no encontrado" }, 404)
    }

    await Note.updateMany(
      { boardUsername: username, type: "drawing", isSeen: false },
      { $set: { isSeen: true } },
    )

    return c.json({
      success: true,
      message: "Dibujos marcados como vistos",
    })
  } catch (error) {
    console.error("Error al marcar dibujos como vistos:", error)
    return c.json({ success: false, message: "Error al marcar los dibujos como vistos" }, 500)
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

// PATCH /board/notes/:noteId - Actualizar posición/tamaño de una nota (Privado)
board.patch(
  "/notes/:noteId",
  zValidator("json", updateNotePositionSchema, (result, c) => {
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
      const noteId = c.req.param("noteId")

      const note = await Note.findById(noteId)
      if (!note) {
        return c.json({ success: false, message: "Nota no encontrada" }, 404)
      }

      const updates = c.req.valid("json")
      Object.assign(note, updates)
      const updatedNote = await note.save()

      return c.json({
        success: true,
        note: updatedNote,
      })
    } catch (error) {
      console.error("Error al actualizar la nota:", error)
      return c.json({ success: false, message: "Error al actualizar la nota" }, 500)
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
