# Implementation Plan: Gestão de produtos

**Branch**: `002-product-management` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-product-management/spec.md`

## Summary

Esta feature entrega o CRUD administrativo de produtos (visualizar, criar,
editar, controlar visibilidade/disponibilidade, desativar, reativar, excluir
definitivamente) sobre o contrato de entidade e HTTP já aprovados
(`docs/data-model.md` §2.4, `docs/api/openapi.yaml` tag Products). Como
`imageAssetId` é obrigatório para criar/editar produto e nenhum código de
upload/normalização de imagem existe ainda no repositório, esta feature
também implementa `POST /admin/assets` (tabela `assets`, bucket do Supabase
Storage e normalização com `sharp`), reusando o contrato já aprovado em
`docs/api/openapi.yaml` e a decisão já registrada em ADR-0003, sem redesenhar
nenhum dos dois. Preço permanece fora do MVP em toda a superfície.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.2 App Router, React 19.2.8,
`@supabase/supabase-js` 2.112.3, `@supabase/ssr` 0.12.4, Zod 4.4.3,
Tailwind CSS 4.3.3, `sharp` 0.35.3 (normalização de imagem, já instalada e
ainda não usada por nenhuma feature).

**Storage**: Supabase Postgres para `products` e `assets` (RLS por loja) e
Supabase Storage para o objeto binário normalizado de cada asset. Nenhuma das
duas tabelas nem o bucket existem ainda; esta feature materializa as duas em
ordem (`assets` antes de `products`, pela FK `products.image_asset_id`).

**Testing**: Vitest 4.1.10 para regras de domínio (unicidade de SKU, estados
de visibilidade/disponibilidade/atividade, validação de upload); Playwright
1.62.1 para os cinco user stories administrativos e para isolamento
cross-tenant, em contextos desktop e mobile.

**Target Platform**: Next.js web application na Vercel, runtime Node para
fronteiras server-side, navegadores desktop e mobile.

**Project Type**: Full-stack web application (mesma aplicação da feature 001).

**Performance Goals**: Sem meta de throughput independente; a validação
moderada usa o volume alvo do PRD (§9), até 50 produtos por loja.

**Constraints**: Autorização sempre server-side e reforçada por RLS (ADR-0002);
nenhum cliente `service_role` em código que atende requisição de admin; preço
nunca armazenado, exibido ou solicitado (PRD regra 9); upload valida MIME e
conteúdo real do arquivo, não a extensão (ADR-0003, `docs/patterns/
supabase-storage.md`); caminho do objeto no Storage é gerado pelo sistema, não
usa o nome enviado pela revendedora; texto visível em PT-BR simples, navegação
por teclado, foco visível, WCAG 2.2 AA (4.5:1 texto normal, 3:1 texto
grande/foco), preferência de movimento reduzido.

**Scale/Scope**: Validação moderada com a primeira loja e administradora já
associadas pela feature 001; isolamento cross-tenant reusa as identidades não
produtivas já provisionadas para os testes E2E da feature 001 (administradora
A/B de lojas distintas). Catálogo público (consumo das leituras) permanece
fora do escopo desta feature.

## Constitution Check

_GATE: PASS — aguardando aprovação do mantenedor na etapa 09 antes de
qualquer execução pelo `implementer`._

- **Contract Before Code**: PASS — entidade e contrato HTTP já aprovados;
  nenhuma mudança de contrato é necessária, só implementação.
- **Simple and Accessible Experience**: PASS — cinco jornadas priorizadas e
  independentemente testáveis, PT-BR simples, sem tela nova além do
  necessário (edição reusa o mesmo formulário de criação, sem rota própria).
- **Tenant Isolation and Least Privilege**: PASS — toda operação de produto e
  asset é escopada por loja via autorização server-side existente
  (`getAuthenticatedStore`) e RLS; FR-009/SC-006 cobrem a negação
  cross-tenant.
- **Evidence Before Completion**: PASS — Vitest, Playwright, typecheck, lint,
  build e revisão de segurança fazem parte do guia de validação.
- **Simplicity With Traceability**: PASS — nenhuma abstração nova (sem ORM,
  sem state library); incluir `assets` nesta feature é rastreável a uma
  dependência obrigatória de dado (FK `NOT NULL`), não a expansão de escopo
  não solicitada.

## Project Structure

### Documentation (this feature)

```text
specs/002-product-management/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── products.md
│   └── assets.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── app/(admin)/admin/
│   ├── page.tsx                           # dashboard existente (feature 001);
│   │                                       # passa a renderizar a lista de produtos
│   │                                       # aqui, não em products/page.tsx — o App
│   │                                       # Router não permite page.tsx e route.ts
│   │                                       # no mesmo segmento (achado L-1 do
│   │                                       # contract-reviewer na revisão da 002)
│   ├── products/
│   │   ├── route.ts                       # GET, POST /admin/products
│   │   ├── [productId]/route.ts           # GET, PATCH, DELETE /admin/products/{id}
│   │   ├── [productId]/deactivate/route.ts
│   │   ├── [productId]/reactivate/route.ts
│   │   └── components/
│   │       ├── product-list.tsx
│   │       ├── product-form.tsx           # criar e editar (mesmo formulário)
│   │       └── delete-product-dialog.tsx  # texto/ações exatos do PRD §6
│   └── assets/
│       └── route.ts                       # POST /admin/assets
│
├── features/products/
│   ├── list-products.ts
│   ├── save-product.ts                    # criar/editar client-side
│   ├── delete-product.ts
│   └── set-product-lifecycle.ts           # desativar/reativar client-side
├── features/assets/
│   └── upload-product-image.ts
│
├── lib/products/
│   ├── list-products.ts
│   ├── create-product.ts
│   ├── update-product.ts
│   ├── delete-product.ts
│   └── set-product-lifecycle.ts
├── lib/assets/
│   ├── create-asset.ts                    # valida, normaliza (sharp), grava no Storage
│   └── delete-asset-if-orphaned.ts
└── types/

