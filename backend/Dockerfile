# Use Node.js LTS version
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy everything (including prisma folder and schema.prisma)
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000
CMD ["npx", "nodemon", "src/server.js"]
