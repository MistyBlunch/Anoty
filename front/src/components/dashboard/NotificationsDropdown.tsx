import Image from "next/image"
import { Trash2 } from "lucide-react"
import SvgSafe from "@/components/svg/SvgSafe"
import type { AuthenticatedUser } from "@/types/auth"
import type { Drawing } from "@/types/drawing"

interface NotificationsDropdownProps {
  user: AuthenticatedUser
  newArrivals: Drawing[]
  open: boolean
  onToggle: () => void
  onFocus: (d: Drawing) => void
  onClear: () => void
}

export default function NotificationsDropdown({
  user,
  newArrivals,
  open,
  onToggle,
  onFocus,
  onClear,
}: NotificationsDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative flex items-center gap-1 sm:gap-2 bg-white border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm hover:border-teal-500/50 transition-colors cursor-pointer"
        title="Notificaciones"
      >
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt="Avatar"
            width={24}
            height={24}
            className="w-6 h-6 rounded-full"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline font-bold text-slate-700">@{user.username}</span>
        {newArrivals.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {newArrivals.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-hidden bg-white border border-slate-200 rounded-t-2xl shadow-xl sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 sm:max-h-none sm:rounded-2xl sm:pb-0">
            <div className="sm:hidden pt-2 pb-1 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Dibujos nuevos</span>
              {newArrivals.length > 0 && (
                <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                  {newArrivals.length}
                </span>
              )}
            </div>
            <div className="max-h-[50dvh] overflow-y-auto sm:max-h-80 pb-[env(safe-area-inset-bottom)]">
              {newArrivals.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">Sin notificaciones nuevas.</p>
              ) : (
                newArrivals.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => onFocus(n)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 cursor-pointer"
                  >
                    <SvgSafe
                      svg={n.content}
                      className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {n.authorName || "Amigo Anónimo"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
            {newArrivals.length > 0 && (
              <button
                onClick={onClear}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar notificaciones
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}