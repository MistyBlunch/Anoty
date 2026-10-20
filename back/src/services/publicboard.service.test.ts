import { describe, it, expect, vi } from "vitest"
import { createPublicBoardService } from "./publicboard.service.js"
import type { PublicBoardRepository } from "../repositories/publicboard.repository.js"
import type { UserRepository } from "../repositories/user.repository.js"

function makeUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByGoogleIdOrEmail: async () => null,
    findByUsername: async () => null,
    findByUsernameOrLegacy: async () => null,
    existsByUsername: async () => true,
    existsByUsernameOrLegacy: async () => true,
    create: async (data) => data as any,
    save: async (user) => user,
    updateLocale: async () => null,
    updateUsername: async () => null,
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
    updateOwnerUsername: async () => null,
    ...overrides,
  }
}

const service = (
  u: Partial<UserRepository> = {},
  b: Partial<PublicBoardRepository> = {},
  n: { onBoardChange?: (board: any) => void } = {},
) =>
  createPublicBoardService({
    userRepo: makeUserRepo(u),
    boardRepo: makeBoardRepo(b),
    notifier: n,
  })

describe("publicboard.service", () => {
  it("getOrCreate devuelve el board existente, migra slug a username y libera slugs anteriores", async () => {
    const board: any = { _id: "b1", ownerUsername: "emma", slug: "viejo-slug", legacySlugs: [], title: "T", isPublished: true, items: [] }
    const save = vi.fn(async (b: any) => b)
    const svc = service(
      { findByUsername: async () => ({ _id: "u1", username: "emma" }) as any },
      { findByOwner: async () => board, save },
    )

    const res = await svc.getOrCreate("emma")

    expect(res.board.slug).toBe("emma")
    expect(board.legacySlugs).toEqual([])
    expect(board.ownerId).toBe("u1")
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
        title: "Mi Tablero Público",
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
      message: "Tablero público no encontrado",
    })
  })

  it("getPublicBySlug devuelve title/items/slug/updatedAt cuando está publicado", async () => {
    const updatedAt = new Date("2026-01-01T00:00:00Z")
    const board: any = {
      _id: "b1",
      title: "T",
      slug: "emma",
      items: [{ noteId: "n1" }],
      isPublished: true,
      updatedAt,
    }
    const res = await service({}, { findBySlugOrLegacy: async () => board }).getPublicBySlug("emma")

    expect(res).toEqual({ success: true, title: "T", slug: "emma", updatedAt, items: [{ noteId: "n1" }] })
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

  it("updateBoard notifica cuando cambian campos publicados (items)", async () => {
    const board: any = { _id: "b1", slug: "emma", title: "T", isPublished: true, items: [], updatedAt: new Date() }
    const onBoardChange = vi.fn()
    const svc = service(
      {},
      { findById: async () => board },
      { onBoardChange },
    )

    await svc.updateBoard("b1", {
      items: [{ noteId: "n1", content: "<svg/>", x: 0, y: 0, width: 100, height: 80 }],
    })

    expect(onBoardChange).toHaveBeenCalledTimes(1)
    expect(onBoardChange).toHaveBeenCalledWith(board)
  })

  it("updateBoard notifica cuando cambia isPublished", async () => {
    const board: any = { _id: "b1", slug: "emma", title: "T", isPublished: true, items: [] }
    const onBoardChange = vi.fn()
    const svc = service({}, { findById: async () => board }, { onBoardChange })

    await svc.updateBoard("b1", { isPublished: false })

    expect(onBoardChange).toHaveBeenCalledWith(board)
  })

  it("updateBoard no notifica por cambios de solo borrador", async () => {
    const board: any = { _id: "b1", slug: "emma", title: "T", isPublished: true, items: [], draftItems: [] }
    const onBoardChange = vi.fn()
    const svc = service({}, { findById: async () => board }, { onBoardChange })

    await svc.updateBoard("b1", {
      draftTitle: "Borrador",
      draftItems: [{ noteId: "n1", content: "<svg/>", x: 0, y: 0, width: 100, height: 80 }],
    })

    expect(onBoardChange).not.toHaveBeenCalled()
  })

  it("updateBoard sincroniza draftItems con items cuando se guardan items sin enviar draftItems", async () => {
    const board: any = {
      _id: "b1",
      slug: "emma",
      title: "T",
      isPublished: true,
      items: [],
      draftItems: [{ noteId: "old", content: "<svg/>", x: 0, y: 0, width: 50, height: 50, z: 0 }],
    }
    const svc = service({}, { findById: async () => board })

    await svc.updateBoard("b1", {
      items: [{ noteId: "new-1", content: "<svg/>", x: 10, y: 20, width: 400, height: 300, z: 5 }],
    })

    expect(board.items).toHaveLength(1)
    expect(board.items[0].noteId).toBe("new-1")
    expect(board.items[0].z).toBe(5)
    expect(board.draftItems).toHaveLength(1)
    expect(board.draftItems[0].noteId).toBe("new-1")
  })

  it("getOrCreate maneja condiciones de carrera retornando el tablero creado si ocurre error de clave duplicada", async () => {
    let callCount = 0
    const existingBoard: any = { _id: "b_concurrent", ownerUsername: "emma", slug: "emma" }

    const findByOwner = vi.fn(async () => {
      // Primera llamada: no existe; Segunda llamada tras la condición de carrera: ya fue creado por otra petición
      callCount++
      if (callCount === 1) return null
      return existingBoard
    })

    const duplicateError: any = new Error("E11000 duplicate key error collection")
    duplicateError.code = 11000

    const create = vi.fn(async () => {
      throw duplicateError
    })

    const svc = service(
      { findByUsername: async () => ({ _id: "u1", username: "emma" }) as any },
      { findByOwner, create },
    )

    const res = await svc.getOrCreate("emma")
    expect(res.success).toBe(true)
    expect(res.board._id).toBe("b_concurrent")
  })

  it("updateBoard preserva el SVG existente cuando el cliente no envía content", async () => {
    const board: any = {
      _id: "b1",
      slug: "emma",
      items: [{ noteId: "n1", content: "<svg id='heavy-svg'/>", x: 10, y: 10, width: 100, height: 100 }],
      draftItems: [{ noteId: "n1", content: "<svg id='heavy-svg'/>", x: 10, y: 10, width: 100, height: 100 }],
    }
    const svc = service({}, { findById: async () => board })

    // El cliente solo envía las nuevas coordenadas, SIN el campo content
    const res = await svc.updateBoard("b1", {
      items: [{ noteId: "n1", x: 50, y: 80, width: 120, height: 120 } as any],
    })

    expect(res.board.items[0].x).toBe(50)
    expect(res.board.items[0].y).toBe(80)
    expect(res.board.items[0].content).toBe("<svg id='heavy-svg'/>")
  })

  it("updateBoard aplica deltas (updatedItems) solo a los elementos modificados", async () => {
    const board: any = {
      _id: "b1",
      slug: "emma",
      items: [
        { noteId: "n1", content: "<svg 1/>", x: 10, y: 10, width: 100, height: 100, z: 0 },
        { noteId: "n2", content: "<svg 2/>", x: 200, y: 200, width: 100, height: 100, z: 0 },
      ],
      draftItems: [
        { noteId: "n1", content: "<svg 1/>", x: 10, y: 10, width: 100, height: 100, z: 0 },
        { noteId: "n2", content: "<svg 2/>", x: 200, y: 200, width: 100, height: 100, z: 0 },
      ],
    }
    const svc = service({}, { findById: async () => board })

    // Se actualiza únicamente n1 a través de updatedItems
    const res = await svc.updateBoard("b1", {
      updatedItems: [{ noteId: "n1", x: 99, y: 88, z: 5 }],
    })

    expect(res.board.draftItems![0].x).toBe(99)
    expect(res.board.draftItems![0].y).toBe(88)
    expect(res.board.draftItems![0].z).toBe(5)
    expect(res.board.draftItems![0].content).toBe("<svg 1/>")
    // n2 no fue modificado
    expect(res.board.draftItems![1].x).toBe(200)
    expect(res.board.draftItems![1].y).toBe(200)
  })

  it("updateBoard aplica updatedDraftItems únicamente al borrador sin afectar la versión publicada", async () => {
    const board: any = {
      _id: "b1",
      slug: "emma",
      items: [
        { noteId: "n1", content: "<svg 1/>", x: 10, y: 10, width: 100, height: 100, z: 0 },
      ],
      draftItems: [
        { noteId: "n1", content: "<svg 1/>", x: 10, y: 10, width: 100, height: 100, z: 0 },
      ],
    }
    const svc = service({}, { findById: async () => board })

    const res = await svc.updateBoard("b1", {
      updatedDraftItems: [{ noteId: "n1", x: 999, y: 888 }],
    })

    // El borrador fue modificado
    expect(res.board.draftItems![0].x).toBe(999)
    expect(res.board.draftItems![0].y).toBe(888)
    // La versión pública publicada permanece intacta
    expect(res.board.items[0].x).toBe(10)
    expect(res.board.items[0].y).toBe(10)
  })
})