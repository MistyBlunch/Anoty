import { describe, expect, it } from "vitest"
import {
  MIN_ZOOM,
  MAX_ZOOM,
  fitNoteSize,
  isTransparent,
  rectsCollide,
  placeDrawings,
  computeContentView,
  computeFocusView,
  zoomTowardPoint,
  serializeBoardItems,
  normalizeBoardItems,
  normalizeNotes,
  findVisibleFreeSlot,
  type Drawing,
} from "@/lib/board"

const draw = (over = {}): Drawing => ({
  _id: "1",
  content: "<svg></svg>",
  x: 0,
  y: 0,
  width: 320,
  height: 220,
  rotation: 0,
  createdAt: new Date(2024, 0, 1).toISOString(),
  ...over,
})

describe("fitNoteSize", () => {
  it("applies defaults when sizes are missing", () => {
    expect(fitNoteSize(undefined, undefined)).toEqual({ width: 320, height: 220 })
  })

  it("enforces a 40px minimum", () => {
    expect(fitNoteSize(10, 10)).toMatchObject({ width: 40, height: 40 })
  })

  it("scales large notes down to the 520x420 cap keeping aspect", () => {
    expect(fitNoteSize(800, 600)).toEqual({ width: 520, height: 390 })
  })

  it("does not upscale small notes", () => {
    expect(fitNoteSize(200, 100)).toEqual({ width: 200, height: 100 })
  })
})

describe("isTransparent", () => {
  it("only returns true for explicitly boolean true", () => {
    expect(isTransparent({ transparent: true })).toBe(true)
    expect(isTransparent({ transparent: false })).toBe(false)
    expect(isTransparent({ transparent: null })).toBe(false)
    expect(isTransparent({})).toBe(false)
  })
})

describe("rectsCollide", () => {
  const rects = [{ x: 0, y: 0, w: 100, h: 100 }]

  it("detects an overlap inside a rect", () => {
    expect(rectsCollide(rects, 10, 10, 50, 50)).toBe(true)
  })

  it("respects the GAP padding", () => {
    expect(rectsCollide(rects, 100, 0, 50, 50)).toBe(true)
    expect(rectsCollide(rects, 114, 0, 50, 50)).toBe(false)
  })

  it("returns false on the empty list", () => {
    expect(rectsCollide([], 0, 0, 50, 50)).toBe(false)
  })
})

describe("placeDrawings", () => {
  it("sorts by createdAt and keeps already-positioned drawings in place", () => {
    const items = [
      draw({ _id: "a", x: 500, y: 50, positionSet: true, createdAt: new Date(2024, 0, 2).toISOString() }),
      draw({ _id: "b", x: 0, y: 0, positionSet: true, createdAt: new Date(2024, 0, 1).toISOString() }),
    ]
    const placed = placeDrawings(items)
    expect(placed[0]._id).toBe("b")
    expect(placed[1]._id).toBe("a")
    expect(placed[0]).toEqual(items[1])
    expect(placed[1]).toEqual(items[0])
  })

  it("places unpositioned drawings without colliding and marks them positionSet", () => {
    const items = [draw({ _id: "a", x: 0, y: 0 }), draw({ _id: "b", x: 0, y: 0 })]
    const placed = placeDrawings(items)
    expect(placed[0].x).toBe(0)
    expect(placed[0].y).toBe(0)
    expect(placed[1].x).toBe(336)
    expect(placed[1].y).toBe(0)
    expect(placed[1].positionSet).toBe(true)
    expect(rectsCollide(
      [{ x: placed[0].x, y: placed[0].y, w: 320, h: 220 }],
      placed[1].x, placed[1].y, 320, 220,
    )).toBe(false)
  })

  it("treats non-zero x/y as an intentional position even without positionSet", () => {
    const placed = placeDrawings([draw({ _id: "a", x: 120, y: 80 })])
    expect(placed[0].x).toBe(120)
    expect(placed[0].y).toBe(80)
    expect(placed[0].positionSet).toBeUndefined()
  })
})

