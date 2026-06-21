# Immagine del backend: serve API + frontend statico.
FROM node:20-alpine

# poppler-utils fornisce "pdftotext", usato per l'import delle schede da PDF.
RUN apk add --no-cache poppler-utils

WORKDIR /app

# Installa solo le dipendenze del backend
COPY backend/package.json ./
RUN npm install --omit=dev

# Codice del backend
COPY backend/ ./

# Frontend statico servito da Express
COPY frontend/ ./public/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
