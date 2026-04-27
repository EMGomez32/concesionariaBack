# BackConcesionaria — multi-stage Dockerfile para producción.
#
# Etapa 1 (builder): compila TS y prisma client.
# Etapa 2 (runtime): solo deps de prod + dist + prisma schema.
#
# Listo para Coolify, Railway, Fly.io, ECS, etc.

# ──────────────────────── BUILDER ────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build tools necesarios para compilar bcrypt nativo en Alpine.
RUN apk add --no-cache openssl python3 make g++

# Instalar dependencias INCLUYENDO dev — necesarias para tsc, prisma generate
# y los @types/* del bundle. `--include=dev` fuerza la instalación aunque
# NODE_ENV=production ya esté seteado en el entorno del build (caso de Coolify,
# Railway, GitHub Actions, etc.) que hace que npm omita devDependencies.
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

# Copiar el resto del código y compilar.
COPY . .
RUN npx prisma generate
RUN npm run build

# Limpiar dev dependencies del builder para copiarlas a runtime.
RUN npm prune --omit=dev

# ──────────────────────── RUNTIME ────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# openssl para Prisma + curl para healthcheck + tini para señales.
# Nota: ya no necesitamos ts-node aquí — init-rls.js corre con node nativo.
RUN apk add --no-cache openssl curl tini

# Copiar solo lo necesario desde el builder.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/scripts ./scripts

# Carpeta para uploads — Coolify la persiste con un volumen.
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck: GET /health debe responder 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fs http://localhost:3000/health || exit 1

# `tini` reapa zombies y maneja señales para PM2/Node.
ENTRYPOINT ["/sbin/tini", "--"]

# Default: prisma db push (sync schema) + init-rls (RLS policies) +
# bootstrap (roles, plan Free, super_admin si BOOTSTRAP_SUPER_PASSWORD está
# seteado) + arranca cluster con PM2.
# Todos los pasos son idempotentes y seguros de re-correr.
# El comando real puede sobrescribirse en Coolify (Custom Start Command) si
# preferís separar migración del start (mejor práctica en deploys con
# múltiples instancias para evitar race conditions).
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run init-rls && npm run bootstrap && npm run start:cluster"]
