# Modelo de dados — Wacatalog MVP

- **Status:** Aceito
- **Data:** 2026-08-22
- **Fonte principal:** [PRD do Wacatalog](prd/wacatalog-mvp.md)
- **Decisões estruturais:** `docs/adrs/0001` a `docs/adrs/0006`

## 1. Princípios do modelo

- O Supabase Postgres é a fonte de verdade.
- A loja é a fronteira de tenancy.
- Todo registro pertencente a uma loja deve carregar `store_id` ou uma relação
  explícita com a loja.
- RLS e constraints do banco reforçam autorização e integridade.
- Assets binários ficam no Supabase Storage; o banco guarda suas referências e
  metadados necessários.
- Carrinho e pedido não são persistidos no MVP.

## 2. Entidades

### 2.1 `stores`

Representa uma loja/catálogo.

| Campo | Tipo lógico | Obrigatório | Regra |
| --- | --- | --- | --- |
| `id` | UUID | sim | Identificador interno da loja |
| `slug` | texto | sim | Único; identificador público estável |
| `name` | texto | sim | Nome público mantido pelo mantenedor |
| `whatsapp_number` | texto | não | Dígitos normalizados no padrão brasileiro internacional |
| `whatsapp_verification_status` | enum | sim | `unverified` ou `verified` |
| `whatsapp_verified_at` | timestamp | não | Preenchido após teste confirmado |
| `created_at` | timestamp | sim | UTC |
| `updated_at` | timestamp | sim | UTC |

Regras:

- `slug` não é credencial nem prova de autorização administrativa.
- O número de WhatsApp pode ser alterado pela administradora.
- Alterar o número volta o status para `unverified` e limpa
  `whatsapp_verified_at`.
- O envio público só fica habilitado quando há número válido e status
  `verified`.
- A identidade visual e o nome da loja são mantidos pelo mantenedor no MVP.

### 2.2 `store_memberships`

Associa usuários autenticados a lojas.

| Campo | Tipo lógico | Obrigatório | Regra |
| --- | --- | --- | --- |
| `id` | UUID | sim | Identificador da associação |
| `store_id` | UUID | sim | FK para `stores` |
| `auth_user_id` | UUID | sim | Referência ao usuário do Supabase Auth |
| `role` | enum | sim | `store_admin` no MVP |
| `created_at` | timestamp | sim | UTC |

Constraints:

- combinação `store_id` + `auth_user_id` única;
- usuário só pode operar lojas associadas;
- não haverá cadastro público de memberships;
- provisionamento é operação do mantenedor em ambiente confiável.

### 2.3 `assets`

Referência de uma imagem normalizada no Supabase Storage.

| Campo | Tipo lógico | Obrigatório | Regra |
| --- | --- | --- | --- |
| `id` | UUID | sim | Identificador do asset |
| `store_id` | UUID | sim | FK para `stores` |
| `storage_path` | texto | sim | Caminho gerado pelo sistema |
| `content_type` | texto | sim | Formato normalizado servido ao navegador |
| `byte_size` | inteiro | sim | Tamanho da versão normalizada |
| `width` | inteiro | não | Dimensão normalizada |
| `height` | inteiro | não | Dimensão normalizada |
| `created_at` | timestamp | sim | UTC |

Regras:

- o caminho não usa diretamente o nome enviado pela revendedora;
- o asset pertence a uma loja e não pode ser anexado a entidade de outra loja;
- a leitura de assets publicados é pública conforme o ADR-0003;
- upload, substituição e remoção exigem associação autorizada;
- o original HEIC/HEIF não precisa ser mantido no MVP.

### 2.4 `products`

Produto mantido no catálogo.

| Campo | Tipo lógico | Obrigatório | Regra |
| --- | --- | --- | --- |
| `id` | UUID | sim | Identificador do produto |
| `store_id` | UUID | sim | FK para `stores` |
| `name` | texto | sim | Não vazio após normalização |
| `sku` | texto | não | Único por loja quando preenchido |
| `description` | texto | sim | Texto descritivo do produto |
| `image_asset_id` | UUID | sim | FK para `assets` da mesma loja |
| `quantity_available` | inteiro | sim | Maior ou igual a zero |
| `is_visible` | booleano | sim | Controla presença no catálogo |
| `is_orderable` | booleano | sim | Controla aceitação para o carrinho |
| `is_active` | booleano | sim | Controla preservação/desativação |
| `created_at` | timestamp | sim | UTC |
| `updated_at` | timestamp | sim | UTC |

Defaults:

- `quantity_available`: `0`;
- `is_visible`: `false`;
- `is_orderable`: `false`;
- `is_active`: `true`.

