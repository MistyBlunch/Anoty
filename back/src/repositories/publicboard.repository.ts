import { PublicBoard, type IPublicBoard } from "../models/publicboard.model.js"

export interface PublicBoardRepository {
  findByOwner(username: string): Promise<IPublicBoard | null>
  findById(id: string): Promise<IPublicBoard | null>
  findBySlugOrLegacy(slug: string): Promise<IPublicBoard | null>
  create(data: Partial<IPublicBoard>): Promise<IPublicBoard>
  save(board: IPublicBoard): Promise<IPublicBoard>
  deleteById(id: string): Promise<IPublicBoard | null>
  updateOwnerUsername(oldUsername: string, newUsername: string): Promise<IPublicBoard | null>
}

export const mongoPublicBoardRepository: PublicBoardRepository = {
  async findByOwner(username) {
    return PublicBoard.findOne({ ownerUsername: username })
  },
  async findById(id) {
    return PublicBoard.findById(id)
  },
  async findBySlugOrLegacy(slug) {
    return PublicBoard.findOne({ $or: [{ slug }, { legacySlugs: slug }] })
  },
  async create(data) {
    return PublicBoard.create(data) as Promise<IPublicBoard>
  },
  async save(board) {
    await (board as any).save()
    return board
  },
  async deleteById(id) {
    return PublicBoard.findByIdAndDelete(id)
  },
  async updateOwnerUsername(oldUsername, newUsername) {
    const doc = await PublicBoard.findOne({
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
    return doc
  },
}