supabase/
├── migrations/
│   ├── 202608240000_assets.sql
│   └── 202608240001_products.sql
└── tests/

e2e/
├── product-management.spec.ts
└── product-management.a11y.spec.ts

tests/
├── security/
└── unit/
```

**Structure Decision**: Mesma aplicação Next.js `src/` da feature 001. Rotas
administrativas de produto ficam em `src/app/(admin)/admin/products/`,
espelhando 1:1 os paths já aprovados em `docs/api/openapi.yaml`; edição reusa
o formulário de criação (mesmo componente, sem rota `/edit` dedicada) para
manter a experiência com poucas decisões. A UI de listagem/produto renderiza
no `admin/page.tsx` já existente (dashboard da feature 001), não em
`products/page.tsx`: o App Router do Next.js não permite `page.tsx` e
`route.ts` no mesmo segmento, e `products/` precisa do `route.ts` para o
contrato HTTP. Esta versão corrige a árvore original do plan (que listava um
`products/page.tsx` inexistente), achado L-1 do `contract-reviewer` durante a
implementação — não muda comportamento nem contrato, só a localização real da
UI. `POST /admin/assets` fica em
`src/app/(admin)/admin/assets/`. `src/lib/products/` e `src/lib/assets/`
concentram acesso a dado e regra de domínio; `src/features/products/` e
`src/features/assets/` concentram chamadas client-side às rotas acima,
espelhando a divisão já usada por `src/lib/store/` e
`src/features/store-access/` na feature 001. Nenhuma segunda aplicação é
introduzida.

## Browser validation design

- Rodar os cinco user stories e o isolamento cross-tenant em projetos
  Playwright desktop e mobile, reusando as identidades administrador A
  (loja A) e administrador B (loja B) já provisionadas para a feature 001.
- Cenário de exclusão definitiva deve capturar o texto exato do aviso (PRD
  §6) e as duas ações (`Cancelar`, `Excluir definitivamente`), cobrindo
  cancelar (produto preservado) e confirmar (produto removido) como
  cenários distintos.
- Cenário de upload deve cobrir: JPEG/PNG/WebP aceitos, HEIC/HEIF aceitos e
  normalizados, arquivo acima de 10 MB rejeitado, formato não suportado
  rejeitado, e falha de upload não deixando o produto com referência de
  imagem inválida.
- Validar WCAG 2.2 AA (4.5:1 texto normal, 3:1 texto grande/foco), navegação
  por teclado no formulário e no diálogo de exclusão, e preferência de
  movimento reduzido no diálogo de confirmação.
- Tentativa cross-tenant: administrador A tenta acessar, editar, desativar,
  reativar ou excluir um `productId` da loja B diretamente pela URL/rota；
  esperar negação sem revelar dados do produto de outra loja.

## Migration and access order

1. `202608240000_assets.sql`: tabela `assets` (campos e regras de
   `docs/data-model.md` §2.3), grants mínimos e RLS restrita à loja
   proprietária; bucket do Supabase Storage criado com leitura pública
   (ADR-0003 regra 5) e escrita restrita a operação autorizada da loja.
2. `202608240001_products.sql`: tabela `products` (campos, defaults e
   constraints de `docs/data-model.md` §2.4, incluindo índice único parcial
   `store_id`+`sku`), grants mínimos e RLS restrita à loja proprietária. Só
   depois de `assets` existir, por causa da FK `image_asset_id`.
3. Validar as duas migrations e a matriz de policies a partir de um banco
   Supabase local ou não produtivo vazio, com as duas tabelas presentes.

Os campos executáveis seguem os tipos lógicos já aprovados:
`uuid` com `gen_random_uuid()` para identificadores, `text` para campos
textuais, `integer` com `CHECK (quantity_available >= 0)`, `boolean` com os
defaults de `docs/data-model.md` §2.4, e `timestamptz` com `now()` mantido por
trigger em `updated_at`, mesmo padrão já usado por `stores`/
`store_memberships` na feature 001.

## Complexity Tracking

Nenhuma violação de constituição. Incluir `assets` nesta feature não é
complexidade adicional não justificada: é uma dependência de dado obrigatória
(`image_asset_id` `NOT NULL`) sem a qual nenhum dos cinco user stories é
testável, e reusa contrato e decisão arquitetural já aprovados sem
redesenhá-los.
