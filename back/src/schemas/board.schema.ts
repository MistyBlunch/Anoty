import { z } from "zod"

export const createNoteSchema = z
  .object({
    type: z.enum(["text", "drawing", "image", "gif"]).default("text"),
    content: z
      .string()
      .min(1, { message: "El contenido no puede estar vacío" })
      .max(500_000, { message: "El contenido excede el tamaño máximo permitido (500KB)" }),
    color: z.string().max(30).optional().default("#fef08a"),
    authorName: z
      .string()
      .max(50, { message: "El nombre del autor no puede superar los 50 caracteres" })
      .optional()
      .default("Amigo Anónimo"),
    authorAvatar: z.string().max(500).optional(),
    x: z.number().min(-10000).max(10000).optional(),
    y: z.number().min(-10000).max(10000).optional(),
    width: z.number().min(10).max(5000).optional(),
    height: z.number().min(10).max(5000).optional(),
    rotation: z.number().min(-360).max(360).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "text" && data.content.length > 2000) {
        return false
      }
      return true
    },
    {
      message: "Las notas de texto no pueden superar los 2,000 caracteres",
      path: ["content"],
    },
  )

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNotePositionSchema = z.object({
  x: z.number().min(-10000).max(10000).optional(),
  y: z.number().min(-10000).max(10000).optional(),
  width: z.number().min(10).max(5000).optional(),
  height: z.number().min(10).max(5000).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  positionSet: z.boolean().optional(),
  z: z.number().min(-1000).max(1000).optional(),
  transparent: z.boolean().nullable().optional(),
})

export type UpdateNotePositionInput = z.infer<typeof updateNotePositionSchema>
