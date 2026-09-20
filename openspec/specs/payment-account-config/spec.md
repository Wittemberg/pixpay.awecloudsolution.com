# payment-account-config Specification

## Purpose
Define os requisitos para cadastro, mascaramento, armazenamento seguro e teste de conexão de credenciais financeiras da LofyPay no PIXPAY, além de garantir a apresentação de métricas reais sem dados fictícios.

## Requirements

### Requirement: Payment Account Credential Management
The API SHALL provide endpoints to save and retrieve provider credentials with the secret key masked.

#### Scenario: Retrieving masked payment account
- GIVEN a payment account is configured
- WHEN a GET request is made to `/api/v1/payment-accounts`
- THEN the response SHALL return the provider `LOFYPAY`, environment, status, and the masked secret key (e.g. `sk_...XXXX`)
- AND the raw secret key SHALL NOT be returned

#### Scenario: Saving payment account credentials
- GIVEN valid credential payload
- WHEN a POST request is made to `/api/v1/payment-accounts`
- THEN the API SHALL store the credentials securely and return status HTTP 200 or 201

### Requirement: Payment Account Connection Testing
The API SHALL provide an endpoint to test connection with the payment provider.

#### Scenario: Successful connection test
- GIVEN valid LofyPay credentials
- WHEN a POST request is made to `/api/v1/payment-accounts/test`
- THEN the response SHALL return HTTP 200 with connection status `CONNECTED` or `VALID`

### Requirement: Zero Initial Metrics State
The API summary and payments endpoints SHALL return real empty states (zero amounts and empty list) when no real payments have been created.

#### Scenario: Empty summary query
- GIVEN no real payments have been registered
- WHEN a GET request is made to `/api/v1/payments/summary`
- THEN `todayReceived` SHALL be 0.00 and `todayCount` SHALL be 0
