import { z } from "zod"

export const publicBoardItemSchema = z.object({
  noteId: z.string().min(1),
  content: z.string().min(1),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  createdAt: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  z: z.number().optional(),
  transparent: z.boolean().optional(),
})

export type PublicBoardItemInput = z.infer<typeof publicBoardItemSchema>

export const createBoardSchema = z.object({
  title: z.string().min(1).max(80).optional(),
})

export type CreateBoardInput = z.infer<typeof createBoardSchema>

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  isPublished: z.boolean().optional(),
  items: z.array(publicBoardItemSchema).optional(),
  draftItems: z.array(publicBoardItemSchema).optional(),
  draftTitle: z.string().max(80).optional(),
})

export type UpdateBoardInput = z.infer<typeof updateBoardSchema>