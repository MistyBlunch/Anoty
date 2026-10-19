import type { PublicBoard } from "../../../../../core/domain/index.js"
import type { IPublicBoard } from "../../../../../models/publicboard.model.js"

export const publicBoardMapper = {
  toDomain(doc: any): PublicBoard {
    if (!doc) return doc
    const id = doc._id?.toString() || doc.id?.toString()
    return {
      id,
      _id: id,
      ownerId: doc.ownerId?.toString(),
      ownerUsername: doc.ownerUsername,
      slug: doc.slug,
      legacySlugs: doc.legacySlugs,
      title: doc.title,
      isPublished: doc.isPublished,
      items: (doc.items || []).map((item: any) => {
        const itemId = item.noteId?.toString() || item._id?.toString() || item.id?.toString()
        return {
          noteId: itemId,
          _id: itemId,
          content: item.content,
          authorName: item.authorName,
          authorAvatar: item.authorAvatar,
          createdAt: item.createdAt,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          z: item.z,
          transparent: item.transparent,
        }
      }),
      draftItems: (doc.draftItems || []).map((item: any) => {
        const itemId = item.noteId?.toString() || item._id?.toString() || item.id?.toString()
        return {
          noteId: itemId,
          _id: itemId,
          content: item.content,
          authorName: item.authorName,
          authorAvatar: item.authorAvatar,
          createdAt: item.createdAt,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          z: item.z,
          transparent: item.transparent,
        }
      }),
      draftTitle: doc.draftTitle,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  },
  toPersistence(entity: Partial<PublicBoard>): Partial<IPublicBoard> {
    const data: any = { ...entity }
    if (entity.id) {
      data._id = entity.id
      delete data.id
    }
    return data
  },
}
