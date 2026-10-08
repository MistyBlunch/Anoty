# Anoty ✨

> **Tu espacio interactivo para recibir notas y dibujos anónimos.**  
> *Your interactive space for anonymous notes and drawings.*

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.x-orange.svg)](https://hono.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)

---

## 📖 Descripción / Overview

**Anoty** es una aplicación web full-stack que permite a los usuarios crear tableros interactivos personales donde amigos o seguidores pueden enviarles notas y dibujos hechos a mano de forma anónima (usando el lienzo interactivo de [Excalidraw](https://excalidraw.com/)).

Los dueños del tablero pueden:
- **Organizar su tablero privado (Inbox):** Mover, rotar, cambiar capas (al frente/atrás), alternar fondo transparente y redimensionar los dibujos recibidos.
- **Crear un tablero público:** Seleccionar y arrastrar sus dibujos favoritos a un tablero público visible para cualquiera en la web (`/p/:slug`).
- **Recibir notificaciones en tiempo real:** Actualizaciones instantáneas en el dashboard mediante WebSockets.
- **Notificaciones por correo electrónico:** Alertas automáticas por email cada vez que llega un nuevo dibujo, con soporte multi-idioma (Inglés y Español).

---

## 🚀 Características Principales / Key Features

- 🎨 **Lienzo de dibujo integrado:** Excalidraw embebido para que cualquiera dibuje fácilmente desde desktop o móvil.
- 📬 **Bandeja de entrada interactiva:** Espacio infinito para mover, organizar y seleccionar notas con herramientas de selección múltiple (Marquee) y modo mano (Pan).
- 🌐 **Tablero público compartible:** Vista de lectura optimizada para compartir tus dibujos favoritos en redes sociales.
- ⚡ **WebSockets en vivo:** El tablero y la campana de notificaciones se actualizan en tiempo real sin recargar la página.
- 📧 **Notificaciones por correo (Resend):** Envío transaccional en segundo plano, bilingüe (EN/ES) con plantillas HTML responsivas.
- 🌍 **Internacionalización completa (i18n):** Interfaz y correos en Español e Inglés con detección automática y guardado de preferencias.
- 🔐 **Autenticación con Google OAuth:** Acceso seguro con persistencia en MongoDB y JWT.

---

## 🏛️ Arquitectura del Proyecto / Architecture

El proyecto está organizado como un monorepo dividido en dos áreas independientes:

```
noty/
├── front/                        # Aplicación Frontend (Next.js Pages Router)
│   ├── src/
│   │   ├── components/           # Componentes UI reutilizables
│   │   │   ├── board/            # Lienzo, notas, controles de tablero
│   │   │   ├── dashboard/        # Barra de acciones, menú de selección, notificaciones
│   │   │   └── layout/           # Header, selector de idioma, navegación
│   │   ├── context/              # Contextos globales (LanguageContext, etc.)
│   │   ├── hooks/                # Hooks personalizados de gestos, auth y WebSocket
│   │   ├── lib/                  # Utilidades cliente, api fetcher, i18n
│   │   └── pages/                # Páginas Next.js (/, /dashboard, /send/:username, /p/:slug)
│   └── package.json
│
├── back/                         # Backend API (Hono + Node.js)
│   ├── src/
│   │   ├── lib/                  # JWT, base de datos MongoDB, WebSocket Hub
│   │   ├── middleware/           # Middleware de autenticación y validación
│   │   ├── models/               # Modelos de Mongoose (User, Note, PublicBoard)
│   │   ├── repositories/         # Capa de acceso a datos (Patrón Repository)
│   │   ├── routes/               # Rutas de Hono (auth, board, publicboard, ws)
│   │   ├── schemas/              # Validación de esquemas con Zod
│   │   └── services/             # Lógica de negocio pura
│   │       ├── auth.service.ts
│   │       ├── board.service.ts
│   │       └── email/            # 🔌 Módulo de Email Desacoplado (Clean Architecture)
│   │           ├── email.types.ts                 # Contratos e Interfaces (Puerto)
│   │           ├── resend-email.service.ts        # Adaptador para Resend
│   │           ├── templates/                     # Plantillas HTML/texto puro
│   │           └── index.ts                       # Composition Root (Fábrica del servicio)
│   ├── Dockerfile                # Configuración de Docker para producción
│   └── package.json
│
├── LICENSE                       # Licencia MIT
└── README.md                     # Documentación principal
```

---

## 🛠️ Stack Tecnológico / Tech Stack

| Área | Tecnologías |
| :--- | :--- |
| **Frontend** | [Next.js](https://nextjs.org/) (Pages Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Excalidraw](https://excalidraw.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide Icons](https://lucide.dev/) |
| **Backend** | [Node.js](https://nodejs.org/) (v22), [Hono](https://hono.dev/), [TypeScript](https://www.typescriptlang.org/), [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/), [WebSockets](https://github.com/websockets/ws), [Zod](https://zod.dev/), [Resend](https://resend.com/) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit & Integration Tests) |
| **Gestor de paquetes** | [Yarn](https://yarnpkg.com/) |
| **Contenedores** | [Docker](https://www.docker.com/) (Multi-stage build) |

---

## ⚙️ Variables de Entorno / Environment Variables

### Backend (`back/.env`)

Copia la plantilla base:
```bash
cp back/.env.template back/.env
```

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha de la API | `3000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB | `mongodb://127.0.0.1:27017/noty_db` |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth Console | `xxxx.apps.googleusercontent.com` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | *(Generar con `openssl rand -hex 32`)* |
| `RESEND_API_KEY` | Clave API de Resend | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Remitente del correo | `Anoty Notifications <onboarding@resend.dev>` |
| `APP_URL` | URL pública de la aplicación | `http://localhost:3000` o `https://anoty-rho.vercel.app` |
| `EMAIL_LOCALE` | Idioma de correos por defecto (`en` / `es`) | `en` |

### Frontend (`front/.env.local`)

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL base de la API backend | `http://localhost:3000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google OAuth | `xxxx.apps.googleusercontent.com` |

---

## 💻 Instalación y Ejecución Local / Getting Started

### 1. Clonar el repositorio
```bash
git clone https://github.com/MistyBlunch/noty.git
cd noty
```

### 2. Iniciar el Backend
```bash
cd back
yarn install
cp .env.template .env # Configura tus variables
yarn dev
```
El servidor backend se iniciará en `http://localhost:3000`.

### 3. Iniciar el Frontend
En una nueva terminal:
```bash
cd front
yarn install
yarn dev
```
La aplicación web estará disponible en `http://localhost:3001` (o el puerto asignado por Next.js).

---

## 🧪 Pruebas / Testing

Para correr las pruebas unitarias del backend:
```bash
cd back
yarn test
```

Para verificar tipos y compilar el backend:
```bash
cd back
yarn build
```

Para verificar tipos y compilar el frontend:
```bash
cd front
yarn build
```

---

## 🐳 Despliegue con Docker / Production Build

El backend incluye un `Dockerfile` optimizado en múltiples etapas:

```bash
cd back
docker build -t noty-backend .
docker run -p 8080:8080 --env-file .env noty-backend
```

---

## 📄 Licencia / License

Este proyecto está distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

---

<p align="center">
  Made with love &lt;3
</p>
