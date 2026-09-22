/**
 * PIXPAY Background Worker & Reconciliation Runner
 * Runtime: Node.js 20+
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const REVISION = process.env.APP_REVISION || 'local';
const DEFAULT_TENANT_ID = 'default-tenant';

// Configuração de reconciliação
const RECONCILIATION_INTERVAL_MS = 60000; // 60 segundos
const STALE_PAYMENT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

// Prisma Client import
let prisma = null;
try {
  const { prisma: prismaClient } = require('@pixpay/database');
  prisma = prismaClient;
  console.log(JSON.stringify({
    level: 'info',
    service: 'pixpay-worker',
    msg: 'Prisma Client loaded successfully',
    timestamp: new Date().toISOString()
  }));
} catch (err) {
  console.log(JSON.stringify({
    level: 'warn',
    service: 'pixpay-worker',
    msg: 'Prisma Client not available',
    error: err.message,
    timestamp: new Date().toISOString()
  }));
}

console.log(JSON.stringify({
  level: 'info',
  service: 'pixpay-worker',
  msg: 'Inicializando PIXPAY Background Worker...',
  revision: REVISION,
  redisUrl: REDIS_URL.replace(/:\/\/.*@/, '://***@'),
  reconciliationIntervalMs: RECONCILIATION_INTERVAL_MS,
  stalePaymentThresholdMs: STALE_PAYMENT_THRESHOLD_MS,
  timestamp: new Date().toISOString()
}));

/**
 * Reconcilia pagamentos pendentes que possam ter mudado de status
 */
async function reconcilePendingPayments() {
  if (!prisma) {
    console.log(JSON.stringify({
      level: 'warn',
      service: 'pixpay-worker',
      msg: 'Skipping reconciliation - Prisma not available',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  try {
    const staleThreshold = new Date(Date.now() - STALE_PAYMENT_THRESHOLD_MS);

    // Buscar pagamentos PENDING que estão há mais de 5 minutos sem atualização
    const stalePayments = await prisma.payment.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: 'PENDING',
        updated_at: {
          lt: staleThreshold,
        },
      },
      select: {
        id: true,
        amount: true,
        created_at: true,
        expires_at: true,
        updated_at: true,
      },
    });

    if (stalePayments.length === 0) {
      console.log(JSON.stringify({
        level: 'info',
        service: 'pixpay-worker',
        msg: 'Reconciliation completed - no stale payments found',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    console.log(JSON.stringify({
      level: 'info',
      service: 'pixpay-worker',
      msg: 'Starting reconciliation of stale payments',
      count: stalePayments.length,
      timestamp: new Date().toISOString()
    }));

    let expiredCount = 0;
    const now = new Date();

    for (const payment of stalePayments) {
      // Verificar se o pagamento expirou
      if (payment.expires_at && payment.expires_at < now) {
        try {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'EXPIRED',
              updated_at: now,
            },
          });

          // Registrar evento de expiração
          await prisma.paymentEvent.create({
            data: {
              payment_id: payment.id,
              event_type: 'payment.expired',
              status: 'EXPIRED',
              metadata: JSON.stringify({
                expired_at: now.toISOString(),
                reason: 'automatic_reconciliation',
              }),
            },
          });

          expiredCount++;

          console.log(JSON.stringify({
            level: 'info',
            service: 'pixpay-worker',
            msg: 'Payment marked as EXPIRED',
            payment_id: payment.id,
            amount: parseFloat(payment.amount.toString()),
            created_at: payment.created_at.toISOString(),
            expired_at: now.toISOString(),
            timestamp: new Date().toISOString()
          }));
        } catch (err) {
          console.log(JSON.stringify({
            level: 'error',
            service: 'pixpay-worker',
            msg: 'Error marking payment as expired',
            payment_id: payment.id,
            error: err.message,
            timestamp: new Date().toISOString()
          }));
        }
      }
    }

    console.log(JSON.stringify({
      level: 'info',
      service: 'pixpay-worker',
      msg: 'Reconciliation completed',
      stale_payments_found: stalePayments.length,
      expired_count: expiredCount,
      timestamp: new Date().toISOString()
    }));

  } catch (err) {
    console.log(JSON.stringify({
      level: 'error',
      service: 'pixpay-worker',
      msg: 'Error during reconciliation',
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    }));
  }
}

// Heartbeat e Reconciliação Periódica
let isRunning = true;
let reconciliationTimer = null;

// Executar reconciliação imediatamente no startup (após 10s para dar tempo do DB estar pronto)
setTimeout(() => {
  if (isRunning) {
    reconcilePendingPayments();
  }
}, 10000);

// Configurar timer periódico de reconciliação
reconciliationTimer = setInterval(async () => {
  if (!isRunning) return;
  await reconcilePendingPayments();
}, RECONCILIATION_INTERVAL_MS);

console.log(JSON.stringify({
  level: 'info',
  service: 'pixpay-worker',
  msg: 'PIXPAY Worker operacional e aguardando eventos de reconciliação.',
  timestamp: new Date().toISOString()
}));

async function shutdown(signal) {
  console.log(JSON.stringify({
    level: 'info',
    service: 'pixpay-worker',
    msg: `Sinal ${signal} recebido. Finalizando worker gracioso...`,
    timestamp: new Date().toISOString()
  }));
  isRunning = false;

  if (reconciliationTimer) {
    clearInterval(reconciliationTimer);
  }

  if (prisma) {
    await prisma.$disconnect();
    console.log(JSON.stringify({
      level: 'info',
      service: 'pixpay-worker',
      msg: 'Prisma disconnected',
      timestamp: new Date().toISOString()
    }));
  }

  setTimeout(() => {
    console.log(JSON.stringify({ level: 'info', service: 'pixpay-worker', msg: 'Worker finalizado com sucesso.' }));
    process.exit(0);
  }, 500);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
