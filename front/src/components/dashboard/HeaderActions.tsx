import Image from "next/image"
import { LogOut, Settings } from "lucide-react"
import type { Drawing } from "@/types/drawing"
import type { AuthenticatedUser } from "@/types/auth"
import type { HeaderActionsProps } from "@/types"
import { useLanguage } from "@/context/LanguageContext"
import LanguageSwitcher from "@/components/layout/LanguageSwitcher"
import NotificationsDropdown from "./NotificationsDropdown"
import BoardSwitcher from "./BoardSwitcher"

export default function HeaderActions({
  user,
  mode,
  onInbox,
  onPublic,
  newArrivals,
  notificationsOpen,
  onToggleNotifications,
  onFocusDrawing,
  onClearNotifications,
  onOpenProfile,
  onLogout,
}: HeaderActionsProps) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <LanguageSwitcher />
      <BoardSwitcher mode={mode} onInbox={onInbox} onPublic={onPublic} />

      {/* User Profile Chip - Clic para abrir el modal de perfil y cambiar username */}
      <button
        id="profile-chip-btn"
        onClick={onOpenProfile}
        className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:border-teal-500/60 hover:text-teal-700 hover:bg-teal-50/20 transition-all cursor-pointer group"
        title={t("profile_edit_tooltip")}
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
            loading="eager"
            priority
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline font-bold">@{user.username}</span>
      </button>

      <NotificationsDropdown
        user={user}
        newArrivals={newArrivals}
        open={notificationsOpen}
        onToggle={onToggleNotifications}
        onFocus={onFocusDrawing}
        onClear={onClearNotifications}
        onOpenProfile={onOpenProfile}
      />
      <button
        onClick={onLogout}
        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 transition-colors cursor-pointer"
        title={t("header_logout_title")}
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  )
}