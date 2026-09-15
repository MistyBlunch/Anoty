import { isTransparent, type Drawing } from "@/lib/board"
import { sanitizeSvg } from "@/lib/svg"

export const COMBINED_EXPORT_MARGIN = 24

export interface CombinedExport {
  svg: string
  width: number
  height: number
}

export const exportCombinedSvg = (drawings: Drawing[]): CombinedExport => {
  if (drawings.length === 0) return { svg: "", width: 0, height: 0 }
  const ordered = [...drawings].sort((a, b) => (a.z || 0) - (b.z || 0))
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const d of ordered) {
    minX = Math.min(minX, d.x)
    minY = Math.min(minY, d.y)
    maxX = Math.max(maxX, d.x + d.width)
    maxY = Math.max(maxY, d.y + d.height)
  }
  const margin = COMBINED_EXPORT_MARGIN
  const width = maxX - minX + margin * 2
  const height = maxY - minY + margin * 2
  const ox = -minX + margin
  const oy = -minY + margin
  const parts = ordered.map((d) => {
    const cx = d.width / 2
    const cy = d.height / 2
    const child = sanitizeSvg(d.content).replace(/^<svg([^>]*)>/i, (_m: string, attrs: string) => {
      const stripped = attrs.replace(/\s+(width|height)="[^"]*"/g, "")
      return `<svg x="0" y="0" width="${d.width}" height="${d.height}"${stripped}>`
    })
    const x = d.x + ox
    const y = d.y + oy
    const rotate = d.rotation || 0
    const transform = rotate
      ? `translate(${x} ${y}) translate(${cx} ${cy}) rotate(${rotate}) translate(${-cx} ${-cy})`
      : `translate(${x} ${y})`
    return `<g transform="${transform}">${child}</g>`
  })
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`,
    width,
    height,
  }
}

export const downloadSelectionAsPng = (drawings: Drawing[]): Promise<void> => {
  if (drawings.length === 0) return Promise.resolve()
  const { svg, width: W, height: H } = exportCombinedSvg(drawings)
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const img = new window.Image()
  return new Promise((resolve) => {
    img.onload = () => {
      try {
        const scale = 2
        const canvas = document.createElement("canvas")
        canvas.width = W * scale
        canvas.height = H * scale
        const ctx = canvas.getContext("2d")
        if (!ctx) return resolve()
        if (!drawings.every((d) => isTransparent(d))) {
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        const link = document.createElement("a")
        link.href = canvas.toDataURL("image/png")
        link.download = `anoty-merged-drawing.png`
        link.click()
        resolve()
      } catch {
        resolve()
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      alert("No se pudo convertir el dibujo a PNG")
      resolve()
    }
    img.src = url
  })
}