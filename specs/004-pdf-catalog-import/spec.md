# Feature Specification: Importação de catálogo via PDF

**Feature Branch**: `004-pdf-catalog-import`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "Importação de catálogo via PDF (PRD §4.9, issue #1 do GitHub): a administradora envia um PDF do catálogo da própria loja; o sistema extrai candidatos a produto (nome, SKU quando presente, descrição — preço se houver é sempre descartado), mostra pré-visualização, detecta duplicidade por SKU contra produtos já cadastrados, permite correção manual dos campos extraídos, e só cria produto após confirmação explícita. Decisões já fechadas com o mantenedor: (1) como `products.image_asset_id` é obrigatório e o PDF não traz imagem, cada item extraído exige que a administradora anexe uma imagem manualmente antes de poder ser confirmado — sem mudar o data-model; (2) itens com SKU já usado por um produto existente da loja são só sinalizados e nunca criados nem usados pra atualizar o produto existente — a importação cria somente produtos novos, sem duplicidade de SKU; resolver o duplicado é responsabilidade da administradora fora do fluxo de import, pelo fluxo normal de edição já existente (feature 002)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Importar um PDF e revisar os produtos extraídos (Priority: P1)

Como administradora de uma loja, quero enviar um PDF do meu catálogo e ver
uma pré-visualização dos produtos que o sistema conseguiu extrair, para
decidir com confiança o que será criado antes de qualquer mudança no meu
catálogo.

**Why this priority**: É o valor central e o ponto de confiança de toda a
feature — sem uma pré-visualização confiável, nenhuma das etapas seguintes
(corrigir, confirmar) faz sentido.

**Independent Test**: Enviar um PDF com produtos e verificar que a
pré-visualização lista cada candidato com nome, SKU (quando extraído) e
descrição, sem criar nenhum produto ainda, e que candidatos cujo SKU já
existe na loja aparecem sinalizados como duplicados.

**Acceptance Scenarios**:

1. **Given** um PDF válido com produtos da própria loja, **When** a
   administradora envia o arquivo, **Then** ela vê uma pré-visualização com
   um item por produto extraído (nome, SKU quando presente, descrição),
   sem nenhuma alteração no catálogo até aqui.
2. **Given** um item extraído tem um SKU que já pertence a um produto
   existente da mesma loja, **When** a pré-visualização é exibida, **Then**
   esse item aparece claramente sinalizado como duplicado, distinto dos
   itens sem conflito.
3. **Given** um arquivo que não é um PDF válido ou que não pôde ser
   processado, **When** a administradora tenta enviá-lo, **Then** ela vê
   uma mensagem de erro clara em PT-BR, sem pré-visualização e sem alterar
   o catálogo.
4. **Given** um PDF do qual nenhum produto pôde ser extraído, **When** a
   pré-visualização é exibida, **Then** a administradora vê uma mensagem
   clara de que nada foi encontrado, sem erro técnico.

---

### User Story 2 - Corrigir, completar e confirmar a criação dos produtos (Priority: P2)

Como administradora, quero corrigir os campos extraídos e anexar uma
imagem para cada produto antes de confirmar, para garantir que só entra no
catálogo o que eu já revisei e aprovei.

**Why this priority**: É a etapa que converte a pré-visualização em valor
real (produtos de fato criados); depende da User Story 1 já mostrar os
candidatos.

**Independent Test**: A partir de uma pré-visualização já carregada,
corrigir um campo de um item, anexar uma imagem a cada item não duplicado,
confirmar, e verificar que exatamente esses produtos foram criados com os
valores revisados.

**Acceptance Scenarios**:

1. **Given** um item extraído na pré-visualização, **When** a
   administradora edita nome, SKU ou descrição desse item, **Then** o valor
   corrigido é o que será usado se o item for confirmado.
2. **Given** um item extraído sem duplicidade, **When** a administradora
   não anexou nenhuma imagem a ele, **Then** esse item não pode ser
   confirmado — o sistema indica claramente que falta uma imagem.
3. **Given** todos os itens não duplicados têm imagem anexada e os campos
   obrigatórios preenchidos, **When** a administradora confirma a
   importação, **Then** um produto novo é criado para cada um desses itens,
   seguindo as mesmas regras de negócio já aprovadas (nome obrigatório, SKU
   único quando informado, sem preço em nenhum estado, visibilidade e
   disponibilidade desligadas por padrão, como em qualquer criação manual).
