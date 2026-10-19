import { PublicBoard, type IPublicBoard } from "../models/publicboard.model.js"

export interface PublicBoardRepository {
  findByOwner(username: string, ownerId?: string): Promise<IPublicBoard | null>
  findById(id: string): Promise<IPublicBoard | null>
  findBySlugOrLegacy(slug: string): Promise<IPublicBoard | null>
  create(data: Partial<IPublicBoard>): Promise<IPublicBoard>
  save(board: IPublicBoard): Promise<IPublicBoard>
  deleteById(id: string): Promise<IPublicBoard | null>
  updateOwnerUsername(oldUsername: string, newUsername: string, ownerId?: string): Promise<IPublicBoard | null>
}

export const mongoPublicBoardRepository: PublicBoardRepository = {
  async findByOwner(username, ownerId) {
    const filter: any = ownerId
      ? { $or: [{ ownerId }, { ownerUsername: username }] }
      : { ownerUsername: username }
    return PublicBoard.findOne(filter)
  },
  async findById(id) {
    return PublicBoard.findById(id)
  },
  async findBySlugOrLegacy(slug) {
    return PublicBoard.findOne({ slug })
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
  async updateOwnerUsername(oldUsername, newUsername, ownerId) {
    const filter: any = ownerId
      ? { $or: [{ ownerId }, { ownerUsername: oldUsername }, { slug: oldUsername }] }
      : { $or: [{ ownerUsername: oldUsername }, { slug: oldUsername }] }
    const doc = await PublicBoard.findOne(filter)
    if (!doc) return null

    doc.ownerUsername = newUsername
    doc.slug = newUsername
    if (ownerId) {
      doc.ownerId = ownerId
    }
    doc.legacySlugs = []
    await doc.save()
    return doc
  },
}