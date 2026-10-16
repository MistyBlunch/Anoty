import { Note as NoteModel } from "../../../../models/note.model.js"
import type { NoteRepositoryPort } from "../../../../core/application/ports/out/note-repository.port.js"
import type { Note } from "../../../../core/domain/index.js"
import { noteMapper } from "./mappers/note.mapper.js"

export class MongoNoteRepository implements NoteRepositoryPort {
  async findByBoard(boardUsername: string): Promise<Note[]> {
    const docs = await NoteModel.find({ boardUsername }).sort({ createdAt: -1 })
    return docs.map((d: any) => noteMapper.toDomain(d))
  }

  async markAllSeen(boardUsername: string): Promise<void> {
    await NoteModel.updateMany(
      { boardUsername, type: "drawing", isSeen: false },
      { $set: { isSeen: true } },
    )
  }

  async markOneSeen(noteId: string, boardUsername: string): Promise<Note | null> {
    const doc = await NoteModel.findOneAndUpdate(
      { _id: noteId, boardUsername },
      { $set: { isSeen: true } },
      { new: true },
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
      const doc = await NoteModel.findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      return doc ? noteMapper.toDomain(doc) : note
    }
    const doc = await NoteModel.create(persistenceData)
    return noteMapper.toDomain(doc)
  }

  async deleteById(id: string): Promise<Note | null> {
    const doc = await NoteModel.findByIdAndDelete(id)
    return doc ? noteMapper.toDomain(doc) : null
  }

  async updateBoardUsername(oldUsername: string, newUsername: string): Promise<number> {
    const result = await NoteModel.updateMany(
      { boardUsername: oldUsername },
      { $set: { boardUsername: newUsername } },
    )
    return result.modifiedCount || 0
  }
}

export const mongoNoteRepository = new MongoNoteRepository()
