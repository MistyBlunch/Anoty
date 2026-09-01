import { z } from "zod"

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, { message: "El idToken de Google es requerido" }),
})

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>
