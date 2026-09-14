import { describe, it, expect, vi, beforeAll } from "vitest"
import { decode } from "hono/jwt"
import { createAuthService } from "./auth.service.js"
import type { UserRepository } from "../repositories/user.repository.js"
import type { GoogleIdTokenVerifier } from "./google-token.service.js"
import { AppError } from "../lib/error.js"

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret"
})

function makeUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByGoogleIdOrEmail: async () => null,
    findByUsername: async () => null,
    existsByUsername: async () => false,
    create: async (data) => ({ _id: "new-id", ...data }) as any,
    save: async (user) => user,
    ...overrides,
  }
}

const verifier: GoogleIdTokenVerifier = {
  verify: async () => ({ sub: "google-123", email: "emma@lap.com", name: "Emma", picture: "pic" }),
}

describe("auth.service", () => {
  it("crea un usuario nuevo con username derivado del email cuando no existe", async () => {
    const create = vi.fn(async (data: any) => ({ _id: "new-id", ...data }) as any)
    const service = createAuthService(makeUserRepo({ create }), verifier)

    const result = await service.authenticate("any-token")

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].username).toBe("emma")
    expect(result.success).toBe(true)
    expect(result.user.username).toBe("emma")

    const { payload } = decode(result.token)
    expect(payload.sub).toBe("new-id")
    expect(payload.username).toBe("emma")
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it("incrementa el username con contador hasta encontrar uno libre", async () => {
    const existing = new Set(["emma", "emma1"])
    const create = vi.fn(async (data: any) => ({ _id: "new-id", ...data }) as any)
    const service = createAuthService(
      makeUserRepo({
        existsByUsername: async (u) => existing.has(u),
        create,
      }),
      verifier,
    )

    await service.authenticate("any-token")

    expect(create.mock.calls[0][0].username).toBe("emma2")
  })

  it("actualiza googleId/avatar/name en un usuario existente y lo guarda", async () => {
    const existing = {
      _id: "u1",
      googleId: undefined,
      email: "emma@lap.com",
      name: "Emma",
      avatar: undefined,
      username: "emma",
    }
    const save = vi.fn(async (user: any) => user)
    const service = createAuthService(
      makeUserRepo({ findByGoogleIdOrEmail: async () => existing as any, save }),
      verifier,
    )

    const result = await service.authenticate("any-token")

    expect(existing.googleId).toBe("google-123")
    expect(existing.avatar).toBe("pic")
    expect(save).toHaveBeenCalled()
    expect(result.user.username).toBe("emma")
  })

  it("lanza AppError 400 si el verificador no devuelve datos", async () => {
    const service = createAuthService(makeUserRepo(), { verify: async () => null })

    await expect(service.authenticate("bad-token")).rejects.toMatchObject({
      status: 400,
      message: "No se pudieron obtener los datos de la cuenta de Google",
    })
  })

  it("propaga el AppError del verificador (token inválido)", async () => {
    const service = createAuthService(makeUserRepo(), {
      verify: async () => {
        throw new AppError(401, "Token de Google inválido o expirado")
      },
    })

    await expect(service.authenticate("ya29.bad")).rejects.toMatchObject({ status: 401 })
  })
})