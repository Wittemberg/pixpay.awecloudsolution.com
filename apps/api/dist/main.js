/**
 * PIXPAY API Core Bootstrap Service
 * Runtime: Node.js 20+
 */
const http = require('http');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const REVISION = process.env.APP_REVISION || 'local';

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    });
    res.end();
    return;
  }

  // Health checks
  if (pathname === '/api/health' || pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      app: 'pixpay-api',
      revision: REVISION,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (pathname === '/api/v1/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'pixpay-api-v1',
      database: process.env.DATABASE_URL ? 'configured' : 'missing',
      redis: process.env.REDIS_URL ? 'configured' : 'missing',
      revision: REVISION,
      environment: process.env.NODE_ENV || 'development',
    });
    return;
  }

  // Payments summary
  if (pathname === '/api/v1/payments/summary' && method === 'GET') {
    sendJson(res, 200, {
      todayReceived: 1250.00,
      todayCount: 4,
      pendingTotal: 350.00,
      pendingCount: 1,
      currency: 'BRL',
    });
    return;
  }

  // Payments list
  if (pathname === '/api/v1/payments' && method === 'GET') {
    sendJson(res, 200, {
      data: [
        {
          id: 'pay_9xA2K8d1',
          amount: 350.00,
          description: 'Manutenção Servidor',
          customer: 'Carlos',
          status: 'PENDING',
          pix_copy_paste: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406350.005802BR5913PIXPAY LTDA6009SAO PAULO62070503***6304ABCD',
          expires_at: new Date(Date.now() + 1800000).toISOString(),
          created_at: new Date().toISOString(),
        }
      ],
      total: 1,
    });
    return;
  }

  // Create payment
  if (pathname === '/api/v1/payments' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const amount = parseFloat(payload.amount || 10.0);
        const description = payload.description || 'Cobrança PIXPAY';
        const customer = payload.customer || 'Cliente';
        const publicId = 'pay_' + Math.random().toString(36).substring(2, 10);
        const copyPaste = '00020126580014br.gov.bcb.pix0136' + Math.random().toString(36).substring(2, 15) + '520400005303986540' + amount.toFixed(2) + '5802BR5907PIXPAY6009SAO PAULO6304' + Math.random().toString(36).substring(2, 6).toUpperCase();

        sendJson(res, 201, {
          id: publicId,
          amount,
          description,
          customer,
          status: 'PENDING',
          pix: {
            copy_paste: copyPaste,
            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(copyPaste)}`,
          },
          expires_at: new Date(Date.now() + 1800000).toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Payload JSON inválido' });
      }
    });
    return;
  }

  // Webhooks
  if (pathname === '/api/v1/webhooks/lofypay' && method === 'POST') {
    sendJson(res, 200, { status: 'received', provider: 'lofypay', timestamp: Date.now() });
    return;
  }

  // MCP endpoint info
  if (pathname === '/mcp') {
    sendJson(res, 200, {
      name: 'pixpay-mcp-server',
      version: '1.0.0',
      protocol: 'model-context-protocol',
      transport: 'streamable-http',
      tools: ['pix_create', 'pix_get', 'pix_list', 'pix_summary'],
    });
    return;
  }

  // Fallback 404
  sendJson(res, 404, { error: 'NOT_FOUND', message: `Rota ${method} ${pathname} não encontrada na PIXPAY API` });
});

server.listen(PORT, HOST, () => {
  console.log(`[PIXPAY API] Servidor rodando em http://${HOST}:${PORT} (Revisão: ${REVISION})`);
});

// Tratamento de sinais de encerramento
function gracefulShutdown(signal) {
  console.log(`[PIXPAY API] Recebido sinal ${signal}. Encerrando conexões com elegância...`);
  server.close(() => {
    console.log('[PIXPAY API] Servidor encerrado.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[PIXPAY API] Encerramento forçado após timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
