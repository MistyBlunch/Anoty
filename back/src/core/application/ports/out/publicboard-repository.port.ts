import type { PublicBoard } from "../../../domain/index.js"

export interface PublicBoardRepositoryPort {
  findByOwner(username: string, ownerId?: string): Promise<PublicBoard | null>
  findById(id: string): Promise<PublicBoard | null>
  findBySlugOrLegacy(slug: string): Promise<PublicBoard | null>
  create(data: Partial<PublicBoard>): Promise<PublicBoard>
  save(board: PublicBoard): Promise<PublicBoard>
  update?(id: string, data: Partial<PublicBoard>): Promise<PublicBoard | null>
  deleteById(id: string): Promise<PublicBoard | null>
  updateOwnerUsername(oldUsername: string, newUsername: string, ownerId?: string): Promise<PublicBoard | null>
}
