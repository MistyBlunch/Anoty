import { PublicBoard as PublicBoardModel } from "../../../../models/publicboard.model.js"
import type { PublicBoardRepositoryPort } from "../../../../core/application/ports/out/publicboard-repository.port.js"
import type { PublicBoard } from "../../../../core/domain/index.js"
import { publicBoardMapper } from "./mappers/publicboard.mapper.js"

export class MongoPublicBoardRepository implements PublicBoardRepositoryPort {
  async findByOwner(username: string): Promise<PublicBoard | null> {
    const doc = await PublicBoardModel.findOne({ ownerUsername: username })
    return doc ? publicBoardMapper.toDomain(doc) : null
  }

  async findById(id: string): Promise<PublicBoard | null> {
    const doc = await PublicBoardModel.findById(id)
    return doc ? publicBoardMapper.toDomain(doc) : null
  }

  async findBySlugOrLegacy(slug: string): Promise<PublicBoard | null> {
    const doc = await PublicBoardModel.findOne({ $or: [{ slug }, { legacySlugs: slug }] })
    return doc ? publicBoardMapper.toDomain(doc) : null
  }

  async create(data: Partial<PublicBoard>): Promise<PublicBoard> {
    const persistenceData = publicBoardMapper.toPersistence(data)
    const doc = await PublicBoardModel.create(persistenceData)
    return publicBoardMapper.toDomain(doc)
  }

  async update(id: string, data: Partial<PublicBoard>): Promise<PublicBoard | null> {
    const persistenceData = publicBoardMapper.toPersistence(data)
    const { _id, id: _tempId, createdAt, updatedAt, ...updateFields } = persistenceData as any
    const doc = await PublicBoardModel.findByIdAndUpdate(
      id,
      { $set: { ...updateFields, updatedAt: new Date() } },
      { returnDocument: "after" },
    )
    return doc ? publicBoardMapper.toDomain(doc) : null
  }

  async save(board: PublicBoard): Promise<PublicBoard> {
    const persistenceData = publicBoardMapper.toPersistence(board)
    const id = (board.id || board._id)?.toString()
    if (id) {
      const { _id, id: _tempId, createdAt, updatedAt, ...updateFields } = persistenceData as any
      const doc = await PublicBoardModel.findByIdAndUpdate(
        id,
        { $set: { ...updateFields, updatedAt: new Date() } },
        { returnDocument: "after" },
      )
      return doc ? publicBoardMapper.toDomain(doc) : board
    }
    const doc = await PublicBoardModel.create(persistenceData)
    return publicBoardMapper.toDomain(doc)
  }

  async deleteById(id: string): Promise<PublicBoard | null> {
    const doc = await PublicBoardModel.findByIdAndDelete(id)
    return doc ? publicBoardMapper.toDomain(doc) : null
  }

  async updateOwnerUsername(oldUsername: string, newUsername: string): Promise<PublicBoard | null> {
    const doc = await PublicBoardModel.findOne({
      $or: [{ ownerUsername: oldUsername }, { slug: oldUsername }, { legacySlugs: oldUsername }],
    })
    if (!doc) return null

    const legacy = new Set(doc.legacySlugs || [])
    if (doc.slug && doc.slug !== newUsername) {
      legacy.add(doc.slug)
    }
    if (oldUsername && oldUsername !== newUsername) {
      legacy.add(oldUsername)
    }

    doc.ownerUsername = newUsername
    doc.slug = newUsername
    doc.legacySlugs = Array.from(legacy)
    await doc.save()
    return publicBoardMapper.toDomain(doc)
  }
}

export const mongoPublicBoardRepository = new MongoPublicBoardRepository()
