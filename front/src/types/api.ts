export interface ApiResult {
  success: boolean
  message?: string
  [key: string]: unknown
}

export interface SendNotePayload {
  type: "drawing"
  content: string
  color: string
  authorName: string
  width: number
  height: number
}