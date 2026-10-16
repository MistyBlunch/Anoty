import { User as UserModel } from "../../../../models/user.model.js"
import type { UserRepositoryPort } from "../../../../core/application/ports/out/user-repository.port.js"
import type { User, UserLocale } from "../../../../core/domain/index.js"
import { userMapper } from "./mappers/user.mapper.js"

export class MongoUserRepository implements UserRepositoryPort {
  async findByGoogleIdOrEmail(googleId: string, email?: string): Promise<User | null> {
    const doc = await UserModel.findOne({
      $or: [{ googleId }, ...(email ? [{ email }] : [])],
    })
    return doc ? userMapper.toDomain(doc) : null
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await UserModel.findOne({ username }).select("username name avatar email locale legacyUsernames")
    return doc ? userMapper.toDomain(doc) : null
  }

  async findByUsernameOrLegacy(username: string): Promise<User | null> {
    const doc = await UserModel.findOne({
      $or: [{ username }, { legacyUsernames: username }],
    }).select("username name avatar email locale legacyUsernames")
    return doc ? userMapper.toDomain(doc) : null
  }

  async existsByUsername(username: string): Promise<boolean> {
    const found = await UserModel.exists({ username })
    return Boolean(found)
  }

  async existsByUsernameOrLegacy(username: string): Promise<boolean> {
    const found = await UserModel.exists({
      $or: [{ username }, { legacyUsernames: username }],
    })
    return Boolean(found)
  }

  async create(data: Partial<User>): Promise<User> {
    const persistenceData = userMapper.toPersistence(data)
    const doc = await UserModel.create(persistenceData)
    return userMapper.toDomain(doc)
  }

  async save(user: User): Promise<User> {
    const persistenceData = userMapper.toPersistence(user)
    const id = (user.id || user._id)?.toString()
    if (id) {
      const { _id, id: _tempId, ...updateFields } = persistenceData as any
      const doc = await UserModel.findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      return doc ? userMapper.toDomain(doc) : user
    }
    const doc = await UserModel.create(persistenceData)
    return userMapper.toDomain(doc)
  }

  async updateLocale(username: string, locale: UserLocale): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate(
      { username },
      { $set: { locale } },
      { new: true },
    )
    return doc ? userMapper.toDomain(doc) : null
  }

  async updateUsername(userId: string, oldUsername: string, newUsername: string): Promise<User | null> {
    const doc = await UserModel.findById(userId)
    if (!doc) return null
    const legacy = new Set(doc.legacyUsernames || [])
    if (oldUsername && oldUsername !== newUsername) {
      legacy.add(oldUsername)
    }
    doc.username = newUsername
    doc.legacyUsernames = Array.from(legacy)
    await doc.save()
    return userMapper.toDomain(doc)
  }
}

export const mongoUserRepository = new MongoUserRepository()
