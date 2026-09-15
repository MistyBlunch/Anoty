import type { PublicBoardRepository } from "../repositories/publicboard.repository.js"
import type { UserRepository } from "../repositories/user.repository.js"
import type {
  PublicBoardItemInput,
  UpdateBoardInput,
} from "../schemas/publicboard.schema.js"
import type { IPublicBoard } from "../models/publicboard.model.js"
import { AppError } from "../lib/error.js"

export type PublicBoardService = ReturnType<typeof createPublicBoardService>

const mapItems = (items: PublicBoardItemInput[]) =>
  items.map((item) => ({
    noteId: item.noteId,
    content: item.content,
    authorName: item.authorName || "Amigo Anónimo",
    authorAvatar: item.authorAvatar,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation ?? 0,
    z: item.z ?? 0,
    transparent: item.transparent ?? false,
  }))

export type PublicBoardNotifier = {
  onBoardChange?: (board: IPublicBoard) => void
}

export function createPublicBoardService(deps: {
  boardRepo: PublicBoardRepository
  userRepo: UserRepository
  notifier?: PublicBoardNotifier
}) {
  const { boardRepo, userRepo, notifier } = deps

  const ensureSlug = async (board: IPublicBoard, username: string) => {
    if (board.slug !== username) {
      if (board.slug && !(board.legacySlugs || []).includes(board.slug)) {
        board.legacySlugs = [...(board.legacySlugs || []), board.slug]
      }
      board.slug = username
      await boardRepo.save(board)
    }
  }

  const assertUserExists = async (username: string) => {
    const userExists = await userRepo.existsByUsername(username)
    if (!userExists) {
      throw new AppError(404, "Usuario no encontrado")
    }
  }

  const getOwnerBoard = async (username: string) => {
    await assertUserExists(username)
    const board = await boardRepo.findByOwner(username)
    if (board) {
      await ensureSlug(board, username)
    }
    return { success: true, board: board || null }
  }

  const getOrCreate = async (username: string, title?: string) => {
    await assertUserExists(username)
    const existing = await boardRepo.findByOwner(username)
    if (existing) {
      await ensureSlug(existing, username)
      return { success: true, board: existing }
    }

    const board = await boardRepo.create({
      ownerUsername: username,
      slug: username,
      title: title || "Mi Muro Público",
      isPublished: true,
      items: [],
    })

    return { success: true, board }
  }

  const updateBoard = async (boardId: string, updates: UpdateBoardInput) => {
    const board = await boardRepo.findById(boardId)
    if (!board) {
      throw new AppError(404, "Board público no encontrado")
    }

    const publishedFieldsChanged =
      typeof updates.title === "string" ||
      typeof updates.isPublished === "boolean" ||
      Array.isArray(updates.items)

    if (typeof updates.title === "string") board.title = updates.title
    if (typeof updates.draftTitle === "string") board.draftTitle = updates.draftTitle
    if (typeof updates.isPublished === "boolean") board.isPublished = updates.isPublished
    if (Array.isArray(updates.items)) {
      board.items = mapItems(updates.items)
    }
    if (Array.isArray(updates.draftItems)) {
      board.draftItems = mapItems(updates.draftItems)
    }
    await boardRepo.save(board)

    if (publishedFieldsChanged) {
      notifier?.onBoardChange?.(board)
    }

    return { success: true, board }
  }

  const deleteBoard = async (boardId: string) => {
    const deleted = await boardRepo.deleteById(boardId)
    if (!deleted) {
      throw new AppError(404, "Board público no encontrado")
    }
    return { success: true, message: "Board público eliminado" }
  }

  const getPublicBySlug = async (slug: string) => {
    const board = await boardRepo.findBySlugOrLegacy(slug)
    if (!board || !board.isPublished) {
      throw new AppError(404, "Muro público no encontrado")
    }

    return {
      success: true,
      title: board.title,
      slug: board.slug,
      updatedAt: board.updatedAt,
      items: board.items,
    }
  }

  return { getOwnerBoard, getOrCreate, updateBoard, deleteBoard, getPublicBySlug }
}