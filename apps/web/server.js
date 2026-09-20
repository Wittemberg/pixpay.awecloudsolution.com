/**
 * PIXPAY Web Dashboard & LofyPay Configuration Interface
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
      --status-invalid: #ef4444;
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
      max-width: 860px;
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
      flex-wrap: wrap;
      gap: 12px;
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
    .nav-tabs {
      display: flex;
      gap: 8px;
      background-color: var(--bg-secondary);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tab-btn:hover {
      color: var(--text-primary);
    }
    .tab-btn.active {
      background-color: var(--bg-card);
      color: var(--text-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .tab-pane {
      display: none;
      flex-direction: column;
      gap: 20px;
    }
    .tab-pane.active {
      display: flex;
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
      justify-content: space-between;
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
      min-width: 220px;
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      color: white;
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-control:focus {
      border-color: var(--accent-green);
    }
    select.form-control {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
    }
    .btn {
      background-color: var(--accent-green);
      color: white;
      font-weight: 600;
      font-size: 0.9375rem;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
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
    .btn-secondary {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }
    .btn-secondary:hover {
      background-color: #222d42;
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
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-paid { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-pending { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .badge-active { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
    .alert-banner {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.875rem;
      display: none;
      margin-bottom: 16px;
    }
    .alert-success { background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; }
    .alert-danger { background-color: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171; }
    .helper-text { font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        PIXPAY
        <span class="brand-badge">PRODUÇÃO</span>
      </div>
      <nav class="nav-tabs">
        <button class="tab-btn active" onclick="switchTab('dashboard')">📊 Dashboard & PIX</button>
        <button class="tab-btn" onclick="switchTab('lofy')">⚙️ Configuração LofyPay</button>
      </nav>
    </header>

    <!-- TAB 1: DASHBOARD & PIX -->
    <main id="tab-dashboard" class="tab-pane active">
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
          <span>⚡ Gerar Nova Cobrança PIX</span>
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
        <div style="padding: 16px 18px; font-weight: 600; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <span>Últimos Recebimentos</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Atualização automática</span>
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
              <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Nenhum pagamento registrado ainda.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- TAB 2: CONFIGURAÇÃO LOFYPAY -->
    <section id="tab-lofy" class="tab-pane">
      <div class="action-card">
        <div class="action-title">
          <span>Integração LofyPay (lofypay.com)</span>
          <span id="lofy-status-badge" class="badge badge-pending">PENDENTE</span>
        </div>

        <div id="lofy-alert" class="alert-banner"></div>

        <form id="lofy-form" onsubmit="handleSaveLofy(event)">
          <div class="input-group">
            <div>
              <label class="helper-text" style="font-weight: 600;">Ambiente Operacional</label>
              <select id="lofy-env" class="form-control" style="width: 100%; margin-top: 6px;">
                <option value="SANDBOX">SANDBOX (Homologação e Testes)</option>
                <option value="PRODUCTION">PRODUÇÃO (Transações Reais)</option>
              </select>
            </div>

            <div>
              <label class="helper-text" style="font-weight: 600;">Client ID / Identificador da Conta</label>
              <input type="text" id="lofy-client-id" class="form-control" style="width: 100%; margin-top: 6px;" placeholder="Cole o seu Client ID da LofyPay" required>
            </div>

            <div>
              <label class="helper-text" style="font-weight: 600;">Secret Key / Chave de API</label>
              <input type="password" id="lofy-secret-key" class="form-control" style="width: 100%; margin-top: 6px;" placeholder="Cole sua Secret Key (ex: sk_live_... / sk_test_...)">
              <div id="lofy-masked-preview" class="helper-text" style="display: none; color: #38bdf8;"></div>
            </div>

            <div style="background-color: var(--bg-card); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 6px;">
              <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">URL de Webhook para cadastrar na LofyPay</div>
              <div id="lofy-webhook-url" class="copy-paste-box" style="margin: 8px 0 10px 0;">https://pixpay.awecloudsolution.com/api/v1/webhooks/lofypay</div>
              <button type="button" class="btn btn-secondary" style="font-size: 0.8125rem; padding: 6px 14px;" onclick="copyWebhookUrl()" id="btn-copy-webhook">Copiar URL do Webhook</button>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
              <button type="submit" id="btn-save-lofy" class="btn">Salvar Credenciais</button>
              <button type="button" class="btn btn-secondary" onclick="handleTestLofy()" id="btn-test-lofy">Testar Conexão</button>
            </div>
          </div>
        </form>
      </div>
    </section>
  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      if (tabId === 'dashboard') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('tab-dashboard').classList.add('active');
        loadData();
      } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('tab-lofy').classList.add('active');
        loadLofyConfig();
      }
    }

    async function loadData() {
      try {
        const sumRes = await fetch('/api/v1/payments/summary');
        if (sumRes.ok) {
          const s = await sumRes.json();
          document.getElementById('metric-today').textContent = 'R$ ' + (s.todayReceived || 0).toFixed(2);
          document.getElementById('metric-count').textContent = s.todayCount || 0;
          document.getElementById('metric-pending').textContent = 'R$ ' + (s.pendingTotal || 0).toFixed(2);
        }

        const listRes = await fetch('/api/v1/payments');
        if (listRes.ok) {
          const { data } = await listRes.json();
          const tbody = document.getElementById('table-body');
          if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Nenhum pagamento registrado ainda.</td></tr>';
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

    async function loadLofyConfig() {
      try {
        const res = await fetch('/api/v1/payment-accounts');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            document.getElementById('lofy-env').value = data.environment || 'SANDBOX';
            document.getElementById('lofy-client-id').value = data.clientId || '';
            document.getElementById('lofy-webhook-url').textContent = data.webhookUrl || 'https://pixpay.awecloudsolution.com/api/v1/webhooks/lofypay';

            const badge = document.getElementById('lofy-status-badge');
            if (data.status === 'ACTIVE') {
              badge.className = 'badge badge-active';
              badge.textContent = 'CONECTADO E ATIVO';
            } else {
              badge.className = 'badge badge-pending';
              badge.textContent = 'AGUARDANDO VALIDAÇÃO';
            }

            const preview = document.getElementById('lofy-masked-preview');
            if (data.hasSecret && data.maskedSecretKey) {
              preview.style.display = 'block';
              preview.textContent = 'Secret Key gravada: ' + data.maskedSecretKey;
            } else {
              preview.style.display = 'none';
            }
          }
        }
      } catch (err) {
        console.error('Falha ao carregar configurações da LofyPay:', err);
      }
    }

    async function handleSaveLofy(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-save-lofy');
      btn.disabled = true;
      btn.textContent = 'Salvando...';

      const alertBox = document.getElementById('lofy-alert');
      alertBox.style.display = 'none';

      const payload = {
        environment: document.getElementById('lofy-env').value,
        clientId: document.getElementById('lofy-client-id').value,
        secretKey: document.getElementById('lofy-secret-key').value
      };

      try {
        const res = await fetch('/api/v1/payment-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          alertBox.className = 'alert-banner alert-success';
          alertBox.textContent = '✓ ' + (data.message || 'Configurações salvas com sucesso!');
          alertBox.style.display = 'block';
          document.getElementById('lofy-secret-key').value = '';
          loadLofyConfig();
        } else {
          alertBox.className = 'alert-banner alert-danger';
          alertBox.textContent = '✕ ' + (data.message || 'Erro ao salvar credenciais.');
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.className = 'alert-banner alert-danger';
        alertBox.textContent = '✕ Erro de conexão ao salvar.';
        alertBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Credenciais';
      }
    }

    async function handleTestLofy() {
      const btn = document.getElementById('btn-test-lofy');
      btn.disabled = true;
      btn.textContent = 'Testando...';

      const alertBox = document.getElementById('lofy-alert');
      alertBox.style.display = 'none';

      try {
        const res = await fetch('/api/v1/payment-accounts/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alertBox.className = 'alert-banner alert-success';
          alertBox.textContent = '✓ ' + data.message;
          alertBox.style.display = 'block';
          loadLofyConfig();
        } else {
          alertBox.className = 'alert-banner alert-danger';
          alertBox.textContent = '✕ ' + (data.message || 'Falha ao testar conexão.');
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.className = 'alert-banner alert-danger';
        alertBox.textContent = '✕ Erro de rede ao testar conexão.';
        alertBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Testar Conexão';
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

    function copyWebhookUrl() {
      const urlText = document.getElementById('lofy-webhook-url').textContent;
      navigator.clipboard.writeText(urlText).then(() => {
        const btn = document.getElementById('btn-copy-webhook');
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = 'Copiar URL do Webhook'; }, 2000);
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
