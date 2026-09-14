import { svgSafeHtml } from "@/lib/svg"

interface SvgSafeProps {
  svg: string
  className?: string
}

export default function SvgSafe({ svg, className }: SvgSafeProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: svgSafeHtml(svg) }} />
}