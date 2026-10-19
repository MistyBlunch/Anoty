import type { UserRepositoryPort } from "../ports/out/user-repository.port.js"
import type { NoteRepositoryPort } from "../ports/out/note-repository.port.js"
import type { EventNotifierPort } from "../ports/out/event-notifier.port.js"
import type { Note, User } from "../../domain/index.js"
import { AppError } from "../../domain/index.js"

export interface CreateNoteDTO {
  type: "text" | "drawing" | "image" | "gif"
  content: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  rotation?: number
  authorName?: string
  authorAvatar?: string
  z?: number
  transparent?: boolean | null
}

export interface UpdateNotePositionDTO {
  x?: number
  y?: number
  z?: number
  width?: number
  height?: number
  rotation?: number
  positionSet?: boolean
  transparent?: boolean | null
}

export type Notifier = EventNotifierPort

export type BoardService = ReturnType<typeof createBoardService>

export function createBoardService(deps: {
  userRepo: UserRepositoryPort
  noteRepo: NoteRepositoryPort
  notifier?: EventNotifierPort
}) {
  const { userRepo, noteRepo, notifier } = deps

  const getRecipientInfo = async (username: string) => {
    const user = await userRepo.findByUsername(username)
    if (!user) {
      throw new AppError(404, "Usuario no encontrado")
    }
    return {
      success: true,
      user: {
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
      },
    }
  }

  const getMyNotes = async (username: string, userId?: string) => {
    const user = await userRepo.findByUsername(username)
    if (!user) {
      throw new AppError(404, "Usuario no encontrado")
    }

    const resolvedUserId = userId || (user.id || user._id)?.toString()
    const notes = await noteRepo.findByBoard(user.username, resolvedUserId)

    return {
      success: true,
      username: user.username,
      totalNotes: notes.length,
      notes,
    }
  }

  const markAllSeen = async (username: string, userId?: string) => {
    const user = await userRepo.findByUsername(username)
    if (!user) {
      throw new AppError(404, "Usuario no encontrado")
    }

    const resolvedUserId = userId || (user.id || user._id)?.toString()
    await noteRepo.markAllSeen(user.username, resolvedUserId)

    return {
      success: true,
      message: "Dibujos marcados como vistos",
    }
  }

  const markNoteSeen = async (noteId: string, ownerUsername: string, userId?: string) => {
    const note = await noteRepo.markOneSeen(noteId, ownerUsername, userId)
    if (!note) {
      throw new AppError(404, "Nota no encontrada")
    }

    return {
      success: true,
      message: "Dibujo marcado como visto",
    }
  }

  const sendNote = async (username: string, data: CreateNoteDTO) => {
    const user = await userRepo.findByUsername(username)
    if (!user) {
      throw new AppError(404, "El usuario receptor no existe")
    }

    const targetUsername = user.username || username
    const recipientUserId = (user.id || user._id)?.toString()
    const newNote = await noteRepo.create({
      userId: recipientUserId,
      boardUsername: targetUsername,
      ...data,
    })

    notifier?.onNewDrawing?.(targetUsername)

    if (newNote.type === "drawing") {
      try {
        void notifier?.onDrawingCreated?.({
          recipient: user,
          note: newNote,
        })
      } catch (err) {
        console.error("Error al disparar notifier.onDrawingCreated:", err)
      }
    }

    return {
      success: true,
      message: `¡Tu nota anónima fue enviada con éxito al tablero de @${username}! 🎉`,
      recipient: {
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
      },
      note: newNote,
    }
  }

  const updateNote = async (
    noteId: string,
    ownerUsername: string,
    updates: UpdateNotePositionDTO,
    userId?: string,
  ) => {
    const note = await noteRepo.findById(noteId)
    if (!note) {
      throw new AppError(404, "Nota no encontrada")
    }
    const isOwner = (userId && note.userId === userId) || note.boardUsername === ownerUsername
    if (!isOwner) {
      throw new AppError(403, "No tienes permiso para modificar esta nota")
    }
    if (userId && !note.userId) {
      note.userId = userId
    }

    Object.assign(note, updates)
    const updatedNote = await noteRepo.save(note)

    return {
      success: true,
      note: updatedNote,
    }
  }

  const deleteNote = async (noteId: string, ownerUsername: string, userId?: string) => {
    const note = await noteRepo.findById(noteId)
    if (!note) {
      throw new AppError(404, "Nota no encontrada")
    }
    const isOwner = (userId && note.userId === userId) || note.boardUsername === ownerUsername
    if (!isOwner) {
      throw new AppError(403, "No tienes permiso para eliminar esta nota")
    }
    await noteRepo.deleteById(noteId)

    return {
      success: true,
      message: "Nota eliminada con éxito",
    }
  }

  return {
    getRecipientInfo,
    getMyNotes,
    markAllSeen,
    markNoteSeen,
    sendNote,
    updateNote,
    deleteNote,
  }
}
