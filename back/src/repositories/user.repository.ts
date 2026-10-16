import { User, type IUser } from "../models/user.model.js"

export interface UserRepository {
  findByGoogleIdOrEmail(googleId: string, email?: string): Promise<IUser | null>
  findByUsername(username: string): Promise<IUser | null>
  findByUsernameOrLegacy(username: string): Promise<IUser | null>
  existsByUsername(username: string): Promise<boolean>
  existsByUsernameOrLegacy(username: string): Promise<boolean>
  create(data: Partial<IUser>): Promise<IUser>
  save(user: IUser): Promise<IUser>
  updateLocale(username: string, locale: "es" | "en"): Promise<IUser | null>
  updateUsername(userId: string, oldUsername: string, newUsername: string): Promise<IUser | null>
}

export const mongoUserRepository: UserRepository = {
  async findByGoogleIdOrEmail(googleId, email) {
    return User.findOne({ $or: [{ googleId }, ...(email ? [{ email }] : [])] })
  },
  async findByUsername(username) {
    return (await User.findOne({ username }).select("username name avatar email locale legacyUsernames")) as IUser | null
  },
  async findByUsernameOrLegacy(username) {
    return (await User.findOne({
      $or: [{ username }, { legacyUsernames: username }],
    }).select("username name avatar email locale legacyUsernames")) as IUser | null
  },
  async existsByUsername(username) {
    const found = await User.exists({ username })
    return Boolean(found)
  },
  async existsByUsernameOrLegacy(username) {
    const found = await User.exists({
      $or: [{ username }, { legacyUsernames: username }],
    })
    return Boolean(found)
  },
  async create(data) {
    return User.create(data) as Promise<IUser>
  },
  async save(user) {
    await (user as any).save()
    return user
  },
  async updateLocale(username, locale) {
    return (await User.findOneAndUpdate(
      { username },
      { $set: { locale } },
      { returnDocument: "after" },
    )) as IUser | null
  },
  async updateUsername(userId, oldUsername, newUsername) {
    const doc = await User.findById(userId)
    if (!doc) return null
    const legacy = new Set(doc.legacyUsernames || [])
    if (oldUsername && oldUsername !== newUsername) {
      legacy.add(oldUsername)
    }
    doc.username = newUsername
    doc.legacyUsernames = Array.from(legacy)
    await doc.save()
    return doc
  },
}