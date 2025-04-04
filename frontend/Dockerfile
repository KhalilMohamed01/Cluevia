FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the app
RUN npm run build

EXPOSE 3000

# Use production server
CMD ["npm", "start"]
