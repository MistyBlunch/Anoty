import { z } from "zod"

export const createNoteSchema = z.object({
  type: z.enum(["text", "drawing", "image", "gif"]).default("text"),
  content: z.string().min(1, { message: "El contenido no puede estar vacío" }),
  color: z.string().optional().default("#fef08a"),
  authorName: z.string().optional().default("Amigo Anónimo"),
  authorAvatar: z.string().optional(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
