import type { Drawing } from "./drawing"

export interface PublicBoardItem {
  noteId: string
  content?: string
  authorName?: string
  authorAvatar?: string
  createdAt?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z: number
  transparent: boolean
}

export interface PublicBoardItemDelta {
  noteId: string
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  z?: number
  transparent?: boolean
}

export interface PublicBoardDraft {
  _id: string
  slug: string
  title: string
  isPublished: boolean
  items: Drawing[]
  updatedAt?: string
}

export interface PublicBoardDto {
  _id: string
  ownerUsername: string
  slug: string
  title: string
  isPublished: boolean
  items?: PublicBoardItem[]
  draftItems?: PublicBoardItem[]
  draftTitle?: string
}