import { Inbox, Globe } from "lucide-react"

interface BoardSwitcherProps {
  mode: "inbox" | "public"
  onInbox: () => void
  onPublic: () => void
}

export default function BoardSwitcher({ mode, onInbox, onPublic }: BoardSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
      <button
        onClick={onInbox}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          mode === "inbox"
            ? "bg-white text-teal-700 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <Inbox className="w-4 h-4" />
        Mis anotys
      </button>
      <button
        onClick={onPublic}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          mode === "public"
            ? "bg-white text-teal-700 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <Globe className="w-4 h-4" />
        Muro público
      </button>
    </div>
  )
}