4. **Given** itens sinalizados como duplicados na pré-visualização,
   **When** a administradora confirma a importação, **Then** nenhum
   produto novo é criado para esses itens e nenhum produto existente é
   alterado por causa deles.
5. **Given** um item com campo obrigatório inválido (ex.: nome vazio após
   edição), **When** a administradora tenta confirmar, **Then** o sistema
   impede a confirmação desse item e indica claramente o motivo, sem
   bloquear os demais itens válidos.

---

### User Story 3 - Cancelar a importação sem aplicar nenhuma mudança (Priority: P3)

Como administradora, quero poder cancelar a importação a qualquer momento
antes de confirmar, para não me sentir obrigada a aplicar um PDF que enviei
só para conferir.

**Why this priority**: É a rede de segurança que torna seguro experimentar
a feature; depende da pré-visualização (User Story 1) existir para ter algo
a cancelar.

**Independent Test**: Enviar um PDF, chegar até a pré-visualização (com ou
sem correções feitas), cancelar, e verificar que nenhum produto foi criado
e o catálogo continua exatamente como estava antes do envio.

**Acceptance Scenarios**:

1. **Given** uma pré-visualização carregada, com ou sem correções feitas
   pela administradora, **When** ela cancela a importação, **Then**
   nenhum produto é criado e nenhuma imagem anexada durante a revisão fica
   associada a um produto.
2. **Given** uma importação cancelada, **When** a administradora consulta
   a lista de produtos da loja, **Then** ela é idêntica à de antes do
   envio do PDF.

---

### Edge Cases

- O que acontece quando o PDF excede um limite de tamanho ainda a definir
  no plano técnico? Mensagem clara de limite excedido, sem processar o
  arquivo (mesmo padrão de UX já usado para imagem, PRD §4.3).
- O que acontece quando dois itens extraídos do mesmo PDF têm o mesmo SKU
  entre si (não contra um produto existente, mas um contra o outro)? Ambos
  são sinalizados como conflito entre si; a administradora precisa
  resolver (corrigir um dos SKUs ou remover um item da confirmação) antes
  de confirmar os dois.
- O que acontece se a administradora fechar a tela ou perder a conexão no
  meio da revisão, antes de confirmar? Equivale a cancelar: nenhum produto
  é criado; nenhuma garantia de que a pré-visualização/correções sejam
  preservadas para retomar depois (fora do escopo desta feature).
- O que acontece quando um item extraído não tem SKU nenhum (PDF sem essa
  informação)? Ele nunca é considerado duplicado por SKU (nada para
  comparar) e segue o fluxo normal de criação, exigindo só imagem e nome
  válidos, como qualquer produto sem SKU.
- O que acontece com um preço eventualmente impresso no PDF ao lado do
  produto? É sempre descartado — nunca aparece na pré-visualização, nunca é
  editável, nunca é salvo (PRD regra de negócio 9).
- O que acontece se a administradora remover uma imagem já anexada a um
  item antes de confirmar? O item volta ao estado "sem imagem", não
  confirmável até uma nova ser anexada (FR-007).
- O que acontece se a criação de um item específico falhar por um motivo
  inesperado (ex.: erro de serviço) durante a confirmação de vários itens?
  Os itens já criados com sucesso antes da falha permanecem criados; o
  item que falhou mostra um erro específico e pode ser confirmado
  novamente, sem exigir reenviar o PDF nem repetir os itens já criados.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que a administradora envie um arquivo
  PDF do catálogo da própria loja.
- **FR-002**: O sistema DEVE extrair candidatos a produto do PDF (nome,
  SKU quando presente, descrição) e exibi-los numa pré-visualização, sem
  criar nenhum produto antes da confirmação explícita.
- **FR-003**: O sistema DEVE descartar qualquer preço eventualmente
  presente no PDF — nunca exibir, armazenar ou usar esse valor.
- **FR-004**: O sistema DEVE detectar, na pré-visualização, todo item cujo
  SKU extraído já pertence a um produto existente da mesma loja, e
  sinalizar esse item distintamente dos demais.
- **FR-005**: O sistema NÃO DEVE criar nem atualizar produto para nenhum
  item sinalizado como duplicado por SKU — nem contra um produto existente,
  nem entre dois itens do mesmo PDF com o mesmo SKU.
