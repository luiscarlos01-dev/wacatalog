# Implementation Plan: Importação de catálogo via PDF

**Branch**: `004-pdf-catalog-import` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-pdf-catalog-import/spec.md`

## Summary

Esta feature entrega a importação assistida de catálogo via PDF: extrair
candidatos a produto de um PDF enviado pela administradora
(`pdfjs-dist`, ADR-0008), sinalizar duplicidade por SKU contra os produtos
já cadastrados, permitir correção manual e exigir imagem por item, e criar
produtos novos só após confirmação explícita. O PDF é enviado direto pelo
navegador a um bucket privado do Supabase Storage
(`catalog-import-uploads`) — nunca no corpo de uma requisição ao servidor
— porque Vercel Functions têm um teto rígido de 4,5 MB de corpo,
inviável para um catálogo real (ADR-0008, revisada em 2026-08-27 após
teste do mantenedor com um catálogo de ~85 MB). Um único endpoint novo é
necessário (`POST /admin/catalog-imports`, recebendo só a referência ao
arquivo já armazenado — extração + detecção de duplicidade); a criação de
cada produto confirmado reusa, sem alteração, `POST /admin/assets` e
`POST /admin/products` já aprovados e implementados (feature 002),
incluindo suas regras de unicidade de SKU e posse de asset já existentes
(`checkAssetOwnership`, `createProduct`).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.2 App Router, React 19.2.8,
`@supabase/supabase-js` 2.112.3, `pdfjs-dist` (nova, ADR-0008 — extração de
texto server-only). Nenhuma outra dependência nova; upload de imagem por
item reusa `sharp` e o fluxo já aprovado da feature 002.

**Storage**: Nenhuma tabela nova. Um bucket novo do Supabase Storage,
privado, `catalog-import-uploads` (upload direto do navegador, `file_size_limit`
de 50 MB, sem leitura pública — ADR-0008), removido pelo servidor após o
processamento. Candidatos extraídos são efêmeros (estado de revisão no
cliente/servidor, nunca persistidos como linha antes da confirmação —
ADR-0008). Produtos confirmados usam `products`/`assets` já existentes,
sem novo campo.

**Testing**: Vitest 4.1.10 para extração (candidatos de um PDF de teste,
casos de PDF sem texto/corrompido/muitas páginas) e detecção de duplicidade
por SKU; Playwright 1.62.1 para os três user stories (preview, corrigir +
confirmar, cancelar), em contextos desktop e mobile.

**Target Platform**: Next.js web application na Vercel, runtime Node
server-only para o processamento do PDF (nunca no browser).

**Project Type**: Full-stack web application (mesma aplicação das
features 001-003).

**Performance Goals**: Processamento de um PDF de catálogo pequeno (até 50
produtos, PRD §9) deve concluir dentro do timeout definido abaixo, sem meta
de throughput independente.

**Constraints**: Arquivo PDF: até 50 MB (teto real do Supabase Storage no
plano Free — mantenedor decidiu assumir esse limite prático em vez de
upgrade agora), até 300 páginas, timeout de processamento de 120 s no
servidor (dentro do limite de 300 s do plano Hobby da Vercel) — rejeição
clara sem processamento parcial se qualquer limite for excedido
(ADR-0008). Upload nunca passa pelo corpo de uma requisição a uma Vercel
Function (teto de 4,5 MB, não configurável) — vai direto do navegador ao
Storage. Nenhum JavaScript nem recurso externo do PDF é executado/buscado.
PDF é removido do Storage após a extração, sucesso ou falha. Toda operação
escopada à loja da administradora autenticada (ADR-0002), sem exceção.

**Scale/Scope**: Validação moderada reusa a loja e os produtos já
cadastrados pelas features 001/002; volume de teste até 50 produtos por
loja (PRD §9).

## Constitution Check

_GATE: PASS — aguardando aprovação do mantenedor na etapa 09 antes de
qualquer execução pelo `implementer`._

- **Contract Before Code**: PASS — endpoint novo definido e gated nesta
  etapa; criação de produto reusa contrato já aprovado sem alteração.
- **Simple and Accessible Experience**: PASS — três user stories
  priorizados; correção/anexo de imagem por item mantém a experiência
  simples (nenhuma tela nova além do necessário), PT-BR, mobile-first.
- **Tenant Isolation and Least Privilege**: PASS — extração, detecção de
  duplicidade e criação são todas escopadas à loja autenticada
  (`getAuthenticatedStore`, RLS); FR-012/SC-006 cobrem isolamento
  cross-tenant.
- **Evidence Before Completion**: PASS — Vitest, Playwright, typecheck,
  lint, build, revisão de segurança (Semgrep, com atenção a bibliotecas de
  PDF por ADR-0008) fazem parte do guia de validação.
- **Simplicity With Traceability**: PASS — nenhuma tabela nova, nenhum
  endpoint de criação duplicado; reusa `createProduct`/
  `checkAssetOwnership` já existentes em vez de reimplementar regra de
  negócio.

## Project Structure

### Documentation (this feature)

```text
specs/004-pdf-catalog-import/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── catalog-import.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── app/(admin)/admin/
│   └── catalog-imports/
│       ├── route.ts                     # POST /admin/catalog-imports
│       └── components/
│           ├── import-upload.tsx        # envio do PDF
│           ├── candidate-review-list.tsx
│           ├── candidate-review-item.tsx # corrigir campos, anexar imagem
│           └── import-summary.tsx        # resultado da confirmação
│
├── features/catalog-import/
│   ├── upload-catalog-pdf.ts             # upload direto ao Storage, client-side
│   └── import-catalog.ts                # orquestra upload + review client-side
│
└── lib/catalog-import/
    ├── extract-pdf-candidates.ts        # pdfjs-dist, busca do Storage, limites de recurso
    └── flag-duplicate-skus.ts           # compara candidatos x products da loja

