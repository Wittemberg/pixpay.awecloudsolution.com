FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./

FROM base AS runtime
ARG REVISION=local
ENV APP_REVISION=${REVISION}
LABEL org.opencontainers.image.source="https://github.com/Wittemberg/pixpay.awecloudsolution.com"

# Healthcheck inicial
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

EXPOSE 3000 3001
CMD ["node", "-e", "const http = require('http'); const server = http.createServer((req, res) => { if (req.url === '/api/health') { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({ status: 'ok', revision: process.env.APP_REVISION || 'local', app: 'pixpay' })); return; } res.writeHead(200, {'Content-Type': 'text/plain'}); res.end('PIXPAY API bootstrap running'); }); server.listen(3000, () => console.log('PIXPAY placeholder server listening on port 3000'));"]
