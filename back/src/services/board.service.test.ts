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
    countUnseenDrawings: async () => 0,
    markAllSeen: async () => {},
    create: async (data) => ({ _id: "n1", ...data }) as any,
    findById: async () => null,
    save: async (note) => note,
    deleteById: async () => null,
    ...overrides,
  }
}

const service = (u: Partial<UserRepository> = {}, n: Partial<NoteRepository> = {}) =>
  createBoardService({ userRepo: makeUserRepo(u), noteRepo: makeNoteRepo(n) })

describe("board.service", () => {
  it("getMyNotes devuelve notas, total y conteo de no vistas", async () => {
    const svc = service(
      {},
      {
        findByBoard: async () => [{ _id: "a" }, { _id: "b" }] as any,
        countUnseenDrawings: async () => 1,
      },
    )

    const res = await svc.getMyNotes("emma")

    expect(res.success).toBe(true)
    expect(res.totalNotes).toBe(2)
    expect(res.unseenDrawingCount).toBe(1)
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
    const note = { _id: "n1", x: 0, y: 0, width: 200 }
    const save = vi.fn(async (n: any) => n)
    const svc = service({}, { findById: async () => note as any, save })

    const res = await svc.updateNote("n1", { x: 100, y: 50 })

    expect(res.note).toMatchObject({ x: 100, y: 50 })
    expect(save).toHaveBeenCalled()
  })

  it("updateNote lanza 404 si la nota no existe", async () => {
    const svc = service({}, { findById: async () => null })
    await expect(svc.updateNote("x", {})).rejects.toMatchObject({ status: 404, message: "Nota no encontrada" })
  })

  it("deleteNote lanza 404 si la nota no existe", async () => {
    await expect(service({}, { deleteById: async () => null }).deleteNote("x")).rejects.toMatchObject({
      status: 404,
    })
  })

  it("getUnseenCount devuelve el conteo", async () => {
    const svc = service({}, { countUnseenDrawings: async () => 3 })
    const res = await svc.getUnseenCount("emma")
    expect(res.unseenDrawingCount).toBe(3)
  })

  it("markAllSeen marca todas como vistas", async () => {
    const markAllSeen = vi.fn(async () => {})
    const svc = service({}, { markAllSeen })
    const res = await svc.markAllSeen("emma")
    expect(markAllSeen).toHaveBeenCalledWith("emma")
    expect(res.success).toBe(true)
  })
})