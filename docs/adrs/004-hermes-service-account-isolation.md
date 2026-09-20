---
adr_number: "004"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 004: Isolamento do Hermes Agent via Service Accounts Sem Credenciais Financeiras

## Contexto
O Hermes Agent opera como interface conversacional via WhatsApp, acionando ferramentas através de Model Context Protocol (MCP). Como agentes de IA estão sujeitos a prompt injection, alucinações ou interpretações ambíguas de intenção do usuário, conceder credenciais financeiras diretas ou permissões destrutivas ao modelo representa risco crítico.

## Alternativas Consideradas
- **Fornecer Credenciais da LofyPay ao Hermes:** O Hermes chamaria a API da LofyPay diretamente. (Risco inaceitável de vazamento de credenciais e falta de auditoria).
- **Hermes Informar `tenant_id` como Parâmetro da Ferramenta:** O token seria compartilhado e a LLM especificaria para qual tenant está gerando a cobrança. (Risco de injeção de contexto entre tenants concorrentes).
- **Service Account Dedicada com Tenant Vinculado:** O Hermes autentica-se com token `wpk_live_...` exclusivo. O backend deriva o `tenant_id` do próprio token, nunca confiando na LLM para indicar a qual organização pertence a operação.

## Decisão
Adotamos o modelo de **Service Account Exclusiva com Tenant Vinculado e Escopos Mínimos**.
1. O Hermes nunca recebe credenciais financeiras da LofyPay.
2. O Hermes nunca informa `tenant_id` em tool calls. O `tenant_id` é inferido de forma determinística no backend a partir do hash SHA-256 do token da Service Account.
3. O Hermes possui ferramentas estritamente limitadas a recebimento e consulta (`pix_create`, `pix_get`, `pix_list`, `pix_summary`).

## Consequências
- **Positivas:**
  - Impossibilidade de ataque de vazamento cruzado de tenant via prompt injection.
  - O agente não consegue realizar transferências, saques, alteração de contas ou exclusão de dados.
  - Auditoria completa de cada tool call gerada pelo Hermes.
- **Negativas:**
  - Cada tenant que deseja conectar o Hermes precisa criar uma Service Account no painel e cadastrar o token correspondente no bot.
- **Neutras / trade-offs aceitos:**
  - O token do bot deve ser tratado como segredo na configuração do Hermes.
