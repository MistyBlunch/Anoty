import type { EmailLocale, NewDrawingEmailPayload } from "../email.types.js"

export interface EmailRenderOutput {
  subject: string
  html: string
  text: string
}

interface TemplateStrings {
  subject: (username: string) => string
  badge: string
  greeting: (name: string) => string
  message: string
  authorLabel: string
  defaultAuthor: string
  cta: string
  footer: (username: string) => string
  copyright: (year: number) => string
  textBody: (name: string, author: string, boardUrl: string) => string
}

const TRANSLATIONS: Record<EmailLocale, TemplateStrings> = {
  en: {
    subject: (username) => `🎨 New noty on your board, @${username}!`,
    badge: "New activity!",
    greeting: (name) => `Hi, ${name}!`,
    message: "Someone just left a new noty on your Anoty board.",
    authorLabel: "Author",
    defaultAuthor: "An anonymous friend",
    cta: "View drawing on my board &rarr;",
    footer: (username) => `You received this email because you have a board on Anoty as @${username}.`,
    copyright: (year) => `&copy; ${year} Anoty. All rights reserved.`,
    textBody: (name, author, boardUrl) => `Hi, ${name}!

${author} just left a new drawing on your Anoty board.

View it here: ${boardUrl}

---
Anoty - Your space for notes and drawings`,
  },
  es: {
    subject: (username) => `🎨 ¡Nuevo noty en tu board, @${username}!`,
    badge: "¡Nueva actividad!",
    greeting: (name) => `¡Hola, ${name}!`,
    message: "Alguien acaba de dejar un noty en tu board de Anoty.",
    authorLabel: "Autor",
    defaultAuthor: "Un amigo anónimo",
    cta: "Ver dibujo en mi board &rarr;",
    footer: (username) => `Recibiste este correo porque tienes un board en Anoty como @${username}.`,
    copyright: (year) => `&copy; ${year} Anoty. Todos los derechos reservados.`,
    textBody: (name, author, boardUrl) => `¡Hola, ${name}!

${author} te ha dejado un nuevo dibujo en tu board de Anoty.

Puedes verlo aquí: ${boardUrl}

---
Anoty - Tu espacio de notas y dibujos`,
  },
}

export function renderNewDrawingEmail(payload: NewDrawingEmailPayload): EmailRenderOutput {
  const { recipientName, recipientUsername, authorName, boardUrl, locale } = payload

  // Por defecto inglés ('en') si no tiene configuración o es diferente de 'es'
  const activeLocale: EmailLocale = locale === "es" ? "es" : "en"
  const strings = TRANSLATIONS[activeLocale]

  const displayName = recipientName || recipientUsername || (activeLocale === "es" ? "amigo" : "friend")

  const isAnonymousAuthor =
    !authorName ||
    [
      "amigo anónimo",
      "amigo anonimo",
      "un amigo anónimo",
      "un amigo anonimo",
      "anonymous friend",
      "an anonymous friend",
    ].includes(authorName.trim().toLowerCase())

  const senderDisplayName = isAnonymousAuthor ? strings.defaultAuthor : authorName

  const subject = strings.subject(recipientUsername)
  const text = strings.textBody(displayName, senderDisplayName, boardUrl)

  const currentYear = new Date().getFullYear()

  const html = `<!DOCTYPE html>
<html lang="${activeLocale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 36px 12px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 8px 0;
    }
    .header-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      border-radius: 9999px;
      padding: 4px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
    }
    .content {
      padding: 32px 28px;
      text-align: center;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .card-highlight {
      background: #f0fdfa;
      border: 1px dashed #5eead4;
      border-radius: 14px;
      padding: 16px 20px;
      margin: 0 0 28px 0;
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
    }
    .card-highlight-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f766e;
      margin: 0 0 4px 0;
    }
    .card-highlight-author {
      font-size: 16px;
      font-weight: 700;
      color: #115e59;
      margin: 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
    }
    .footer {
      padding: 24px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-logo">Anoty ✨</div>
        <div class="header-badge">${escapeHtml(strings.badge)}</div>
      </div>
      <div class="content">
        <h1 class="greeting">${escapeHtml(strings.greeting(displayName))}</h1>
        <p class="message">
          ${escapeHtml(strings.message)}
        </p>
        <div class="card-highlight">
          <div class="card-highlight-title">${escapeHtml(strings.authorLabel)}</div>
          <div class="card-highlight-author">${escapeHtml(senderDisplayName)}</div>
        </div>
        <div>
          <a href="${boardUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
            ${strings.cta}
          </a>
        </div>
      </div>
      <div class="footer">
        ${escapeHtml(strings.footer(recipientUsername))}<br>
        ${strings.copyright(currentYear)}
      </div>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
