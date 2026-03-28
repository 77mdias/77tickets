# Checkout Observability Runbook (UX-002)

Data: 2026-03-28

## Objetivo
Fornecer acompanhamento mínimo de operação para o fluxo `POST /api/orders` sem dependência de stack externa obrigatória nesta fase.

## Eventos estruturados

### API (`checkout.create_order`)
- Origem: `src/server/api/create-order.handler.ts`
- Campos:
  - `event`
  - `outcome` (`success` | `failure`)
  - `status`
  - `errorCode` (`validation` | `authorization` | `conflict` | `internal` | `null`)
  - `latencyMs`
  - `actorRole`
  - `eventId`
  - `itemsCount`
  - `couponApplied`
  - `timestamp`

### Use-case (`checkout.create_order.use_case`)
- Origem: `src/server/application/use-cases/create-order.use-case.ts`
- Campos:
  - `event`
  - `outcome`
  - `errorCode`
  - `errorReason`
  - `eventId`
  - `itemsCount`
  - `couponApplied`

## Dados sensíveis (proibidos)
- Não registrar:
  - `customerId`
  - payload bruto de request
  - tokens, cookies, headers de autenticação
  - mensagens internas de driver/infra

## Consultas operacionais mínimas

### Taxa de sucesso/falha
1. Filtrar entradas `event="checkout.create_order"`.
2. Agrupar por `outcome` em janela de 5m/15m.
3. Calcular `success_rate = success / (success + failure)`.

### Latência (p95)
1. Filtrar `event="checkout.create_order"` e `status=200`.
2. Calcular percentil 95 de `latencyMs` por janela.

### Categorias de erro
1. Filtrar `event="checkout.create_order"` e `outcome="failure"`.
2. Agrupar por `errorCode`.
3. Em `conflict`, usar `checkout.create_order.use_case.errorReason` para detalhar causa de negócio.

## Sinais de alerta (baseline inicial)
- `success_rate` abaixo de 95% por mais de 15 minutos.
- `p95 latencyMs` acima de 1000ms por mais de 15 minutos.
- crescimento súbito de `errorCode="authorization"` (pode indicar abuso/integração incorreta).
- crescimento contínuo de `errorCode="conflict"` com `errorReason="insufficient_stock"` (risco de catálogo/lotes).
