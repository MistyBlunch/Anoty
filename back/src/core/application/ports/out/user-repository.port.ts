import type { User, UserLocale } from "../../../domain/index.js"

export interface UserRepositoryPort {
  findByGoogleIdOrEmail(googleId: string, email?: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  findByUsernameOrLegacy(username: string): Promise<User | null>
  existsByUsername(username: string, excludeUserId?: string): Promise<boolean>
  existsByUsernameOrLegacy(username: string, excludeUserId?: string): Promise<boolean>
  create(data: Partial<User>): Promise<User>
  save(user: User): Promise<User>
  updateLocale(username: string, locale: UserLocale): Promise<User | null>
  updateUsername(userId: string, oldUsername: string, newUsername: string): Promise<User | null>
}
