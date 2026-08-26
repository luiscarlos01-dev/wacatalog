# Feature Data Model — Catálogo público

Esta feature reusa o modelo canônico do Wacatalog. Materializa
`hero_banners` (já aprovada, não implementada) e não redefine `stores`,
`products` ou `assets`.

## Entidades em escopo

### `hero_banners` (`docs/data-model.md` §2.5)

Materializada por esta feature (`202608250000_hero_banners.sql`).

| Campo | Regra executável |
| --- | --- |
| `id` | `uuid` primary key, default `gen_random_uuid()`. |
| `store_id` | `uuid` `NOT NULL`, FK para `stores(id)`. |
| `image_asset_id` | `uuid` `NOT NULL`, FK para `assets(id)`, mesma loja do banner (checado na aplicação, mesma abordagem já usada por `products.image_asset_id`). |
| `accessible_description` | `text` `NOT NULL`, `CHECK (btrim(accessible_description) <> '')`. |
| `title` | `text`, opcional. |
| `text` | `text`, opcional. |
| `position` | `integer` `NOT NULL`, `CHECK (position BETWEEN 1 AND 5)`. |
| `is_active` | `boolean` `NOT NULL`, default `false`. |
| `created_at` | `timestamptz` `NOT NULL`, default `now()`. |
| `updated_at` | `timestamptz` `NOT NULL`, default `now()`, mantido por trigger em todo `UPDATE`. |

Constraints adicionais:

- índice único parcial `(store_id, position) WHERE is_active`, garantindo
  posição única entre banners ativos da mesma loja;
- limite de cinco banners ativos por loja aplicado na camada de aplicação
  (checagem antes do `INSERT`/`UPDATE` que ativaria um sexto banner), já
  que um `CHECK` de contagem entre linhas não é nativo do Postgres — mesma
  abordagem prevista para uma futura feature de gestão administrativa de
  banners; esta feature não cria caminho de escrita, só a leitura pública.

RLS: `SELECT` público restrito a `is_active = true` e aos campos do
contrato `PublicBanner` (`docs/api/openapi.yaml`); nenhuma policy de
escrita é adicionada por esta feature (fica para a futura feature
administrativa).

## Relações

- `hero_banners.store_id → stores.id`.
- `hero_banners.image_asset_id → assets.id` (mesma loja).

## Consulta pública (`GET /stores/{storeSlug}/catalog`)

Reusa as regras já aprovadas em `docs/data-model.md` §4: resolve `stores`
pelo `slug`, retorna produtos com `is_active = true` e `is_visible = true`,
banners com `is_active = true` ordenados por `position`, e nenhum dado de
associação, credencial ou administração.

## Fora do escopo desta feature

- Qualquer caminho de escrita para `hero_banners` (CRUD administrativo,
  `/admin/banners*`).
- Carrinho, seleção de quantidade e envio via WhatsApp.