Constraints e regras:

- índice único parcial em `store_id` + `sku` quando `sku` não for nulo;
- `quantity_available >= 0`;
- `image_asset_id` deve apontar para asset da mesma loja;
- produto público exige `is_active = true` e `is_visible = true`;
- produto adicionável ao carrinho exige `is_active = true`,
  `is_visible = true`, `is_orderable = true` e quantidade maior que zero;
- desativação mantém o registro, mas consultas públicas ignoram o produto;
- reativação não restaura automaticamente estados anteriores; a operação deve
  deixar `is_visible` e `is_orderable` desativados até nova configuração.

### 2.5 `hero_banners`

Banner ordenado do hero da loja.

| Campo | Tipo lógico | Obrigatório | Regra |
| --- | --- | --- | --- |
| `id` | UUID | sim | Identificador do banner |
| `store_id` | UUID | sim | FK para `stores` |
| `image_asset_id` | UUID | sim | FK para `assets` da mesma loja |
| `accessible_description` | texto | sim | Descrição acessível da imagem |
| `title` | texto | não | Texto opcional |
| `text` | texto | não | Texto opcional |
| `position` | inteiro | sim | Inteiro de 1 a 5 |
| `is_active` | booleano | sim | Controla presença no hero |
| `created_at` | timestamp | sim | UTC |
| `updated_at` | timestamp | sim | UTC |

Constraints e regras:

- `position` deve estar entre 1 e 5;
- uma posição não pode se repetir dentro da loja;
- a loja não pode possuir mais de cinco banners;
- banner público exige `is_active = true`;
- CTA, agendamento e link não possuem campos no MVP;
- `image_asset_id` deve apontar para asset da mesma loja.

## 3. Relações

```text
stores 1 ─── N store_memberships N ─── 1 auth.users
stores 1 ─── N products N ─── 1 assets
stores 1 ─── N hero_banners N ─── 1 assets
```

`auth.users` pertence ao Supabase Auth e não será duplicado no schema público.
`store_memberships.auth_user_id` referencia o usuário autenticado para as
políticas de acesso.

## 4. Consultas públicas

O catálogo público recebe um `store.slug` e só pode retornar:

- a loja correspondente;
- produtos com `is_active = true` e `is_visible = true`;
- banners com `is_active = true`, ordenados por `position`;
- campos públicos, sem dados de associação, credenciais ou administração.

O número de WhatsApp só é usado para gerar o link de pedido quando o status é
`verified`.

## 5. RLS e autorização

- `stores`: leitura pública limitada aos campos públicos; alterações somente
  pelo mantenedor conforme o ADR-0002;
- `store_memberships`: leitura restrita à própria associação e operações de
  provisionamento server-only;
- `products` e `hero_banners`: leitura/mutação administrativa somente para
  membership da mesma loja;
- `assets`: upload, substituição e remoção somente para membership da mesma
  loja; leitura pública somente quando o asset estiver associado a conteúdo
  publicado;
- catálogo público não usa sessão administrativa e aplica filtros de
  publicação;
- nenhuma política aceita `store_id` vindo do cliente como prova suficiente;
- operações privilegiadas não são expostas ao browser.

## 6. Integridade e ciclo de vida

- exclusão de loja, se futuramente existir, não faz parte do MVP;
- exclusão de produto deve tratar seu asset sem deixar referência órfã;
- substituição de asset deve preservar a versão anterior até a nova persistir;
- alterações de SKU devem respeitar unicidade dentro da mesma loja;
- criação ou atualização que exceda cinco banners deve falhar sem alteração
  parcial;
- quantidades não são reservadas nem decrementadas pelo carrinho.

## 7. Fora do modelo do MVP

Não serão criadas entidades para:

- preços;
- carrinho persistido;
- pedido ou histórico de pedidos;
- pagamento;
- checkout;
- reserva de estoque;
- OCR ou importação de PDF;
- auditoria detalhada de operações, salvo se uma decisão posterior exigir.

## 8. Derivações novas deste documento

Os seguintes detalhes são especificações derivadas necessárias para o contrato
de dados e ainda não estavam explicitados como campos nas fontes anteriores:

- `stores.slug`, `whatsapp_verification_status` e `whatsapp_verified_at`;
- entidade `store_memberships` com papel `store_admin`;
- entidade `assets` com caminho e metadados normalizados;
- defaults de produto e regras de publicação;
- entidades e posições de `hero_banners`;
- índice parcial de unicidade de SKU;
- rejeição atômica de uma sexta posição de banner.

Este documento está proposto e aguarda aprovação humana antes da elaboração do
OpenAPI.
