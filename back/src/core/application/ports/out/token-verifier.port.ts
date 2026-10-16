export interface GoogleUserData {
  id: string
  email: string
  name: string
  picture: string
}

export interface TokenVerifierPort {
  verifyGoogleToken(token: string): Promise<GoogleUserData | null>
}
