export interface AuthenticatedUser {
  id: string
  username: string
  name?: string
  email?: string
  avatar?: string
}

export interface RecipientUser {
  username: string
  name: string
  avatar?: string
}

export interface GoogleAuthPayload {
  idToken: string
}