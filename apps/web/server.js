/**
 * PIXPAY Web Minimal Dashboard Server
 * Runtime: Node.js 20+
 * Standards: Wittemberg UX/UI Baseline (100% zoom reference, perfect container fit, no silent failures)
 */
const http = require('http');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PIXPAY — Recebimentos Inteligentes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0e17;
      --bg-secondary: #121826;
      --bg-card: #1a2234;
      --border-color: #263248;
      --text-primary: #f8fafc;
      --text-muted: #94a3b8;
      --accent-green: #10b981;
      --accent-green-hover: #059669;
      --accent-blue: #3b82f6;
      --status-pending: #f59e0b;
      --status-paid: #10b981;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      background: linear-gradient(135deg, #10b981, #047857);
      color: white;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .metric-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 18px 20px;
    }
    .metric-label {
      font-size: 0.8125rem;
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-val {
      font-size: 1.75rem;
      font-weight: 700;
      margin-top: 6px;
      color: var(--text-primary);
    }
    .action-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 24px;
    }
    .action-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .input-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .form-control {
      flex: 1;
      min-width: 180px;
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      color: white;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-control:focus {
      border-color: var(--accent-green);
    }
    .btn {
      background-color: var(--accent-green);
      color: white;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s ease;
    }
    .btn:hover {
      background-color: var(--accent-green-hover);
    }
    .result-box {
      margin-top: 20px;
      padding: 16px;
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      display: none;
    }
    .copy-paste-box {
      background-color: var(--bg-primary);
      padding: 10px 14px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.875rem;
      color: #38bdf8;
      word-break: break-all;
      margin: 10px 0;
      max-height: 80px;
      overflow-y: auto;
      border: 1px solid #1e293b;
    }
    .table-card {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    th, td {
      padding: 12px 18px;
      border-bottom: 1px solid var(--border-color);
    }
    th {
      background-color: var(--bg-card);
      color: var(--text-muted);
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-paid { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-pending { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        PIXPAY
        <span class="brand-badge">PRODUÇÃO</span>
      </div>
      <div style="font-size: 0.875rem; color: var(--text-muted);">
        Tenant: <strong>Principal (Sócio)</strong>
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Recebido Hoje</div>
        <div class="metric-val" id="metric-today">R$ 0,00</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Pagamentos Hoje</div>
        <div class="metric-val" id="metric-count">0</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Aguardando PIX</div>
        <div class="metric-val" id="metric-pending" style="color: var(--status-pending);">R$ 0,00</div>
      </div>
    </div>

    <div class="action-card">
      <div class="action-title">
        ⚡ Gerar Nova Cobrança PIX
      </div>
      <form id="pix-form" onsubmit="handleCreatePix(event)">
        <div class="input-group">
          <div class="input-row">
            <input type="number" step="0.01" min="0.50" id="pix-amount" class="form-control" placeholder="Valor (R$) *" required autofocus>
            <input type="text" id="pix-customer" class="form-control" placeholder="Cliente (ex: Carlos)">
          </div>
          <div class="input-row">
            <input type="text" id="pix-desc" class="form-control" placeholder="Descrição (ex: Manutenção servidor)">
            <button type="submit" id="btn-submit" class="btn">Gerar PIX</button>
          </div>
        </div>
      </form>

      <div id="pix-result" class="result-box">
        <div style="font-weight: 600; color: #34d399; margin-bottom: 8px;">✓ PIX Gerado com Sucesso!</div>
        <div style="font-size: 0.875rem; color: var(--text-muted);">Código Copia e Cola:</div>
        <div id="pix-copy-text" class="copy-paste-box"></div>
        <button type="button" class="btn" onclick="copyPixCode()" id="btn-copy">Copiar Código PIX</button>
      </div>
    </div>

    <div class="table-card">
      <div style="padding: 16px 18px; font-weight: 600; border-bottom: 1px solid var(--border-color);">
        Últimos Recebimentos
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody id="table-body">
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted);">Carregando pagamentos...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function loadData() {
      try {
        const sumRes = await fetch('/api/v1/payments/summary');
        if (sumRes.ok) {
          const s = await sumRes.json();
          document.getElementById('metric-today').textContent = 'R$ ' + s.todayReceived.toFixed(2);
          document.getElementById('metric-count').textContent = s.todayCount;
          document.getElementById('metric-pending').textContent = 'R$ ' + s.pendingTotal.toFixed(2);
        }

        const listRes = await fetch('/api/v1/payments');
        if (listRes.ok) {
          const { data } = await listRes.json();
          const tbody = document.getElementById('table-body');
          if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum pagamento registrado ainda.</td></tr>';
            return;
          }
          tbody.innerHTML = data.map(p => \`
            <tr>
              <td><code>\${p.id}</code></td>
              <td>\${p.customer || '—'}</td>
              <td><strong>R$ \${p.amount.toFixed(2)}</strong></td>
              <td><span class="badge \${p.status === 'PAID' ? 'badge-paid' : 'badge-pending'}">\${p.status}</span></td>
              <td>\${new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          \`).join('');
        }
      } catch (e) {
        console.error('Falha ao carregar dados:', e);
      }
    }

    async function handleCreatePix(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-submit');
      btn.disabled = true;
      btn.textContent = 'Gerando...';

      const amount = document.getElementById('pix-amount').value;
      const customer = document.getElementById('pix-customer').value;
      const description = document.getElementById('pix-desc').value;

      try {
        const res = await fetch('/api/v1/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, customer, description })
        });
        if (res.ok) {
          const data = await res.json();
          document.getElementById('pix-copy-text').textContent = data.pix.copy_paste;
          document.getElementById('pix-result').style.display = 'block';
          loadData();
        } else {
          alert('Erro ao gerar PIX');
        }
      } catch (err) {
        alert('Erro de conexão ao gerar PIX');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Gerar PIX';
      }
    }

    function copyPixCode() {
      const code = document.getElementById('pix-copy-text').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btn-copy');
        btn.textContent = 'Copiado com Sucesso!';
        setTimeout(() => { btn.textContent = 'Copiar Código PIX'; }, 2000);
      });
    }

    loadData();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;

  if (pathname === '/api/health' || pathname === '/health') {
    const payload = JSON.stringify({ status: 'ok', app: 'pixpay-web', uptime: Math.floor(process.uptime()) });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
    res.end(payload);
    return;
  }

  // Serve Dashboard HTML
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(DASHBOARD_HTML) });
  res.end(DASHBOARD_HTML);
});

server.listen(PORT, HOST, () => {
  console.log(`[PIXPAY WEB] Dashboard rodando em http://${HOST}:${PORT}`);
});

function gracefulShutdown(signal) {
  console.log(`[PIXPAY WEB] Recebido ${signal}. Encerrando...`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
