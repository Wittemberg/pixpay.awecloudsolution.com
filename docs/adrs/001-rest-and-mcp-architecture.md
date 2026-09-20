---
adr_number: "001"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 001: REST como Contrato Principal e MCP como Interface para Agentes de IA

## Contexto
O PIXPAY atende a dois tipos distintos de clientes de integração:
1. Aplicações humanas tradicionais (Frontend Web Next.js, integrações futuras com ERP/PDV).
2. Agentes autônomos de Inteligência Artificial (Hermes Agent via WhatsApp).

Necessitamos definir como essas duas interfaces se comunicam com o núcleo da aplicação sem duplicar regras de negócio nem criar acoplamentos perigosos.

## Alternativas Consideradas
- **Apenas REST API para tudo (Hermes faz HTTP direto):** Exigiria que a LLM fizesse requisições HTTP arbitrárias, tratasse headers e montasse payloads REST manuais, aumentando o risco de falhas de formatação e parsing.
- **Apenas GraphQL:** Adiciona overhead de schema e tooling sem benefício claro para os fluxos transacionais simples de PIX.
- **REST para a Aplicação + Servidor MCP Dedicado:** O backend expõe uma REST API robusta; um servidor MCP separado traduz o protocolo Model Context Protocol (JSON-RPC) em chamadas à API interna, expondo ferramentas tipadas e estritas para a LLM.

## Decisão
Adotamos a **arquitetura híbrida REST + MCP**. A REST API (`apps/api`) é a única fonte de verdade e autoridade de negócio. O servidor MCP (`apps/mcp`) atua como uma fachada de ferramentas para o Hermes Agent, utilizando o MCP SDK oficial sobre transporte HTTP/SSE.

## Consequências
- **Positivas:**
  - O Hermes Agent consome ferramentas declarativas (`pix_create`, `pix_get`), sem necessidade de lidar com rotas HTTP complexas.
  - As regras de negócio, autorização e validação permanecem centralizadas na API REST.
  - Segurança aprimorada: o servidor MCP expõe apenas um subconjunto restrito de ações seguras.
- **Negativas:**
  - Existe um componente adicional (`apps/mcp`) para versionar e implantar.
- **Neutras / trade-offs aceitos:**
  - O servidor MCP comunica-se com a API REST internamente através da rede privada do cluster Docker.
