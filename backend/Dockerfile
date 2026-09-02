FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar e instalar dependencias del backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copiar e instalar dependencias del frontend y compilar Vite bundle
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copiar código fuente
COPY backend ./backend
COPY frontend ./frontend
RUN cd frontend && npm run build

# Cambiar directorio de trabajo a backend
WORKDIR /app/backend

# Exponer el puerto 3500
EXPOSE 3500

ENV PORT=3500
ENV NODE_ENV=production

CMD ["node", "server.js"]
