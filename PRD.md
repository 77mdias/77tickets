# 📄 PRD — TicketFlow (Demo → Produção)

## 1. Visão Geral

**Nome:** TicketFlow
**Tipo:** Web App (Demo funcional evolutiva)
**Objetivo:** Plataforma de venda e gerenciamento de ingressos para eventos, com arquitetura preparada para escalar para produção real.

---

## 2. Problema

Hoje existem dois extremos:

* soluções simples → não escalam / arquitetura ruim
* soluções completas → caras / complexas para começar

Você quer:

* um projeto **real de portfólio**
* com **fluxo completo funcional**
* com **arquitetura pronta para produção**
* sem custo inicial relevante

---

## 3. Objetivo do Produto

### Objetivo principal

Criar uma plataforma onde:

* usuários compram ingressos
* organizadores criam eventos
* tickets são gerados e validados

### Objetivo técnico

* validar arquitetura full-stack
* permitir futura migração para:

  * Next.js (estável)
  * NestJS (backend separado)

---

## 4. Escopo da DEMO (MVP)

## 🎯 Core (obrigatório)

### Público

* listagem de eventos
* página de evento
* seleção de ingressos
* checkout simulado
* “meus ingressos”

### Admin

* criar evento
* criar lotes
* visualizar pedidos
* check-in de tickets

### Sistema

* autenticação
* geração de ticket
* QR/token
* status de pedido

---

## ❌ Fora do escopo (agora)

* pagamento real
* split financeiro
* antifraude
* app mobile
* multi-organização complexa

---

## 5. Personas

### 👤 Comprador

* quer comprar rápido
* quer ver ticket fácil
* quer entrar sem problema

### 🧑‍💼 Organizador

* quer vender ingressos
* quer controlar lotes
* quer ver vendas

### 🎫 Checker

* quer validar ticket rápido
* não pode errar duplicidade

---

## 6. Fluxos principais

## 🧾 Compra

1. acessar evento
2. escolher lote
3. login
4. checkout
5. pedido criado
6. tickets gerados

---

## 🛠 Admin

1. criar evento
2. criar lotes
3. publicar
4. acompanhar vendas

---

## 🎟 Check-in

1. ler QR
2. validar ticket
3. marcar como usado

---

## 7. Requisitos Funcionais

### RF-001 Auth

Usuário deve:

* cadastrar
* logar
* manter sessão

---

### RF-002 Eventos

Sistema deve:

* listar eventos
* mostrar detalhes
* filtrar

---

### RF-003 Lotes

Sistema deve:

* mostrar tipos de ingresso
* respeitar estoque
* respeitar data

---

### RF-004 Carrinho

Usuário deve:

* adicionar ingressos
* limitar quantidade

---

### RF-005 Checkout (demo)

Sistema deve:

* criar pedido
* simular pagamento

---

### RF-006 Tickets

Sistema deve:

* gerar ticket por item
* associar ao usuário

---

### RF-007 Meus ingressos

Usuário deve:

* visualizar tickets
* acessar QR/token

---

### RF-008 Admin Eventos

Admin deve:

* criar/editar eventos
* publicar

---

### RF-009 Admin Lotes

Admin deve:

* criar lotes
* definir preço/estoque

---

### RF-010 Pedidos

Admin deve:

* ver pedidos
* ver status

---

### RF-011 Check-in

Sistema deve:

* validar ticket
* impedir duplicidade

---

### RF-012 Cupons (simples)

Admin deve:

* criar cupom
* aplicar desconto

---

## 8. Requisitos Não Funcionais

### RNF-001 Arquitetura escalável

* desacoplada de framework

### RNF-002 Banco compatível produção

* Postgres

### RNF-003 Validação forte

* Zod compartilhado

### RNF-004 Segurança

* auth + roles
* validação server-side

### RNF-005 Deploy contínuo

* Cloudflare Workers

---

## 9. Regras de Negócio

* lote não vende fora do período
* lote não ultrapassa estoque
* pedido pode expirar
* ticket usado não pode ser reutilizado
* cupom tem limite e validade
* organizer só vê seus eventos

---

## 10. Modelo de Dados (resumo)

* users
* events
* ticket_types
* ticket_lots
* orders
* order_items
* tickets
* coupons

---

## 11. Arquitetura Técnica

## Agora (Demo)

```
Vinext (frontend + server)
   ↓
Use Cases
   ↓
Repositories
   ↓
Neon (Postgres)
```

---

## Futuro (Produção)

```
Next.js (frontend)
   ↓
NestJS API
   ↓
Use Cases (mesmos)
   ↓
Repositories (mesmos contratos)
   ↓
Postgres (Neon)
```

---

## 12. Stack Técnica

### Front

* Vinext
* React
* Tailwind
* shadcn/ui

### Backend (dentro do vinext)

* route handlers / server functions

### Banco

* Neon (Postgres)

### ORM

* Drizzle

### Auth

* Better Auth / Auth.js / Clerk

### Validação

* Zod

---
