import { mongoUserRepository } from "../adapters/out/persistence/mongo-user.repository.js"
import { mongoNoteRepository } from "../adapters/out/persistence/mongo-note.repository.js"
import { mongoPublicBoardRepository } from "../adapters/out/persistence/mongo-publicboard.repository.js"
import { defaultEmailService } from "../../services/email/index.js"
import { googleTokenVerifierAdapter } from "../adapters/out/auth/google-token-verifier.adapter.js"
import { wsHub, WS_USER_PREFIX, WS_BOARD_PREFIX } from "../../lib/ws-hub.js"
import { signSessionToken } from "../../lib/auth.js"
import {
  createBoardService,
  createPublicBoardService,
  createAuthService,
  DrawingNotificationService,
} from "../../core/application/services/index.js"
import type { DrawingCreatedEvent, PublicBoard } from "../../core/domain/index.js"

export const drawingNotificationService = new DrawingNotificationService(defaultEmailService)

export const boardService = createBoardService({
  userRepo: mongoUserRepository,
  noteRepo: mongoNoteRepository,
  notifier: {
    onNewDrawing: (username: string) =>
      wsHub.broadcast(`${WS_USER_PREFIX}${username}`, { type: "new-drawing" }),
    onDrawingCreated: (event: DrawingCreatedEvent) => drawingNotificationService.handle(event),
  },
})

export const publicBoardService = createPublicBoardService({
  boardRepo: mongoPublicBoardRepository,
  userRepo: mongoUserRepository,
  noteRepo: mongoNoteRepository,
  notifier: {
    onBoardChange: (board: PublicBoard) => {
      const channel = `${WS_BOARD_PREFIX}${board.slug}`
      if (board.isPublished) {
        wsHub.broadcast(channel, {
          type: "board-updated",
          slug: board.slug,
          updatedAt: board.updatedAt?.toISOString() ?? new Date().toISOString(),
        })
      } else {
        wsHub.broadcast(channel, { type: "board-hidden", slug: board.slug })
      }
    },
  },
})

export const authService = createAuthService(
  mongoUserRepository,
  googleTokenVerifierAdapter,
  signSessionToken,
  {
    noteRepo: mongoNoteRepository,
    publicBoardRepo: mongoPublicBoardRepository,
  },
)
