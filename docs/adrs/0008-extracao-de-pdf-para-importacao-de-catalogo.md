# ADR-0008 — Extração de texto de PDF para importação de catálogo

- **Status:** Aceito
- **Data:** 2026-08-27 (revisada em 2026-08-27 antes de qualquer
  implementação chegar a produção — ver "Atualização" abaixo)
- **Escopo:** processamento server-side do arquivo PDF enviado pela
  administradora na feature de importação de catálogo (PRD §4.9)

## Atualização (2026-08-27) — arquitetura de upload corrigida

A versão original desta ADR assumia que o PDF chegaria ao servidor no
corpo de uma requisição comum a um Route Handler (mesmo padrão de
`POST /admin/assets`), com um limite de 10 MB. Teste do mantenedor com um
catálogo real (Boticário, 85,1 MB) expôs que essa premissa está errada:
**Vercel Functions têm um limite rígido e não configurável de 4,5 MB para
corpo de requisição/resposta** ([Vercel — Function limitations](https://vercel.com/docs/functions/limitations),
erro `FUNCTION_PAYLOAD_TOO_LARGE`), independente do plano contratado ou de
qualquer configuração em `next.config.ts`/`vercel.json`. Isso não é
específico de PDF: **o mesmo teto já afeta `POST /admin/assets` em
produção hoje** para qualquer imagem entre 4,5 MB e o limite de 10 MB que
a ADR-0003 promete — tratado como achado separado e urgente, fora do
escopo desta ADR.

Pesquisa adicional (mantenedor confirmou: catálogos reais até ~100 MB,
Vercel no plano Hobby, Supabase no plano Free) mostrou dois limites reais
adicionais:

- Vercel Hobby: até 300 s de duração de função e memória gerenciada pela
  plataforma (mínimo 1 vCPU) — suficiente para processar um arquivo já
  em Storage, mas não muda o teto de 4,5 MB de entrada da requisição.
- **Supabase Storage no plano Free tem um teto global de 50 MB por
  arquivo, em todos os buckets do projeto** — não contornável por código.
  Um catálogo de 85-100 MB excede esse teto mesmo depois de corrigir o
  transporte. O mantenedor decidiu (2026-08-27): assumir 50 MB como limite
  prático real por ora, documentado como limitação conhecida do MVP, a
  revisitar se/quando o Supabase for upgradado — não uma decisão técnica
  desta ADR.

A decisão abaixo já reflete a arquitetura corrigida. As decisões 1
(biblioteca), 2 (extração texto-only) e 4-6 (não execução de conteúdo
ativo, não retenção, fronteira de loja) da versão original permanecem
válidas sem alteração; a decisão 3 (limite de tamanho) e o transporte do
arquivo até o servidor foram reescritos.

## Contexto

A feature de importação de catálogo via PDF (PRD §4.9) precisa extrair
candidatos a produto (nome, SKU, descrição) de um arquivo enviado pela
administradora. É a primeira vez que o Wacatalog processa conteúdo de um
arquivo **não-imagem** enviado por um usuário — diferente de ADR-0003
(imagens, normalizadas por `sharp` para exibição), aqui o objetivo é ler e
interpretar o conteúdo textual de um formato de arquivo mais complexo e com
histórico relevante de vulnerabilidades em bibliotecas de PDF do ecossistema
JavaScript.

## Decisão

1. Extração de texto usa `pdfjs-dist` (a distribuição npm do PDF.js da
   Mozilla, o mesmo motor usado no Firefox), executado server-only. Nenhuma
   biblioteca de **geração** de PDF (ex.: jsPDF) é usada nesta feature — o
   caso de uso é só leitura de um arquivo existente.
2. O processamento roda em modo texto: só `getTextContent()`/equivalente é
   usado para extrair o conteúdo textual das páginas. Nenhum JavaScript
   embutido no PDF é executado; nenhum recurso externo referenciado pelo
   PDF (links, fontes remotas) é buscado.
3. **Transporte do arquivo**: o navegador envia o PDF diretamente para um
   bucket privado do Supabase Storage (`catalog-import-uploads`), usando a
   sessão autenticada da administradora — o arquivo nunca passa pelo corpo
   de uma requisição a uma Vercel Function, contornando o teto de 4,5 MB.
   Só depois o navegador chama `POST /admin/catalog-imports` com uma
   referência pequena ao objeto já armazenado (o caminho no bucket), nunca
   com os bytes do arquivo. O servidor busca o arquivo do Storage (chamada
   de saída, sem o teto de entrada da Function) antes de processar.
4. Limites de recurso são obrigatórios antes de processar qualquer arquivo:
   50 MB de tamanho (teto real do plano Free do Supabase Storage — ver
   "Atualização" acima; revisitar se o plano mudar), 300 páginas, e
   timeout de processamento de 120 s (dentro do limite de 300 s do plano
   Hobby da Vercel, com folga para download do Storage e overhead de
   invocação). Arquivo ou extração que excede qualquer limite é rejeitado
   com mensagem clara, sem processar parcialmente.
5. O arquivo PDF é removido do bucket `catalog-import-uploads` logo após o
   processamento (sucesso ou falha) — mesma decisão já
   aprovada para o original de imagem (ADR-0003 regra 3); só os candidatos
   extraídos (efêmeros, não persistidos como entidade própria) chegam à
   revisão da administradora.
6. Os candidatos extraídos não são uma nova entidade do modelo de dados:
   existem só durante a sessão de revisão (estado de UI/servidor
   transitório), nunca como linha própria no banco antes da confirmação.
   Um produto só passa a existir como `products` (`docs/data-model.md`
   §2.4) após confirmação explícita, pelo caminho de criação já aprovado.
7. Toda operação desta feature é autorizada pelo mesmo limite de loja já
   estabelecido (ADR-0002): a administradora só processa e revisa PDFs da
   própria loja, e os candidatos extraídos nunca são comparados nem
   confirmados contra produtos de outra loja.
8. `catalog-import-uploads` é um bucket **privado** (nunca `public = true`,
   diferente de `catalog-assets`): `INSERT`/`SELECT`/`DELETE` restritos ao
   caminho da própria loja da administradora autenticada, sem nenhuma
   leitura pública — o conteúdo é um catálogo bruto, não um asset
   publicado.

## Consequências

### Positivas

- `pdfjs-dist` é mantido pela Mozilla, é o motor de renderização/extração
  de PDF mais amplamente auditado do ecossistema JavaScript, e evita o
  histórico recente de vulnerabilidades graves em bibliotecas de geração de
  PDF (ex.: CVE-2025-68428 em `jsPDF`, que não se aplica aqui por ser uma
  biblioteca de geração, não de leitura).
- Extração texto-only, sem executar JavaScript nem buscar recursos
  externos, reduz a superfície de ataque de um arquivo malicioso.
- Limites de recurso obrigatórios (tamanho, páginas, timeout) protegem
  contra arquivos desenhados para esgotar CPU/memória.

### Negativas e riscos

- Extração de texto de PDF é inerentemente imprecisa para layouts
  complexos (colunas, tabelas, PDFs escaneados sem camada de texto) — por
  isso o spec já exige pré-visualização e correção manual, nunca aplicação
  direta sem revisão humana.
- PDFs escaneados como imagem (sem camada de texto) não produzem nenhum
  candidato; não há OCR nesta feature (PRD §10 exclui OCR explicitamente).
- `pdfjs-dist` é uma biblioteca grande (motor de renderização completo);
  usar só a parte de extração de texto ainda carrega esse peso na função
  server-side. Aceitável para o volume do MVP (uma importação por vez, por
  loja), a revisitar se o volume crescer.
- Catálogo real acima de 50 MB (ex.: o exemplo de 85,1 MB) é rejeitado
  enquanto o Supabase estiver no plano Free — limitação conhecida e aceita
  pelo mantenedor para o MVP, não um bug; mensagem de erro deve deixar
  claro que é um limite de tamanho, não uma falha de processamento.
- O fluxo em duas etapas (upload direto ao Storage, depois acionar o
  processamento) pode deixar um arquivo órfão no bucket
  `catalog-import-uploads` se a administradora enviar o arquivo e abandonar
  a tela antes de disparar `POST /admin/catalog-imports`. O MVP não inclui
  um job de limpeza automática — custo de armazenamento órfão é pequeno e
  limitado (um arquivo de até 50 MB por tentativa abandonada); revisitar
  com um mecanismo de expiração se o padrão de uso mostrar necessidade.

## Regras derivadas para os documentos seguintes

- O plano de implementação desta feature deve criar o bucket
  `catalog-import-uploads` (privado, `file_size_limit` de 50 MB) e suas
  policies de `INSERT`/`SELECT`/`DELETE` escopadas à própria loja, seguindo
  o mesmo padrão de `catalog-assets` (feature 002) trocando "público" por
  "privado, sem leitura pública".
- Testes devem cobrir PDF válido, PDF sem texto extraível (escaneado),
  arquivo corrompido, arquivo acima do limite de 50 MB, e um PDF
  adversarial simples (ex.: muitas páginas vazias) para validar o
  timeout/limite de páginas.
- A revisão de segurança (Semgrep) desta feature deve conferir que nenhum
  caminho de código desta feature usa uma biblioteca de geração de PDF,
  executa conteúdo ativo do arquivo, ou envia o arquivo pelo corpo de uma
  requisição a uma Vercel Function.

## Alternativas consideradas

- **`pdf-parse`**: avaliado; internamente também se apoia em pdf.js na
  maioria das versões populares, mas é uma camada de terceiros mais fina e
  com histórico de manutenção menos previsível que depender diretamente de
  `pdfjs-dist`. Rejeitado por preferir a dependência mais direta e
  autoritativa.
- **Serviço externo de extração/OCR (ex.: API de terceiros)**: rejeitado
  para o MVP — adiciona dependência de rede, custo e mais uma fronteira de
  dado saindo da infraestrutura própria, sem necessidade comprovada dado o
  volume esperado (uma loja, catálogos pequenos).
- **OCR para PDFs escaneados**: rejeitado, já excluído explicitamente pelo
  PRD §10 (fora do MVP).
- **Enviar o PDF no corpo de `POST /admin/catalog-imports` (desenho
  original desta ADR)**: rejeitado — inviável acima de 4,5 MB por limite
  rígido da plataforma Vercel, não configurável. Teria funcionado só em
  ambiente local (sem o limite da Vercel), escondendo o problema até a
  produção.
- **Upgrade do Supabase para o plano Pro agora, para suportar o catálogo
  de ~100 MB sem limite prático**: avaliado; rejeitado pelo mantenedor por
  ora — decisão de custo, não técnica; revisitar se o teto de 50 MB se
  mostrar um bloqueio real de uso.

## Fontes

- `docs/prd/wacatalog-mvp.md` §4.9 e §10.
- `docs/adrs/0002-isolamento-multi-tenant-e-autorizacao.md` (fronteira de
  loja, reutilizada sem alteração).
- `docs/adrs/0003-storage-e-imagens-do-catalogo.md` (precedente de não reter
  o arquivo original após processamento; mesmo achado do teto de 4,5 MB da
  Vercel se aplica a `POST /admin/assets`, tratado como achado separado).
- [PDF.js (Mozilla)](https://mozilla.github.io/pdf.js/)
- [pdfjs-dist no npm](https://www.npmjs.com/package/pdfjs-dist)
- [Vercel — Functions Limitations](https://vercel.com/docs/functions/limitations)
  (teto de 4,5 MB de corpo de requisição/resposta, não configurável).
- [Vercel — Configuring Maximum Duration](https://vercel.com/docs/functions/configuring-functions/duration)
  e [Vercel — Hobby Plan](https://vercel.com/docs/plans/hobby.md) (até
  300 s de duração no plano Hobby).
- [Vercel — How to bypass the 4.5MB body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
  (padrão de upload direto ao storage, adaptado aqui para Supabase Storage
  em vez de Vercel Blob).
- [Supabase — Storage upload file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
  (teto global de 50 MB por arquivo no plano Free).
- Confirmação direta do mantenedor (2026-08-27): faixa real de catálogos
  até ~100 MB (exemplo Boticário, 85,1 MB), plano Vercel Hobby, plano
  Supabase Free, decisão de assumir 50 MB como limite prático do MVP.
- Achado de vulnerabilidade em `jsPDF` (CVE-2025-68428), usado só para
  descartar bibliotecas de geração de PDF desta decisão, não para
  desqualificar `pdfjs-dist` (extração), que não é afetado.