supabase/
└── migrations/
    └── 202608270000_catalog_import_uploads.sql  # bucket privado + policies

tests/
└── unit/catalog-import/

e2e/
└── catalog-import.spec.ts
```

**Structure Decision**: Mesma aplicação Next.js `src/` das features
001-003. Rota administrativa nova em
`src/app/(admin)/admin/catalog-imports/`, seguindo o mesmo padrão de
`src/lib/<domínio>/` para regra de domínio testável isoladamente da rota.
`upload-catalog-pdf.ts` chama o Supabase client do navegador diretamente
(mesmo padrão de `src/lib/supabase/browser.ts`, feature 001) para o
upload ao Storage — sem passar pelo servidor Next.js, por causa do teto de
4,5 MB da Vercel (ADR-0008). Nenhuma UI de criação de produto é duplicada:
a confirmação de cada item chama, client-side, os mesmos fluxos já
existentes de `src/features/assets/upload-product-image.ts` e
`src/features/products/save-product.ts` (feature 002), reaproveitados sem
alteração.

## Browser validation design

- Rodar os três user stories em Playwright desktop e mobile, reusando a
  loja/administrador já provisionados pelas features 001/002.
- Fixture de PDF de teste (fora do repositório, mesmo padrão de imagem de
  teste da feature 002): um PDF com produtos válidos, um com SKU repetido
  (contra produto já existente) e um corrompido/inválido.
- Cenário de duplicidade: usar um produto já cadastrado na loja de teste
  com um SKU conhecido, incluí-lo no PDF de teste, confirmar que aparece
  sinalizado e não é recriado.
- Cenário de imagem obrigatória: tentar confirmar um item sem imagem
  anexada e confirmar o bloqueio.
- Cenário cross-tenant: usar o PDF/produtos da loja B para confirmar que a
  detecção de duplicidade e a criação nunca cruzam com a loja A.
- Validar WCAG 2.2 AA, navegação por teclado no fluxo de revisão
  (potencialmente vários itens), e preferência de movimento reduzido.
- Cenário de limite: enviar um arquivo acima de 50 MB ao bucket e confirmar
  rejeição clara (via limite do próprio Storage e/ou checagem client-side
  antes de tentar o upload), sem acionar `POST /admin/catalog-imports`.

## Migration and access order

1. `202608270000_catalog_import_uploads.sql`: cria o bucket
   `catalog-import-uploads` (`public = false`, `file_size_limit` 50 MB,
   `allowed_mime_types: ['application/pdf']`) e suas policies de
   `storage.objects`: `INSERT`/`SELECT`/`DELETE` restritos à administradora
   autenticada, escopados ao segmento de loja do path (mesmo padrão de
   `catalog-assets`, feature 002, trocando "leitura pública" por "sem
   leitura pública em nenhuma hipótese").
2. Validar a partir de um banco/Storage local ou não produtivo vazio:
   upload da própria loja permitido, leitura/upload de outra loja negados,
   nenhuma leitura anônima em nenhuma circunstância.

## Complexity Tracking

Nenhuma violação de constituição. Nenhuma tabela nova; o bucket novo é
infraestrutura de upload temporário, não uma entidade de domínio. O único
componente novo de fato é a extração de PDF (ADR-0008), isolada em
`src/lib/catalog-import/` e testável sem depender de nenhuma rota.
