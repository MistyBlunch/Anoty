import mongoose from "mongoose"

export interface INote {
  _id?: string
  boardUsername: string
  type: "text" | "drawing" | "image" | "gif"
  content: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  rotation?: number
  authorName?: string
  authorAvatar?: string
  createdAt?: Date
  updatedAt?: Date
}

const noteSchema = new mongoose.Schema<INote>(
  {
    boardUsername: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "drawing", "image", "gif"],
      default: "text",
      required: true,
    },
    content: {
      type: String,
      required: [true, "El contenido de la nota es requerido"],
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 200,
    },
    height: {
      type: Number,
      default: 180,
    },
    color: {
      type: String,
      default: "#fef08a",
    },
    rotation: {
      type: Number,
      default: 0,
    },
    authorName: {
      type: String,
      default: "Amigo Anónimo",
    },
    authorAvatar: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

export const Note = mongoose.models.Note || mongoose.model<INote>("Note", noteSchema)
