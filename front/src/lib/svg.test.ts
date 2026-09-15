import { describe, expect, it } from "vitest"
import { sanitizeSvg, normalizeSvgTransform, svgSafeHtml } from "@/lib/svg"

describe("sanitizeSvg", () => {
  it("removes script blocks", () => {
    const out = sanitizeSvg('<svg><script>alert("x")</script><path/></svg>')
    expect(out).not.toContain("script")
    expect(out).not.toContain("alert")
  })

  it("removes case-insensitive script tags", () => {
    expect(sanitizeSvg('<svg><SCRIPT>evil()</SCRIPT></svg>')).not.toContain("SCRIPT")
  })

  it("removes inline event handlers", () => {
    const out = sanitizeSvg('<svg onload="steal()"><path onclick="hack()"/></svg>')
    expect(out).not.toContain("onload")
    expect(out).not.toContain("onclick")
    expect(out).not.toContain("steal")
  })

  it("removes bare or self-closing script tags too", () => {
    expect(sanitizeSvg('<svg><script></script></svg>')).not.toContain("script")
    expect(sanitizeSvg('<svg><script/></svg>')).not.toContain("script")
  })

  it("keeps benign content intact", () => {
    const svg = '<svg width="100"><circle cx="50" cy="50" r="40"/></svg>'
    expect(sanitizeSvg(svg)).toContain('<circle cx="50" cy="50" r="40"/>')
  })
})

describe("normalizeSvgTransform", () => {
  it("returns non-svg input unchanged", () => {
    expect(normalizeSvgTransform("hello")).toBe("hello")
  })

  it("drops width/height and forces 100% with centered aspect", () => {
    const out = normalizeSvgTransform(
      '<svg width="500" height="400" viewBox="0 0 500 400"><path/></svg>',
    )
    expect(out).toContain('width="100%"')
    expect(out).toContain('height="100%"')
    expect(out).toContain('preserveAspectRatio="xMidYMid meet"')
    expect(out).not.toContain('width="500"')
    expect(out).not.toContain('height="400"')
    expect(out).toContain('viewBox="0 0 500 400"')
  })

  it("preserves other attributes", () => {
    const out = normalizeSvgTransform('<svg fill="red" class="x"><path/></svg>')
    expect(out).toContain('fill="red"')
    expect(out).toContain('class="x"')
  })
})

describe("svgSafeHtml", () => {
  it("sanitizes then normalizes", () => {
    const out = svgSafeHtml('<svg onload="x()"><script/></svg>')
    expect(out).not.toContain("onload")
    expect(out).not.toContain("script")
    expect(out).toContain('preserveAspectRatio="xMidYMid meet"')
  })
})