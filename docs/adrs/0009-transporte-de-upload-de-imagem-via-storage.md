# ADR-0009 — Transporte de upload de imagem via Storage, não pelo corpo da requisição

- **Status:** Aceito
- **Data:** 2026-08-27
- **Escopo:** transporte do arquivo em `POST /admin/assets` (feature 002,
  já implementada e em produção). Não altera formatos aceitos, limite de
  10 MB, normalização ou o bucket público final — todos de ADR-0003.

## Contexto

Durante a revisão da ADR-0008 (importação de PDF), pesquisa sobre limites
de plataforma confirmou que **Vercel Functions têm um teto rígido de
4,5 MB para corpo de requisição/resposta, não configurável por nenhum
plano ou arquivo de configuração** ([Vercel — Function limitations](https://vercel.com/docs/functions/limitations),
erro `FUNCTION_PAYLOAD_TOO_LARGE`).

`POST /admin/assets` (`src/app/(admin)/admin/assets/route.ts`) recebe o
arquivo via `request.formData()` — um Route Handler comum, portanto uma
Vercel Function sujeita a esse teto. A ADR-0003 promete upload de imagem
até 10 MB. **Qualquer imagem entre 4,5 MB e 10 MB falha hoje em produção**
com `413 FUNCTION_PAYLOAD_TOO_LARGE` do próprio Vercel, antes de chegar ao
código da aplicação — sem o corpo de erro JSON que a aplicação define
(`payload_too_large`), sem log da aplicação, e sem relação com o teto de
10 MB que o código e a mensagem de erro da própria aplicação anunciam.
Fotos de celular — em especial HEIC de iPhones recentes — ultrapassam
4,5 MB com frequência normal, não como caso extremo.

Este achado surgiu durante o trabalho da feature 004
(`specs/004-pdf-catalog-import/`), mas é um bug pré-existente da feature
002, já em produção — tratado aqui como correção própria, não como parte
da 004.

## Decisão

1. O transporte do arquivo de imagem passa a ser o mesmo padrão já
   decidido para PDF (ADR-0008): o navegador envia o arquivo bruto direto
   a um bucket privado novo do Supabase Storage (`asset-uploads`), usando
   a sessão autenticada da administradora — nunca no corpo de uma
   requisição a `POST /admin/assets`.
2. `POST /admin/assets` passa a receber `{ storagePath, kind }` em
   `application/json` (referência ao arquivo já enviado), não mais
   `multipart/form-data` com o arquivo. O servidor busca o arquivo do
   Storage (chamada de saída, sem o teto de entrada da Function) antes de
   validar/normalizar.
3. Validação de formato, limite de 10 MB e normalização via `sharp`
   continuam exatamente como a ADR-0003 já decidiu — só o transporte até o
   servidor muda; a lógica de `createAsset` (`src/lib/assets/`) é adaptada
   para receber o buffer já baixado do Storage, não reescrita.
4. O arquivo bruto é removido de `asset-uploads` depois do processamento,
   sucesso ou falha — mesmo padrão de não retenção já usado para o asset
   final normalizado (ADR-0003) e para o PDF (ADR-0008).
5. `asset-uploads` é um bucket **privado** (nunca `public = true`,
   diferente de `catalog-assets`): `INSERT`/`SELECT`/`DELETE` restritos ao
   caminho da própria loja, sem leitura pública — mesmo padrão de
   `catalog-import-uploads` (ADR-0008).
6. Esta ADR supera, **só para o transporte do arquivo**, a implementação
   atual de `POST /admin/assets`. Todo o resto da ADR-0003 (formatos,
   10 MB, normalização, bucket público final `catalog-assets`, path
   `{storeId}/{kind}/{assetId}.webp`) permanece integralmente válido.

## Consequências

### Positivas

- Corrige um bug ativo em produção sem mudar nenhum comportamento
  aprovado de produto (formatos, limite, qualidade da imagem final).
- Mesmo padrão já validado e documentado para PDF (ADR-0008) — sem decisão
  técnica nova, só aplicação consistente.

### Negativas e riscos

- É uma mudança **breaking** no contrato de `POST /admin/assets`
  (`multipart/form-data` → `application/json` com referência). Como não há
  consumidor externo desse endpoint (só o próprio frontend do Wacatalog,
  sem API pública de terceiros no MVP), é seguro desde que frontend e
  backend sejam corrigidos e implantados juntos.
- Mesmo risco de upload órfão já aceito para `catalog-import-uploads`
  (ADR-0008): sem job de limpeza automática no MVP, custo limitado e
  aceito.
- Enquanto a correção não é implantada, o bug documentado aqui continua
  ativo em produção — a urgência da implementação é do mantenedor decidir
  (fila de trabalho), não desta ADR.

## Regras derivadas para os documentos seguintes

- `docs/api/openapi.yaml` — `POST /admin/assets`: `requestBody` muda de
  `multipart/form-data` para `application/json` com `{ storagePath, kind }`;
  adicionar `404` (referência não encontrada).
- O plano de implementação da correção deve criar a migration do bucket
  `asset-uploads` e adaptar `src/features/assets/upload-product-image.ts`
  e os dois consumidores existentes (`product-form.tsx` da feature 002,
  formulário de banner quando existir) para o novo fluxo de duas etapas.
- Testes devem incluir pelo menos uma imagem de teste entre 4,5 MB e
  10 MB, para provar que o cenário que motivou esta ADR está corrigido —
  esse tamanho específico não era coberto pelos testes da feature 002.

## Alternativas consideradas

- **Manter o transporte atual, só documentar o risco**: rejeitado — é um
  bug ativo, não um risco aceito; a ADR-0003 já promete 10 MB como
  comportamento aprovado do produto.
- **Reduzir o limite anunciado para 4,5 MB, sem mudar transporte**:
  rejeitado — pioraria a experiência da revendedora sem necessidade,
  quando a correção real (upload direto ao Storage) resolve sem abrir mão
  do limite já aprovado.
- **Bucket compartilhado único para upload bruto de imagem e PDF**:
  avaliado; rejeitado por ora para não reabrir o desenho já aprovado de
  `catalog-import-uploads` (ADR-0008) numa correção que deveria ficar
  isolada ao bug de imagem. Pode ser revisitado como limpeza futura.

## Fontes

- `docs/adrs/0003-storage-e-imagens-do-catalogo.md` (regras preservadas,
  exceto transporte).
- `docs/adrs/0008-extracao-de-pdf-para-importacao-de-catalogo.md`
  (revisão de 2026-08-27, mesmo achado de plataforma, mesmo padrão de
  correção).
- [Vercel — Functions Limitations](https://vercel.com/docs/functions/limitations)
  (teto de 4,5 MB, não configurável).
- [Vercel — How to bypass the 4.5MB body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).
- `src/app/(admin)/admin/assets/route.ts` (implementação atual, confirmando
  o transporte via `request.formData()`).
