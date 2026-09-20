---
adr_number: "006"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 006: Persistência Imutável de Eventos de Pagamento e Trilha de Auditoria

## Contexto
Sistemas financeiros não podem depender exclusivamente do estado atual de uma linha na tabela `payments`. Se o status mudar de `PENDING` para `PAID`, é fundamental saber exatamente quando, por qual canal (webhook, reconciliação, consulta manual) e por qual motivo essa transição ocorreu. Adicionalmente, chamadas administrativas e execuções de ferramentas por IAs exigem rastreabilidade.

## Alternativas Consideradas
- **Apenas Coluna `status` e `updated_at`:** Sobrescrever o estado na tabela `payments`. (Perda irreversível do histórico de transições e impossibilidade de auditoria forense).
- **Event Sourcing Completo com Event Store Dedicada:** Complexidade excessiva para o escopo inicial da aplicação.
- **Histórico Append-Only de `PaymentEvents` e `AuditLogs`:** Manter a tabela `payments` com o estado canônico atual para consultas rápidas, enquanto toda mudança relevante gera um registro imutável em `payment_events` e toda ação de segurança em `audit_logs`.

## Decisão
Adotamos o padrão de **Tabelas de Histórico Append-Only (`payment_events` e `audit_logs`)**:
1. `payments`: Representa o estado agregado atual da cobrança.
2. `payment_events`: Guarda todos os eventos do ciclo de vida (`payment.created`, `payment.paid`, `payment.expired`, `payment.cancelled`, `payment.reconciled`), com payload JSONB imutável.
3. `audit_logs`: Registra quem (`USER`, `SERVICE_ACCOUNT`, `SYSTEM`, `WEBHOOK`), quando e qual recurso foi acessado ou modificado.

## Consequências
- **Positivas:**
  - Auditabilidade completa: capacidade de reconstituir a linha do tempo de qualquer pagamento.
  - Base preparada para reprocessamento de regras e publicação de eventos para outros sistemas (notificações, ERPs).
- **Negativas:**
  - Crescimento contínuo de registros nas tabelas append-only (mitigado por particionamento futuro por mês).
- **Neutras / trade-offs aceitos:**
  - Nunca armazenar chaves de API ou dados sensíveis em payloads de eventos ou auditoria.
