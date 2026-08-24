# Feature Specification: Gestão de produtos

**Feature Branch**: `002-product-management`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Gestão de produtos (CRUD) para administradoras de loja, conforme docs/prd/wacatalog-mvp.md §4.2 (Produtos), §4.3 (Imagens, dependência direta), §5 (Regras de negócio 1-8) e §6 (Exclusão definitiva). O contrato de entidade (`docs/data-model.md` §2.4 `products`) e o contrato HTTP (`docs/api/openapi.yaml`, tag Products) já estão aprovados e são fonte de verdade — não reinventar entidades ou endpoints, especificar o comportamento e os cenários de aceitação da experiência administrativa sobre esse contrato já existente."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cadastrar e visualizar produtos da loja (Priority: P1)

Como administradora de uma loja, quero cadastrar um produto e ver todos os
produtos da minha loja numa lista, para começar a montar meu catálogo.

**Why this priority**: Sem cadastro e listagem, não existe catálogo para
gerir; é a base sobre a qual toda a gestão de produtos se apoia.

**Independent Test**: Com uma sessão administrativa válida, cadastrar um
produto com nome, descrição, imagem e quantidade, e verificar que ele aparece
na lista da própria loja com os estados corretos (não visível, não pedível,
ativo por padrão).

**Acceptance Scenarios**:

1. **Given** a administradora está autenticada na própria loja, **When** ela
   cadastra um produto com nome, descrição, imagem e quantidade disponível,
   **Then** o produto é criado e aparece na lista da loja com visibilidade e
   disponibilidade desligadas por padrão.
2. **Given** a administradora informa um SKU, **When** o SKU já está em uso
   por outro produto da mesma loja, **Then** o cadastro é rejeitado com uma
   mensagem clara indicando o conflito, sem criar o produto.
3. **Given** a loja já tem produtos cadastrados, **When** a administradora
   abre a lista de produtos, **Then** ela vê apenas produtos da própria loja,
   com nome, SKU (quando houver), quantidade e estados de visibilidade,
   disponibilidade e atividade.

---

### User Story 2 - Editar produto e controlar visibilidade/disponibilidade (Priority: P2)

Como administradora, quero editar nome, SKU, descrição, imagem e quantidade
de um produto, e controlar separadamente se ele aparece no catálogo e se pode
ser pedido, para manter o catálogo atualizado e decidir quando cada produto
fica disponível para venda.

**Why this priority**: Um catálogo estático sem edição nem controle de
visibilidade/disponibilidade não sustenta o uso real da revendedora após o
cadastro inicial.

**Independent Test**: Com um produto já cadastrado, editar seus campos e
alternar visibilidade e disponibilidade de forma independente, verificando
que cada alteração é refletida sem afetar a outra.

**Acceptance Scenarios**:

1. **Given** um produto existente da própria loja, **When** a administradora
   edita nome, descrição, imagem ou quantidade, **Then** os novos valores são
   salvos e refletidos na lista e nos detalhes do produto.
2. **Given** um produto visível e disponível, **When** a administradora
   desliga apenas a disponibilidade, **Then** o produto continua visível
   (consultável) mas deixa de poder ser adicionado ao carrinho.
3. **Given** um produto não visível, **When** a administradora liga apenas a
   visibilidade, **Then** o produto passa a aparecer no catálogo público,
   respeitando o estado de disponibilidade já configurado.
4. **Given** um produto de outra loja, **When** a administradora tenta editá-lo
   diretamente pelo identificador, **Then** o sistema nega a operação sem
   revelar dados do produto de outra loja.

---

### User Story 3 - Desativar produto preservando o cadastro (Priority: P3)

Como administradora, quero desativar um produto sem perder seu cadastro,
para removê-lo temporariamente do catálogo e do carrinho sem recriar tudo
depois.

**Why this priority**: É a forma reversível de remoção do catálogo; depende
de cadastro e edição já existirem, mas é necessária antes de qualquer fluxo
de exclusão definitiva ser confiável.

