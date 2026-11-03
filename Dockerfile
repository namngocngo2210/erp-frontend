ARG NODE_BASE=public.ecr.aws/docker/library/node:22-alpine
ARG NGINX_BASE=public.ecr.aws/docker/library/nginx:1.27-alpine
FROM ${NODE_BASE} AS builder

WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci --no-audit --no-fund

COPY tsconfig.json vite.config.ts postcss.config.js components.json index.html /app/
COPY src /app/src
COPY public /app/public

RUN npm run build

# build.sourcemap="hidden" luôn sinh .map. Khi build KHÔNG có SENTRY_AUTH_TOKEN thì
# plugin Sentry không chạy nên .map còn nằm lại trong dist — dọn sạch để image nginx
# không bao giờ serve sourcemap ra ngoài.
RUN find /app/dist -name "*.map" -delete

FROM ${NGINX_BASE}
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
