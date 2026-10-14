export type NoteType = "text" | "drawing" | "image" | "gif"

export interface Note {
  id?: string
  _id?: string
  boardUsername: string
  type: NoteType
  content: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  rotation?: number
  authorName?: string
  authorAvatar?: string
  isSeen?: boolean
  positionSet?: boolean
  z?: number
  transparent?: boolean | null
  createdAt?: Date
  updatedAt?: Date
}