**Independent Test**: Desativar um produto visível e disponível e confirmar
que ele some do catálogo público e do carrinho, mas continua aparecendo na
lista administrativa como inativo, com o cadastro preservado.

**Acceptance Scenarios**:

1. **Given** um produto ativo, visível e disponível, **When** a administradora
   o desativa, **Then** ele deixa de aparecer no catálogo público e não pode
   mais ser adicionado ao carrinho, mas continua visível na lista
   administrativa como inativo.
2. **Given** um produto desativado, **When** a administradora consulta seus
   detalhes, **Then** todos os dados cadastrados (nome, SKU, descrição,
   imagem, quantidade) continuam preservados.

---

### User Story 4 - Reativar produto reconfigurando visibilidade e disponibilidade (Priority: P4)

Como administradora, quero reativar um produto desativado e configurar de
novo sua visibilidade e disponibilidade, para evitar que ele volte ao
catálogo público sem eu revisar antes se ele já está pronto para venda.

**Why this priority**: Fecha o ciclo reversível iniciado pela desativação;
depende dela existir primeiro.

**Independent Test**: Reativar um produto previamente desativado e verificar
que ele volta ao estado ativo com visibilidade e disponibilidade desligadas,
exigindo nova configuração explícita antes de reaparecer no catálogo público.

**Acceptance Scenarios**:

1. **Given** um produto desativado que antes era visível e disponível,
   **When** a administradora o reativa, **Then** o produto volta a ativo, mas
   com visibilidade e disponibilidade desligadas até serem configuradas de
   novo.
2. **Given** um produto recém-reativado, **When** a administradora não
   reconfigura visibilidade nem disponibilidade, **Then** o produto não
   aparece no catálogo público nem pode ser pedido.

---

### User Story 5 - Excluir produto definitivamente (Priority: P5)

Como administradora, quero excluir definitivamente um produto que não farei
mais uso, com uma confirmação explícita, para remover cadastros indesejados
do catálogo sem risco de exclusão acidental.

**Why this priority**: É irreversível e usada com menor frequência que os
demais fluxos; depende do cadastro existir e da distinção clara com
"desativar" já estar estabelecida.

**Independent Test**: Acionar a exclusão de um produto, ver o aviso com o
nome do produto e as duas ações disponíveis, cancelar uma vez (produto
preservado) e confirmar em seguida (produto removido permanentemente).

**Acceptance Scenarios**:

1. **Given** um produto existente, **When** a administradora aciona excluir,
   **Then** o sistema exibe o aviso "Tem certeza de que deseja excluir
   definitivamente o produto "{nome}"? Essa ação não pode ser desfeita. Para
   apenas ocultá-lo e preservá-lo, use "Desativar"." com as ações `Cancelar` e
   `Excluir definitivamente`.
2. **Given** o aviso de exclusão está visível, **When** a administradora
   escolhe `Cancelar`, **Then** o produto permanece intacto e nenhuma
   alteração é feita.
3. **Given** o aviso de exclusão está visível, **When** a administradora
   escolhe `Excluir definitivamente`, **Then** o produto é removido de forma
   permanente e deixa de aparecer em qualquer listagem, incluindo a
   administrativa.

---

### Edge Cases

- O que acontece quando a administradora tenta cadastrar ou editar um produto
  com SKU já usado por outro produto da mesma loja? O sistema rejeita a
  operação com mensagem clara, sem criar/alterar o produto (regra de negócio
  8, contrato `409` já aprovado em `docs/api/openapi.yaml`).
- O que acontece quando a administradora tenta visualizar, editar, desativar,
  reativar ou excluir um produto de outra loja pelo identificador direto? O
  sistema nega a operação sem revelar existência ou dados do produto.
- O que acontece quando a administradora tenta excluir ou reativar um produto
  que já foi excluído definitivamente por outra sessão? O sistema informa que
  o produto não foi encontrado, sem erro técnico.
