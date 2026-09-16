import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=3" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
