import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import Image from "next/image"
import Script from "next/script"
import {
  MessageSquareHeart,
  Send,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react"
import { motion } from "framer-motion"
import ExcalidrawCanvas from "@/components/ExcalidrawCanvas"

interface RecipientUser {
  username: string
  name: string
  avatar?: string
}

export default function SendNote() {
  const router = useRouter()
  const { username } = router.query as { username: string }

  const [isSuccess, setIsSuccess] = useState(false)
  const [recipient, setRecipient] = useState<RecipientUser | null>(null)

  useEffect(() => {
    if (!username) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    fetch(`${apiUrl}/board/user/${username}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setRecipient(data.user)
        }
      })
      .catch(() => {})
  }, [username])

  return (
    <>
      <Head>
        <title>{`Envía una nota anónima a @${username || ""} – Noty`}</title>
        <meta
          name="description"
          content={`Envía un mensaje o dibujo anónimo a @${username}. Solo ellos podrán verlo.`}
        />
      </Head>

      <Script id="load-excalidraw-asset-path" strategy="beforeInteractive">
        {`window["EXCALIDRAW_ASSET_PATH"] = window.origin;`}
      </Script>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-teal-500/20 via-cyan-500/20 to-blue-500/10 blur-[120px] pointer-events-none rounded-full" />

        {/* Header */}
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <MessageSquareHeart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                Noty<span className="text-cyan-500">.</span>
              </span>
            </div>

            <div className="text-center flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center my-auto mx-auto shadow-lg shadow-teal-500/30 overflow-hidden">
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
                  <span className="text-2xl font-extrabold text-white">
                    {username ? username.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
                Envía una nota a{" "}
                <span className="gradient-text">@{username}</span>
              </h1>
            </div>

            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="w-full mx-auto px-4 py-4 relative z-10">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-teal-500/40 shadow-2xl mt-5"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
                ¡Dibujo enviado con éxito! 🎉
              </h2>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
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
            <div>
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-[88vh]">
                <ExcalidrawCanvas username={username} onSent={() => setIsSuccess(true)} />
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
