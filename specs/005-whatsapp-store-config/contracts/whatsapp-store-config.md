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
