import type { PublicBoardRepositoryPort } from "../ports/out/publicboard-repository.port.js"
import type { UserRepositoryPort } from "../ports/out/user-repository.port.js"
import type { PublicBoard, PublicBoardItem } from "../../domain/index.js"
import { AppError } from "../../domain/index.js"

export interface PublicBoardItemDTO {
  noteId: string
  content: string
  authorName?: string
  authorAvatar?: string
  createdAt?: string | Date
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  z?: number
  transparent?: boolean
}

export interface UpdateBoardDTO {
  title?: string
  draftTitle?: string
  isPublished?: boolean
  items?: PublicBoardItemDTO[]
  draftItems?: PublicBoardItemDTO[]
}

export type PublicBoardNotifier = {
  onBoardChange?: (board: PublicBoard) => void
}

export type PublicBoardService = ReturnType<typeof createPublicBoardService>

const mapItems = (items: PublicBoardItemDTO[]): PublicBoardItem[] =>
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

export function createPublicBoardService(deps: {
  boardRepo: PublicBoardRepositoryPort
  userRepo: UserRepositoryPort
  notifier?: PublicBoardNotifier
}) {
  const { boardRepo, userRepo, notifier } = deps

  const ensureSlug = async (board: PublicBoard, username: string) => {
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
      title: title || "Mi Tablero Público",
      isPublished: true,
      items: [],
    })

    return { success: true, board }
  }

  const updateBoard = async (boardId: string, updates: UpdateBoardDTO) => {
    const publishedFieldsChanged =
      typeof updates.title === "string" ||
      typeof updates.isPublished === "boolean" ||
      Array.isArray(updates.items)

    const updateData: Partial<PublicBoard> = {}
    if (typeof updates.title === "string") updateData.title = updates.title
    if (typeof updates.draftTitle === "string") updateData.draftTitle = updates.draftTitle
    if (typeof updates.isPublished === "boolean") updateData.isPublished = updates.isPublished
    if (Array.isArray(updates.items)) {
      updateData.items = mapItems(updates.items)
      if (!Array.isArray(updates.draftItems)) {
        updateData.draftItems = updateData.items
      }
    }
    if (Array.isArray(updates.draftItems)) {
      updateData.draftItems = mapItems(updates.draftItems)
    }

    let saved: PublicBoard | null = null
    if (typeof boardRepo.update === "function") {
      saved = await boardRepo.update(boardId, updateData)
    } else {
      const board = await boardRepo.findById(boardId)
      if (!board) throw new AppError(404, "Tablero público no encontrado")
      Object.assign(board, updateData)
      saved = await boardRepo.save(board)
    }

    if (!saved) {
      throw new AppError(404, "Tablero público no encontrado")
    }

    if (publishedFieldsChanged) {
      notifier?.onBoardChange?.(saved)
    }

    return { success: true, board: saved }
  }

  const deleteBoard = async (boardId: string) => {
    const deleted = await boardRepo.deleteById(boardId)
    if (!deleted) {
      throw new AppError(404, "Tablero público no encontrado")
    }
    return { success: true, message: "Tablero público eliminado" }
  }

  const getPublicBySlug = async (slug: string) => {
    const board = await boardRepo.findBySlugOrLegacy(slug)
    if (!board || !board.isPublished) {
      throw new AppError(404, "Tablero público no encontrado")
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
