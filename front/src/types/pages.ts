import type { Drawing } from "./drawing"
import type { Locale } from "@/lib/i18n"

export interface PublicBoardProps {
  slug: string
  initialStatus: "loading" | "ready" | "notfound"
  initialTitle: string
  initialItems: Drawing[]
  initialUpdatedAt: string | null
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  ogImage: string
}

export interface SendNoteProps {
  username: string
  initialLocale: Locale
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
}
