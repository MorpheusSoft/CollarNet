FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar dependencias e instalarlas
COPY package*.json ./
RUN npm ci --only=production

# Copiar código del backend
COPY . ./

# Exponer puerto 3500
EXPOSE 3500

# Variable de entorno por defecto
ENV PORT=3500
ENV NODE_ENV=production

CMD ["node", "server.js"]