- O que acontece quando a loja ainda não tem nenhum produto cadastrado? A
  lista mostra um estado vazio claro, sem erro.
- O que acontece quando a imagem referenciada no cadastro ainda não terminou
  de ser enviada/normalizada ou falhou? O cadastro/edição do produto não é
  concluído sem uma referência de imagem válida da própria loja; a falha de
  upload é tratada pelo fluxo de imagens já aprovado (PRD §4.3), não por esta
  feature.
- O que acontece quando a administradora tenta salvar quantidade negativa? O
  sistema rejeita a operação com mensagem clara (quantidade deve ser maior ou
  igual a zero).
- O que acontece quando a administradora substitui a imagem de um produto? A
  imagem anterior permanece associada até a nova imagem ser persistida com
  sucesso; nenhum estado intermediário deixa o produto sem imagem válida
  (`docs/data-model.md` §6).
- O que acontece com a imagem do produto quando ele é excluído
  definitivamente? A exclusão trata o asset associado sem deixar referência
  órfã (`docs/data-model.md` §6); esta feature não redefine como o asset é
  tratado, apenas garante que a exclusão do produto dispara esse tratamento.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que a administradora visualize todos os
  produtos da própria loja, e apenas dela.
- **FR-002**: O sistema DEVE permitir que a administradora cadastre um
  produto informando nome (obrigatório), SKU (opcional), descrição, imagem e
  quantidade disponível (maior ou igual a zero).
- **FR-003**: O sistema DEVE permitir que a administradora edite nome, SKU,
  descrição, imagem e quantidade disponível de um produto existente da
  própria loja.
- **FR-004**: O sistema DEVE permitir que a administradora ligue/desligue
  visibilidade no catálogo e disponibilidade para pedido de forma
  independente uma da outra.
- **FR-005**: O sistema DEVE impedir cadastro ou edição de produto com SKU já
  usado por outro produto da mesma loja, retornando mensagem clara de
  conflito.
- **FR-006**: O sistema DEVE permitir que a administradora desative um
  produto, preservando seu cadastro e removendo-o do catálogo público e da
  possibilidade de pedido.
- **FR-007**: O sistema DEVE permitir que a administradora reative um produto
  desativado, retornando visibilidade e disponibilidade para o estado
  desligado até serem reconfiguradas explicitamente.
- **FR-008**: O sistema DEVE permitir que a administradora exclua um produto
  definitivamente somente após uma confirmação explícita que nomeie o
  produto, declare que a ação é irreversível e ofereça `Cancelar` e `Excluir
definitivamente` como únicas ações.
- **FR-009**: O sistema DEVE impedir que a administradora visualize, edite,
  desative, reative ou exclua um produto que pertence a outra loja.
- **FR-010**: O sistema NÃO DEVE exibir, solicitar ou armazenar preço em
  nenhuma tela ou formulário de produto.
- **FR-011**: O sistema DEVE exibir, para cada produto na lista
  administrativa, seus estados atuais de visibilidade, disponibilidade e
  atividade (ativo/desativado).
- **FR-012**: O sistema DEVE exibir mensagens de erro claras e em PT-BR
  simples quando uma operação de produto falhar (SKU duplicado, quantidade
  inválida, imagem inválida, produto não encontrado).
- **FR-013**: Ao substituir a imagem de um produto, o sistema DEVE preservar
  a imagem anterior até a nova ser persistida com sucesso, sem deixar o
  produto sem imagem válida em nenhum momento.
- **FR-014**: Ao excluir um produto definitivamente, o sistema DEVE tratar o
  asset de imagem associado sem deixar referência órfã.
- **FR-015**: O sistema DEVE rejeitar como imagem de produto qualquer arquivo
  cujo conteúdo real não corresponda a um formato aceito (JPEG, PNG, WebP,
  HEIC, HEIF), independentemente da extensão ou do tipo declarado pelo
  navegador.
