import { MessageSquareHeart } from "lucide-react"

interface LogoProps {
  onClick?: () => void
}

export default function Logo({ onClick }: LogoProps) {
  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={onClick}>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
        <MessageSquareHeart className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
        Noty<span className="text-cyan-500">.</span>
      </span>
    </div>
  )
}