export type UserLocale = "es" | "en"

export interface User {
  id?: string
  _id?: string
  googleId?: string
  facebookId?: string
  email?: string
  name?: string
  avatar?: string
  username: string
  locale?: UserLocale
  createdAt?: Date
  updatedAt?: Date
}
