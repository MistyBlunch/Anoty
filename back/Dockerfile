FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

RUN npm install --no-save --package-lock=false "@typescript/typescript-linux-x64@$(node -p "require('./node_modules/typescript/package.json').version")"

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-slim

WORKDIR /app

RUN useradd --system --create-home --shell /usr/sbin/nologin appuser

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER appuser

EXPOSE 8080

CMD ["node", "dist/index.js"]