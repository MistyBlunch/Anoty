export interface RealtimeClient {
  send(data: string): void
  close?(code?: number, reason?: string): void
}

export interface WsBrokerPort {
  register(channel: string, client: RealtimeClient): void
  unregister(client: RealtimeClient): void
  broadcast(channel: string, message: object): Promise<void> | void
  close?(): Promise<void> | void
}
