# Feature Data Model — Importação de catálogo via PDF

Esta feature não introduz nenhuma tabela nova nem campo novo em
`products`/`assets`. Reusa integralmente o modelo canônico já aprovado.
Introduz um bucket privado do Supabase Storage (`catalog-import-uploads`,
infraestrutura de upload temporário, não uma entidade de domínio) —
detalhado em `plan.md`, "Migration and access order", e na ADR-0008.

## Entidades reusadas, sem alteração

- **`products`** (`docs/data-model.md` §2.4): todo produto confirmado pela
  importação é criado por `createProduct` (`src/lib/products/`), o mesmo
  caminho já usado pela criação manual (feature 002) — mesmos campos,
  defaults, constraints e regra de unicidade de SKU.
- **`assets`** (`docs/data-model.md` §2.3): toda imagem anexada durante a
  revisão é criada por `POST /admin/assets` já existente — mesma
  normalização, mesmas regras de posse por loja.

## Entidade efêmera, não persistida

- **Candidato extraído**: existe só na resposta de
  `POST /admin/catalog-imports` e no estado do cliente durante a revisão
  (nome, SKU, descrição, `isDuplicateSku`). Nunca é gravado como linha de
  banco antes da confirmação; depois de confirmado, deixa de existir como
  conceito — o que passa a existir é um `products` normal. Cancelar ou
  fechar a tela não deixa nenhum rastro no banco (ADR-0008 regra 5).

## Fora do escopo desta feature

- Qualquer persistência de "importação em andamento" ou histórico de
  importações passadas (`research.md` — processamento síncrono, sem job).
- Qualquer mudança em `products`/`assets` além do que a criação manual já
  faz.
