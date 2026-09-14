import { PublicBoard, type IPublicBoard } from "../models/publicboard.model.js"

export interface PublicBoardRepository {
  findByOwner(username: string): Promise<IPublicBoard | null>
  findById(id: string): Promise<IPublicBoard | null>
  findBySlugOrLegacy(slug: string): Promise<IPublicBoard | null>
  create(data: Partial<IPublicBoard>): Promise<IPublicBoard>
  save(board: IPublicBoard): Promise<IPublicBoard>
  deleteById(id: string): Promise<IPublicBoard | null>
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
}