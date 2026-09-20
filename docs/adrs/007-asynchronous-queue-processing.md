---
adr_number: "007"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 007: Processamento Assíncrono com BullMQ e Redis para Webhooks e Reconciliação

## Contexto
O processamento de webhooks financeiros envolve múltiplas etapas: validação de assinatura, verificação de idempotência, atualização transacional no banco de dados, gravação de eventos e disparo de notificações ao Hermes Agent no WhatsApp. Executar todas essas etapas de forma síncrona dentro da requisição HTTP do webhook traz sérios riscos de timeout, lentidão e perda de mensagens em caso de oscilações na rede externa.

## Alternativas Consideradas
- **Processamento Síncrono no Request HTTP:** Bloquear a resposta até que tudo seja concluído. (Inviável: se a notificação do WhatsApp ou o banco demorar, a LofyPay dá timeout e suspende os envios).
- **Processamento em Background In-Memory (`setImmediate` / `EventEmitter`):** Se o processo da API reiniciar ou cair no Swarm durante o processamento, as tarefas pendentes na memória são perdidas irremediavelmente.
- **Filas com Persistência em Redis via BullMQ:** O endpoint HTTP salva o webhook bruto no PostgreSQL, enfileira o job no BullMQ/Redis e responde imediatamente. Um Worker dedicado processa as filas com retries automáticos e controle de concorrência.

## Decisão
Adotamos **BullMQ sobre Redis** para orquestrar todas as operações assíncronas do PIXPAY:
1. `webhook.process`: Processamento e normalização do webhook da LofyPay.
2. `payment.reconcile`: Varredura periódica de pagamentos pendentes.
3. `notification.hermes`: Envio de confirmações de recebimento para o WhatsApp via Hermes.

Para evitar sobrecarga de memória no host (servidor de 4GB RAM), o container Redis terá limite estrito de `maxmemory 128mb` e política `allkeys-lru`, e o BullMQ removerá jobs concluídos após 24 horas.

## Consequências
- **Positivas:**
  - Resposta ultrarrápida do endpoint de webhook (< 200ms), garantindo confiabilidade com o PSP.
  - Resiliência: falhas no envio de notificações para o WhatsApp não travam a confirmação do pagamento no banco.
  - Retries automáticos com backoff exponencial para lidar com lentidões temporárias.
- **Negativas:**
  - Necessidade de gerenciar e monitorar um serviço adicional (Redis) na stack.
- **Neutras / trade-offs aceitos:**
  - O estado da confirmação de pagamento torna-se eventualmente consistente (com atraso típico de 200 a 800ms entre o recebimento do webhook e a atualização visual no painel).
