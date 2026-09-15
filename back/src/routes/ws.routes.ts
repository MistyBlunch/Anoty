import { upgradeWebSocket } from "@hono/node-server"
import type { WSContext } from "hono/ws"
import { verifySessionToken } from "../lib/auth.js"
import { wsHub, WS_USER_PREFIX } from "../lib/ws-hub.js"

type IncomingMessage = { type: string; channel?: unknown }

export const wsRoutes = upgradeWebSocket((c) => {
  const token = new URL(c.req.url).searchParams.get("token")
  let username: string | null = null

  return {
    onOpen(_event, ws: WSContext) {
      if (token) {
        verifySessionToken(token)
          .then((payload) => {
            username = payload.username
            wsHub.register(`${WS_USER_PREFIX}${username}`, ws)
          })
          .catch(() => ws.close(4401, "unauthorized"))
      }
    },
    onMessage(event, ws: WSContext) {
      let message: IncomingMessage
      try {
        message = JSON.parse(String(event.data)) as IncomingMessage
      } catch {
        return
      }
      if (message.type === "subscribe" && typeof message.channel === "string") {
        wsHub.register(message.channel, ws)
      }
    },
    onClose(_event, ws: WSContext) {
      wsHub.unregister(ws)
    },
    onError(_event, ws: WSContext) {
      wsHub.unregister(ws)
    },
  }
})