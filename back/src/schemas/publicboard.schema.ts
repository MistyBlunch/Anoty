import { z } from "zod"

export const publicBoardItemSchema = z.object({
  noteId: z.string().min(1),
  content: z.string().optional(),
  authorName: z.string().optional(),
  authorAvatar: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  z: z.number().optional(),
  transparent: z.boolean().optional(),
})

export type PublicBoardItemInput = z.infer<typeof publicBoardItemSchema>

export const publicBoardItemDeltaSchema = z.object({
  noteId: z.string().min(1),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  z: z.number().optional(),
  transparent: z.boolean().optional(),
})

export type PublicBoardItemDeltaInput = z.infer<typeof publicBoardItemDeltaSchema>

export const createBoardSchema = z.object({
  title: z.string().min(1).max(80).optional(),
})

export type CreateBoardInput = z.infer<typeof createBoardSchema>

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  isPublished: z.boolean().optional(),
  items: z.array(publicBoardItemSchema).optional(),
  draftItems: z.array(publicBoardItemSchema).optional(),
  updatedItems: z.array(publicBoardItemDeltaSchema).optional(),
  updatedDraftItems: z.array(publicBoardItemDeltaSchema).optional(),
  draftTitle: z.string().max(80).optional(),
})

export type UpdateBoardInput = z.infer<typeof updateBoardSchema>