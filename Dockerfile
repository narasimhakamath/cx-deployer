# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port (change if your app uses a different port)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
