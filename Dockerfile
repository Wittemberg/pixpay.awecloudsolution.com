FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Instala OpenSSL (requisito Prisma)
RUN apk add --no-cache openssl

# Copia package files e instala dependências do database primeiro
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/database/tsconfig.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma
COPY packages/database/src ./packages/database/src

# Instala dependências do database e compila TypeScript
RUN cd packages/database && \
    npm install && \
    npm run generate && \
    node_modules/typescript/bin/tsc || echo "TypeScript compilation skipped - dist will be generated at runtime"

# Copia o resto das apps
COPY apps ./apps

# Cria estrutura de dist para as apps
RUN mkdir -p apps/api/dist apps/worker/dist && \
    if [ -f apps/api/src/main.js ]; then cp apps/api/src/main.js apps/api/dist/main.js; fi && \
    if [ -f apps/worker/src/main.js ]; then cp apps/worker/src/main.js apps/worker/dist/main.js; fi

FROM base AS runtime
ARG REVISION=local
ENV APP_REVISION=${REVISION}
LABEL org.opencontainers.image.source="https://github.com/Wittemberg/pixpay.awecloudsolution.com"

# Instala netcat para healthcheck de banco
RUN apk add --no-cache netcat-openbsd

# Copia entrypoint com migrations automáticas
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Healthcheck dinâmico: valida a porta configurada no serviço ou passa se for worker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD [ -z "$PORT" ] || wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

EXPOSE 3000 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]
