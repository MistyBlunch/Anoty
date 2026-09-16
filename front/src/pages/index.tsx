import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import {
  Sparkles,
  ArrowRight,
  MessageSquareHeart,
  CheckCircle2,
  LogOut,
  LayoutDashboard,
  Share2,
  Copy,
  Check,
  Paintbrush,
  Send,
} from "lucide-react"
import { motion } from "framer-motion"
import { useGoogleLogin } from "@react-oauth/google"
import { api } from "@/lib/api"
import type { AuthenticatedUser } from "@/types/auth"

import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import HeaderShell from "@/components/layout/HeaderShell"
import LanguageSwitcher from "@/components/layout/LanguageSwitcher"

export default function Home() {
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { user, saveSession, logout } = useAuth({ redirect: false })
  const { t } = useLanguage()

  const [copiedLink, setCopiedLink] = useState(false)
  const [origin, setOrigin] = useState("https://anoty.app")

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin)
    }
  }, [])

  const shareUrl = user ? `${origin}/send/${user.username}` : `${origin}/send/yourname`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch {
      // fallback
    }
  }

  const loginWithGoogle = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setIsLoggingIn(true)
      try {
        const data = await api.post<{ success: boolean; token?: string; user?: AuthenticatedUser; message?: string }>(
          "/auth/google",
          { idToken: tokenResponse.access_token },
        )
        if (data.success && data.token && data.user) {
          saveSession(data.user, data.token)
          router.push("/dashboard")
        } else {
          alert(`Error: ${data.message || t("login_error_default")}`)
        }
      } catch (error) {
        console.error("Error connecting to backend:", error)
        alert(t("login_backend_error"))
      } finally {
        setIsLoggingIn(false)
      }
    },
    onError: () => alert(t("login_oauth_error")),
  })

  return (
    <>
      <Head>
        <title>{t("home_title")}</title>
        <meta name="description" content={t("home_description")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-teal-500/20 via-cyan-500/20 to-blue-500/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-teal-900/10 blur-[150px] pointer-events-none rounded-full" />

        <HeaderShell
          onLogoClick={() => router.push("/")}
          right={
            user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <LanguageSwitcher />
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-medium px-3 sm:px-4 py-2 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("my_private_wall")}</span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 transition-colors cursor-pointer"
                  title={t("sign_out")}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <button
                  onClick={() => loginWithGoogle()}
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:border-teal-500/50 cursor-pointer active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  <span className="hidden sm:inline">{t("login_with_google")}</span>
                  <span className="sm:hidden">{isLoggingIn ? "..." : t("login_short")}</span>
                </button>
              </div>
            )
          }
        />

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto px-6 pt-12 pb-16 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-teal-500/30 text-teal-700 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
              <span>{t("hero_badge")}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 leading-[1.15]">
              {t("hero_heading_1")} <br className="hidden sm:block" />
              <span className="gradient-text">{t("hero_heading_2")}</span>
            </h1>

            {/* Subheading */}
            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              {t("hero_subheading")}
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              {user ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full sm:w-auto gradient-button text-white font-semibold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-base shadow-lg cursor-pointer"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>{t("go_to_my_wall")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => loginWithGoogle()}
                  disabled={isLoggingIn}
                  className="w-full sm:w-auto gradient-button text-white font-semibold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2.5 text-base shadow-lg cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#ffffff" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#ffffff" d="M5.6 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                    <path fill="#ffffff" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  <span>{isLoggingIn ? t("connecting") : t("hero_cta_create")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Micro badges */}
            <div className="flex items-center justify-center flex-wrap gap-5 text-xs text-slate-500 mb-12">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t("hero_check_no_passwords")}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t("hero_check_private")}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t("hero_check_no_register")}</span>
            </div>

            {/* Share Link Preview Box */}
            <div className="max-w-2xl mx-auto mb-16">
              <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-lg border border-teal-500/20 text-left">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{t("hero_share_preview_label")}</p>
                      <p className="text-[11px] text-slate-400">{t("hero_share_preview_sublabel")}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                      copiedLink
                        ? "bg-emerald-500 text-white"
                        : "bg-teal-600 hover:bg-teal-700 text-white active:scale-95"
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("hero_share_preview_copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t("hero_share_preview_copy_btn")}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono select-all overflow-x-auto">
                  <span className="text-teal-600 font-bold">🔗</span>
                  <span className="truncate">{shareUrl}</span>
                </div>
              </div>
            </div>

            {/* How It Works: 3 Clean Steps */}
            <div className="pt-4 border-t border-slate-200/60 max-w-4xl mx-auto text-left">
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                  {t("how_it_works_title")}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {t("how_it_works_subtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center mb-3">
                      {t("step_1_badge")}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <LayoutDashboard className="w-4 h-4 text-teal-600" />
                      {t("step_1_title")}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t("step_1_desc")}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-700 font-bold text-xs flex items-center justify-center mb-3">
                      {t("step_2_badge")}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-cyan-600" />
                      {t("step_2_title")}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t("step_2_desc")}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
                      {t("step_3_badge")}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <Paintbrush className="w-4 h-4 text-blue-600" />
                      {t("step_3_title")}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t("step_3_desc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-5 px-6 text-center text-xs text-slate-500 glass-panel w-full">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-teal-600 flex items-center justify-center">
                <MessageSquareHeart className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-700 font-mono text-sm">Anoty</span>
            </div>
            <p>© {new Date().getFullYear()} Anoty App. {t("footer_tagline")}</p>
          </div>
        </footer>
      </div>
    </>
  )
}