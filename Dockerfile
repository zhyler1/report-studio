# Report Studio: frontend (Vite) + API (FastAPI) en una sola imagen
FROM node:22-slim AS web
WORKDIR /w/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && playwright install --with-deps chromium
COPY backend/ backend/
COPY seed/ seed/
COPY schema/ schema/
COPY --from=web /w/frontend/dist frontend/dist
ENV RS_DB=/data/report_studio.db RS_MEDIA=/data/media
VOLUME /data
WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
