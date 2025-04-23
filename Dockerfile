FROM node:20

# Create app directory
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm install

COPY . .

# Expose signaling port
EXPOSE 5555
CMD ["node", "server.js"]
