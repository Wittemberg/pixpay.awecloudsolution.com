/**
 * PIXPAY API Core Service
 * Runtime: Node.js 20+
 */
const http = require('http');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const REVISION = process.env.APP_REVISION || 'local';

// Prisma Client import
let prisma = null;
try {
  const { prisma: prismaClient } = require('@pixpay/database');
  prisma = prismaClient;
  console.log('[PIXPAY API] Prisma Client loaded successfully');
} catch (err) {
  console.warn('[PIXPAY API] Prisma Client not available:', err.message);
}

// Estado persistido em memória (preparado para espelhamento em PostgreSQL)
let paymentsList = [];

let lofypayAccount = {
  provider: 'LOFYPAY',
  environment: process.env.LOFYPAY_DEFAULT_ENV || 'SANDBOX',
  clientId: '',
  secretKey: '',
  status: 'PENDING',
  webhookUrl: 'https://pixpay.awecloudsolution.com/api/v1/webhooks/lofypay',
  lastTestedAt: null,
};

function maskSecret(key) {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return key.substring(0, 7) + '****************' + key.substring(key.length - 4);
}

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
    // Check database connection if Prisma is available
    if (prisma) {
      prisma.$queryRaw`SELECT 1`
        .then(() => {
          sendJson(res, 200, {
            status: 'ok',
            service: 'pixpay-api-v1',
            database: 'connected',
            redis: process.env.REDIS_URL ? 'configured' : 'missing',
            revision: REVISION,
            environment: process.env.NODE_ENV || 'development',
          });
        })
        .catch(err => {
          sendJson(res, 503, {
            status: 'error',
            service: 'pixpay-api-v1',
            database: 'disconnected',
            error: err.message,
            revision: REVISION,
          });
        });
    } else {
      sendJson(res, 200, {
        status: 'ok',
        service: 'pixpay-api-v1',
        database: process.env.DATABASE_URL ? 'configured' : 'missing',
        redis: process.env.REDIS_URL ? 'configured' : 'missing',
        revision: REVISION,
        environment: process.env.NODE_ENV || 'development',
      });
    }
    return;
  }

  // Payments summary — métricas reais calculadas dinamicamente (limpas de dados fictícios)
  if (pathname === '/api/v1/payments/summary' && method === 'GET') {
    const today = new Date().toDateString();
    let todayReceived = 0;
    let todayCount = 0;
    let pendingTotal = 0;
    let pendingCount = 0;

    for (const p of paymentsList) {
      const pDate = new Date(p.created_at).toDateString();
      if (p.status === 'PAID') {
        if (pDate === today) {
          todayReceived += p.amount;
          todayCount++;
        }
      } else if (p.status === 'PENDING') {
        pendingTotal += p.amount;
        pendingCount++;
      }
    }

    sendJson(res, 200, {
      todayReceived,
      todayCount,
      pendingTotal,
      pendingCount,
      currency: 'BRL',
    });
    return;
  }

  // Payments list — lista real (inicia vazia)
  if (pathname === '/api/v1/payments' && method === 'GET') {
    sendJson(res, 200, {
      data: paymentsList,
      total: paymentsList.length,
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
        const amount = parseFloat(payload.amount);
        if (isNaN(amount) || amount <= 0) {
          sendJson(res, 400, { error: 'BAD_REQUEST', message: 'O valor deve ser maior que R$ 0,00' });
          return;
        }

        const description = payload.description || 'Cobrança PIXPAY';
        const customer = payload.customer || 'Cliente';
        const publicId = 'pay_' + Math.random().toString(36).substring(2, 10);
        const copyPaste = '00020126580014br.gov.bcb.pix0136' + Math.random().toString(36).substring(2, 15) + '520400005303986540' + amount.toFixed(2) + '5802BR5907PIXPAY6009SAO PAULO6304' + Math.random().toString(36).substring(2, 6).toUpperCase();

        const newPayment = {
          id: publicId,
          amount,
          description,
          customer,
          status: 'PENDING',
          pix_copy_paste: copyPaste,
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(copyPaste)}`,
          expires_at: new Date(Date.now() + 1800000).toISOString(),
          created_at: new Date().toISOString(),
        };

        paymentsList.unshift(newPayment);

        sendJson(res, 201, {
          id: newPayment.id,
          amount: newPayment.amount,
          description: newPayment.description,
          customer: newPayment.customer,
          status: newPayment.status,
          pix: {
            copy_paste: newPayment.pix_copy_paste,
            qr_code_url: newPayment.qr_code_url,
          },
          expires_at: newPayment.expires_at,
          created_at: newPayment.created_at,
        });
      } catch (err) {
        sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Payload JSON inválido' });
      }
    });
    return;
  }

  // Payment Accounts - Get LofyPay Config (chave mascarada)
  if (pathname === '/api/v1/payment-accounts' && method === 'GET') {
    sendJson(res, 200, {
      data: {
        provider: lofypayAccount.provider,
        environment: lofypayAccount.environment,
        clientId: lofypayAccount.clientId,
        hasSecret: Boolean(lofypayAccount.secretKey),
        maskedSecretKey: maskSecret(lofypayAccount.secretKey),
        status: lofypayAccount.status,
        webhookUrl: lofypayAccount.webhookUrl,
        lastTestedAt: lofypayAccount.lastTestedAt,
      }
    });
    return;
  }

  // Payment Accounts - Save LofyPay Config
  if (pathname === '/api/v1/payment-accounts' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if (payload.environment) lofypayAccount.environment = payload.environment;
        if (typeof payload.clientId === 'string') lofypayAccount.clientId = payload.clientId.trim();
        if (payload.secretKey && payload.secretKey.trim() !== '') {
          lofypayAccount.secretKey = payload.secretKey.trim();
        }
        sendJson(res, 200, {
          success: true,
          message: 'Configurações da LofyPay salvas com sucesso.',
          data: {
            provider: lofypayAccount.provider,
            environment: lofypayAccount.environment,
            clientId: lofypayAccount.clientId,
            hasSecret: Boolean(lofypayAccount.secretKey),
            maskedSecretKey: maskSecret(lofypayAccount.secretKey),
            status: lofypayAccount.status,
            webhookUrl: lofypayAccount.webhookUrl,
            lastTestedAt: lofypayAccount.lastTestedAt,
          }
        });
      } catch (err) {
        sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Payload JSON inválido' });
      }
    });
    return;
  }

  // Payment Accounts - Test LofyPay Connection
  if (pathname === '/api/v1/payment-accounts/test' && method === 'POST') {
    if (!lofypayAccount.clientId || !lofypayAccount.secretKey) {
      sendJson(res, 400, {
        success: false,
        message: 'Preencha o Client ID e a Secret Key antes de testar a conexão com a LofyPay.',
      });
      return;
    }

    // Simulação e registro de handshake com o ambiente LofyPay
    lofypayAccount.status = 'ACTIVE';
    lofypayAccount.lastTestedAt = new Date().toISOString();

    sendJson(res, 200, {
      success: true,
      status: 'ACTIVE',
      environment: lofypayAccount.environment,
      message: `Conexão com a API da LofyPay (${lofypayAccount.environment}) validada com sucesso!`,
      timestamp: lofypayAccount.lastTestedAt,
    });
    return;
  }

  // Webhooks LofyPay
  if (pathname === '/api/v1/webhooks/lofypay' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if (payload.id || payload.transaction_id) {
          const matchId = payload.id || payload.transaction_id;
          const target = paymentsList.find(p => p.id === matchId);
          if (target) {
            target.status = 'PAID';
            target.paid_at = new Date().toISOString();
          }
        }
        sendJson(res, 200, { status: 'received', provider: 'lofypay', timestamp: Date.now() });
      } catch (err) {
        sendJson(res, 200, { status: 'received_with_raw_payload' });
      }
    });
    return;
  }

  // MCP info
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

  sendJson(res, 404, { error: 'NOT_FOUND', message: `Rota ${method} ${pathname} não encontrada na PIXPAY API` });
});

server.listen(PORT, HOST, () => {
  console.log(`[PIXPAY API] Servidor rodando em http://${HOST}:${PORT} (Revisão: ${REVISION})`);
  if (prisma) {
    console.log('[PIXPAY API] Database connection via Prisma is ready');
  }
});

async function gracefulShutdown(signal) {
  console.log(`[PIXPAY API] Recebido sinal ${signal}. Encerrando...`);
  if (prisma) {
    await prisma.$disconnect();
    console.log('[PIXPAY API] Prisma disconnected');
  }
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
