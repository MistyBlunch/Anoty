import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import Image from "next/image"
import Script from "next/script"
import { Send, CheckCircle2, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas"
import HeaderShell from "@/components/layout/HeaderShell"
import type { RecipientUser } from "@/types/auth"

export default function SendNote() {
  const router = useRouter()
  const { username } = router.query as { username: string }

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

  return (
    <>
      <Head>
        <title>{`Envía una nota anónima a @${username || ""} – Anoty`}</title>
        <meta
          name="description"
          content={`Envía un mensaje o dibujo anónimo a @${username}. Solo ellos podrán verlo.`}
        />
      </Head>

      <Script id="load-excalidraw-asset-path" strategy="beforeInteractive">
        {`window["EXCALIDRAW_ASSET_PATH"] = window.origin;`}
      </Script>

      <div className="h-dvh bg-white text-slate-800 selection:bg-teal-500 selection:text-white relative overflow-hidden flex flex-col">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-teal-500/20 via-cyan-500/20 to-blue-500/10 blur-[120px] pointer-events-none rounded-full" />

        <HeaderShell
          onLogoClick={() => router.push("/")}
          center={
            <div className="text-center flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30 overflow-hidden shrink-0">
                {recipient?.avatar ? (
                  <Image
                    src={recipient.avatar}
                    alt={`Avatar de ${recipient.name}`}
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
                Envía una nota a{" "}
                <span className="gradient-text">@{username}</span>
              </h1>
            </div>
          }
          right={
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver al inicio</span>
            </button>
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
                ¡Dibujo enviado con éxito! 🎉
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                Tu dibujo fue guardado de forma anónima en el muro privado de{" "}
                <strong className="text-teal-700">@{username}</strong>. <br />
                Recuerda que solo esta persona podrá verlo al iniciar sesión.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsSuccess(false)}
                  className="gradient-button text-white font-semibold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Dibujar otra nota</span>
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="glass-panel text-slate-700 font-medium px-6 py-3 rounded-xl border border-slate-200 text-sm inline-flex items-center gap-2 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Crear mi propio muro
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
