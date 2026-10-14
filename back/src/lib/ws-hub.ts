import { defaultWsBroker } from "../infrastructure/adapters/out/websocket/index.js"
import type { RealtimeClient, WsBrokerPort } from "../core/application/ports/out/ws-broker.port.js"

export const WS_USER_PREFIX = "user:"
export const WS_BOARD_PREFIX = "board:"

export type { RealtimeClient }

export const wsHub: WsBrokerPort = defaultWsBroker