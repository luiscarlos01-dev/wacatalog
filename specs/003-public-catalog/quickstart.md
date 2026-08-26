# Quickstart — Catálogo público

Este guia valida a feature sem dados de produção nem credenciais commitadas.

## Prerequisites

- Node.js `24.19.0` e pnpm `11.22.0`.
- Supabase CLI para validação local de migration e policy.
- Um projeto Supabase local ou não produtivo com as migrations das features
  001/002 já aplicadas (`stores`, `store_memberships`, `assets`,
  `products`).
- A loja e os produtos de teste já provisionados pelas features 001/002
  (administrador A/loja A com ao menos um produto ativo e visível); a
  loja B (feature 001) serve como caso de catálogo vazio.
- Banners de teste inseridos diretamente via fixture/SQL (sem UI
  administrativa, fora do escopo desta feature) para o cenário "hero com
  banners".

Nenhuma credencial de cliente é necessária: o catálogo público não exige
sessão.

## Database foundation checks

```sh
supabase db reset
supabase test db
```

O reset deve aplicar, nesta ordem, as migrations já existentes seguidas da
nova desta feature:

1. `202608220000_stores.sql`
2. `202608220001_store_memberships.sql`
3. `202608240000_assets.sql`
4. `202608240001_products.sql`
5. `202608250000_hero_banners.sql`

Validar RLS a partir de um banco vazio: leitura pública de `hero_banners`
restrita a `is_active = true`; nenhuma escrita pública permitida.

## Application checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # filtros de ativo/visível, ordenação de banners, campos expostos
pnpm build
pnpm test:e2e           # os dois user stories + loja inexistente + catálogo/hero vazios
```

## Manual validation script

1. Acessar `/{storeSlug}` da loja A (com produtos ativos/visíveis
   cadastrados); confirmar que cada produto aparece com nome, SKU (quando
   houver), descrição, imagem e disponibilidade, sem pedir login.
2. Confirmar que nenhum produto não visível, desativado, ou de outra loja
   aparece.
3. Acessar `/{storeSlug}` da loja B, sem produtos publicados; confirmar
   estado de catálogo vazio, sem erro.
4. Inserir um banner ativo de teste via SQL para a loja A; acessar
   novamente e confirmar que ele aparece no topo com a descrição acessível.
5. Acessar um slug inexistente; confirmar mensagem clara de "loja não
   encontrada" em PT-BR, sem detalhe técnico.
6. Repetir os passos 1-3 em viewport mobile; confirmar contraste, foco
   visível e preferência de movimento reduzido.

## Evidence checklist (Stage 11)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`
      limpos.
- [ ] `pnpm test` cobrindo filtros de ativo/visível e ordenação de banners.
- [ ] `pnpm test:e2e` cobrindo os dois user stories, loja inexistente,
      catálogo vazio e hero vazio/com banners.
- [ ] Verificação de acessibilidade (contraste, foco, movimento reduzido)
      no viewport mobile.
- [ ] Nenhuma chamada de rede do catálogo público inclui cabeçalho de
      autenticação nem expõe campo administrativo.
- [ ] Nenhum segredo, credencial ou identificador real de loja/produto em
      fixture, log ou commit.
