# Stage 1: フロントエンドビルド
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: バックエンドビルド & 最終イメージ
FROM node:20-slim

# better-sqlite3 のネイティブビルドに必要
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# バックエンド依存インストール & ビルド
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
RUN cd backend && npx tsc

# フロントエンドビルド成果物をコピー
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# データディレクトリ作成（ボリュームマウント先）
RUN mkdir -p /app/backend/data

WORKDIR /app/backend
EXPOSE 3001

CMD ["node", "dist/index.js"]
