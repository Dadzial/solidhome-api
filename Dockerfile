# ------------------------------------------------------------------------------
# Stage 1: Build - Z TypeScript do JavaScript
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

# Włączenie pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Kopiowanie plików definicji pakietów
COPY backend/api/package.json backend/api/pnpm-lock.yaml backend/api/pnpm-workspace.yaml* ./

# Instalacja wszystkich zależności
RUN pnpm install --frozen-lockfile

# Kopiowanie konfiguracji TypeScript, kodu źródłowego i testów
COPY backend/api/tsconfig.json ./
COPY backend/api/lib ./lib
COPY backend/api/tests ./tests

# Budowanie projektu TypeScript do katalogu dist
RUN pnpm run build

# ------------------------------------------------------------------------------
# Stage 2: Obraz produkcyjny
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

# Zmienne środowiskowe dla środowiska produkcyjnego
ENV NODE_ENV=production
ENV PORT=3100

# Włączenie pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Kopiowanie definicji zależności do instalacji produkcyjnej
COPY backend/api/package.json backend/api/pnpm-lock.yaml backend/api/pnpm-workspace.yaml* ./

# Instalacja wyłącznie zależności produkcyjnych
RUN pnpm install --prod --frozen-lockfile

# Skopiowanie kodu z etapu builder
COPY --from=builder /app/dist/lib ./dist/lib

# Zapewnienie użytkownika node
RUN chown -R node:node /app

# Uruchomienie kontenera jako użytkownik nieuprzywilejowany
USER node

# Port nasłuchiwania API
EXPOSE 3100

# Health check sprawdzający endpoint główny API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3100) + '/', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Uruchomienie aplikacji
CMD ["node", "dist/lib/index.js"]
