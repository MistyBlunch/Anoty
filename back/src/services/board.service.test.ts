import { describe, it, expect, vi } from "vitest"
import { createBoardService } from "./board.service.js"
import type { UserRepository } from "../repositories/user.repository.js"
import type { NoteRepository } from "../repositories/note.repository.js"
import { AppError } from "../lib/error.js"

function makeUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByGoogleIdOrEmail: async () => null,
    findByUsername: async () => ({ _id: "u1", username: "emma", name: "Emma", avatar: "" }) as any,
    existsByUsername: async () => true,
    create: async (data) => data as any,
    save: async (user) => user,
    ...overrides,
  }
}

function makeNoteRepo(overrides: Partial<NoteRepository> = {}): NoteRepository {
  return {
    findByBoard: async () => [],
    markAllSeen: async () => {},
    markOneSeen: async () => null,
    create: async (data) => ({ _id: "n1", ...data }) as any,
    findById: async () => null,
    save: async (note) => note,
    deleteById: async () => null,
    ...overrides,
  }
}

const service = (
  u: Partial<UserRepository> = {},
  n: Partial<NoteRepository> = {},
  notifier: { onNewDrawing?: (username: string) => void } = {},
) =>
  createBoardService({
    userRepo: makeUserRepo(u),
    noteRepo: makeNoteRepo(n),
    notifier,
  })

describe("board.service", () => {
  it("getMyNotes devuelve notas y total", async () => {
    const svc = service(
      {},
      {
        findByBoard: async () => [{ _id: "a" }, { _id: "b" }] as any,
      },
    )

    const res = await svc.getMyNotes("emma")

    expect(res.success).toBe(true)
    expect(res.totalNotes).toBe(2)
    expect(res.notes).toHaveLength(2)
  })

  it("getMyNotes lanza 404 si el usuario no existe", async () => {
    const svc = service({ existsByUsername: async () => false })
    await expect(svc.getMyNotes("nadie")).rejects.toMatchObject({ status: 404 })
  })

  it("sendNote crea la nota para el board del receptor", async () => {
    const create = vi.fn(async (data: any) => ({ _id: "n1", ...data }) as any)
    const svc = service({}, { create })

    const res = await svc.sendNote("emma", { type: "drawing", content: "<svg/>" } as any)

    expect(create.mock.calls[0][0].boardUsername).toBe("emma")
    expect(res.note._id).toBe("n1")
    expect(res.recipient.username).toBe("emma")
    expect(res.message).toContain("@emma")
  })

  it("sendNote lanza 404 si el receptor no existe", async () => {
    const svc = service({ findByUsername: async () => null })
    await expect(svc.sendNote("nadie", { type: "text", content: "hi" } as any)).rejects.toMatchObject({
      status: 404,
      message: "El usuario receptor no existe",
    })
  })

  it("updateNote aplica updates y guarda", async () => {
    const note = { _id: "n1", boardUsername: "emma", x: 0, y: 0, width: 200 }
    const save = vi.fn(async (n: any) => n)
    const svc = service({}, { findById: async () => note as any, save })

    const res = await svc.updateNote("n1", "emma", { x: 100, y: 50 })

    expect(res.note).toMatchObject({ x: 100, y: 50 })
    expect(save).toHaveBeenCalled()
  })

  it("updateNote lanza 404 si la nota no existe", async () => {
    const svc = service({}, { findById: async () => null })
    await expect(svc.updateNote("x", "emma", {})).rejects.toMatchObject({ status: 404, message: "Nota no encontrada" })
  })

  it("updateNote lanza 403 si el dueño no corresponde", async () => {
    const svc = service({}, { findById: async () => ({ _id: "n1", boardUsername: "otra" }) as any })
    await expect(svc.updateNote("n1", "emma", {})).rejects.toMatchObject({ status: 403 })
  })

  it("deleteNote elimina la nota del dueño", async () => {
    const deleteById = vi.fn(async () => ({ _id: "n1" }) as any)
    const svc = service({}, { findById: async () => ({ _id: "n1", boardUsername: "emma" }) as any, deleteById })
    const res = await svc.deleteNote("n1", "emma")
    expect(deleteById).toHaveBeenCalledWith("n1")
    expect(res.success).toBe(true)
  })

  it("deleteNote lanza 403 si el dueño no corresponde", async () => {
    const svc = service({}, { findById: async () => ({ _id: "n1", boardUsername: "otra" }) as any })
    await expect(svc.deleteNote("n1", "emma")).rejects.toMatchObject({ status: 403 })
  })

  it("deleteNote lanza 404 si la nota no existe", async () => {
    await expect(service({}, {}).deleteNote("x", "emma")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("markAllSeen marca todas como vistas", async () => {
    const markAllSeen = vi.fn(async () => {})
    const svc = service({}, { markAllSeen })
    const res = await svc.markAllSeen("emma")
    expect(markAllSeen).toHaveBeenCalledWith("emma")
    expect(res.success).toBe(true)
  })

  it("markNoteSeen marca el dibujo y verifica el dueño", async () => {
    const markOneSeen = vi.fn(async (noteId: string, owner: string) => ({
      _id: noteId,
      boardUsername: owner,
      isSeen: true,
    }) as any)
    const svc = service({}, { markOneSeen })
    const res = await svc.markNoteSeen("n1", "emma")
    expect(markOneSeen).toHaveBeenCalledWith("n1", "emma")
    expect(res.success).toBe(true)
  })

  it("markNoteSeen lanza 404 si la nota no existe o no es del dueño", async () => {
    const svc = service({}, { markOneSeen: async () => null })
    await expect(svc.markNoteSeen("x", "emma")).rejects.toMatchObject({
      status: 404,
      message: "Nota no encontrada",
    })
  })

  it("sendNote notifica al receptor cuando llega un dibujo nuevo", async () => {
    const onNewDrawing = vi.fn()
    const svc = service(
      {},
      { create: async (data) => ({ _id: "n1", ...data }) as any },
      { onNewDrawing },
    )

    await svc.sendNote("emma", { type: "drawing", content: "<svg/>" } as any)

    expect(onNewDrawing).toHaveBeenCalledTimes(1)
    expect(onNewDrawing).toHaveBeenCalledWith("emma")
  })

  it("sendNote funciona sin notifier configurado", async () => {
    const res = await service({}, {}).sendNote("emma", { type: "drawing", content: "<svg/>" } as any)
    expect(res.success).toBe(true)
  })
})