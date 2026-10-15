import type { Note } from "../../../domain/index.js"

export interface NoteRepositoryPort {
  findByBoard(boardUsername: string): Promise<Note[]>
  markAllSeen(boardUsername: string): Promise<void>
  markOneSeen(noteId: string, boardUsername: string): Promise<Note | null>
  create(data: Partial<Note>): Promise<Note>
  findById(id: string): Promise<Note | null>
  save(note: Note): Promise<Note>
  deleteById(id: string): Promise<Note | null>
  updateBoardUsername(oldUsername: string, newUsername: string): Promise<number>
}
