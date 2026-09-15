import { MessageSquareHeart } from "lucide-react"

interface LogoProps {
  onClick?: () => void
}

export default function Logo({ onClick }: LogoProps) {
  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={onClick}>
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
        <MessageSquareHeart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <span className="hidden sm:inline text-2xl font-bold tracking-tight text-slate-900 font-mono">
        Anoty<span className="text-cyan-500">.</span>
      </span>
    </div>
  )
}