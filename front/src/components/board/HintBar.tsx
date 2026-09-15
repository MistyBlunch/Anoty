import { Hand } from "lucide-react"

interface HintBarProps {
  text: string
}

export default function HintBar({ text }: HintBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-600 shadow-md pointer-events-none max-w-[calc(100vw-2.5rem)]">
      <Hand className="w-3.5 h-3.5 text-teal-600 shrink-0" />
      <span className="truncate whitespace-nowrap">{text}</span>
    </div>
  )
}