# Dev container for the TanStack Start frontend (used by docker-compose `web`).
# Production deploys go to Vercel (`npm run build` → .vercel/output), not this image.
FROM node:22-slim

WORKDIR /app

# Install deps first for layer caching. The bind mount in docker-compose overlays
# /app at runtime, while the anonymous volume keeps these node_modules.
COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 8080

# Bind to 0.0.0.0:8080 so the published port (8080:8080) reaches the dev server.
# VITE_API_URL (set in docker-compose) points the browser at the backend.
CMD ["npm", "run", "dev", "--", "--port", "8080"]
