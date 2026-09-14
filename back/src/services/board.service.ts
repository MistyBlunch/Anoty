import type { UserRepository } from "../repositories/user.repository.js"
import type { NoteRepository } from "../repositories/note.repository.js"
import type { CreateNoteInput, UpdateNotePositionInput } from "../schemas/board.schema.js"
import { AppError } from "../lib/error.js"

export type BoardService = ReturnType<typeof createBoardService>

export function createBoardService(deps: {
  userRepo: UserRepository
  noteRepo: NoteRepository
}) {
  const { userRepo, noteRepo } = deps

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

  const getMyNotes = async (username: string) => {
    const userExists = await userRepo.existsByUsername(username)
    if (!userExists) {
      throw new AppError(404, "Usuario no encontrado")
    }

    const notes = await noteRepo.findByBoard(username)
    const unseenDrawingCount = await noteRepo.countUnseenDrawings(username)

    return {
      success: true,
      username,
      totalNotes: notes.length,
      unseenDrawingCount,
      notes,
    }
  }

  const getUnseenCount = async (username: string) => {
    const userExists = await userRepo.existsByUsername(username)
    if (!userExists) {
      throw new AppError(404, "Usuario no encontrado")
    }

    const unseenDrawingCount = await noteRepo.countUnseenDrawings(username)

    return {
      success: true,
      username,
      unseenDrawingCount,
    }
  }

  const markAllSeen = async (username: string) => {
    const userExists = await userRepo.existsByUsername(username)
    if (!userExists) {
      throw new AppError(404, "Usuario no encontrado")
    }

    await noteRepo.markAllSeen(username)

    return {
      success: true,
      message: "Dibujos marcados como vistos",
    }
  }

  const sendNote = async (username: string, data: CreateNoteInput) => {
    const user = await userRepo.findByUsername(username)
    if (!user) {
      throw new AppError(404, "El usuario receptor no existe")
    }

    const newNote = await noteRepo.create({
      boardUsername: username,
      ...data,
    })

    return {
      success: true,
      message: `¡Tu nota anónima fue enviada con éxito al muro de @${username}! 🎉`,
      recipient: {
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar,
      },
      note: newNote,
    }
  }

  const updateNote = async (noteId: string, updates: UpdateNotePositionInput) => {
    const note = await noteRepo.findById(noteId)
    if (!note) {
      throw new AppError(404, "Nota no encontrada")
    }

    Object.assign(note, updates)
    const updatedNote = await noteRepo.save(note)

    return {
      success: true,
      note: updatedNote,
    }
  }

  const deleteNote = async (noteId: string) => {
    const deletedNote = await noteRepo.deleteById(noteId)
    if (!deletedNote) {
      throw new AppError(404, "Nota no encontrada")
    }

    return {
      success: true,
      message: "Nota eliminada con éxito",
    }
  }

  return { getRecipientInfo, getMyNotes, getUnseenCount, markAllSeen, sendNote, updateNote, deleteNote }
}