describe("computeContentView", () => {
  it("returns a default centered view for an empty board", () => {
    expect(computeContentView(1200, 800, [])).toEqual({ zoom: 0.8, pan: { x: 0, y: 0 } })
  })

  it("caps zoom at 1.25", () => {
    const view = computeContentView(1200, 800, [draw()])
    expect(view.zoom).toBeCloseTo(1.25, 5)
    expect(view.pan.x).toBeCloseTo(400, 5)
    expect(view.pan.y).toBeCloseTo(262.5, 5)
  })

  it("zooms out to fit tall content and never below MIN_ZOOM", () => {
    const wide = draw({ width: 5000, height: 100 })
    const view = computeContentView(1200, 800, [wide])
    expect(view.zoom).toBeGreaterThanOrEqual(MIN_ZOOM)
    expect(view.zoom).toBeLessThanOrEqual(MAX_ZOOM)
    expect(view.zoom).toBeLessThan(1)
  })
})

describe("computeFocusView", () => {
  it("centers a single drawing", () => {
    const view = computeFocusView(1200, 800, draw({ x: 100, y: 50 }))
    expect(view.zoom).toBeCloseTo(1.25, 5)
    expect(view.pan.x).toBeCloseTo(1200 / 2 - (100 + 160) * 1.25, 5)
    expect(view.pan.y).toBeCloseTo(800 / 2 - (50 + 110) * 1.25, 5)
  })
})

describe("zoomTowardPoint", () => {
  it("zooms toward the given client point", () => {
    const view = zoomTowardPoint({ x: 0, y: 0 }, 1, 2, 100, 100)
    expect(view.zoom).toBe(2)
    expect(view.pan).toEqual({ x: -100, y: -100 })
  })

  it("clamps the zoom factor", () => {
    expect(zoomTowardPoint({ x: 0, y: 0 }, 1, 0.01, 0, 0).zoom).toBe(MIN_ZOOM)
    expect(zoomTowardPoint({ x: 0, y: 0 }, 1, 1000, 0, 0).zoom).toBe(MAX_ZOOM)
  })
})

describe("serializeBoardItems", () => {
  it("rounds coordinates and keeps author data", () => {
    const items = [draw({ authorName: "Ana", x: 10.4, y: 20.6, transparent: true })]
    const out = serializeBoardItems(items)
    expect(out[0]).toMatchObject({
      noteId: "1",
      x: 10,
      y: 21,
      rotation: 0,
      z: 0,
      transparent: true,
      authorName: "Ana",
    })
  })
})

describe("normalizeBoardItems", () => {
  it("maps API board items to drawing shapes with fitted sizes", () => {
    const out = normalizeBoardItems([{ noteId: "n1", x: 5, y: 6, width: 900, height: 900 }])
    expect(out[0]).toMatchObject({ _id: "n1", x: 5, y: 6, width: 420, height: 420, z: 0 })
    expect(out[0].transparent).toBeNull()
  })
})

describe("normalizeNotes", () => {
  it("filters to drawings and preserves seen/position flags", () => {
    const notes = [
      { type: "text", _id: "t1", content: "hola" },
      { type: "drawing", _id: "d1", content: "<svg/>", width: 800, height: 600, isSeen: false, positionSet: true, z: 2 },
    ]
    const out = normalizeNotes(notes)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ _id: "d1", width: 520, height: 390, isSeen: false, positionSet: true, z: 2 })
  })
})

describe("findVisibleFreeSlot", () => {
  it("returns the viewport center when nothing is placed", () => {
    expect(findVisibleFreeSlot(200, 200, { x: 0, y: 0 }, 1, 50, 50, [])).toEqual({ x: 75, y: 75 })
  })

  it("places beside the nearest rect without collision", () => {
    const slot = findVisibleFreeSlot(400, 400, { x: 0, y: 0 }, 1, 50, 50, [
      { x: 0, y: 0, w: 100, h: 100 },
    ])
    expect(slot).toEqual({ x: 114, y: 0 })
  })
})