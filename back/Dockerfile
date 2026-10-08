FROM node:22-slim AS build

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN yarn build

FROM node:22-slim

WORKDIR /app

RUN useradd --system --create-home --shell /usr/sbin/nologin appuser

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile && yarn cache clean

COPY --from=build /app/dist ./dist

USER appuser

EXPOSE 8080

CMD ["node", "dist/index.js"]