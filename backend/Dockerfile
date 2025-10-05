FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for TS)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript ignoring type errors
RUN npx tsc --noEmitOnError false --skipLibCheck

# Remove devDependencies for production image
RUN npm prune --production

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 4000

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
