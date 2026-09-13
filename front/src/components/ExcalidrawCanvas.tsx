import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawCanvasProps {
  username?: string
  onSent?: () => void
}

const ExcalidrawCanvas = dynamic(
  async () => {
    const { Excalidraw, MainMenu, WelcomeScreen, exportToSvg } = await import('@excalidraw/excalidraw')

    return function ExcalidrawCanvasInner({ username, onSent }: ExcalidrawCanvasProps) {
      const [elements, setElements] = useState<readonly any[]>([])
      const [appState, setAppState] = useState<any>(null)
      const [files, setFiles] = useState<any>(null)
      const [isSending, setIsSending] = useState(false)
      const excalidrawApiRef = useRef<any>(null)

      useEffect(() => {
        const handleClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement | null
          if (!target?.closest) return
          const isImageBtn =
            target.closest('[data-testid="toolbar-image"]') != null ||
            target.closest('label.ToolIcon')?.querySelector('[data-testid="toolbar-image"]') != null
          if (!isImageBtn) return
          e.preventDefault()
          e.stopPropagation()
          excalidrawApiRef.current?.setActiveTool({
            type: 'image',
            insertOnCanvasDirectly: true,
          })
        }
        document.addEventListener('click', handleClick, true)
        return () => document.removeEventListener('click', handleClick, true)
      }, [])

      const handleSendDrawing = async () => {
        if (!username || !elements || elements.length === 0) return
        setIsSending(true)

        try {
          const svg = await exportToSvg({
            elements,
            appState: {
              ...(appState || {}),
              exportBackground: false,
              exportPadding: 20,
            },
            files,
          })

          const width = parseFloat(svg.getAttribute('width') || '') || 400
          const height = parseFloat(svg.getAttribute('height') || '') || 400

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
          const response = await fetch(`${apiUrl}/board/send/${username}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'drawing',
              content: svg.outerHTML,
              color: '#ffffff',
              authorName: 'Amigo Anónimo',
              width,
              height,
            }),
          })

          const data = await response.json()
          if (data.success) {
            onSent?.()
          } else {
            alert(`Error: ${data.message || 'No se pudo enviar el dibujo'}`)
          }
        } catch (error) {
          console.error('Error al enviar dibujo:', error)
          alert('No se pudo enviar el dibujo al servidor')
        } finally {
          setIsSending(false)
        }
      }

      const canSend = username && elements && elements.length > 0

      return (
        <div className="relative h-full">
          <div className="absolute top-3 right-3 z-50">
            <button
              onClick={handleSendDrawing}
              disabled={!canSend || isSending}
              className="flex items-center gap-1.5 bg-teal-600 text-white border border-teal-600 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-teal-500/25 hover:bg-teal-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-600"
              title={`Enviar el dibujo de forma anónima a @${username || '...'}`}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSending ? 'Enviando...' : `Enviar a @${username}`}</span>
            </button>
          </div>

          <Excalidraw
            excalidrawAPI={(api: any) => {
              excalidrawApiRef.current = api
            }}
            onChange={(els: readonly any[], app: any, fls: any) => {
              setElements(els)
              setAppState(app)
              setFiles(fls)
            }}
          >
            <MainMenu>
              <MainMenu.Group title="Acciones">
                <MainMenu.DefaultItems.SaveAsImage />
                <MainMenu.DefaultItems.ClearCanvas />
              </MainMenu.Group>
              <MainMenu.Separator />
              <MainMenu.Group>
                <MainMenu.DefaultItems.Help />
              </MainMenu.Group>
            </MainMenu>
            <WelcomeScreen>
              <WelcomeScreen.Center>
                <WelcomeScreen.Center.Heading>
                  ¡Dibuja algo y envíalo anónimamente!
                </WelcomeScreen.Center.Heading>
              </WelcomeScreen.Center>
            </WelcomeScreen>
          </Excalidraw>
        </div>
      )
    }
  },
  { ssr: false }
)

export default ExcalidrawCanvas