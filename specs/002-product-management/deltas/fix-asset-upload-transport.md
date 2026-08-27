# Delta: correção do transporte de upload de imagem (bug de produção)

**Status**: Aprovado pelo mantenedor em 2026-08-27 (contrato pequeno,
correção de bug já em produção — não é feature nova, não precisa de Spec
Kit completo).

**Origem**: achado durante o trabalho de planejamento da feature
004-pdf-catalog-import — pesquisa sobre limites de plataforma Vercel
revelou um bug pré-existente na feature 002, já em produção.

## Problema

`POST /admin/assets` (`src/app/(admin)/admin/assets/route.ts`) recebe o
arquivo de imagem no corpo da requisição via `request.formData()`. Vercel
Functions têm um teto rígido e não configurável de 4,5 MB para corpo de
requisição/resposta ([Vercel — Function limitations](https://vercel.com/docs/functions/limitations)).
A ADR-0003 promete upload de imagem até 10 MB — **qualquer imagem entre
4,5 MB e 10 MB falha hoje em produção** com `413 FUNCTION_PAYLOAD_TOO_LARGE`
do Vercel, antes de chegar ao código da aplicação, sem o corpo de erro
JSON que a aplicação define. Fotos de celular (especialmente HEIC de
iPhone) ultrapassam 4,5 MB com frequência normal.

## Contrato (correção de transporte, mesmo padrão da ADR-0008/004)

`docs/api/openapi.yaml` — `POST /admin/assets`: `requestBody` muda de
`multipart/form-data` (`file` binário) para `application/json`
(`{ storagePath, kind }`); adicionado `404` (referência não encontrada).
Documentado em ADR-0009. **Mudança breaking** no contrato existente, mas
segura: nenhum consumidor externo, só o próprio frontend do Wacatalog.

Formatos aceitos, limite de 10 MB, normalização via `sharp` e o bucket
público final (`catalog-assets`) **não mudam** — só o transporte do
arquivo bruto até o servidor.

## Requisitos

1. Novo bucket privado `asset-uploads` (Storage), com policies
   `INSERT`/`SELECT`/`DELETE` escopadas à própria loja, sem leitura
   pública — mesmo padrão de `catalog-import-uploads` (ADR-0008).
2. O navegador sobe a imagem bruta direto pro bucket, usando o Supabase
   client do navegador (mesmo padrão de
   `src/features/catalog-import/upload-catalog-pdf.ts`, feature 004).
3. `POST /admin/assets` passa a receber `{ storagePath, kind }`, busca o
   arquivo do Storage, roda a validação/normalização já existente
   (`createAsset`, `src/lib/assets/`) sem alterar sua lógica interna além
   da origem do buffer, e remove o arquivo bruto do Storage após o
   processamento (sucesso ou falha).
4. `src/features/assets/upload-product-image.ts` (consumido por
   `product-form.tsx`, feature 002) é adaptado pro fluxo de duas etapas,
   sem mudar a experiência visível pra administradora (mesmo formulário,
   mesma mensagem de erro pra formato/tamanho inválido).
5. Teste unitário/E2E com pelo menos uma imagem entre 4,5 MB e 10 MB —
   esse tamanho específico não era coberto pelos testes da feature 002 e é
   exatamente o que confirma a correção do bug.

## Fora do escopo

- Qualquer mudança em formatos aceitos, limite de tamanho, ou qualidade da
  normalização (ADR-0003, inalterada).
- Bucket compartilhado entre upload de imagem e de PDF — mantidos
  separados por ora (ADR-0009, "Alternativas consideradas").
- Job de limpeza automática de upload órfão — mesmo risco aceito já
  registrado para `catalog-import-uploads` (ADR-0008).

## Evidência esperada

- Typecheck, lint, testes unitários (incluindo o caso de 4,5-10 MB),
  build.
- Verificação manual/E2E: upload de imagem de produto e de banner (quando
  aplicável) continua funcionando visualmente igual pra administradora,
  agora sem falhar para imagens nessa faixa de tamanho.
- Validar em deploy de preview real na Vercel, não só localmente — o bug
  original só se manifesta em produção/preview, nunca no servidor de
  desenvolvimento local.
- Revisão do `contract-reviewer` antes de merge, como qualquer mudança de
  contrato aprovado — atenção especial por ser mudança breaking num
  endpoint já em produção.
