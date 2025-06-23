# ---------- Etapa 1: build ----------
FROM node:20-bookworm AS builder

# Instala las librerías nativas requeridas para compilar node-canvas
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        python3            \
        libcairo2-dev      \
        libpango1.0-dev    \
        libjpeg-dev        \
        libgif-dev         \
        librsvg2-dev       \
        && rm -rf /var/lib/apt/lists/*

# Crea y usa un directorio de trabajo
WORKDIR /app

# Copia solo los archivos de dependencias primero
COPY package*.json ./

# Instala dependencias (usa npm ci si tienes package-lock.json)
RUN npm i

# Copia el resto del código de la aplicación
COPY . .

# ---------- Etapa 2: runtime ----------
FROM node:20-slim

# Copiamos dependencias de sistema (solo las runtime)    
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libcairo2    \
        libpango-1.0-0 \
        libjpeg62-turbo \
        libgif7       \
        librsvg2-2    \
        && rm -rf /var/lib/apt/lists/*

# Copiamos la app compilada desde la etapa builder
WORKDIR /app
COPY --from=builder /app .

# Puerto donde escucha tu app (cámbialo si usas otro)
EXPOSE 3000

# Comando de arranque
CMD ["npm", "start"]
