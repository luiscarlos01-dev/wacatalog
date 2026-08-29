# Hero Banners Contract

Esta feature implementa (não redefine) cinco endpoints já aprovados em
`docs/api/openapi.yaml`, tag `Hero banners`, sem código ainda.

## `GET /admin/banners`

- `200`: `{ items: AdminBanner[] }`, ordenado por `position`; empate
  (dois banners com a mesma posição, caso possível só entre um ativo e
  um inativo ou dois inativos) desempata por `created_at` crescente
  (`research.md`/`data-model.md`).
- `401`/`403`: preservados.

## `POST /admin/banners`

- `requestBody`: `BannerInput` (`imageAssetId`, `accessibleDescription`
  obrigatórios; `title`/`text` opcionais; `position` 1-5 obrigatório;
  `isActive` opcional, default `false`).
- `201`: `AdminBanner` criado.
- `400`/`401`/`403`: preservados.
- `409`: dois significados fixados por esta feature via `code` no corpo
  `Error` — `banner_limit_reached` (loja já tem 5 banners) ou
  `position_conflict` (posição já ocupada por outro banner **ativo** da
  mesma loja). Só se aplica quando o banner está sendo criado como
  ativo, ou quando `count >= 5` independentemente do estado ativo.
- `422`: `ValidationError` quando `accessibleDescription` vazio ou
  `position` fora de 1-5.

## `PATCH /admin/banners/{bannerId}`

- `requestBody`: `BannerUpdate` (= `BannerInput`) — substituição completa
  dos campos editáveis, mesmo padrão já usado em
  `PATCH /admin/store` (feature 005).
- `200`: `AdminBanner` atualizado.
- `400`/`401`/`403`/`404`: preservados.
- `409`: `code: position_conflict` — o banner está sendo salvo como
  ativo (porque mudou `position` e/ou porque `isActive` virou `true`)
  numa posição já ocupada por outro banner ativo da mesma loja.
- `422`: `ValidationError`, mesmas regras de `POST`.

## `DELETE /admin/banners/{bannerId}`

- `204`: banner removido permanentemente. Sem renumeração automática dos
  banners restantes (`spec.md` Assumptions).
- `401`/`403`/`404`: preservados.

## `PUT /admin/banners/order`

- `requestBody`: `{ bannerIds: uuid[] }` (1-5 itens, únicos) — precisa
  ser exatamente o conjunto atual de banners da própria loja, em
  qualquer ordem; `bannerIds[i]` recebe `position = i + 1`.
- `200`: `{ items: AdminBanner[] }` com as posições atualizadas.
- `400`: lista não corresponde ao conjunto atual (faltando, duplicado)
  — rejeitada por inteiro, nada aplicado.
- `401`/`403`: preservados.
- `404`: algum id não pertence à própria loja.
- `409`: reservado para uma condição de corrida real (dois pedidos de
  reorder concorrentes na mesma loja) — não deve ocorrer numa operação
  isolada bem formada; ver `research.md` sobre a implementação em duas
  fases que evita o `409` esperado de uma troca de posição entre dois
  banners ativos.

## Regras de negócio aplicadas (PRD §4.4, `docs/data-model.md` §2.5)

1. No máximo 5 banners por loja (aplicação, `research.md`).
2. Posição não se repete entre banners **ativos** da mesma loja (banco,
   índice único parcial já materializado).
3. `imageAssetId` precisa pertencer à própria loja (aplicação, mesmo
   padrão de produtos).
4. Nenhuma operação aceita `storeId` do cliente como prova suficiente —
   sempre resolvida via `getAuthenticatedStore` (ADR-0002).
5. Excluir exige confirmação explícita no cliente antes de chamar
   `DELETE` (mesmo padrão de produtos, PRD §4.2).

## Pré-requisito de infraestrutura (não é mudança de contrato HTTP)

Nenhum dos `200`/`201`/`204` acima é alcançável contra o banco real sem a
migration de privilégio administrativo em `hero_banners` (`data-model.md`
desta feature, `tasks.md`) — a tabela existe desde a feature 003 sem
nenhum `GRANT` para `authenticated`. Identificado nesta rodada de
planejamento, antes da implementação (ao contrário dos achados A-1/A-2 da
feature 005, que só apareceram na revisão pós-implementação).
