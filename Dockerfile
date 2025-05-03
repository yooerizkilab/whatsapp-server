# Gunakan image Node.js versi LTS
FROM node:20.18.0

# Set direktori kerja
WORKDIR /app

# Copy package files dan install dependensi
COPY package*.json ./
RUN npm install

# Copy semua source code
COPY . .

# Ekspos port yang digunakan Express
EXPOSE 3000