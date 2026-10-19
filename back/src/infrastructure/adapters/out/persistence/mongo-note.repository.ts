import { Note as NoteModel } from "../../../../models/note.model.js"
import type { NoteRepositoryPort } from "../../../../core/application/ports/out/note-repository.port.js"
import type { Note } from "../../../../core/domain/index.js"
import { noteMapper } from "./mappers/note.mapper.js"

export class MongoNoteRepository implements NoteRepositoryPort {
  async findByBoard(boardUsername: string, userId?: string): Promise<Note[]> {
    const filter: any = userId
      ? { $or: [{ userId }, { boardUsername }] }
      : { boardUsername }
    const docs = await NoteModel.find(filter).sort({ createdAt: -1 })
    return docs.map((d: any) => noteMapper.toDomain(d))
  }

  async markAllSeen(boardUsername: string, userId?: string): Promise<void> {
    const filter: any = userId
      ? { $or: [{ userId }, { boardUsername }], type: "drawing", isSeen: false }
      : { boardUsername, type: "drawing", isSeen: false }
    await NoteModel.updateMany(filter, { $set: { isSeen: true } })
  }

  async markOneSeen(noteId: string, boardUsername: string, userId?: string): Promise<Note | null> {
    const filter: any = { _id: noteId }
    if (userId) {
      filter.$or = [{ userId }, { boardUsername }]
    } else {
      filter.boardUsername = boardUsername
    }
    const doc = await NoteModel.findOneAndUpdate(
      filter,
      { $set: { isSeen: true } },
      { returnDocument: "after" },
    )
    return doc ? noteMapper.toDomain(doc) : null
  }

  async create(data: Partial<Note>): Promise<Note> {
    const persistenceData = noteMapper.toPersistence(data)
    const doc = await NoteModel.create(persistenceData)
    return noteMapper.toDomain(doc)
  }

  async findById(id: string): Promise<Note | null> {
    const doc = await NoteModel.findById(id)
    return doc ? noteMapper.toDomain(doc) : null
  }

  async save(note: Note): Promise<Note> {
    const persistenceData = noteMapper.toPersistence(note)
    const id = (note.id || note._id)?.toString()
    if (id) {
      const { _id, id: _tempId, ...updateFields } = persistenceData as any
      const doc = await NoteModel.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" })
      return doc ? noteMapper.toDomain(doc) : note
    }
    const doc = await NoteModel.create(persistenceData)
    return noteMapper.toDomain(doc)
  }

  async deleteById(id: string): Promise<Note | null> {
    const doc = await NoteModel.findByIdAndDelete(id)
    return doc ? noteMapper.toDomain(doc) : null
  }

  async updateBoardUsername(oldUsername: string, newUsername: string, userId?: string): Promise<number> {
    const filter: any = userId
      ? { $or: [{ userId }, { boardUsername: oldUsername }] }
      : { boardUsername: oldUsername }
    const update: any = { $set: { boardUsername: newUsername } }
    if (userId) {
      update.$set.userId = userId
    }
    const result = await NoteModel.updateMany(filter, update)
    return result.modifiedCount || 0
  }
}

export const mongoNoteRepository = new MongoNoteRepository()
