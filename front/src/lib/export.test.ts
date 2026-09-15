import { describe, expect, it } from "vitest"
import { exportCombinedSvg, downloadSelectionAsPng, COMBINED_EXPORT_MARGIN } from "@/lib/export"
import type { Drawing } from "@/lib/board"

const draw = (over = {}): Drawing => ({
  _id: "1",
  content: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><path/></svg>`,
  x: 0,
  y: 0,
  width: 320,
  height: 220,
  rotation: 0,
  z: 0,
  createdAt: new Date(2024, 0, 1).toISOString(),
  ...over,
})

describe("exportCombinedSvg", () => {
  it("returns an empty export for no drawings", () => {
    expect(exportCombinedSvg([])).toEqual({ svg: "", width: 0, height: 0 })
  })

  it("builds a bbox canvas around all drawings", () => {
    const a = draw({ _id: "a", x: 0, y: 0, width: 320, height: 220 })
    const b = draw({ _id: "b", x: 1000, y: 600, width: 320, height: 220 })
    const { width, height, svg } = exportCombinedSvg([a, b])
    expect(width).toBe(1000 - 0 + 320 + COMBINED_EXPORT_MARGIN * 2)
    expect(height).toBe(600 - 0 + 220 + COMBINED_EXPORT_MARGIN * 2)
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg).toContain(`width="${width}"`)
    expect(svg).toContain(`height="${height}"`)
  })

  it("paints drawings in z order (lowest first)", () => {
    const under = draw({ _id: "u", z: 0, x: 0, y: 0 })
    const over = draw({ _id: "o", z: 5, x: 0, y: 0 })
    const { svg } = exportCombinedSvg([
      { ...over, content: `<svg id="o" width="100" height="80"><path/></svg>` },
      { ...under, content: `<svg id="u" width="100" height="80"><path/></svg>` },
    ])
    const underIdx = svg.indexOf('id="u"')
    const overIdx = svg.indexOf('id="o"')
    expect(underIdx).toBeGreaterThan(-1)
    expect(overIdx).toBeGreaterThan(underIdx)
  })

  it("strips width/height from the child svg and applies the drawing size", () => {
    const { svg } = exportCombinedSvg([draw({ x: 0, y: 0, width: 320, height: 220 })])
    expect(svg).toContain(`<svg x="0" y="0" width="320" height="220"`)
  })

  it("rotates around the drawing center", () => {
    const { svg } = exportCombinedSvg([
      draw({ width: 320, height: 220, rotation: 45, x: 100, y: 50 }),
    ])
    expect(svg).toContain(`translate(24 24) translate(160 110) rotate(45) translate(-160 -110)`)
  })

  it("translates unrotated drawings plainly", () => {
    const { svg } = exportCombinedSvg([draw({ x: 100, y: 50 })])
    expect(svg).toContain(`<g transform="translate(24 24)">`)
  })
})

describe("downloadSelectionAsPng", () => {
  it("resolves immediately without a download for an empty selection", async () => {
    await expect(downloadSelectionAsPng([])).resolves.toBeUndefined()
  })
})