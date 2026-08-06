FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar e instalar dependencias del backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copiar código fuente del backend y frontend
COPY backend ./backend
COPY frontend ./frontend

# Cambiar directorio de trabajo a backend
WORKDIR /app/backend

# Exponer el puerto 3500
EXPOSE 3500

ENV PORT=3500
ENV NODE_ENV=production

CMD ["node", "server.js"]
