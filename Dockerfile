# Базовый образ с Node.js
FROM node:20-alpine AS base
WORKDIR /app

# Установка зависимостей
FROM base AS deps
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/
RUN npm ci --workspace=server --workspace=shared

# Сборка приложения
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY server ./server
COPY shared ./shared
COPY package*.json ./
RUN npm run build --workspace=server

# Production образ
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Копируем только необходимое для production
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/shared ./shared
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Создаём папку для uploads
RUN mkdir -p /app/server/uploads && \
    chown -R node:node /app

USER node

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=server"]
