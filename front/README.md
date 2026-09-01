# Noty Frontend (Next.js)

Frontend de **Noty** construido con [Next.js](https://nextjs.org) (Pages Router) + React + Tailwind CSS.

## Scripts

```bash
yarn dev       # Servidor de desarrollo
yarn build     # Build de producción
yarn start     # Servir el build
yarn lint      # Lint con oxlint
```

## Estructura

- `src/pages/` — Rutas (Pages Router): `/`, `/dashboard`, `/send/[username]`
- `src/components/` — Componentes reutilizables
- `src/index.css` — Estilos globales (Tailwind)
- `public/` — Assets estáticos (favicon, icons)

## Variables de entorno

Copia `.env` (template) y ajusta los valores públicos:

- `NEXT_PUBLIC_API_URL` — URL del backend (ej. `http://localhost:3000`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Client ID de Google OAuth

`.env.local` con sobrescrituras locales no se commitea.
