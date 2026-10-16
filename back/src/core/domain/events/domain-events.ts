import type { User } from "../entities/user.entity.js"
import type { Note } from "../entities/note.entity.js"

export interface DrawingCreatedEvent {
  recipient: User
  note: Note
}
