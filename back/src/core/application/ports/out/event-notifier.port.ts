import type { DrawingCreatedEvent } from "../../../domain/index.js"

export interface EventNotifierPort {
  onNewDrawing?: (username: string) => void
  onDrawingCreated?: (event: DrawingCreatedEvent) => void | Promise<void>
}
