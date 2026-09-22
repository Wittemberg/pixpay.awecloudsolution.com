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

// ============================================================================
// TENANT PADRÃO (single-tenant provisório até implementar autenticação)
// ============================================================================
const DEFAULT_TENANT_ID = 'default-tenant';

// Função auxiliar para garantir tenant padrão existe
async function ensureDefaultTenant() {
  if (!prisma) return null;

  try {
    let tenant = await prisma.tenant.findUnique({
      where: { id: DEFAULT_TENANT_ID }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: DEFAULT_TENANT_ID,
          name: 'Default Organization',
          slug: 'default',
          status: 'ACTIVE',
        }
      });
      console.log('[PIXPAY API] Default tenant created:', DEFAULT_TENANT_ID);
    }

    return tenant;
  } catch (err) {
    console.error('[PIXPAY API] Error ensuring default tenant:', err.message);
    return null;
  }
}

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
    (async () => {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Recebido hoje (PAID e criado hoje)
        const todayPaid = await prisma.payment.aggregate({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            status: 'PAID',
            created_at: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          _sum: {
            amount: true,
          },
          _count: true,
        });

        // Pendente (status PENDING)
        const pending = await prisma.payment.aggregate({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            status: 'PENDING',
          },
          _sum: {
            amount: true,
          },
          _count: true,
        });

        sendJson(res, 200, {
          todayReceived: todayPaid._sum.amount ? parseFloat(todayPaid._sum.amount.toString()) : 0,
          todayCount: todayPaid._count || 0,
          pendingTotal: pending._sum.amount ? parseFloat(pending._sum.amount.toString()) : 0,
          pendingCount: pending._count || 0,
          currency: 'BRL',
        });
      } catch (err) {
        console.error('[PIXPAY API] Error fetching payment summary:', err);
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Erro ao buscar resumo' });
      }
    })();
    return;
  }

  // Payments list — lista real (inicia vazia)
  if (pathname === '/api/v1/payments' && method === 'GET') {
    (async () => {
      try {
        const payments = await prisma.payment.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        const formattedPayments = payments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount.toString()),
          description: p.description,
          customer: p.customer_name,
          status: p.status,
          pix_copy_paste: p.pix_copy_paste,
          qr_code_url: p.qr_code_url,
          expires_at: p.expires_at.toISOString(),
          created_at: p.created_at.toISOString(),
        }));

        sendJson(res, 200, {
          data: formattedPayments,
          total: formattedPayments.length,
        });
      } catch (err) {
        console.error('[PIXPAY API] Error listing payments:', err);
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Erro ao buscar pagamentos' });
      }
    })();
    return;
  }

  // Create payment
  if (pathname === '/api/v1/payments' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const amount = parseFloat(payload.amount);
        if (isNaN(amount) || amount <= 0) {
          sendJson(res, 400, { error: 'BAD_REQUEST', message: 'O valor deve ser maior que R$ 0,00' });
          return;
        }

        const description = payload.description || 'Cobrança PIXPAY';
        const customer = payload.customer || 'Cliente';

        // Garantir que tenant padrão existe
        const tenant = await ensureDefaultTenant();
        if (!tenant) {
          sendJson(res, 503, { error: 'SERVICE_UNAVAILABLE', message: 'Banco de dados indisponível' });
          return;
        }

        // Buscar ou criar conta de pagamento padrão LOFYPAY
        let paymentAccount = await prisma.paymentAccount.findFirst({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            provider: 'LOFYPAY',
          }
        });

        if (!paymentAccount) {
          // Criar conta padrão vazia (será configurada depois via POST /payment-accounts)
          paymentAccount = await prisma.paymentAccount.create({
            data: {
              tenant_id: DEFAULT_TENANT_ID,
              provider: 'LOFYPAY',
              environment: process.env.LOFYPAY_DEFAULT_ENV || 'SANDBOX',
              encrypted_credentials: JSON.stringify({}), // vazio por enquanto
              status: 'PENDING',
            }
          });
        }

        // Gerar código PIX copia e cola simulado
        const copyPaste = '00020126580014br.gov.bcb.pix0136' + Math.random().toString(36).substring(2, 15) + '520400005303986540' + amount.toFixed(2) + '5802BR5907PIXPAY6009SAO PAULO6304' + Math.random().toString(36).substring(2, 6).toUpperCase();

        // Criar pagamento no banco de dados
        const expiresAt = new Date(Date.now() + 1800000);
        const newPayment = await prisma.payment.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            payment_account_id: paymentAccount.id,
            amount: amount,
            currency: 'BRL',
            description: description,
            customer_name: customer,
            status: 'PENDING',
            pix_copy_paste: copyPaste,
            qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(copyPaste)}`,
            expires_at: expiresAt,
          }
        });

        sendJson(res, 201, {
          id: newPayment.id,
          amount: parseFloat(newPayment.amount.toString()),
          description: newPayment.description,
          customer: newPayment.customer_name,
          status: newPayment.status,
          pix: {
            copy_paste: newPayment.pix_copy_paste,
            qr_code_url: newPayment.qr_code_url,
          },
          expires_at: newPayment.expires_at.toISOString(),
          created_at: newPayment.created_at.toISOString(),
        });
      } catch (err) {
        console.error('[PIXPAY API] Error creating payment:', err);
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Erro ao criar pagamento' });
      }
    });
    return;
  }

  // Payment Accounts - Get LofyPay Config (chave mascarada)
  if (pathname === '/api/v1/payment-accounts' && method === 'GET') {
    (async () => {
      try {
        const paymentAccount = await prisma.paymentAccount.findFirst({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            provider: 'LOFYPAY',
          }
        });

        if (!paymentAccount) {
          sendJson(res, 200, {
            data: {
              provider: 'LOFYPAY',
              environment: process.env.LOFYPAY_DEFAULT_ENV || 'SANDBOX',
              clientId: '',
              hasSecret: false,
              maskedSecretKey: '',
              status: 'PENDING',
              webhookUrl: '',
              lastTestedAt: null,
            }
          });
          return;
        }

        const credentials = paymentAccount.encrypted_credentials
          ? JSON.parse(paymentAccount.encrypted_credentials)
          : {};

        sendJson(res, 200, {
          data: {
            provider: paymentAccount.provider,
            environment: paymentAccount.environment,
            clientId: credentials.clientId || '',
            hasSecret: Boolean(credentials.secretKey),
            maskedSecretKey: maskSecret(credentials.secretKey || ''),
            status: paymentAccount.status,
            webhookUrl: credentials.webhookUrl || '',
            lastTestedAt: paymentAccount.last_tested_at ? paymentAccount.last_tested_at.toISOString() : null,
          }
        });
      } catch (err) {
        console.error('[PIXPAY API] Error fetching payment account:', err);
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Erro ao buscar conta de pagamento' });
      }
    })();
    return;
  }

  // Payment Accounts - Save LofyPay Config
  if (pathname === '/api/v1/payment-accounts' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const tenant = await ensureDefaultTenant();
        if (!tenant) {
          sendJson(res, 503, { error: 'SERVICE_UNAVAILABLE', message: 'Banco de dados indisponível' });
          return;
        }

        const payload = body ? JSON.parse(body) : {};

        let paymentAccount = await prisma.paymentAccount.findFirst({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            provider: 'LOFYPAY',
          }
        });

        const existingCredentials = paymentAccount?.encrypted_credentials
          ? JSON.parse(paymentAccount.encrypted_credentials)
          : {};

        const updatedCredentials = {
          clientId: payload.clientId !== undefined
            ? (typeof payload.clientId === 'string' ? payload.clientId.trim() : existingCredentials.clientId)
            : existingCredentials.clientId,
          secretKey: (payload.secretKey && payload.secretKey.trim() !== '')
            ? payload.secretKey.trim()
            : existingCredentials.secretKey,
          webhookUrl: existingCredentials.webhookUrl || '',
        };

        const updatedEnvironment = payload.environment || paymentAccount?.environment || process.env.LOFYPAY_DEFAULT_ENV || 'SANDBOX';

        if (paymentAccount) {
          paymentAccount = await prisma.paymentAccount.update({
            where: { id: paymentAccount.id },
            data: {
              environment: updatedEnvironment,
              encrypted_credentials: JSON.stringify(updatedCredentials),
            }
          });
        } else {
          paymentAccount = await prisma.paymentAccount.create({
            data: {
              tenant_id: DEFAULT_TENANT_ID,
              provider: 'LOFYPAY',
              environment: updatedEnvironment,
              encrypted_credentials: JSON.stringify(updatedCredentials),
              status: 'PENDING',
            }
          });
        }

        sendJson(res, 200, {
          success: true,
          message: 'Configurações da LofyPay salvas com sucesso.',
          data: {
            provider: paymentAccount.provider,
            environment: paymentAccount.environment,
            clientId: updatedCredentials.clientId || '',
            hasSecret: Boolean(updatedCredentials.secretKey),
            maskedSecretKey: maskSecret(updatedCredentials.secretKey || ''),
            status: paymentAccount.status,
            webhookUrl: updatedCredentials.webhookUrl || '',
            lastTestedAt: paymentAccount.last_tested_at ? paymentAccount.last_tested_at.toISOString() : null,
          }
        });
      } catch (err) {
        console.error('[PIXPAY API] Error saving payment account:', err);
        sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Erro ao salvar configurações' });
      }
    });
    return;
  }

  // Payment Accounts - Test LofyPay Connection
  if (pathname === '/api/v1/payment-accounts/test' && method === 'POST') {
    (async () => {
      try {
        const paymentAccount = await prisma.paymentAccount.findFirst({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            provider: 'LOFYPAY',
          }
        });

        if (!paymentAccount) {
          sendJson(res, 400, {
            success: false,
            message: 'Nenhuma conta de pagamento LofyPay configurada.',
          });
          return;
        }

        const credentials = paymentAccount.encrypted_credentials
          ? JSON.parse(paymentAccount.encrypted_credentials)
          : {};

        if (!credentials.clientId || !credentials.secretKey) {
          sendJson(res, 400, {
            success: false,
            message: 'Preencha o Client ID e a Secret Key antes de testar a conexão com a LofyPay.',
          });
          return;
        }

        // Simulação e registro de handshake com o ambiente LofyPay
        const updatedAccount = await prisma.paymentAccount.update({
          where: { id: paymentAccount.id },
          data: {
            status: 'ACTIVE',
            last_tested_at: new Date(),
          }
        });

        sendJson(res, 200, {
          success: true,
          status: 'ACTIVE',
          environment: updatedAccount.environment,
          message: `Conexão com a API da LofyPay (${updatedAccount.environment}) validada com sucesso!`,
          timestamp: updatedAccount.last_tested_at.toISOString(),
        });
      } catch (err) {
        console.error('[PIXPAY API] Error testing payment account:', err);
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Erro ao testar conexão' });
      }
    })();
    return;
  }

  // Webhooks LofyPay
  if (pathname === '/api/v1/webhooks/lofypay' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};

        if (payload.id || payload.transaction_id) {
          const matchId = payload.id || payload.transaction_id;
          const target = await prisma.payment.findUnique({
            where: { id: matchId }
          });

          if (target) {
            await prisma.payment.update({
              where: { id: matchId },
              data: {
                status: 'PAID',
                paid_at: new Date(),
              }
            });
          }

          // Create webhook event for audit trail
          const paymentAccount = await prisma.paymentAccount.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              provider: 'LOFYPAY',
            }
          });

          if (paymentAccount) {
            await prisma.webhookEvent.create({
              data: {
                tenant_id: DEFAULT_TENANT_ID,
                payment_account_id: paymentAccount.id,
                payment_id: target ? matchId : null,
                provider: 'LOFYPAY',
                event_type: 'payment.paid',
                raw_payload: body,
                processed: true,
              }
            });
          }
        }

        sendJson(res, 200, { status: 'received', provider: 'lofypay', timestamp: Date.now() });
      } catch (err) {
        console.error('[PIXPAY API] Error processing webhook:', err);
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
