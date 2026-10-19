import { Note, type INote } from "../models/note.model.js"

export interface NoteRepository {
  findByBoard(boardUsername: string, userId?: string): Promise<INote[]>
  markAllSeen(boardUsername: string, userId?: string): Promise<void>
  markOneSeen(noteId: string, boardUsername: string, userId?: string): Promise<INote | null>
  create(data: Partial<INote>): Promise<INote>
  findById(id: string): Promise<INote | null>
  save(note: INote): Promise<INote>
  deleteById(id: string): Promise<INote | null>
  updateBoardUsername(oldUsername: string, newUsername: string, userId?: string): Promise<number>
}

export const mongoNoteRepository: NoteRepository = {
  async findByBoard(boardUsername, userId) {
    const filter: any = userId
      ? { $or: [{ userId }, { boardUsername }] }
      : { boardUsername }
    return Note.find(filter).sort({ createdAt: -1 })
  },
  async markAllSeen(boardUsername, userId) {
    const filter: any = userId
      ? { $or: [{ userId }, { boardUsername }], type: "drawing", isSeen: false }
      : { boardUsername, type: "drawing", isSeen: false }
    await Note.updateMany(filter, { $set: { isSeen: true } })
  },
  async markOneSeen(noteId: string, boardUsername: string, userId?: string) {
    const filter: any = { _id: noteId }
    if (userId) {
      filter.$or = [{ userId }, { boardUsername }]
    } else {
      filter.boardUsername = boardUsername
    }
    const note = await Note.findOne(filter)
    if (!note) return null
    note.isSeen = true
    await (note as any).save()
    return note
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
  async updateBoardUsername(oldUsername, newUsername, userId) {
    const filter: any = userId
      ? { $or: [{ userId }, { boardUsername: oldUsername }] }
      : { boardUsername: oldUsername }
    const update: any = { $set: { boardUsername: newUsername } }
    if (userId) {
      update.$set.userId = userId
    }
    const result = await Note.updateMany(filter, update)
    return result.modifiedCount || 0
  },
}