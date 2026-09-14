export interface Drawing {
  _id: string
  content: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  authorName?: string
  createdAt: string
  isSeen?: boolean
  positionSet?: boolean
  z?: number
  transparent?: boolean | null
}