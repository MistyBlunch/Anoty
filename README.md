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
- 🌐 **Tablero público compartible:** Vista de lectura optimizada para compartir tus dibujos favoritos en redes sociales con enlaces dinámicos (`/p/:slug`).
- 👤 **Gestión de perfil y alias:** Modal de configuración para modificar tu nombre de usuario (`username`) en cualquier momento, sincronizando automáticamente tus tableros públicos.
- ⚡ **WebSockets escalables en vivo:** Sincronización en tiempo real del tablero y notificaciones sin recargar página, respaldado por broker en memoria o Redis Pub/Sub distribuido.
- 💾 **Guardado continuo en segundo plano:** Actualizaciones optimistas en el lienzo sin bloqueos de interfaz ni saltos de cámara.
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
│   │   │   ├── board/            # Lienzo, tarjetas de dibujo, controles de tablero
│   │   │   ├── dashboard/        # Barra de acciones, menú de selección, notificaciones
│   │   │   └── layout/           # Header, modal de perfil, selector de idioma
│   │   ├── context/              # Contextos globales (LanguageContext, etc.)
│   │   ├── features/             # Módulos por funcionalidad (board, dashboard, public-board)
│   │   ├── hooks/                # Hooks personalizados de gestos, zoom, auth y WebSocket
│   │   ├── lib/                  # Utilidades cliente, normalización de notas, api fetcher, i18n
│   │   └── pages/                # Páginas Next.js (/, /dashboard, /send/:username, /p/:slug)
│   └── package.json
│
├── back/                         # Backend API (Hono + Node.js - Arquitectura Hexagonal)
│   ├── src/
│   │   ├── core/                 # Núcleo del dominio y lógica de negocio (DDD / Clean Architecture)
│   │   │   ├── domain/           # Entidades, tipos, contratos de repositorios y puertos
│   │   │   └── application/      # Servicios de aplicación y casos de uso
│   │   ├── infrastructure/       # Adaptadores de infraestructura (Ports & Adapters)
│   │   │   ├── adapters/
│   │   │   │   ├── in/           # Adaptadores primarios (Rutas HTTP Hono, WebSockets)
│   │   │   │   └── out/          # Adaptadores secundarios (MongoDB Repositories, Resend Email, Redis Pub/Sub)
│   │   │   └── config/           # Contenedor de inyección de dependencias (Composition Root)
│   │   ├── middleware/           # Middlewares (Autenticación JWT, Rate Limit, Validación)
│   │   ├── lib/                  # Base de datos MongoDB, JWT, WebSocket Hub
│   │   └── schemas/              # Validación de esquemas con Zod
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
| **Backend** | [Node.js](https://nodejs.org/) (v22), [Hono](https://hono.dev/), [TypeScript](https://www.typescriptlang.org/), [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/), [WebSockets](https://github.com/websockets/ws), [Redis / Upstash](https://upstash.com/) (Pub/Sub escalable), [Zod](https://zod.dev/), [Resend](https://resend.com/) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit & Integration Tests en Front y Back) |
| **Gestor de paquetes** | [Yarn](https://yarnpkg.com/) |
| **Contenedores y Cloud** | [Docker](https://www.docker.com/), [Google Cloud Run](https://cloud.google.com/run), [Vercel](https://vercel.com/) |

---

## ⚙️ Variables de Entorno / Environment Variables

### Backend (`back/.env`)

Copia la plantilla base:
```bash
cp back/.env.template back/.env
```

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha de la API | `3000` (local) o `8080` (Cloud Run / Docker) |
| `MONGODB_URI` | Cadena de conexión a MongoDB | `mongodb://127.0.0.1:27017/noty_db` o MongoDB Atlas |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth Console | `xxxx.apps.googleusercontent.com` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | *(Generar con `openssl rand -hex 32`)* |
| `RESEND_API_KEY` | Clave API de Resend | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Remitente del correo | `Anoty Notifications <onboarding@resend.dev>` |
| `REDIS_URL` | *(Opcional)* URL de Redis para Pub/Sub multi-instancia | `rediss://default:token@host.upstash.io:6379` |
| `APP_URL` | URL pública de la aplicación frontend | `http://localhost:3001` o `https://anoty-rho.vercel.app` |
| `EMAIL_LOCALE` | Idioma de correos por defecto (`en` / `es`) | `en` |

### Frontend (`front/.env.local`)

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL base de la API backend | `http://localhost:3000` o `https://mi-api-cloudrun.run.app` |
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
El servidor backend se iniciará en `http://localhost:3000` (o el puerto configurado en `PORT`).

### 3. Iniciar el Frontend
En una nueva terminal:
```bash
cd front
yarn install
yarn dev
```
La aplicación web estará disponible en `http://localhost:3001` (puerto predeterminado configurado en el script `dev` de Next.js).

---

## 🧪 Pruebas / Testing

Para correr las pruebas unitarias del backend:
```bash
cd back
yarn test
```

Para correr las pruebas unitarias del frontend:
```bash
cd front
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

## 🐳 Despliegue en Producción / Deployment

### Backend (Docker & Google Cloud Run)
El backend incluye un `Dockerfile` optimizado en múltiples etapas:

```bash
cd back
docker build -t noty-backend .
docker run -p 8080:8080 --env-file .env noty-backend
```

Para Google Cloud Run:
- Asegúrate de definir `PORT=8080` y `HOST=0.0.0.0` en las variables de entorno de Cloud Run.
- Configura `REDIS_URL` (ej. Upstash) si utilizas múltiples réplicas de Cloud Run para mantener sincronizados los WebSockets entre instancias.

### Frontend (Vercel)
Despliega la carpeta `front/` directamente en Vercel configurando `NEXT_PUBLIC_API_URL` apuntando a tu backend en producción.

---

## 📄 Licencia / License

Este proyecto está distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

---

<p align="center">
  Made with love &lt;3
</p>
