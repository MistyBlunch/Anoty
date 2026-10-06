import { memo, useMemo } from "react"
import { svgSafeHtml } from "@/lib/svg"

interface SvgSafeProps {
  svg: string
  className?: string
}

function SvgSafe({ svg, className }: SvgSafeProps) {
  // Sanitizing large Excalidraw SVGs is expensive; only redo it when the content changes.
  const html = useMemo(() => ({ __html: svgSafeHtml(svg) }), [svg])
  return <div className={className} dangerouslySetInnerHTML={html} />
}

export default memo(SvgSafe)