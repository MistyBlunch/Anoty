import type {
  WsBrokerPort,
  RealtimeClient,
} from "../../../../core/application/ports/out/ws-broker.port.js"

export class InMemoryWsBroker implements WsBrokerPort {
  private readonly rooms = new Map<string, Set<RealtimeClient>>()

  register(channel: string, client: RealtimeClient): void {
    let set = this.rooms.get(channel)
    if (!set) {
      set = new Set()
      this.rooms.set(channel, set)
    }
    set.add(client)
  }

  unregister(client: RealtimeClient): void {
    for (const set of this.rooms.values()) {
      set.delete(client)
    }
  }

  broadcast(channel: string, message: object): void {
    const set = this.rooms.get(channel)
    if (!set) return
    const data = JSON.stringify(message)
    for (const client of set) {
      client.send(data)
    }
  }

  getSubscriberCount(channel: string): number {
    return this.rooms.get(channel)?.size ?? 0
  }
}
