# Delta: pré-visualização de imagem no admin de produtos

**Status**: Aprovado pelo mantenedor em 2026-08-26 (contrato pequeno,
Spec Kit completo não é necessário — sem entidade nova, sem endpoint novo).
Mecanismo de resolução de `imageUrl` **confirmado como `join`** em
2026-08-27 após bloqueio do `contract-reviewer` (M-1/M-2) — ver seção
"Decisão de mecanismo" abaixo. Implementer deve reverter a tentativa de
concatenação determinística antes de prosseguir.

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

## Decisão de mecanismo (resolvido em 2026-08-27, após bloqueio M-1/M-2 do contract-reviewer)

O implementer trocou o `join` original por concatenação determinística de
path (`{storeId}/product/{imageAssetId}.webp`, o mesmo padrão de
`list_public_products`), alegando um bug real e reproduzido 2x — `GET`
logo após `PATCH` de troca de imagem podia devolver `imageAssetId`
desatualizado — mas com causa raiz não confirmada.

**Mecanismo obrigatório: `join` com `assets(storage_path)`, como o
contrato original especificava. A concatenação está rejeitada pra este
delta.** Dois motivos, cada um suficiente sozinho:

1. **A tabela `assets` não tem coluna `kind`** — `kind` só existe embutido
   no `storage_path` (string), e `POST /admin/assets` recebe `kind` do
   cliente sem validar contra o uso real do asset. Nada impede um produto
   de referenciar um `image_asset_id` cujo `storage_path` real está sob
   `/banner/`. Hoje isso é um buraco latente sem quebra ativa (6 de 243
   assets estão sob `/banner/`, mas 199/199 produtos atuais referenciam
   assets corretos) — mas o comportamento diverge de forma importante entre
   os dois mecanismos: o `join` lê o `storage_path` real e sempre mostra a
   imagem que de fato existe (na pior hipótese, uma imagem "arquivada" sob
   o prefixo errado, mas visível); a concatenação **assume** o prefixo
   `/product/` e, se o asset real estiver em outro prefixo, gera uma URL
   que não existe — imagem quebrada (404), silenciosa, sem log.
2. **A troca não resolve a causa alegada.** Os dois mecanismos leem o
   mesmíssimo campo `products.image_asset_id`. Se esse campo vem
   desatualizado logo após o `PATCH` (a hipótese do implementer, ainda não
   confirmada), o `join` monta a URL de um asset real só que errado, e a
   concatenação monta uma URL sintética a partir do mesmo ID errado —
   também errada, só que sem nenhum indício de falha. Trocar o mecanismo
   troca uma falha visível (imagem de um asset existente, mas errado) por
   uma falha silenciosa (URL inventada), sem tocar na causa raiz.

**Ação exigida do implementer**: reverter para `join`; investigar e
confirmar a causa raiz real do `GET` pós-`PATCH` retornando
`image_asset_id` desatualizado (se o bug persistir mesmo com `join`, é um
problema de leitura/consistência anterior à resolução da URL — cache,
revalidação do Next.js, ou timing de leitura —, não de como a URL é
montada). Qualquer mudança de mecanismo depois disso volta a ser decisão de
contrato, não de implementação.

**Achado relacionado, fora do escopo deste delta**: `list_public_products`
e `list_public_hero_banners` (feature 003, já mergeada) usam a mesma
concatenação determinística e têm exatamente a mesma fragilidade
(assumem `/product/`ou `/banner/` sem checar `storage_path` real). Não é
uma quebra ativa hoje (mesma amostra: 199/199 produtos corretos), mas é
uma dívida real que merece seu próprio contrato/gate — trocar para `join`
nessas duas funções, ou adicionar validação de `kind` na criação do asset.
Registrar como item de fila, não resolver aqui.

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
