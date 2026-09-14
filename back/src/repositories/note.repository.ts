import { Note, type INote } from "../models/note.model.js"

export interface NoteRepository {
  findByBoard(boardUsername: string): Promise<INote[]>
  countUnseenDrawings(boardUsername: string): Promise<number>
  markAllSeen(boardUsername: string): Promise<void>
  create(data: Partial<INote>): Promise<INote>
  findById(id: string): Promise<INote | null>
  save(note: INote): Promise<INote>
  deleteById(id: string): Promise<INote | null>
}

export const mongoNoteRepository: NoteRepository = {
  async findByBoard(boardUsername) {
    return Note.find({ boardUsername }).sort({ createdAt: -1 })
  },
  async countUnseenDrawings(boardUsername) {
    return Note.countDocuments({ boardUsername, type: "drawing", isSeen: false })
  },
  async markAllSeen(boardUsername) {
    await Note.updateMany(
      { boardUsername, type: "drawing", isSeen: false },
      { $set: { isSeen: true } },
    )
  },
  async create(data) {
    return Note.create(data)
  },
  async findById(id) {
    return Note.findById(id)
  },
  async save(note) {
    await (note as any).save()
    return note
  },
  async deleteById(id) {
    return Note.findByIdAndDelete(id)
  },
}