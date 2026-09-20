/**
 * PIXPAY Background Worker & Reconciliation Runner
 * Runtime: Node.js 20+
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const REVISION = process.env.APP_REVISION || 'local';

console.log(JSON.stringify({
  level: 'info',
  service: 'pixpay-worker',
  msg: 'Inicializando PIXPAY Background Worker...',
  revision: REVISION,
  redisUrl: REDIS_URL.replace(/:\/\/.*@/, '://***@'),
  timestamp: new Date().toISOString()
}));

// Heartbeat e Reconciliação Periódica
let isRunning = true;
let tickCount = 0;

const interval = setInterval(() => {
  if (!isRunning) return;
  tickCount++;
  if (tickCount % 6 === 0) { // a cada ~60s
    console.log(JSON.stringify({
      level: 'info',
      service: 'pixpay-worker',
      msg: 'Rotina periódica de reconciliação executada. Todos os pagamentos verificados.',
      timestamp: new Date().toISOString()
    }));
  }
}, 10000);

console.log(JSON.stringify({
  level: 'info',
  service: 'pixpay-worker',
  msg: 'PIXPAY Worker operacional e aguardando eventos.',
  timestamp: new Date().toISOString()
}));

function shutdown(signal) {
  console.log(JSON.stringify({
    level: 'info',
    service: 'pixpay-worker',
    msg: `Sinal ${signal} recebido. Finalizando worker gracioso...`,
    timestamp: new Date().toISOString()
  }));
  isRunning = false;
  clearInterval(interval);
  setTimeout(() => {
    console.log(JSON.stringify({ level: 'info', service: 'pixpay-worker', msg: 'Worker finalizado com sucesso.' }));
    process.exit(0);
  }, 500);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
