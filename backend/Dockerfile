FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (using npm install instead of npm ci to avoid cache issues)
RUN npm install --production=false

# Copy source code
COPY . .

# Clean up any cache issues
RUN rm -rf node_modules/.cache || true

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 