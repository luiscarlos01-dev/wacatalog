# WhatsApp Store Config Contract

Esta feature implementa (não redefine) dois endpoints já aprovados em
`docs/api/openapi.yaml`, tag `Store administration`, sem código ainda.

## `PATCH /admin/store`

- `requestBody`: `UpdateWhatsappRequest` (`{ whatsappNumber }`,
  obrigatório, 10-30 caracteres no formato familiar enviado pela
  administradora).
- `200`: `AdminStore` atualizado (número normalizado, verificação
  resetada para `unverified`).
- `400`/`401`/`403`: preservados.
- `422`: `ValidationError` quando o valor não normaliza para um número
  brasileiro válido (`^55[0-9]{10,11}$` — `research.md`).

## `POST /admin/store/whatsapp/verification`

- Sem corpo de requisição.
- `200`: `AdminStore` com `whatsappVerificationStatus: "verified"` e
  `whatsappVerifiedAt` preenchido.
- `400`/`401`/`403`: preservados.
- `409`: `Conflict` — significado fixado por esta feature: nenhum número
  configurado (`whatsapp_number` nulo). Reconfirmar um número já
  verificado não é conflito (idempotente, `research.md`).

## Regras de negócio aplicadas (PRD §4.6, `docs/data-model.md` §2.1)

1. Alterar o número sempre reseta a verificação, mesmo vindo de
   "verified" para outro número.
2. Teste (`wa.me`) é uma ação client-side, sem endpoint próprio.
3. Nenhuma operação aceita `storeId` do cliente como prova suficiente —
   sempre resolvida via `getAuthenticatedStore` (ADR-0002).

## Consolidação aplicada nesta rodada

Diferente de rodadas anteriores, `500` foi adicionado aos dois endpoints
diretamente no gate desta feature (não registrado como débito) — ambos
ainda não tinham nenhuma implementação, então não há razão para repetir o
padrão de consolidar depois.

## Correção 2026-08-28: privilégio de banco (achado A-1, bloqueante)

Os `200`s de `PATCH /admin/store` e `POST /admin/store/whatsapp/verification`
descritos acima pressupõem que a mutação em `stores` é permitida pelo
banco. Não era: `authenticated` só tinha `SELECT` (feature 001). Uma
migration nova (`tasks.md` T025) precisa conceder `UPDATE` e criar uma
policy de RLS para `UPDATE` escopada por `store_memberships`/`store_admin`
(mesmo padrão de `products`, feature 002) antes que qualquer um dos dois
`200`s seja alcançável de verdade.

## Correção 2026-08-28: privilégio de coluna (achado A-2, bloqueante)

O `grant update on table public.stores` da correção do A-1 (T025) era de
tabela inteira; a policy de RLS só escopa linha, não coluna. Testado com
identidade real: uma administradora conseguia escrever `name`/`slug`
(viola `CLAUDE.md`) e, mais grave, `whatsapp_verification_status`/
`whatsapp_verified_at` diretamente — auto-verificação sem passar pelo
`POST /admin/store/whatsapp/verification` acima, reabrindo o L-1 por outro
caminho (status forjado em vez de número vazado). `supabase/tests/admin-
store-access.sql:537-541` (feature 001) já provava isso: a asserção
"authenticated administrators cannot update stores" começou a falhar assim
que T025 rodou.

Correção (`tasks.md` T028-T030): as duas escritas migram para funções
`security definer` (`update_store_whatsapp_number`,
`confirm_store_whatsapp_verification`) que resolvem a loja só via
`store_memberships`/sessão, nunca por parâmetro do cliente — mesmo padrão
das funções públicas da feature 003. `authenticated` perde todo privilégio
direto de `UPDATE` em `stores` (a migration de T028 revoga o grant e a
policy de T025, sem editar essa migration já aplicada). Os dois endpoints
HTTP acima não mudam de contrato — só a implementação interna.

## Correção 2026-08-28: exposição pública do número (achado L-1)

Fora do par de endpoints acima, mas no mesmo campo: `resolve_public_store`
(feature 003) devolve `whatsapp_number` incondicionalmente. Decisão do
mantenedor: o catálogo público (`GET /stores/{storeSlug}/catalog`,
`PublicCatalog.store.whatsappNumber`) só pode devolver o número quando
`whatsapp_verification_status = 'verified'` — `null` nos demais casos
(FR-010/SC-006 em `spec.md`). Corrigido via `tasks.md` T026, numa migration
nova (nunca editando a `202608250001` já mesclada). O schema OpenAPI não
muda (`whatsappNumber` já era nullable); só a descrição foi ajustada em
`docs/api/openapi.yaml`.
