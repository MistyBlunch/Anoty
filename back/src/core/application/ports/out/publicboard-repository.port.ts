import type { PublicBoard } from "../../../domain/index.js"

export interface PublicBoardRepositoryPort {
  findByOwner(username: string): Promise<PublicBoard | null>
  findById(id: string): Promise<PublicBoard | null>
  findBySlugOrLegacy(slug: string): Promise<PublicBoard | null>
  create(data: Partial<PublicBoard>): Promise<PublicBoard>
  save(board: PublicBoard): Promise<PublicBoard>
  deleteById(id: string): Promise<PublicBoard | null>
  updateOwnerUsername(oldUsername: string, newUsername: string): Promise<PublicBoard | null>
}
