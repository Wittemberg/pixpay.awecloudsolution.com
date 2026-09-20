---
adr_number: "002"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 002: Abstração de Provedor Financeiro (PaymentProvider Interface)

## Contexto
O PIXPAY iniciará suas operações integrado à LofyPay. No entanto, depender diretamente das peculiaridades da API da LofyPay no domínio principal criaria um acoplamento severo. Se a LofyPay alterar contratos, taxas ou apresentar instabilidades, a substituição ou inclusão de outros provedores (Efí, Mercado Pago, Asaas, Inter) seria excessivamente onerosa.

## Alternativas Consideradas
- **Acoplamento Direto:** Implementar as chamadas da LofyPay diretamente nos controllers e services da API. (Risco alto de débito técnico).
- **Abstração por Adapter Pattern (`PaymentProvider`):** Criar uma interface canônica e implementar a LofyPay como um adapter em `packages/providers/lofypay`.
- **SDK Externo Multiprovedor de Terceiros:** Adicionar dependência externa paga ou de terceiros para gerenciar provedores.

## Decisão
Adotamos o **Adapter Pattern via interface `PaymentProvider`** em `packages/payment-core`. Toda a aplicação conversa exclusivamente com tipos canônicos do PIXPAY:
```typescript
export interface PaymentProvider {
  createPayment(account: PaymentAccount, input: CreatePaymentInput): Promise<NormalizedPayment>;
  getPayment(account: PaymentAccount, providerTransactionId: string): Promise<NormalizedPayment>;
  validateCredentials(credentials: ProviderCredentials): Promise<boolean>;
  processWebhook(payload: unknown, headers: Record<string, string>): Promise<NormalizedWebhookResult>;
}
```
A implementação concreta `LofyPayProvider` traduz os payloads específicos da LofyPay para os tipos canônicos do PIXPAY.

## Consequências
- **Positivas:**
  - Desacoplamento total: novos provedores (Efí, Mercado Pago) podem ser adicionados implementando a interface sem alterar controladores ou regras de negócio.
  - Testabilidade: criação facilitada de `MockPaymentProvider` para testes automatizados unitários e de integração.
- **Negativas:**
  - Exige escrita de código de mapeamento (normalização de enums e estruturas de dados).
- **Neutras / trade-offs aceitos:**
  - Estados específicos do provedor (ex.: `PAID_OUT`) devem ser traduzidos para estados canônicos do PIXPAY (`PAID`).
