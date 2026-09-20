# Design: LofyPay Configuration and Zero State

## Overview

Ajuste do backend (`apps/api`) e do frontend (`apps/web`) para:
1. Eliminar dados fictícios hardcoded de métricas e histórico.
2. Adicionar uma interface tabulada no painel web com duas abas principais:
   - **Dashboard & PIX:** Métricas reais, calculadora de geração de PIX e tabela de recebimentos reais.
   - **Configurações LofyPay:** Formulário de credenciais, seleção de ambiente, cópia do endpoint de Webhook do PIXPAY e teste de conectividade.
3. Endpoints REST dedicados em `apps/api`:
   - `GET /api/v1/payment-accounts`: Retorna os dados da conta LofyPay configurada (máscara de segurança na Secret Key).
   - `POST /api/v1/payment-accounts`: Atualiza ambiente, Client ID e Secret Key.
   - `POST /api/v1/payment-accounts/test`: Simula/executa handshake de autenticação.
