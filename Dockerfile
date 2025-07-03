# Etapa de construcción
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para bcrypt y otros módulos nativos
RUN apk add --no-cache python3 make g++ 

# Crear usuario no root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine

# Instalar ffmpeg que es una dependencia del proyecto
RUN apk add --no-cache ffmpeg

# Crear usuario no root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar la build de la etapa anterior
COPY --from=builder /app/dist ./dist

# Establecer usuario no root
USER appuser

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000

# Exponer puerto
EXPOSE $PORT

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/health || exit 1

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
