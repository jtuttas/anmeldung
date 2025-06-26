# Dockerfile für Anmeldung Förderverein Pro MMBbS
FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /app

# Nur package.json und package-lock.json kopieren und Abhängigkeiten installieren
COPY package*.json ./
RUN npm install

# Quellcode kopieren (ohne config!)
COPY . .

# config-Ordner für secrets.json und email_text.txt (wird als Volume gemountet, z.B. mit docker-compose)
RUN mkdir -p /app/config

# Build Frontend
RUN npm run build

# Exponiere Port
EXPOSE 4000

# Startbefehl
CMD ["node", "server.js"]
