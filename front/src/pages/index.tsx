import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  Sparkles,
  ArrowRight,
  MessageSquareHeart,
  CheckCircle2,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'

interface UserState {
  id: string
  username: string
  name?: string
  email?: string
  avatar?: string
}

export default function Home() {
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [user, setUser] = useState<UserState | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoggingIn(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        const response = await fetch(`${apiUrl}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: tokenResponse.access_token }),
        })
        const data = await response.json()
        if (data.success) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          setUser(data.user)
          router.push('/dashboard')
        } else {
          alert(`Error: ${data.message}`)
        }
      } catch (error) {
        console.error('Error al conectar con el backend:', error)
        alert('No se pudo conectar con el servidor backend')
      } finally {
        setIsLoggingIn(false)
      }
    },
    onError: () => alert('Fallo al abrir la ventana de Google OAuth'),
  })

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <>
      <Head>
        <title>Noty – Mensajes y dibujos anónimos para tus amigos</title>
        <meta name="description" content="Crea tu muro privado con Google y recibe mensajes y dibujos anónimos de tus amigos. Solo tú puedes verlos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <div className="min-h-screen bg-[#0b0b12] text-slate-100 selection:bg-purple-500 selection:text-white relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-blue-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-purple-900/10 blur-[150px] pointer-events-none rounded-full" />

        {/* Navbar */}
        <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <MessageSquareHeart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                Noty<span className="text-pink-500">.</span>
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Mi Muro Privado</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => loginWithGoogle()}
                disabled={isLoggingIn}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:border-purple-500/50 cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <span>{isLoggingIn ? 'Conectando...' : 'Ingresar con Google'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-8 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>Tus mensajes y dibujos anónimos, 100% privados</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Recibe notas y dibujos secretos de tus amigos <br className="hidden sm:block" />
              <span className="gradient-text">que solo TÚ podrás ver</span>
            </h1>

            <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Crea tu muro privado en 1 segundo con Google. Comparte tu enlace personal y recibe mensajes y dibujos a mano alzada. Tu muro es totalmente privado.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full sm:w-auto gradient-button text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-3 text-base shadow-lg cursor-pointer"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Ir a mi Muro Privado</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => loginWithGoogle()}
                  disabled={isLoggingIn}
                  className="w-full sm:w-auto gradient-button text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-3 text-base shadow-lg cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                    <path fill="#ffffff" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#ffffff" d="M5.6 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                    <path fill="#ffffff" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  <span>{isLoggingIn ? 'Conectando...' : 'Crear mi muro privado con Google'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sin contraseñas</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Privado para ti</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Amigos sin registro</span>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 px-6 text-center text-xs text-slate-500 absolute z-10 glass-panel w-full bottom-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
                <MessageSquareHeart className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-300 font-mono text-sm">Noty</span>
            </div>
            <p>© 2026 Noty App. Mensajes y dibujos anónimos y privados.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
