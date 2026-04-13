# ── Stage 1: Build frontend ──
FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --workspace=@mediconnect/frontend

COPY frontend/ frontend/
RUN npm run build --workspace=@mediconnect/frontend

# ── Stage 2: Production runtime ──
FROM node:22-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace=@mediconnect/backend --omit=dev

COPY backend/ backend/

# Generate Prisma client
RUN cd backend && npx prisma generate

# Copy frontend build output
COPY --from=frontend-build /app/frontend/dist frontend/dist

ENV NODE_ENV=production
EXPOSE 3006

CMD ["node", "backend/src/server.js"]
