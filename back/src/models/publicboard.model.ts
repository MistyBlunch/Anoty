import mongoose from "mongoose"

export interface IPublicBoardItem {
  noteId: string
  content: string
  authorName?: string
  authorAvatar?: string
  createdAt?: Date
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z: number
  transparent?: boolean
}

export interface IPublicBoard {
  _id?: string
  ownerUsername: string
  slug: string
  legacySlugs?: string[]
  title: string
  isPublished: boolean
  items: IPublicBoardItem[]
  draftItems?: IPublicBoardItem[]
  draftTitle?: string
  createdAt?: Date
  updatedAt?: Date
}

const publicBoardItemSchema = new mongoose.Schema<IPublicBoardItem>(
  {
    noteId: { type: String, required: true },
    content: { type: String, required: true },
    authorName: { type: String, default: "Amigo Anónimo" },
    authorAvatar: { type: String },
    createdAt: { type: Date },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 320 },
    height: { type: Number, default: 220 },
    rotation: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
    transparent: { type: Boolean, default: false },
  },
  { _id: false },
)

const publicBoardSchema = new mongoose.Schema<IPublicBoard>(
  {
    ownerUsername: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    legacySlugs: {
      type: [String],
      default: [],
    },
    title: {
      type: String,
      default: "Mi Muro Público",
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    items: {
      type: [publicBoardItemSchema],
      default: [],
    },
    draftItems: {
      type: [publicBoardItemSchema],
      default: [],
    },
    draftTitle: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

export const PublicBoard =
  mongoose.models.PublicBoard || mongoose.model<IPublicBoard>("PublicBoard", publicBoardSchema)