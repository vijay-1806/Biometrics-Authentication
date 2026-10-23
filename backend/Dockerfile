FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./package.json
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/src ./src
COPY backend/scripts/create-account.js ./scripts/create-account.js
COPY backend/scripts/seed-demo.js ./scripts/seed-demo.js
COPY backend/scripts/test-seed-demo.js ./scripts/test-seed-demo.js
COPY backend/db_seeds /app/demo-seeds/lms
COPY docker/backend-entrypoint.cjs /app/backend-entrypoint.cjs
RUN mkdir -p /app/runtime && chown node:node /app/runtime
USER node
EXPOSE 5000
CMD ["node", "/app/backend-entrypoint.cjs"]
