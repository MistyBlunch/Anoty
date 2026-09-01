import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  MessageSquareHeart,
  Paintbrush,
  Send,
  Lock,
  Eraser,
  CheckCircle2,
  Palette,
  ArrowLeft,
  FileText
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function SendNote() {
  const router = useRouter()
  const { username } = router.query as { username: string }

  const [activeTab, setActiveTab] = useState<'text' | 'drawing'>('text')
  const [textContent, setTextContent] = useState('')
  const [noteColor, setNoteColor] = useState('#fef08a')
  const [authorName, setAuthorName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Canvas state for Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState('#ec4899')
  const [brushSize, setBrushSize] = useState(4)

  const colors = [
    { name: 'Amarillo', hex: '#fef08a' },
    { name: 'Rosa', hex: '#fbcfe8' },
    { name: 'Cian', hex: '#a5f3fc' },
    { name: 'Verde', hex: '#bbf7d0' },
    { name: 'Púrpura', hex: '#e9d5ff' },
  ]

  const brushColors = ['#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ffffff']

  useEffect(() => {
    if (activeTab === 'drawing' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [activeTab])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.beginPath()
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineWidth = brushSize
    ctx.strokeStyle = brushColor

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalContent = ''

    if (activeTab === 'text') {
      if (!textContent.trim()) {
        alert('Por favor escribe un mensaje antes de enviar.')
        return
      }
      finalContent = textContent.trim()
    } else {
      if (!canvasRef.current) return
      finalContent = canvasRef.current.toDataURL('image/png')
    }

    setIsSubmitting(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/board/send/${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          content: finalContent,
          color: activeTab === 'text' ? noteColor : '#0f172a',
          authorName: authorName.trim() || 'Amigo Anónimo',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsSuccess(true)
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error al enviar nota:', error)
      alert('No se pudo enviar la nota al servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Envía una nota anónima a @{username} – Noty</title>
        <meta name="description" content={`Envía un mensaje o dibujo anónimo a @${username}. Solo ellos podrán verlo.`} />
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

            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-2xl mx-auto px-6 py-10 relative z-10">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-purple-500/40 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-3xl font-extrabold text-white mb-3">
                ¡Nota enviada con éxito! 🎉
              </h2>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Tu mensaje o dibujo fue guardado en el muro privado de <strong className="text-purple-300">@{username}</strong>.{' '}
                <br />Recuerda que solo esta persona podrá leerlo al iniciar sesión.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => { setIsSuccess(false); setTextContent(''); setAuthorName(''); clearCanvas() }}
                  className="gradient-button text-white font-semibold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar otra nota</span>
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="glass-panel text-slate-200 font-medium px-6 py-3 rounded-xl border border-white/10 text-sm inline-flex items-center gap-2 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Crear mi propio muro
                </button>
              </div>
            </motion.div>
          ) : (
            <div>
              {/* Profile Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                  <span className="text-2xl font-extrabold text-white">
                    {username ? username.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-white mb-1">
                  Envía una nota a <span className="gradient-text">@{username}</span>
                </h1>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tu nota será 100% anónima y privada</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Solo <strong className="text-slate-300">@{username}</strong> podrá verla al iniciar sesión.
                </p>
              </div>

              {/* Main Form Container */}
              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
                {/* Type Switcher Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab('text')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                      activeTab === 'text'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Nota Adhesiva</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('drawing')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                      activeTab === 'drawing'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Paintbrush className="w-4 h-4" />
                    <span>Dibujo en Lienzo</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  {activeTab === 'text' ? (
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Escribe tu nota:
                      </label>
                      <div
                        className="rounded-2xl p-4 transition-colors shadow-inner"
                        style={{ backgroundColor: noteColor }}
                      >
                        <textarea
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          placeholder="Escribe tu mensaje secreto o confesión aquí..."
                          rows={5}
                          className="w-full bg-transparent border-none text-slate-950 font-medium placeholder-slate-700/70 focus:outline-none resize-none text-base"
                          maxLength={400}
                        />
                        <div className="text-right text-xs text-slate-700/80 font-mono">
                          {textContent.length}/400
                        </div>
                      </div>

                      {/* Color Selector */}
                      <div className="mt-4">
                        <span className="block text-xs font-semibold text-slate-400 mb-2">Color de la nota:</span>
                        <div className="flex items-center gap-3">
                          {colors.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setNoteColor(c.hex)}
                              className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                                noteColor === c.hex ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Dibuja en el lienzo:
                        </label>
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>Borrar dibujo</span>
                        </button>
                      </div>

                      <div className="bg-slate-950 rounded-2xl border border-white/10 p-2 overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={300}
                          onMouseDown={startDrawing}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onMouseMove={draw}
                          onTouchStart={startDrawing}
                          onTouchEnd={stopDrawing}
                          onTouchMove={draw}
                          className="w-full h-64 bg-slate-900 rounded-xl cursor-crosshair touch-none"
                        />
                      </div>

                      {/* Brush Tools */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 glass-panel p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-purple-400" />
                          <div className="flex items-center gap-2">
                            {brushColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setBrushColor(color)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                  brushColor === color ? 'scale-125 border-white' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Grosor:</span>
                          <input
                            type="range"
                            min={2}
                            max={16}
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-24 accent-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Author Signature */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Firma (Opcional):
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Ej: Tu amigo secreto, El de la última fila..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      maxLength={40}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full gradient-button text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg text-base cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? 'Enviando...' : `Enviar nota anónima a @${username}`}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
