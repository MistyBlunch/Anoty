import type { User } from "../../../../../core/domain/index.js"
import type { IUser } from "../../../../../models/user.model.js"

export const userMapper = {
  toDomain(doc: any): User {
    if (!doc) return doc
    const id = doc._id?.toString() || doc.id?.toString()
    return {
      id,
      _id: id,
      googleId: doc.googleId,
      facebookId: doc.facebookId,
      email: doc.email,
      name: doc.name,
      avatar: doc.avatar,
      username: doc.username,
      legacyUsernames: doc.legacyUsernames ? [...doc.legacyUsernames] : [],
      locale: doc.locale,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  },
  toPersistence(entity: Partial<User>): Partial<IUser> {
    const data: any = { ...entity }
    if (entity.id) {
      data._id = entity.id
      delete data.id
    }
    return data
  },
}
