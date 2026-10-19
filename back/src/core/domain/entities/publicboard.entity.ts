export interface PublicBoardItem {
  noteId: string
  content: string
  authorName?: string
  authorAvatar?: string
  createdAt?: Date
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z: number
  transparent?: boolean
}

export interface PublicBoard {
  id?: string
  _id?: string
  ownerId?: string
  ownerUsername: string
  slug: string
  legacySlugs?: string[]
  title: string
  isPublished: boolean
  items: PublicBoardItem[]
  draftItems?: PublicBoardItem[]
  draftTitle?: string
  createdAt?: Date
  updatedAt?: Date
}
