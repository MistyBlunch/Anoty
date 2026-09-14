import { User, type IUser } from "../models/user.model.js"

export interface UserRepository {
  findByGoogleIdOrEmail(googleId: string, email?: string): Promise<IUser | null>
  findByUsername(username: string): Promise<IUser | null>
  existsByUsername(username: string): Promise<boolean>
  create(data: Partial<IUser>): Promise<IUser>
  save(user: IUser): Promise<IUser>
}

export const mongoUserRepository: UserRepository = {
  async findByGoogleIdOrEmail(googleId, email) {
    return User.findOne({ $or: [{ googleId }, ...(email ? [{ email }] : [])] })
  },
  async findByUsername(username) {
    return (await User.findOne({ username }).select("username name avatar")) as IUser | null
  },
  async existsByUsername(username) {
    const found = await User.exists({ username })
    return Boolean(found)
  },
  async create(data) {
    return User.create(data) as Promise<IUser>
  },
  async save(user) {
    await (user as any).save()
    return user
  },
}