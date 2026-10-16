import { useState } from "react"
import { Trash2, Bell, Settings } from "lucide-react"
import SvgSafe from "@/components/svg/SvgSafe"
import type { Drawing } from "@/types/drawing"
import type { NotificationsDropdownProps } from "@/types"
import { useLanguage } from "@/context/LanguageContext"

export default function NotificationsDropdown({
  user,
  newArrivals,
  open,
  onToggle,
  onFocus,
  onClear,
  onOpenProfile,
}: NotificationsDropdownProps) {
  const { t } = useLanguage()
  const [confirmClear, setConfirmClear] = useState(false)
  return (
    <div className="relative">
      <button
        id="notifications-bell-btn"
        onClick={() => {
          setConfirmClear(false)
          onToggle()
        }}
        className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-teal-700 hover:border-teal-500/50 shadow-sm transition-colors cursor-pointer"
        title={t("notifications_title")}
        aria-label={t("notifications_title")}
      >
        <Bell className="w-4 h-4" />
        {newArrivals.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {newArrivals.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setConfirmClear(false)
              onToggle()
            }}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-hidden bg-white border border-slate-200 rounded-t-2xl shadow-xl sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 sm:max-h-none sm:rounded-2xl sm:pb-0">
            <div className="sm:hidden pt-2 pb-1 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{t("notifications_new_drawings")}</span>
                {newArrivals.length > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                    {newArrivals.length}
                  </span>
                )}
              </div>
              {onOpenProfile && (
                <button
                  onClick={() => {
                    onToggle()
                    onOpenProfile()
                  }}
                  className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>{t("profile_modal_title")}</span>
                </button>
              )}
            </div>
            <div className="max-h-[50dvh] overflow-y-auto sm:max-h-80 pb-[env(safe-area-inset-bottom)]">
              {newArrivals.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">{t("notifications_empty")}</p>
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
                        {n.authorName || t("notifications_anonymous_friend")}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
            {newArrivals.length > 0 &&
              (confirmClear ? (
                <div className="flex items-center justify-between gap-1 bg-red-500/5 border border-red-500/20 rounded-lg px-2.5 py-2 m-2">
                  <span className="text-xs font-semibold text-red-600 truncate">
                    {t("notifications_clear")}?
                  </span>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <button
                      onClick={() => {
                        onClear()
                        setConfirmClear(false)
                      }}
                      className="text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {t("actions_confirm")}
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {t("actions_cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("notifications_clear")}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  )
}