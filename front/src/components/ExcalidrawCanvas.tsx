import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import '@excalidraw/excalidraw/index.css'
import { api } from '@/lib/api'
import { useLanguage } from '@/context/LanguageContext'

interface ExcalidrawCanvasProps {
  username?: string
  onSent?: () => void
}

const ExcalidrawInner = dynamic(
  async () => {
    const { Excalidraw, MainMenu, WelcomeScreen, exportToSvg } = await import('@excalidraw/excalidraw')

    return function ExcalidrawCanvasInner({
      username,
      onSent,
      sendLabel,
      sendingLabel,
      sendTitle,
      anonymousAuthor,
      welcomeHeading,
      actionsLabel,
      errorDefault,
      errorBackend,
    }: ExcalidrawCanvasProps & {
      sendLabel: string
      sendingLabel: string
      sendTitle: string
      anonymousAuthor: string
      welcomeHeading: string
      actionsLabel: string
      errorDefault: string
      errorBackend: string
    }) {
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
              ...appState,
              exportBackground: false,
              exportPadding: 20,
            },
            files,
          })

          const width = parseFloat(svg.getAttribute('width') || '') || 400
          const height = parseFloat(svg.getAttribute('height') || '') || 400

          const data = await api.post<{ success: boolean; message?: string }>(
            `/board/send/${username}`,
            {
              type: 'drawing',
              content: svg.outerHTML,
              color: '#ffffff',
              authorName: anonymousAuthor,
              width,
              height,
            },
          )
          if (data.success) {
            onSent?.()
          } else {
            alert(`Error: ${data.message || errorDefault}`)
          }
        } catch (error) {
          console.error('Error sending drawing:', error)
          alert(errorBackend)
        } finally {
          setIsSending(false)
        }
      }

      const canSend = username && elements && elements.length > 0

      return (
        <div className="relative h-full">
          <div className="absolute max-sm:w-11/12 max-sm:bottom-17 bottom-5 max-lg:left-1/2 max-lg:-translate-x-1/2 lg:top-3 lg:right-3 z-50">
            <button
              onClick={handleSendDrawing}
              disabled={!canSend || isSending}
              className="flex items-center justify-center gap-1.5 max-sm:w-full bg-teal-600 text-white border border-teal-600 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-teal-500/25 hover:bg-teal-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-600"
              title={sendTitle}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className='truncate'>{isSending ? sendingLabel : sendLabel}</span>
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
              <MainMenu.Group title={actionsLabel}>
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
                  {welcomeHeading}
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

export default function ExcalidrawCanvas({ username, onSent }: ExcalidrawCanvasProps) {
  const { t } = useLanguage()
  return (
    <ExcalidrawInner
      username={username}
      onSent={onSent}
      sendLabel={t('send_button', username || '...')}
      sendingLabel={t('send_sending')}
      sendTitle={t('send_button_title', username || '...')}
      anonymousAuthor={t('send_anonymous_author')}
      welcomeHeading={t('send_excalidraw_welcome')}
      actionsLabel={t('send_excalidraw_actions')}
      errorDefault={t('send_error_default')}
      errorBackend={t('send_backend_error')}
    />
  )
}