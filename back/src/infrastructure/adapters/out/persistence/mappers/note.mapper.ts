import type { Note } from "../../../../../core/domain/index.js"
import type { INote } from "../../../../../models/note.model.js"

export const noteMapper = {
  toDomain(doc: any): Note {
    if (!doc) return doc
    const id = doc._id?.toString() || doc.id?.toString()
    return {
      id,
      _id: id,
      boardUsername: doc.boardUsername,
      type: doc.type,
      content: doc.content,
      x: doc.x,
      y: doc.y,
      width: doc.width,
      height: doc.height,
      color: doc.color,
      rotation: doc.rotation,
      authorName: doc.authorName,
      authorAvatar: doc.authorAvatar,
      isSeen: doc.isSeen,
      positionSet: doc.positionSet,
      z: doc.z,
      transparent: doc.transparent,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  },
  toPersistence(entity: Partial<Note>): Partial<INote> {
    const data: any = { ...entity }
    if (entity.id) {
      data._id = entity.id
      delete data.id
    }
    return data
  },
}
