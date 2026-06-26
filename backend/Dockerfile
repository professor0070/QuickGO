FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy root and workspace package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies (workspaces support)
RUN npm ci --include=dev

# Copy backend source files
COPY backend ./backend

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Build NestJS backend
RUN npm run build -w backend

# Prune devDependencies to keep container lean
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy built package and dependencies from builder
COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/backend/node_modules ./backend/node_modules
COPY --from=builder /usr/src/app/backend/package*.json ./backend/
COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/backend/prisma ./backend/prisma

EXPOSE 3000
CMD ["node", "backend/dist/src/main"]
