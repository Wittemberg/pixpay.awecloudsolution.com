FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY apps ./apps

# Garante a existência dos diretórios dist e arquivos de execução
RUN mkdir -p apps/api/dist apps/worker/dist && \
    if [ -f apps/api/src/main.js ] && [ ! -f apps/api/dist/main.js ]; then cp apps/api/src/main.js apps/api/dist/main.js; fi && \
    if [ -f apps/worker/src/main.js ] && [ ! -f apps/worker/dist/main.js ]; then cp apps/worker/src/main.js apps/worker/dist/main.js; fi

FROM base AS runtime
ARG REVISION=local
ENV APP_REVISION=${REVISION}
LABEL org.opencontainers.image.source="https://github.com/Wittemberg/pixpay.awecloudsolution.com"

# Healthcheck dinâmico: valida a porta configurada no serviço ou passa se for worker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD [ -z "$PORT" ] || wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

EXPOSE 3000 3001
CMD ["node", "apps/api/dist/main.js"]
