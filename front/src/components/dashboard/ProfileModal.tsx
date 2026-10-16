import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  X,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react"
import type { AuthenticatedUser } from "@/types/auth"
import { useLanguage } from "@/context/LanguageContext"
import { api } from "@/lib/api"

interface ProfileModalProps {
  user: AuthenticatedUser
  open: boolean
  onClose: () => void
  onUpdateUsername: (newUsername: string) => Promise<{ success: boolean; message: string }>
}

export default function ProfileModal({
  user,
  open,
  onClose,
  onUpdateUsername,
}: ProfileModalProps) {
  const { t, locale } = useLanguage()
  const [usernameInput, setUsernameInput] = useState(user.username)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{
    available: boolean
    reason?: string
    isCurrent?: boolean
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<number | null>(null)

  // Sincronizar input cuando se abre el modal o cambia el usuario
  useEffect(() => {
    if (open) {
      setUsernameInput(user.username)
      setCheckResult({ available: true, isCurrent: true })
      setErrorMessage(null)
      setSuccessToast(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, user.username])

  // Escuchar tecla Escape para cerrar
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  // Debounced check de disponibilidad
  const validateAndCheckUsername = useCallback(
    (value: string) => {
      const clean = value.trim().toLowerCase()
      if (!clean) {
        setCheckResult({
          available: false,
          reason: t("profile_username_hint"),
        })
        return
      }

      if (clean === user.username.toLowerCase()) {
        setCheckResult({
          available: true,
          isCurrent: true,
          reason: t("profile_username_current"),
        })
        return
      }

      if (!/^[a-z0-9_-]{1,20}$/.test(clean)) {
        setCheckResult({
          available: false,
          reason: t("profile_username_invalid"),
        })
        return
      }

      setChecking(true)
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)

      debounceTimerRef.current = window.setTimeout(async () => {
        try {
          const res = await api.get<{
            success: boolean
            available: boolean
            reason?: string
          }>(`/auth/check-username/${clean}`)

          setCheckResult({
            available: res.available,
            reason: res.available
              ? t("profile_username_available")
              : res.reason || t("profile_username_taken"),
            isCurrent: false,
          })
        } catch {
          setCheckResult({
            available: false,
            reason: t("profile_error"),
          })
        } finally {
          setChecking(false)
        }
      }, 350)
    },
    [user.username, t],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    setUsernameInput(val)
    setErrorMessage(null)
    validateAndCheckUsername(val)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = usernameInput.trim().toLowerCase()
    if (!clean || clean === user.username) {
      onClose()
      return
    }

    if (!checkResult?.available) {
      setErrorMessage(checkResult?.reason || t("profile_username_invalid"))
      return
    }

    setSaving(true)
    setErrorMessage(null)

    try {
      const res = await onUpdateUsername(clean)
      if (res.success) {
        setSuccessToast(true)
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setErrorMessage(res.message || t("profile_error"))
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("profile_error")
      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const previewUsername = usernameInput.trim() || user.username
  const previewSendUrl = `${origin}/send/${previewUsername}${locale === "es" ? "?lang=es" : ""}`
  const previewPublicUrl = `${origin}/p/${previewUsername}${locale === "es" ? "?lang=es" : ""}`

  const isChanged = usernameInput.trim().toLowerCase() !== user.username.toLowerCase()
  const canSave = isChanged && checkResult?.available && !checking && !saving

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-10 transition-all flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {t("profile_modal_title")}
              </h2>
              <p className="text-xs text-slate-400">
                {t("profile_modal_subtitle")}
              </p>
            </div>
          </div>
          <button
            id="profile-modal-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label={t("profile_cancel")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* User Profile Summary */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt="Avatar"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border border-white shadow-sm"
                referrerPolicy="no-referrer"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-teal-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">
                {user.name || `@${user.username}`}
              </p>
              {user.email && (
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              )}
            </div>
          </div>

          {/* Username Input Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="username-input"
              className="text-xs font-bold text-slate-700 flex items-center justify-between"
            >
              <span>{t("profile_username_label")}</span>
              {checking ? (
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-teal-500" />
                  Verificando...
                </span>
              ) : checkResult ? (
                <span
                  className={`text-[11px] font-semibold flex items-center gap-1 ${
                    checkResult.isCurrent
                      ? "text-slate-500"
                      : checkResult.available
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {checkResult.isCurrent ? (
                    <Sparkles className="w-3 h-3 text-teal-500" />
                  ) : checkResult.available ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {checkResult.reason}
                </span>
              ) : null}
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-slate-400 select-none">
                @
              </span>
              <input
                id="username-input"
                ref={inputRef}
                type="text"
                value={usernameInput}
                onChange={handleInputChange}
                maxLength={20}
                placeholder={t("profile_username_placeholder")}
                className={`w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-semibold text-slate-800 bg-white placeholder-slate-400 transition-all focus:outline-none focus:ring-2 ${
                  checkResult && !checkResult.available && !checkResult.isCurrent
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    : checkResult?.available && isChanged
                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                    : "border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 px-0.5">
              {t("profile_username_hint")}
            </p>
          </div>

          {/* Links Preview */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100">
            <span className="text-xs font-bold text-teal-900 block">
              {t("profile_links_preview")}
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-teal-100/80">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    {t("profile_link_send")}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-700 truncate block">
                    {previewSendUrl}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>

              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-teal-100/80">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    {t("profile_link_public")}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-700 truncate block">
                    {previewPublicUrl}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            </div>
          </div>

          {/* Zero Data Loss Guarantee Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-800 block mb-0.5">
                {t("profile_zero_data_loss_badge")}
              </span>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                {t("profile_zero_data_loss_desc")}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Toast */}
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t("profile_saved_toast")}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              id="profile-modal-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t("profile_cancel")}
            </button>
            <button
              id="profile-modal-save-btn"
              type="submit"
              disabled={!canSave}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                canSave
                  ? "bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-500/20 active:scale-95"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t("profile_saving")}
                </>
              ) : (
                t("profile_save_btn")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
