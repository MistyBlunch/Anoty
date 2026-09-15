import { afterEach, describe, expect, it, vi } from "vitest"

const { api, apiUrl } = await import("@/lib/api")

type Stored = Record<string, string | null>
const storage = (initial: Stored = {}) => {
  let data: Stored = { ...initial }
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void (data[k] = null),
  }
}

let fetchMock: ReturnType<typeof vi.fn>

describe("api", () => {
  it("falls back to localhost:3000 when no env var is set", () => {
    expect(apiUrl).toBe("http://localhost:3000")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends an Authorization header when a token is stored", async () => {
    fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({ success: true }) })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("window", {})
    vi.stubGlobal(
      "localStorage",
      storage({ token: "abc.def.ghi", user: '{"id":"1","username":"ana"}' }),
    )

    await api.get("/board/my-notes/ana")

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${apiUrl}/board/my-notes/ana`)
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer abc.def.ghi" })
  })

  it("omits the Authorization header when no token is stored", async () => {
    fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("window", {})
    vi.stubGlobal("localStorage", storage())

    await api.post("/board/send/ana", { content: "<svg/>" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${apiUrl}/board/send/ana`)
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(headers["Content-Type"]).toBe("application/json")
    expect((init as RequestInit).body).toBe(JSON.stringify({ content: "<svg/>" }))
  })

  it("returns parsed JSON from the response", async () => {
    fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({ success: true, notes: [] }) })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("window", {})
    vi.stubGlobal("localStorage", storage())

    const data = await api.get("/board/user/ana")
    expect(data).toEqual({ success: true, notes: [] })
  })

  it("falls back to an empty object when the JSON cannot be parsed", async () => {
    fetchMock = vi.fn().mockResolvedValue({ json: vi.fn().mockRejectedValue(new Error("boom")) })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("window", {})
    vi.stubGlobal("localStorage", storage())

    const data = await api.get("/anything")
    expect(data).toEqual({})
  })
})