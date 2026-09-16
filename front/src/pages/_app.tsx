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
          <link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml" />
          <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=3" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
          <link rel="shortcut icon" href="/favicon.ico?v=3" />
        </Head>
        <Component {...pageProps} />
      </LanguageProvider>
    </GoogleOAuthProvider>
  )
}
