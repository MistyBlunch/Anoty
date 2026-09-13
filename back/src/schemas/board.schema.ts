import { z } from "zod"

export const createNoteSchema = z.object({
  type: z.enum(["text", "drawing", "image", "gif"]).default("text"),
  content: z.string().min(1, { message: "El contenido no puede estar vacío" }),
  color: z.string().optional().default("#fef08a"),
  authorName: z.string().optional().default("Amigo Anónimo"),
  authorAvatar: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNotePositionSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  positionSet: z.boolean().optional(),
  z: z.number().optional(),
  transparent: z.boolean().nullable().optional(),
})

export type UpdateNotePositionInput = z.infer<typeof updateNotePositionSchema>
