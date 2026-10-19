import type { PublicBoardRepositoryPort } from "../ports/out/publicboard-repository.port.js"
import type { UserRepositoryPort } from "../ports/out/user-repository.port.js"
import type { NoteRepositoryPort } from "../ports/out/note-repository.port.js"
import type { PublicBoard, PublicBoardItem, User } from "../../domain/index.js"
import { AppError } from "../../domain/index.js"

export interface PublicBoardItemDTO {
  noteId: string
  content?: string
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

export interface PublicBoardItemDeltaDTO {
  noteId: string
  x?: number
  y?: number
  width?: number
  height?: number
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
  updatedItems?: PublicBoardItemDeltaDTO[]
  updatedDraftItems?: PublicBoardItemDeltaDTO[]
}

export type PublicBoardNotifier = {
  onBoardChange?: (board: PublicBoard) => void
}

export type PublicBoardService = ReturnType<typeof createPublicBoardService>

export function createPublicBoardService(deps: {
  boardRepo: PublicBoardRepositoryPort
  userRepo: UserRepositoryPort
  noteRepo?: NoteRepositoryPort
  notifier?: PublicBoardNotifier
}) {
  const { boardRepo, userRepo, noteRepo, notifier } = deps

  const ensureSlug = async (board: PublicBoard, username: string) => {
    if (board.slug !== username) {
      board.slug = username
      board.legacySlugs = []
      await boardRepo.save(board)
    }
  }

  const getUserOrThrow = async (username: string): Promise<User> => {
    let user = await userRepo.findByUsername(username)
    if (!user) {
      const exists = await userRepo.existsByUsername(username)
      if (!exists) {
        throw new AppError(404, "Usuario no encontrado")
      }
      user = { username } as User
    }
    return user
  }

  const getOwnerBoard = async (username: string) => {
    const user = await getUserOrThrow(username)
    const userId = (user.id || user._id)?.toString()
    const board = await boardRepo.findByOwner(username, userId)
    if (board) {
      if (!board.ownerId && userId) {
        board.ownerId = userId
        await boardRepo.save(board)
      }
      await ensureSlug(board, username)
    }
    return { success: true, board: board || null }
  }

  const getOrCreate = async (username: string, title?: string) => {
    const user = await getUserOrThrow(username)
    const userId = (user.id || user._id)?.toString()
    const existing = await boardRepo.findByOwner(username, userId)
    if (existing) {
      if (!existing.ownerId && userId) {
        existing.ownerId = userId
        await boardRepo.save(existing)
      }
      await ensureSlug(existing, username)
      return { success: true, board: existing }
    }

    try {
      const board = await boardRepo.create({
        ownerId: userId,
        ownerUsername: username,
        slug: username,
        title: title || "Mi Tablero Público",
        isPublished: true,
        items: [],
      })

      return { success: true, board }
    } catch (err: any) {
      // Manejo de condición de carrera: si otra petición concurrente creó el tablero en el mismo instante
      const isDuplicateKey =
        err?.code === 11000 ||
        err?.name === "MongoServerError" ||
        err?.message?.includes("E11000") ||
        err?.message?.includes("duplicate key")
      if (isDuplicateKey) {
        const concurrentBoard = await boardRepo.findByOwner(username, userId)
        if (concurrentBoard) {
          return { success: true, board: concurrentBoard }
        }
      }
      throw err
    }
  }

  const updateBoard = async (boardId: string, updates: UpdateBoardDTO) => {
    const publishedFieldsChanged =
      typeof updates.title === "string" ||
      typeof updates.isPublished === "boolean" ||
      Array.isArray(updates.items) ||
      (Array.isArray(updates.updatedItems) && updates.updatedItems.length > 0)

    const board = await boardRepo.findById(boardId)
    if (!board) throw new AppError(404, "Tablero público no encontrado")

    const existingItemMap = new Map<string, PublicBoardItem>()
    for (const it of board.items || []) {
      if (it.noteId) existingItemMap.set(it.noteId, it)
    }
    for (const it of board.draftItems || []) {
      if (it.noteId && !existingItemMap.has(it.noteId)) existingItemMap.set(it.noteId, it)
    }

    const resolveItem = async (dto: PublicBoardItemDTO): Promise<PublicBoardItem> => {
      const existing = existingItemMap.get(dto.noteId)
      let content = dto.content || existing?.content || ""
      let authorName = dto.authorName || existing?.authorName || "Amigo Anónimo"
      let authorAvatar = dto.authorAvatar !== undefined ? dto.authorAvatar : existing?.authorAvatar
      let createdAt = dto.createdAt ? new Date(dto.createdAt) : existing?.createdAt

      if (!content && noteRepo) {
        try {
          const originalNote = await noteRepo.findById(dto.noteId)
          if (originalNote) {
            content = originalNote.content || ""
            if (!dto.authorName && originalNote.authorName) authorName = originalNote.authorName
            if (dto.authorAvatar === undefined && originalNote.authorAvatar) authorAvatar = originalNote.authorAvatar
            if (!dto.createdAt && originalNote.createdAt) createdAt = originalNote.createdAt
          }
        } catch {}
      }

      return {
        noteId: dto.noteId,
        content,
        authorName,
        authorAvatar,
        createdAt,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        rotation: dto.rotation ?? 0,
        z: dto.z ?? 0,
        transparent: dto.transparent ?? false,
      }
    }

    const updateData: Partial<PublicBoard> = {}
    if (typeof updates.title === "string") updateData.title = updates.title
    if (typeof updates.draftTitle === "string") updateData.draftTitle = updates.draftTitle
    if (typeof updates.isPublished === "boolean") updateData.isPublished = updates.isPublished

    // 1. Si se envían deltas de items específicos (updatedItems)
    if (Array.isArray(updates.updatedItems) && updates.updatedItems.length > 0) {
      const deltaMap = new Map(updates.updatedItems.map((u) => [u.noteId, u]))
      const applyDelta = (list: PublicBoardItem[]) =>
        list.map((it) => {
          const delta = deltaMap.get(it.noteId)
          if (!delta) return it
          return {
            ...it,
            ...(delta.x !== undefined ? { x: delta.x } : {}),
            ...(delta.y !== undefined ? { y: delta.y } : {}),
            ...(delta.width !== undefined ? { width: delta.width } : {}),
            ...(delta.height !== undefined ? { height: delta.height } : {}),
            ...(delta.rotation !== undefined ? { rotation: delta.rotation } : {}),
            ...(delta.z !== undefined ? { z: delta.z } : {}),
            ...(delta.transparent !== undefined ? { transparent: delta.transparent } : {}),
          }
        })

      updateData.draftItems = applyDelta(board.draftItems || board.items || [])
      updateData.items = applyDelta(board.items || [])
    }

    // 1b. Si se envían deltas solo para borrador (updatedDraftItems)
    if (Array.isArray(updates.updatedDraftItems) && updates.updatedDraftItems.length > 0) {
      const deltaMap = new Map(updates.updatedDraftItems.map((u) => [u.noteId, u]))
      const applyDelta = (list: PublicBoardItem[]) =>
        list.map((it) => {
          const delta = deltaMap.get(it.noteId)
          if (!delta) return it
          return {
            ...it,
            ...(delta.x !== undefined ? { x: delta.x } : {}),
            ...(delta.y !== undefined ? { y: delta.y } : {}),
            ...(delta.width !== undefined ? { width: delta.width } : {}),
            ...(delta.height !== undefined ? { height: delta.height } : {}),
            ...(delta.rotation !== undefined ? { rotation: delta.rotation } : {}),
            ...(delta.z !== undefined ? { z: delta.z } : {}),
            ...(delta.transparent !== undefined ? { transparent: delta.transparent } : {}),
          }
        })

      const baseList = updateData.draftItems || board.draftItems || board.items || []
      updateData.draftItems = applyDelta(baseList)
    }

    // 2. Si se envían items completos (con o sin content)
    if (Array.isArray(updates.items)) {
      updateData.items = await Promise.all(updates.items.map(resolveItem))
      if (!Array.isArray(updates.draftItems)) {
        updateData.draftItems = updateData.items
      }
    }

    // 3. Si se envían draftItems completos (con o sin content)
    if (Array.isArray(updates.draftItems)) {
      updateData.draftItems = await Promise.all(updates.draftItems.map(resolveItem))
    }

    let saved: PublicBoard | null = null
    if (typeof boardRepo.update === "function") {
      saved = await boardRepo.update(boardId, updateData)
    } else {
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
