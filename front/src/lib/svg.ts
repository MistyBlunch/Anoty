export const sanitizeSvg = (svg: string) =>
  svg.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/on\w+\s*=\s*["'][\s\S]*?["']/gi, "")

export const normalizeSvgTransform = (svg: string) => {
  if (!/^<svg/i.test(svg)) return svg
  return svg.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
    const clean = attrs.replace(/\s+(width|height)="[^"]*"/g, "")
    return `<svg${clean} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`
  })
}