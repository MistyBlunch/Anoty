import type { MarqueeRect } from "@/hooks/useBoardGesture"

interface MarqueeOverlayProps {
  rect: MarqueeRect
}

export default function MarqueeOverlay({ rect }: MarqueeOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute z-20 border-2 border-teal-500 bg-teal-400/10"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}