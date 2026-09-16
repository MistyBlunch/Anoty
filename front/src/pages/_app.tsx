import '../index.css'
import type { AppProps } from 'next/app'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LanguageProvider } from '@/context/LanguageContext'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <LanguageProvider>
        <Component {...pageProps} />
      </LanguageProvider>
    </GoogleOAuthProvider>
  )
}
