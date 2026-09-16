import { LogOut } from "lucide-react"
import type { Drawing } from "@/lib/board"
import type { AuthenticatedUser } from "@/types/auth"
import { useLanguage } from "@/context/LanguageContext"
import LanguageSwitcher from "@/components/layout/LanguageSwitcher"
import NotificationsDropdown from "./NotificationsDropdown"
import BoardSwitcher from "./BoardSwitcher"

interface HeaderActionsProps {
  user: AuthenticatedUser
  mode: "inbox" | "public"
  onInbox: () => void
  onPublic: () => void
  newArrivals: Drawing[]
  notificationsOpen: boolean
  onToggleNotifications: () => void
  onFocusDrawing: (d: Drawing) => void
  onClearNotifications: () => void
  onLogout: () => void
}

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
  onLogout,
}: HeaderActionsProps) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <LanguageSwitcher />
      <BoardSwitcher mode={mode} onInbox={onInbox} onPublic={onPublic} />
      <NotificationsDropdown
        user={user}
        newArrivals={newArrivals}
        open={notificationsOpen}
        onToggle={onToggleNotifications}
        onFocus={onFocusDrawing}
        onClear={onClearNotifications}
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