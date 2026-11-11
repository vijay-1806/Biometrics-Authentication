FROM mongo:7.0-jammy AS mongo

FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS backend
WORKDIR /app
COPY package.json ./
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev --no-audit --no-fund

FROM python:3.11-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4 libssl3 libstdc++6 nginx tini wget \
    && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default \
    && useradd --system --no-create-home --user-group mongodb \
    && useradd --create-home --user-group --uid 1000 node \
    && useradd --create-home --user-group --uid 10001 bioauth

COPY --from=mongo /usr/bin/mongod /usr/local/bin/mongod
COPY --from=backend /usr/local/bin/node /usr/local/bin/node
COPY --from=backend /app/backend/node_modules ./backend/node_modules
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY backend/db_seeds ./demo-seeds/lms
COPY docker/backend-entrypoint.cjs ./backend-entrypoint.cjs

COPY behavioral-auth-ml-service/backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt
COPY behavioral-auth-ml-service/backend ./behavioral-auth-ml-service/backend
COPY behavioral-auth-ml-service/frontend ./behavioral-auth-ml-service/frontend

COPY --from=frontend /app/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/bioauth.conf
COPY docker/standalone.py ./standalone.py
RUN install -d -o node -g node /app/runtime \
    && install -d -o bioauth -g bioauth /app/behavioral-auth-ml-service/data /app/behavioral-auth-ml-service/models \
    && node --version \
    && mongod --version

EXPOSE 8080 8000
HEALTHCHECK --interval=5s --timeout=4s --start-period=90s --retries=5 CMD wget -q -T 2 -O /dev/null http://127.0.0.1:8080/api/health && wget -q -T 2 -O /dev/null http://127.0.0.1:8080/bio-api/v1/system/health
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "/app/standalone.py"]
