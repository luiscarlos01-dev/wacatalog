# Research — WhatsApp da loja

**Date**: 2026-08-28

## Decision: algoritmo de normalização reusa o padrão já aprovado (`^55[0-9]{10,11}$`)

1. Remover todo caractere que não seja dígito da entrada.
2. Se o resultado já começa com `55` e tem 12 ou 13 dígitos no total,
   manter como está.
3. Se o resultado tem 10 ou 11 dígitos (DDD + número, sem código do
   país), prefixar com `55`.
4. Validar o resultado final contra `^55[0-9]{10,11}$`. Qualquer entrada
   que não produza um valor válido por essas regras é rejeitada (FR-003).

**Rationale**: Esse exato padrão já é o contrato aprovado e implementado
em `PublicCatalog.store.whatsappNumber` (`docs/api/openapi.yaml`, feature
003) — reusar garante que o valor salvo por esta feature sempre é
consumível pelo catálogo público sem nenhuma conversão adicional. Não há
necessidade de validar uma lista de DDDs válidos: o contrato já aprovado
não exige isso, e adicionar essa checagem seria validação além do que foi
aprovado (YAGNI).

**Alternatives considered**: biblioteca de validação de telefone
internacional (ex.: `libphonenumber-js`) — rejeitada, escopo é só números
brasileiros com um padrão já fixo e simples; a biblioteca resolveria um
problema mais genérico do que o que existe.

## Decision: `409` de `POST /admin/store/whatsapp/verification` significa "nenhum número configurado"

O contrato já aprovado inclui `409 Conflict` para este endpoint sem
detalhar a causa. Esta feature fixa o significado: `409` quando
`whatsapp_number` é `null` no momento da confirmação — não há nada para
confirmar.

**Rationale**: É a única condição de conflito que faz sentido no domínio
(o endpoint não recebe corpo, não há outro estado em disputa). Confirmar
um número já confirmado não é tratado como conflito — é idempotente
(User Story 2, cenário 4), atualizando `whatsapp_verified_at`.

## Decision: link de teste é `wa.me` sem mensagem pré-preenchida, aberto client-side

`https://wa.me/<numeroNormalizado>` é montado e aberto em nova aba pelo
navegador — nenhuma chamada ao servidor além de já ter o número
normalizado disponível na tela (via `GET /admin/store`, já carregado).

**Rationale**: PRD §4.6 só pede que a administradora "teste o número e
confirme que a conta correta foi aberta" — não pede envio de mensagem de
teste. Mensagem pré-preenchida em um teste poderia ser mal interpretada
como um pedido real, se enviada por engano.
