import type { UserRepository } from "../repositories/user.repository.js"
import type { GoogleIdTokenVerifier } from "./google-token.service.js"
import { signSessionToken } from "../lib/auth.js"
import {
  createAuthService as createCoreAuthService,
  type AuthResult,
} from "../core/application/services/auth.service.js"

export type { AuthResult }

export function createAuthService(
  userRepo: UserRepository,
  verifier: GoogleIdTokenVerifier,
  signToken: (user: any) => Promise<string> = signSessionToken,
) {
  return createCoreAuthService(
    userRepo as any,
    {
      verifyGoogleToken: async (token: string) => {
        const u = await verifier.verify(token)
        if (!u) return null
        return {
          id: u.sub,
          email: u.email || "",
          name: u.name || "",
          picture: u.picture || "",
        }
      },
    },
    signToken,
  )
}