- **FR-006**: O sistema DEVE permitir que a administradora corrija nome,
  SKU e descrição de qualquer item extraído antes de confirmar.
- **FR-007**: O sistema DEVE exigir que a administradora anexe uma imagem a
  cada item não duplicado antes que esse item possa ser confirmado.
- **FR-008**: O sistema DEVE criar um produto novo, seguindo as mesmas
  regras de negócio já aprovadas para criação manual (nome obrigatório,
  SKU único quando informado, visibilidade e disponibilidade desligadas
  por padrão, sem preço), para cada item não duplicado, com imagem
  anexada e campos válidos, somente após confirmação explícita da
  administradora.
- **FR-009**: O sistema DEVE permitir que a administradora cancele a
  importação a qualquer momento antes da confirmação, sem criar nenhum
  produto nem deixar rastro no catálogo.
- **FR-010**: O sistema DEVE impedir a confirmação de um item individual
  com campo obrigatório inválido, sem bloquear a confirmação dos demais
  itens válidos.
- **FR-011**: O sistema DEVE exibir mensagens claras em PT-BR para arquivo
  inválido, PDF sem nenhum produto extraível, e item com dado inválido.
- **FR-012**: O sistema NÃO DEVE permitir que a importação de uma loja
  afete produtos de outra loja, nem na detecção de duplicidade nem na
  criação.
- **FR-013**: Se a criação de um item específico falhar por um erro
  inesperado durante a confirmação, o sistema DEVE preservar os itens já
  criados com sucesso e permitir que a administradora tente novamente
  apenas o item que falhou, sem exigir reenviar o PDF.

### Key Entities _(include if feature involves data)_

- **Candidato a produto (extraído)**: representação temporária, não
  persistida como entidade própria do domínio, de um item extraído do PDF
  antes da confirmação — nome, SKU, descrição, estado de duplicidade,
  imagem anexada (ou pendente). Deixa de existir após confirmar ou
  cancelar; produtos confirmados viram `products` normais
  (`docs/data-model.md` §2.4), sem novo campo ou tabela.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A administradora consegue enviar um PDF do catálogo e ver
  uma pré-visualização dos produtos extraídos antes de qualquer mudança
  real no catálogo.
- **SC-002**: Nenhum produto é criado ou alterado a partir de um item
  sinalizado como duplicado por SKU, em nenhuma execução da importação.
- **SC-003**: A administradora consegue corrigir um campo extraído e
  confirmar, e o produto criado reflete exatamente o valor corrigido, não
  o valor original extraído.
- **SC-004**: Nenhum produto é criado sem uma imagem anexada durante a
  revisão da importação.
- **SC-005**: Cancelar a importação em qualquer ponto antes da confirmação
  não deixa nenhuma alteração visível no catálogo da loja.
- **SC-006**: Uma importação de uma loja nunca cria, atualiza ou sinaliza
  duplicidade contra produtos de outra loja.

## Assumptions

- O mecanismo técnico de extração de texto do PDF (biblioteca, robustez
  contra formatos variados) é decisão do plano técnico desta feature, não
  deste documento; o spec assume só que candidatos plausíveis podem ser
  extraídos de um PDF razoavelmente estruturado, sem garantir 100% de
  acerto — daí a pré-visualização e a correção manual serem obrigatórias.
- A importação cria somente produtos novos; nunca atualiza um produto
  existente. Resolver um SKU duplicado (editar o produto existente ou
  ajustar o SKU do item importado) é responsabilidade da administradora
  pelo fluxo normal de edição já aprovado (feature 002), fora desta
  feature.
- Cada item não duplicado exige uma imagem anexada manualmente antes de
  poder ser confirmado — decisão que evita alterar a constraint `NOT NULL`
  de `products.image_asset_id` e evita revisar as telas que já assumem
  produto sempre ter imagem (feature 002, delta `product-image-preview`).
  Isso torna a importação uma revisão assistida por item, não um upload em
  lote sem intervenção.
- Sem retomar uma importação depois de fechar a tela antes de confirmar —
  cancelar e reenviar o PDF é o caminho aceito no MVP.
- Preço, quando presente no PDF, nunca é extraído para exibição, edição ou
  persistência (PRD regra de negócio 9).
- Volume de teste segue o mesmo volume de validação já usado nas features
  anteriores (até 50 produtos por loja, PRD §9); sem meta de performance
  numérica para arquivos grandes além de um limite de tamanho a definir no
  plano técnico.
