# Image chạy ui-check: Chromium + puppeteer-core cài riêng ở /app (không đụng package.json frontend).
FROM node:22-alpine
RUN apk add --no-cache chromium font-noto ttf-dejavu \
  && mkdir /app && cd /app && npm init -y >/dev/null \
  && npm i puppeteer-core@23 --no-audit --no-fund --silent
ENV CHROME_PATH=/usr/bin/chromium PUPPETEER_BASE=/app/package.json
WORKDIR /app
