---
adr_number: "005"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 005: Exclusão Deliberada de Recursos de Cashout no MVP

## Contexto
Alguns provedores financeiros suportam operações de envio de dinheiro via PIX (cashout, transferências, saques automáticos). Operações de saída exigem controles rigorosos de autorização de dois fatores (2FA), aprovação em múltiplas assinaturas, compliance e salvaguardas financeiras contra invasões ou fraudes.

## Alternativas Consideradas
- **Implementar Cashout Básico:** Disponibilizar endpoints ou ferramentas de transferência já no MVP. (Risco elevado de perda financeira e aumento desproporcional da superfície de ataque).
- **Excluir Cashout do MVP:** Concentrar a proposta de valor exclusivamente em **recebimento** e consulta de cobranças PIX, adiando saques para fases posteriores.

## Decisão
Decidimos **excluir terminantemente recursos de cashout do MVP**. A plataforma atua puramente como facilitadora de recebimento e consulta. O resgate de fundos ou saques deve continuar sendo realizado diretamente pelos sócios dentro do console bancário oficial da LofyPay.

## Consequências
- **Positivas:**
  - Redução drástica da superfície de risco financeiro e regulatório da aplicação inicial.
  - O Hermes Agent e a API não têm como ser explorados para drenar saldo de contas bancárias.
  - Menor tempo de desenvolvimento e entrega mais rápida do valor central do produto.
- **Negativas:**
  - Usuários que desejam transferir saldo para outras contas precisam abrir o painel da LofyPay separadamente.
- **Neutras / trade-offs aceitos:**
  - Uma eventual introdução de cashout no futuro exigirá um ADR específico, auditoria de segurança independente e confirmação forte fora do canal do WhatsApp.