- **FR-016**: O sistema DEVE aceitar e persistir `isOrderable = true` com
  quantidade zerada como estado válido do produto (regra de negócio 4 do PRD
  — quantidade não substitui disponibilidade). O bloqueio efetivo de
  adicionar ao carrinho com quantidade zero é responsabilidade do catálogo
  público/carrinho, fora do escopo desta feature (`docs/data-model.md`
  §2.4); aqui, verificável apenas como persistência correta do estado, não
  como comportamento de carrinho.

### Key Entities _(include if feature involves data)_

- **Produto**: item do catálogo de uma loja. Atributos relevantes para esta
  feature: nome (obrigatório), SKU (opcional, único por loja), descrição,
  referência de imagem, quantidade disponível, estado de visibilidade,
  estado de disponibilidade para pedido, estado de atividade (ativo ou
  desativado). Contrato completo já aprovado em `docs/data-model.md` §2.4.
- **Loja**: contexto de posse de cada produto; toda operação de produto é
  restrita à loja da administradora autenticada. Contrato já aprovado em
  `docs/data-model.md` §2.1.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A administradora consegue cadastrar um produto informando
  nome, descrição, imagem e quantidade, e vê-lo na lista da própria loja
  imediatamente após a confirmação, sem etapa técnica adicional.
- **SC-002**: A administradora consegue alternar visibilidade e
  disponibilidade de um produto de forma independente, e o estado exibido
  reflete exatamente a última alteração salva, sem afetar o outro estado.
- **SC-003**: A administradora consegue desativar um produto e confirmar que
  ele deixa de aparecer no catálogo público e no carrinho, com o cadastro
  preservado e consultável na área administrativa.
- **SC-004**: A administradora consegue reativar um produto desativado e
  confirma que visibilidade e disponibilidade voltam desligadas até serem
  configuradas de novo, sem reaparecer automaticamente no catálogo público.
- **SC-005**: A administradora consegue excluir definitivamente um produto
  somente depois de ver e confirmar o aviso irreversível nomeando o produto;
  escolher `Cancelar` preserva o produto sem nenhuma alteração.
- **SC-006**: Uma administradora nunca visualiza, edita, desativa, reativa
  nem exclui produto de outra loja, mesmo tentando acessar diretamente pelo
  identificador do produto.

## Assumptions

- O contrato de entidade (`docs/data-model.md` §2.4 `products`) e o contrato
  HTTP (`docs/api/openapi.yaml`, tag Products) já aprovados são reaproveitados
  sem alteração; esta feature especifica comportamento e experiência
  administrativa sobre esse contrato existente, não o redefine.
- Upload e normalização de imagem seguem o contrato já aprovado
  `POST /admin/assets` (kind=product, OpenAPI) e as regras do PRD §4.3; esta
  feature não reespecifica esse comportamento. Nenhum código do endpoint de
  assets existia antes desta feature — construí-lo é pré-requisito de
  implementação para os cenários de criar/editar produto, mas reaproveita o
  contrato existente sem alterá-lo (ver plan.md).
- Preço não existe em nenhum estado do produto no MVP (PRD §4.2, regra de
  negócio 9); não há campo, tela ou mensagem de preço a considerar.
- Sem paginação, busca ou ordenação explícitas no PRD; uma lista simples é
  suficiente para o volume esperado de até 50 produtos por loja no MVP
  (PRD §4.8).
- Quantidade disponível não é alterada automaticamente por
  desativação/reativação; apenas visibilidade e disponibilidade são
  reconfiguradas na reativação (PRD, regra de negócio 7).
- Edição de campos (nome, SKU, descrição, imagem, quantidade) é permitida
  independentemente do produto estar ativo ou desativado; o PRD não restringe
  edição ao estado de atividade.
- O isolamento multi-tenant (ADR 0002) já garante, na camada de dados, que
  nenhuma consulta expõe produto de outra loja; esta feature verifica esse
  comportamento na superfície administrativa de produtos, sem redefinir a
  política de autorização.
