FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy root and workspace package files
COPY package*.json ./
COPY web/admin_panel/package*.json ./web/admin_panel/

# Install dependencies (workspaces support)
RUN npm ci --include=dev

# Copy Next.js frontend code
COPY web/admin_panel ./web/admin_panel

# Build Next.js
RUN npm run build -w web/admin_panel

# Prune dependencies to keep container lean
RUN npm prune --omit=dev

# Ensure directories required by runner exist
RUN mkdir -p web/admin_panel/public web/admin_panel/node_modules

FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy static assets and compiled output
COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/web/admin_panel/node_modules ./web/admin_panel/node_modules
COPY --from=builder /usr/src/app/web/admin_panel/package*.json ./web/admin_panel/
COPY --from=builder /usr/src/app/web/admin_panel/.next ./web/admin_panel/.next
COPY --from=builder /usr/src/app/web/admin_panel/public ./web/admin_panel/public

EXPOSE 3001
CMD ["npm", "run", "start", "-w", "web/admin_panel"]
