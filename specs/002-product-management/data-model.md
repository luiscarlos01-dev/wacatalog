# Feature Data Model — Gestão de produtos

Esta feature reusa o modelo canônico do Wacatalog. Não introduz entidade
concorrente nem redefine campo já aprovado.

## Entidades em escopo

### `assets` (`docs/data-model.md` §2.3)

Materializada por esta feature (`202608240000_assets.sql`), antes de
`products` por causa da FK.

| Campo | Regra executável |
| --- | --- |
| `id` | `uuid` primary key, default `gen_random_uuid()`. |
| `store_id` | `uuid` `NOT NULL`, FK para `stores(id)`. |
| `storage_path` | `text` `NOT NULL`, único; formato `{storeId}/{kind}/{id}.webp`, onde `{kind}` vem do parâmetro `kind` já recebido em `POST /admin/assets` (OpenAPI) e é usado só para compor o caminho — não é persistido como coluna própria, para não divergir do conjunto de campos já aprovado em `docs/data-model.md` §2.3. |
| `content_type` | `text` `NOT NULL`, sempre `image/webp` após normalização. |
| `byte_size` | `integer` `NOT NULL`, `CHECK (byte_size > 0)`. |
| `width` | `integer`, opcional. |
| `height` | `integer`, opcional. |
| `created_at` | `timestamptz` `NOT NULL`, default `now()`. |

RLS: `SELECT`/`INSERT`/`DELETE` restritos a `store_id` resolvido pela
associação da administradora autenticada; sem `UPDATE` (substituição de
imagem cria um novo asset e atualiza a referência no produto, nunca
sobrescreve o objeto existente — ver `research.md`, ADR-0003 regra 7).

### `products` (`docs/data-model.md` §2.4)

Materializada por esta feature (`202608240001_products.sql`), depois de
`assets`.

| Campo | Regra executável |
| --- | --- |
| `id` | `uuid` primary key, default `gen_random_uuid()`. |
| `store_id` | `uuid` `NOT NULL`, FK para `stores(id)`. |
| `name` | `text` `NOT NULL`, `CHECK (btrim(name) <> '')`. |
| `sku` | `text`, opcional. |
| `description` | `text` `NOT NULL`. |
| `image_asset_id` | `uuid` `NOT NULL`, FK para `assets(id)`, mesma loja do produto (checado na camada de aplicação antes do insert/update, já que Postgres não valida FK condicional entre colunas de tabelas diferentes). |
| `quantity_available` | `integer` `NOT NULL`, default `0`, `CHECK (quantity_available >= 0)`. |
| `is_visible` | `boolean` `NOT NULL`, default `false`. |
| `is_orderable` | `boolean` `NOT NULL`, default `false`. |
| `is_active` | `boolean` `NOT NULL`, default `true`. |
| `created_at` | `timestamptz` `NOT NULL`, default `now()`. |
| `updated_at` | `timestamptz` `NOT NULL`, default `now()`, mantido por trigger em todo `UPDATE` (mesmo padrão de `stores`). |

Constraints adicionais:

- índice único parcial `(store_id, sku) WHERE sku IS NOT NULL`;
- trigger de reativação: a operação `reactivate` sempre grava
  `is_visible = false, is_orderable = false`, independentemente do estado
  anterior (regra de negócio 7 do PRD) — aplicado na função de mutação, não
  como constraint de banco, para permitir mensagem de erro amigável se
  chamada em produto já ativo.

RLS: `SELECT`/`INSERT`/`UPDATE`/`DELETE` restritos a `store_id` resolvido pela
associação da administradora autenticada. `DELETE` é permanente (sem soft
delete a nível de banco); "desativar" é um `UPDATE` de `is_active`, nunca um
`DELETE`.

## Relações

- `products.image_asset_id → assets.id` (obrigatória, mesma loja).
- `assets.store_id → stores.id` (reuso da tenancy já materializada pela
  feature 001).

## Fora do escopo desta feature

- `hero_banners` (usa `assets` mas é feature própria, ainda não planejada).
- Catálogo público de leitura (consumo de `products`/`assets` pelo cliente
  final).
