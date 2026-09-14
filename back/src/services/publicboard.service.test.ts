import { describe, it, expect, vi } from "vitest"
import { createPublicBoardService } from "./publicboard.service.js"
import type { PublicBoardRepository } from "../repositories/publicboard.repository.js"
import type { UserRepository } from "../repositories/user.repository.js"

function makeUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByGoogleIdOrEmail: async () => null,
    findByUsername: async () => null,
    existsByUsername: async () => true,
    create: async (data) => data as any,
    save: async (user) => user,
    ...overrides,
  }
}

function makeBoardRepo(overrides: Partial<PublicBoardRepository> = {}): PublicBoardRepository {
  return {
    findByOwner: async () => null,
    findById: async () => null,
    findBySlugOrLegacy: async () => null,
    create: async (data) => ({ _id: "b1", legacySlugs: [], ...data }) as any,
    save: async (board) => board,
    deleteById: async () => null,
    ...overrides,
  }
}

const service = (u: Partial<UserRepository> = {}, b: Partial<PublicBoardRepository> = {}) =>
  createPublicBoardService({ userRepo: makeUserRepo(u), boardRepo: makeBoardRepo(b) })

describe("publicboard.service", () => {
  it("getOrCreate devuelve el board existente y migra slug a username (legacy)", async () => {
    const board: any = { _id: "b1", ownerUsername: "emma", slug: "viejo-slug", legacySlugs: [], title: "T", isPublished: true, items: [] }
    const save = vi.fn(async (b: any) => b)
    const svc = service({}, { findByOwner: async () => board, save })

    const res = await svc.getOrCreate("emma")

    expect(res.board.slug).toBe("emma")
    expect(board.legacySlugs).toContain("viejo-slug")
    expect(save).toHaveBeenCalled()
  })

  it("getOrCreate crea un board nuevo con slug=username y título por defecto", async () => {
    const create = vi.fn(async (data: any) => ({ _id: "b1", ...data }) as any)
    const svc = service({}, { create })

    const res = await svc.getOrCreate("emma")

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUsername: "emma",
        slug: "emma",
        title: "Mi Muro Público",
        isPublished: true,
        items: [],
      }),
    )
    expect(res.success).toBe(true)
  })

  it("getOrCreate usa el título recibido", async () => {
    const create = vi.fn(async (data: any) => ({ _id: "b1", ...data }) as any)
    const svc = service({}, { create })

    await svc.getOrCreate("emma", "Mi Muro Raro")

    expect(create.mock.calls[0][0].title).toBe("Mi Muro Raro")
  })

  it("getOrCreate lanza 404 si el usuario no existe", async () => {
    const svc = service({ existsByUsername: async () => false })
    await expect(svc.getOrCreate("nadie")).rejects.toMatchObject({ status: 404 })
  })

  it("updateBoard aplica updates y mapea items con defaults", async () => {
    const board: any = { _id: "b1", title: "", legacySlugs: [], items: [], draftItems: [] }
    const svc = service({}, { findById: async () => board })

    const res = await svc.updateBoard("b1", {
      title: "Nuevo",
      draftTitle: "Borrador",
      isPublished: false,
      items: [{ noteId: "n1", content: "<svg/>", x: 10, y: 20, width: 100, height: 80, rotation: 45 }],
    })

    expect(res.board.title).toBe("Nuevo")
    expect(res.board.draftTitle).toBe("Borrador")
    expect(res.board.isPublished).toBe(false)
    expect(res.board.items[0]).toMatchObject({
      noteId: "n1",
      rotation: 45,
      transparent: false,
      authorName: "Amigo Anónimo",
    })
  })

  it("updateBoard lanza 404 si el board no existe", async () => {
    const svc = service({}, { findById: async () => null })
    await expect(svc.updateBoard("x", {})).rejects.toMatchObject({
      status: 404,
      message: "Board público no encontrado",
    })
  })

  it("getPublicBySlug devuelve solo title/items cuando está publicado", async () => {
    const svc = service(
      {},
      { findBySlugOrLegacy: async () => ({ _id: "b1", title: "T", items: [{ noteId: "n1" }], isPublished: true }) as any },
    )

    const res = await svc.getPublicBySlug("emma")

    expect(res).toEqual({ success: true, title: "T", items: [{ noteId: "n1" }] })
  })

  it("getPublicBySlug resuelve slugs legacy", async () => {
    const findBySlugOrLegacy = vi.fn(async () => ({ title: "T", items: [], isPublished: true }) as any)
    const svc = service({}, { findBySlugOrLegacy })

    await svc.getPublicBySlug("9465p9gg")

    expect(findBySlugOrLegacy).toHaveBeenCalledWith("9465p9gg")
  })

  it("getPublicBySlug lanza 404 si el board está oculto", async () => {
    const svc = service(
      {},
      { findBySlugOrLegacy: async () => ({ title: "T", items: [], isPublished: false }) as any },
    )
    await expect(svc.getPublicBySlug("emma")).rejects.toMatchObject({ status: 404 })
  })

  it("getPublicBySlug lanza 404 si no existe", async () => {
    await expect(service({}, { findBySlugOrLegacy: async () => null }).getPublicBySlug("zzz")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("deleteBoard lanza 404 si el board no existe", async () => {
    await expect(service({}, { deleteById: async () => null }).deleteBoard("x")).rejects.toMatchObject({
      status: 404,
    })
  })
})