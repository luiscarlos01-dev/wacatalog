# ADR-0008 — Extração de texto de PDF para importação de catálogo

- **Status:** Aceito
- **Data:** 2026-08-27
- **Escopo:** processamento server-side do arquivo PDF enviado pela
  administradora na feature de importação de catálogo (PRD §4.9)

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
3. Limites de recurso são obrigatórios antes de processar qualquer arquivo:
   tamanho máximo do arquivo (mesma ordem de grandeza do limite de imagem
   já aprovado, 10 MB, salvo ajuste no plano técnico), número máximo de
   páginas processadas, e timeout de processamento. Arquivo ou extração que
   excede qualquer limite é rejeitado com mensagem clara, sem processar
   parcialmente.
4. O arquivo PDF original não é retido após a extração — mesma decisão já
   aprovada para o original de imagem (ADR-0003 regra 3); só os candidatos
   extraídos (efêmeros, não persistidos como entidade própria) chegam à
   revisão da administradora.
5. Os candidatos extraídos não são uma nova entidade do modelo de dados:
   existem só durante a sessão de revisão (estado de UI/servidor
   transitório), nunca como linha própria no banco antes da confirmação.
   Um produto só passa a existir como `products` (`docs/data-model.md`
   §2.4) após confirmação explícita, pelo caminho de criação já aprovado.
6. Toda operação desta feature é autorizada pelo mesmo limite de loja já
   estabelecido (ADR-0002): a administradora só processa e revisa PDFs da
   própria loja, e os candidatos extraídos nunca são comparados nem
   confirmados contra produtos de outra loja.

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

## Regras derivadas para os documentos seguintes

- O plano de implementação desta feature deve definir os valores exatos de
  limite (tamanho do arquivo, páginas, timeout).
- Testes devem cobrir PDF válido, PDF sem texto extraível (escaneado),
  arquivo corrompido, arquivo acima do limite, e um PDF adversarial simples
  (ex.: muitas páginas vazias) para validar o timeout/limite de páginas.
- A revisão de segurança (Semgrep) desta feature deve conferir que nenhum
  caminho de código desta feature usa uma biblioteca de geração de PDF nem
  executa conteúdo ativo do arquivo.

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

## Fontes

- `docs/prd/wacatalog-mvp.md` §4.9 e §10.
- `docs/adrs/0002-isolamento-multi-tenant-e-autorizacao.md` (fronteira de
  loja, reutilizada sem alteração).
- `docs/adrs/0003-storage-e-imagens-do-catalogo.md` (precedente de não reter
  o arquivo original após processamento).
- [PDF.js (Mozilla)](https://mozilla.github.io/pdf.js/)
- [pdfjs-dist no npm](https://www.npmjs.com/package/pdfjs-dist)
- Achado de vulnerabilidade em `jsPDF` (CVE-2025-68428), usado só para
  descartar bibliotecas de geração de PDF desta decisão, não para
  desqualificar `pdfjs-dist` (extração), que não é afetado.
