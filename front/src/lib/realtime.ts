export interface RealtimeEvent {
  type: string
  [key: string]: unknown
}

export interface RealtimeListener {
  onEvent?: (event: RealtimeEvent) => void
  onOpen?: () => void
  onClose?: () => void
}

export function wsUrlFromApi(base: string): string {
  const url = new URL(base)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString().replace(/\/$/, "")
}

const BASE_DELAY = 1000
const MAX_DELAY = 15000

export function nextBackoff(attempt: number): number {
  if (attempt <= 0) return 0
  return Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1))
}

export function isNewerUpdatedAt(current: string | null | undefined, incoming: unknown): boolean {
  if (typeof incoming !== "string") return false
  if (!current) return true
  return new Date(incoming).getTime() > new Date(current).getTime()
}

export class RealtimeClient {
  private ws: WebSocket | null = null
  private attempt = 0
  private timer: number | null = null
  private closedByUser = false
  private readonly channels = new Set<string>()

  constructor(
    private readonly url: string,
    private readonly listeners: RealtimeListener = {},
    private readonly getToken: () => string | null = () => null,
    private readonly retryDelay: (attempt: number) => number = nextBackoff,
  ) {}

  connect() {
    this.closedByUser = false
    this.open()
  }

  private open() {
    const token = this.getToken()
    const withToken = token ? `${this.url}${this.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : this.url
    const ws = new WebSocket(withToken)
    this.ws = ws

    ws.onopen = () => {
      this.attempt = 0
      for (const channel of this.channels) ws.send(JSON.stringify({ type: "subscribe", channel }))
      this.listeners.onOpen?.()
    }
    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return
      try {
        this.listeners.onEvent?.(JSON.parse(ev.data) as RealtimeEvent)
      } catch {
        // ignorar tramas inválidas
      }
    }
    ws.onerror = () => ws.close()
    ws.onclose = () => {
      this.ws = null
      this.listeners.onClose?.()
      if (!this.closedByUser) this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.closedByUser) return
    const delay = this.retryDelay(++this.attempt)
    this.timer = window.setTimeout(() => this.open(), delay)
  }

  subscribe(channel: string) {
    this.channels.add(channel)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", channel }))
    }
  }

  close() {
    this.closedByUser = true
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.ws?.close()
    this.ws = null
  }
}