import type { WSContext } from "hono/ws"

export const WS_USER_PREFIX = "user:"
export const WS_BOARD_PREFIX = "board:"

export type RealtimeClient = Pick<WSContext, "send" | "close">

const rooms = new Map<string, Set<RealtimeClient>>()

export const wsHub = {
  register(channel: string, client: RealtimeClient) {
    let set = rooms.get(channel)
    if (!set) {
      set = new Set()
      rooms.set(channel, set)
    }
    set.add(client)
  },
  unregister(client: RealtimeClient) {
    for (const set of rooms.values()) {
      set.delete(client)
    }
  },
  broadcast(channel: string, message: object) {
    const set = rooms.get(channel)
    if (!set) return
    const data = JSON.stringify(message)
    for (const client of set) {
      client.send(data)
    }
  },
}