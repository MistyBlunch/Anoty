import '../index.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LanguageProvider } from '@/context/LanguageContext'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <LanguageProvider initialLocale={pageProps?.initialLocale}>
        <Head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/favicon.svg" />
        </Head>
        <Component {...pageProps} />
      </LanguageProvider>
    </GoogleOAuthProvider>
  )
}
