# Delta: pré-visualização de imagem no admin de produtos

**Status**: Aprovado pelo mantenedor em 2026-08-26 (contrato pequeno,
Spec Kit completo não é necessário — sem entidade nova, sem endpoint novo).

**Origem**: pedido do mantenedor durante teste manual do admin de produtos
(feature 002-product-management), relayado via wacatolog-7c, com dois
pedidos relacionados.

## Problema

- **Pedido 1**: o card de produto na listagem admin
  (`src/app/(admin)/admin/products/components/product-list.tsx`) não mostra
  nenhuma imagem — só nome, SKU, quantidade e toggles.
- **Pedido 2**: o formulário de criar/editar
  (`product-form.tsx:236-266`) só mostra uma prévia isolada da imagem
  recém-enviada nesta sessão (`asset.publicUrl` do `POST /admin/assets`).
  No modo editar sem trocar a imagem, não mostra nada da imagem atual, só o
  texto "a imagem atual será mantida". O pedido original era ver como o
  produto vai ficar de fato no card do catálogo público antes de confirmar.

## Achado que muda o enquadramento inicial

O pedido chegou como "sem alteração de contrato de API/dados esperada", mas
isso é impreciso: `AdminProduct` (`docs/api/openapi.yaml`,
`src/lib/products/product-row.ts`) só tem `imageAssetId` (UUID), nunca uma
URL resolvida. `PublicProduct` tem `imageUrl`; `AdminProduct` não. Sem uma
URL, não dá pra montar `<img src>` nem pra pré-visualizar a imagem de um
produto já existente (só a que acabou de ser enviada nesta sessão, via
`Asset.publicUrl`, continua funcionando sem mudança).

## Contrato (delta aditivo, sem breaking change)

`docs/api/openapi.yaml` — `AdminProduct` ganha `imageUrl` (obrigatório,
`format: uri`), resolvido a partir de `image_asset_id` via join com
`assets` (mesmo padrão que `list_public_products` já usa no catálogo
público, mas aqui é join direto — RLS já permite a administradora ler
assets da própria loja, não precisa de função `security definer`). Já
aplicado e lintado (Redocly) nesta sessão, commit a seguir.

Nenhuma migration, nenhuma entidade nova, nenhuma mudança de ADR/PRD/
data-model — só um campo aditivo na resposta já existente.

## Requisitos

1. **Lista de produtos**: cada item mostra uma thumbnail da imagem do
   produto (usando `AdminProduct.imageUrl`), sem precisar clicar em
   "Editar".
2. **Formulário de criar/editar**: mostra uma pré-visualização fiel de como
   o produto vai aparecer no catálogo público (nome, SKU, descrição,
   imagem, estado de disponibilidade), tanto ao criar (imagem recém-
   enviada) quanto ao editar sem trocar a imagem (imagem atual, via
   `imageUrl` do produto carregado).
3. Nenhum dos dois pedidos altera regra de negócio, autorização ou os
   fluxos já aprovados de `specs/002-product-management/spec.md` — é
   puramente apresentação sobre dado que já existe.

## Decisão de reuso de componente

- **Pedido 2** (form): reusar `src/app/(public)/[storeSlug]/components/
  product-card.tsx` inteiro, montando um objeto no shape de `PublicProduct`
  a partir do estado não salvo do formulário + `imageUrl` (atual ou
  recém-enviada). Garante fidelidade visual exata com o catálogo público
  sem duplicar markup, e o componente já é puramente apresentacional (sem
  fetch), seguro pra reusar fora da árvore `(public)`.
- **Pedido 1** (lista): **não** reusar o `ProductCard` inteiro — o layout da
  lista admin (toggles, editar, excluir, badges de estado) não cabe no
  formato de card público. Extrair só o bloco de imagem do `ProductCard`
  (o `<img>` com o tratamento de `alt`/classe) para um componente pequeno
  compartilhado (ex.: `src/components/product-thumbnail.tsx`), usado pelo
  `ProductCard` público e pelo item da lista admin, evitando duplicar o
  tratamento de imagem sem forçar o layout inteiro.

## Fora do escopo

- Qualquer mudança em `PublicProduct`, `docs/data-model.md` ou ADRs.
- Paginação, busca ou qualquer alteração de listagem além da thumbnail.
- Upload/normalização de imagem (já aprovado, inalterado).

## Evidência esperada (proporcional ao tamanho)

- Typecheck, lint, testes unitários (resolução de `imageUrl` em
  `list-products.ts`/`create-product.ts`/`update-product.ts`/
  `set-product-lifecycle.ts` e no `GET` por id), build.
- Verificação visual/E2E: thumbnail aparece na lista sem editar; preview no
  form bate com o `ProductCard` real do catálogo público, em criar e em
  editar sem trocar imagem.
- Revisão do `contract-reviewer` antes de merge, como qualquer mudança de
  contrato aprovado.
