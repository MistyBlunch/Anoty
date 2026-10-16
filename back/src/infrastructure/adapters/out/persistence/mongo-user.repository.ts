import mongoose from "mongoose"
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

  async existsByUsername(username: string, excludeUserId?: string): Promise<boolean> {
    const filter: any = { username }
    if (excludeUserId && mongoose.isValidObjectId(excludeUserId)) {
      filter._id = { $ne: excludeUserId }
    }
    const found = await UserModel.exists(filter)
    if (!found) return false
    if (excludeUserId && (found as any)._id?.toString() === excludeUserId.toString()) {
      return false
    }
    return true
  }

  async existsByUsernameOrLegacy(username: string, excludeUserId?: string): Promise<boolean> {
    const filter: any = {
      $or: [{ username }, { legacyUsernames: username }],
    }
    if (excludeUserId && mongoose.isValidObjectId(excludeUserId)) {
      filter._id = { $ne: excludeUserId }
    }
    const found = await UserModel.exists(filter)
    if (!found) return false
    if (excludeUserId && (found as any)._id?.toString() === excludeUserId.toString()) {
      return false
    }
    return true
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
      const doc = await UserModel.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" })
      return doc ? userMapper.toDomain(doc) : user
    }
    const doc = await UserModel.create(persistenceData)
    return userMapper.toDomain(doc)
  }

  async updateLocale(username: string, locale: UserLocale): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate(
      { username },
      { $set: { locale } },
      { returnDocument: "after" },
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
    legacy.delete(newUsername)
    doc.username = newUsername
    doc.legacyUsernames = Array.from(legacy)
    await doc.save()
    return userMapper.toDomain(doc)
  }
}

export const mongoUserRepository = new MongoUserRepository()
