# BackConcesionaria/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Build tools necesarios para compilar bcrypt nativo en Alpine
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copiar el resto del código
COPY . .

# Generar el cliente de Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

EXPOSE 3000

# Default a single-process; el override de docker-compose usa PM2 cluster.
CMD ["npm", "start"]
