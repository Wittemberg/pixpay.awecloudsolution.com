FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY apps ./apps

FROM base AS runtime
ARG REVISION=local
ENV APP_REVISION=${REVISION}
LABEL org.opencontainers.image.source="https://github.com/Wittemberg/pixpay.awecloudsolution.com"

# Healthcheck para monitorar o status da API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

EXPOSE 3000 3001
CMD ["node", "apps/api/dist/main.js"]
