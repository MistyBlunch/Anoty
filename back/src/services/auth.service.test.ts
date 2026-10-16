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
  const findByUsername = overrides.findByUsername || (async () => null)
  const existsByUsername = overrides.existsByUsername || (async () => false)
  return {
    findByGoogleIdOrEmail: async () => null,
    findByUsername,
    findByUsernameOrLegacy: overrides.findByUsernameOrLegacy || findByUsername,
    existsByUsername,
    existsByUsernameOrLegacy: overrides.existsByUsernameOrLegacy || existsByUsername,
    create: async (data) => ({ _id: "new-id", ...data }) as any,
    save: async (user) => user,
    updateLocale: async () => null,
    updateUsername: async () => null,
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

  describe("changeUsername", () => {
    it("cambia el username, migra notas y tablero público, y añade el anterior a legacyUsernames", async () => {
      const user = {
        _id: "u1",
        username: "emma",
        name: "Emma",
        email: "emma@lap.com",
        legacyUsernames: [],
      }
      const updateUsername = vi.fn(async (_id, oldU, newU) => {
        return { ...user, username: newU, legacyUsernames: [oldU] }
      })
      const updateBoardUsername = vi.fn(async () => 5)
      const updateOwnerUsername = vi.fn(async () => ({} as any))

      const service = createAuthService(
        makeUserRepo({
          existsByUsername: async () => false,
          updateUsername: updateUsername as any,
        }),
        verifier,
        undefined,
        {
          noteRepo: { updateBoardUsername } as any,
          publicBoardRepo: { updateOwnerUsername } as any,
        },
      )

      const res = await service.changeUsername("u1", "emma", "emma_art")

      expect(res.success).toBe(true)
      expect(res.user.username).toBe("emma_art")
      expect(res.user.legacyUsernames).toEqual(["emma"])
      expect(updateUsername).toHaveBeenCalledWith("u1", "emma", "emma_art")
      expect(updateBoardUsername).toHaveBeenCalledWith("emma", "emma_art")
      expect(updateOwnerUsername).toHaveBeenCalledWith("emma", "emma_art")

      const { payload } = decode(res.token)
      expect(payload.username).toBe("emma_art")
    })

    it("rechaza si el username tiene caracteres inválidos o longitud incorrecta", async () => {
      const service = createAuthService(makeUserRepo(), verifier)

      await expect(service.changeUsername("u1", "emma", "ab")).rejects.toMatchObject({
        status: 400,
      })
      await expect(service.changeUsername("u1", "emma", "inv@lid!")).rejects.toMatchObject({
        status: 400,
      })
    })

    it("rechaza nombres de usuario reservados", async () => {
      const service = createAuthService(makeUserRepo(), verifier)

      await expect(service.changeUsername("u1", "emma", "admin")).rejects.toMatchObject({
        status: 400,
      })
      await expect(service.changeUsername("u1", "emma", "dashboard")).rejects.toMatchObject({
        status: 400,
      })
    })

    it("rechaza si el nombre de usuario ya está en uso", async () => {
      const service = createAuthService(
        makeUserRepo({
          existsByUsername: async (u) => u === "taken_user",
        }),
        verifier,
      )

      await expect(service.changeUsername("u1", "emma", "taken_user")).rejects.toMatchObject({
        status: 409,
      })
    })

    it("no realiza cambios si el nombre es el mismo y retorna el usuario", async () => {
      const service = createAuthService(
        makeUserRepo({
          findByUsername: async () =>
            ({ _id: "u1", username: "emma", name: "Emma", email: "emma@lap.com" }) as any,
        }),
        verifier,
      )

      const res = await service.changeUsername("u1", "emma", "emma")
      expect(res.success).toBe(true)
      expect(res.user.username).toBe("emma")
    })
  })

  describe("isUsernameAvailable", () => {
    it("valida disponibilidad correctamente", async () => {
      const service = createAuthService(
        makeUserRepo({
          existsByUsername: async (u) => u === "existing",
        }),
        verifier,
      )

      expect((await service.isUsernameAvailable("existing")).available).toBe(false)
      expect((await service.isUsernameAvailable("existing", "existing")).available).toBe(true)
      expect((await service.isUsernameAvailable("admin")).available).toBe(false)
      expect((await service.isUsernameAvailable("ab")).available).toBe(false)
      expect((await service.isUsernameAvailable("free_user_123")).available).toBe(true)
    })
  })
})