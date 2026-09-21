import { useState, useEffect } from "react"
import type { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import Head from "next/head"
import Image from "next/image"
import Script from "next/script"
import { Send, CheckCircle2, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { translations, type Locale } from "@/lib/i18n"
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas"
import HeaderShell from "@/components/layout/HeaderShell"
import { useLanguage } from "@/context/LanguageContext"
import LanguageSwitcher from "@/components/layout/LanguageSwitcher"
import type { RecipientUser } from "@/types/auth"

interface SendNoteProps {
  username: string
  initialLocale: Locale
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
}

export const getServerSideProps: GetServerSideProps<SendNoteProps> = async (context) => {
  const rawUsername = context.params?.username
  const username = typeof rawUsername === "string" ? rawUsername : ""
  const queryLang = context.query.lang
  const initialLocale: Locale = queryLang === "es" ? "es" : "en"

  const dict = translations[initialLocale]
  const titleFn = dict.send_title as (u: string) => string
  const descFn = dict.send_description as (u: string) => string

  const metaTitle = typeof titleFn === "function" ? titleFn(username) : `Send an anonymous note to @${username} – Anoty`
  const metaDescription = typeof descFn === "function" ? descFn(username) : `Send an anonymous message or drawing to @${username}. Only they can see it.`

  const host = context.req.headers.host || "anoty.app"
  const protocol = host.includes("localhost") ? "http" : "https"
  const canonicalUrl = `${protocol}://${host}/send/${username}${queryLang === "es" ? "?lang=es" : ""}`

  return {
    props: {
      username,
      initialLocale,
      metaTitle,
      metaDescription,
      canonicalUrl,
    },
  }
}

export default function SendNote({
  username: initialUsername,
  metaTitle,
  metaDescription,
  canonicalUrl,
}: SendNoteProps) {
  const router = useRouter()
  const username = initialUsername || (router.query.username as string) || ""
  const { t } = useLanguage()

  const [isSuccess, setIsSuccess] = useState(false)
  const [recipient, setRecipient] = useState<RecipientUser | null>(null)

  useEffect(() => {
    if (!username) return
    api
      .get<{ success: boolean; user?: RecipientUser }>(
        `/board/user/${username}`,
      )
      .then((data) => {
        if (data.success && data.user) setRecipient(data.user)
      })
      .catch(() => {})
  }, [username])

  const dynamicTitle = t("send_title", username || "")
  const dynamicDescription = t("send_description", username || "")

  return (
    <>
      <Head>
        <title>{dynamicTitle || metaTitle}</title>
        <meta name="description" content={dynamicDescription || metaDescription} />

        {/* Open Graph / Social Sharing (WhatsApp, Twitter, Discord, iMessage, etc.) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={dynamicTitle || metaTitle} />
        <meta property="og:description" content={dynamicDescription || metaDescription} />
        <meta property="og:image" content="/favicon.svg" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={dynamicTitle || metaTitle} />
        <meta name="twitter:description" content={dynamicDescription || metaDescription} />
        <meta name="twitter:image" content="/favicon.svg" />
      </Head>

      <Script id="load-excalidraw-asset-path" strategy="beforeInteractive">
        {`window["EXCALIDRAW_ASSET_PATH"] = window.origin;`}
      </Script>

      <div className="h-dvh bg-white text-slate-800 selection:bg-teal-500 selection:text-white relative overflow-hidden flex flex-col">
        <HeaderShell
          onLogoClick={() => router.push("/")}
          center={
            <div className="text-center flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30 overflow-hidden shrink-0">
                {recipient?.avatar ? (
                  <Image
                    src={recipient.avatar}
                    alt={t("send_avatar_alt", recipient.name)}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                ) : (
                  <span className="text-lg sm:text-2xl font-extrabold text-white">
                    {username ? username.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <h1 className="text-base/tight md:text-2xl sm:text-lg font-extrabold text-slate-900 mb-0 min-w-0">
                {t("send_header_title", username || "")
                  .split(`@${username}`)
                  .flatMap((part, i, arr) =>
                    i < arr.length - 1
                      ? [part, <span key={i} className="gradient-text">@{username}</span>]
                      : [part],
                  )}
              </h1>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t("send_back")}</span>
              </button>
            </div>
          }
        />

        {/* Content */}
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 relative z-10">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-6 sm:p-12 text-center border border-teal-500/40 shadow-2xl m-auto max-w-lg w-full"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
                {t("send_success_heading")}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                {t("send_success_body", username || "").split(`@${username}`).flatMap((part, i, arr) =>
                  i < arr.length - 1
                    ? [part, <strong key={i} className="text-teal-700">@{username}</strong>]
                    : [part],
                )}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsSuccess(false)}
                  className="gradient-button text-white font-semibold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t("send_another")}</span>
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="glass-panel text-slate-700 font-medium px-6 py-3 rounded-xl border border-slate-200 text-sm inline-flex items-center gap-2 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  {t("send_create_wall")}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-slate-200">
              <ExcalidrawCanvas
                username={username}
                onSent={() => setIsSuccess(true)}
              />
            </div>
          )}
        </main>
      </div>
    </>
  )
}
