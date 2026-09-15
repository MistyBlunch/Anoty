import { Inbox, Globe } from "lucide-react"

interface BoardSwitcherProps {
  mode: "inbox" | "public"
  onInbox: () => void
  onPublic: () => void
}

export default function BoardSwitcher({ mode, onInbox, onPublic }: BoardSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 border border-slate-200 p-0.5 sm:p-1 rounded-xl">
      <button
        onClick={onInbox}
        className={`flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          mode === "inbox"
            ? "bg-white text-teal-700 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title="Mis anotys"
      >
        <Inbox className="w-4 h-4" />
        <span className="hidden sm:inline">Mis anotys</span>
      </button>
      <button
        onClick={onPublic}
        className={`flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          mode === "public"
            ? "bg-white text-teal-700 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title="Muro público"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">Muro público</span>
      </button>
    </div>
  )
}