import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import {
  MessageSquareHeart,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Sparkles,
  Paintbrush,
  Lock,
  Share2,
  LogOut,
  ExternalLink,
  Heart,
  FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Note {
  _id: string
  boardUsername: string
  type: 'text' | 'drawing' | 'image' | 'gif'
  content: string
  color: string
  authorName?: string
  createdAt: string
}

interface UserState {
  id: string
  username: string
  name?: string
  email?: string
  avatar?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'text' | 'drawing'>('all')

  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (!saved) {
      router.push('/')
      return
    }
    setUser(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (user) fetchMyNotes()
  }, [user])

  const fetchMyNotes = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/board/my-notes/${user.username}`)
      const data = await response.json()
      if (data.success) {
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error al cargar notas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota de tu muro?')) return
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/board/notes/${noteId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        setNotes((prev) => prev.filter((n) => n._id !== noteId))
      } else {
        alert('Error al eliminar la nota')
      }
    } catch (error) {
      console.error('Error al eliminar la nota:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/send/${user?.username}`
    : `/send/${user?.username}`

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const filteredNotes = notes.filter((n) => {
    if (filterType === 'all') return true
    return n.type === filterType
  })

  if (!user) return null

  return (
    <>
      <Head>
        <title>Mi Muro Privado – Noty</title>
        <meta name="description" content="Tu tablero privado de mensajes y dibujos anónimos." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-[#0b0b12] text-slate-100 selection:bg-purple-500 selection:text-white relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-blue-500/10 blur-[120px] pointer-events-none rounded-full" />

        {/* Header */}
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

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-medium">
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
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-slate-200">@{user.username}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
          {/* Banner de Enlace Personal */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-500/30 mb-10 shadow-xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-pink-950/20">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Muro Privado • Solo tú ves estas notas</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                  ¡Hola, {user.name || `@${user.username}`}! 👋
                </h1>
                <p className="text-slate-400 text-sm">
                  Comparte tu enlace público para que tus amigos te dejen mensajes o dibujos anónimos.
                </p>
              </div>

              <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full sm:w-auto flex items-center justify-between gap-2 bg-slate-950/80 border border-white/10 px-4 py-2.5 rounded-xl font-mono text-xs text-purple-300">
                  <span className="truncate max-w-[240px] sm:max-w-[280px]">{shareUrl}</span>
                  <a
                    href={`/send/${user.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Abrir vista de envío"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <button
                  onClick={copyShareLink}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar enlace para compartir'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Notas Recibidas
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  {notes.length}
                </span>
              </h2>
              <button
                onClick={fetchMyNotes}
                className="p-2 rounded-xl glass-panel hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Actualizar muro"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterType === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Todas ({notes.length})
              </button>
              <button
                onClick={() => setFilterType('text')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterType === 'text' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                📝 Notas
              </button>
              <button
                onClick={() => setFilterType('drawing')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterType === 'drawing' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                🎨 Dibujos
              </button>
            </div>
          </div>

          {/* Notes Grid */}
          {isLoading ? (
            <div className="text-center py-20">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Cargando tus notas privadas...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10 max-w-xl mx-auto my-10">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tu muro aún está vacío</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Copia tu enlace personal y compártelo en tus historias de Instagram, TikTok o WhatsApp para que tus amigos te envíen notas o dibujos anónimos.
              </p>
              <button
                onClick={copyShareLink}
                className="gradient-button text-white font-semibold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Copiar mi enlace personal</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note._id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ y: -4 }}
                    className={`p-6 rounded-2xl shadow-xl border flex flex-col justify-between relative group ${
                      note.type === 'drawing'
                        ? 'bg-slate-900 border-purple-500/30 glass-panel'
                        : 'bg-amber-100 text-amber-950 border-amber-300'
                    }`}
                    style={note.color && note.type === 'text' ? { backgroundColor: note.color } : {}}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-950/60 hover:bg-red-600 text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
                      title="Eliminar nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider opacity-80">
                        <span className="flex items-center gap-1">
                          {note.type === 'drawing' ? <Paintbrush className="w-3.5 h-3.5 text-purple-400" /> : <FileText className="w-3.5 h-3.5" />}
                          {note.type === 'drawing' ? 'Dibujo Libre' : 'Nota Adhesiva'}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {note.type === 'drawing' ? (
                        <div className="w-full h-44 bg-slate-950/90 rounded-xl border border-white/10 flex items-center justify-center p-2 mb-3 overflow-hidden">
                          {note.content.startsWith('<svg') ? (
                            <div dangerouslySetInnerHTML={{ __html: note.content }} className="w-full h-full flex items-center justify-center" />
                          ) : (
                            <img src={note.content} alt="Dibujo" className="w-full h-full object-contain" />
                          )}
                        </div>
                      ) : (
                        <p className="font-medium text-sm sm:text-base leading-relaxed mb-4 whitespace-pre-wrap">
                          &ldquo;{note.content}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center text-xs font-semibold">
                      <span className="opacity-80">— {note.authorName || 'Amigo Anónimo'} 🤫</span>
                      <Heart className="w-4 h-4 text-pink-600 fill-pink-600" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
