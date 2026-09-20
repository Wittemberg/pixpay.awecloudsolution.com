# Proposal: Configuração LofyPay e Limpeza de Dados Fictícios

## Why

A interface web inicial carregava dados fictícios demonstrativos (R$ 1.250,00 e linha simulada na tabela). Para permitir a operação real, esses dados devem ser zerados, refletindo o estado real do banco de dados (empty state). Além disso, os sócios necessitam da tela/aba de configuração para cadastrar e testar as credenciais da LofyPay (`Client ID`, `Secret Key`, ambiente Sandbox/Produção e visualização da URL de webhook), viabilizando o início dos testes de conexão financeira real.

## What Changes

- Limpeza de todos os dados fictícios dos endpoints `/api/v1/payments` e `/api/v1/payments/summary` (inicializados em zero e lista vazia).
- Implementação da tela/aba "Configuração LofyPay" no painel web:
  - Seleção de ambiente: `SANDBOX` vs `PRODUCTION`.
  - Campos para `Client ID` / `Chave de Acesso` e `Secret Key` (com máscara de segurança `sk_...`).
  - Exibição com botão de cópia da URL do Webhook do PIXPAY (`https://pixpay.awecloudsolution.com/api/v1/webhooks/lofypay`).
  - Botão "Salvar Credenciais" e botão "Testar Conexão".
- Endpoints de API para gestão e teste da conta de pagamento:
  - `GET /api/v1/payment-accounts`: Retorna status da conexão e chaves mascaradas.
  - `POST /api/v1/payment-accounts`: Salva credenciais com persistência/criptografia.
  - `POST /api/v1/payment-accounts/test`: Executa teste de handshake com a LofyPay.

## Capabilities

### New Capabilities
- `payment-account-config`: Gestão, mascaramento e teste de credenciais financeiras da LofyPay no backend e frontend.

### Modified Capabilities
*(Nenhuma modificação de contratos existentes; a capacidade base continua operando).*

## Impact

- Afeta `apps/api/dist/main.js`, `apps/api/src/main.js` e `apps/web/server.js`.
- Habilita a configuração real pelo usuário via navegador.
