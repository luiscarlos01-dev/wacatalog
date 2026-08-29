# Feature Specification: Banners do hero

**Feature Branch**: `006-hero-banners`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "Banners do hero (PRD §4.4): a administradora gerencia até 5 banners ordenados do hero da própria loja — cria, edita, exclui e reordena. Cada banner tem imagem (asset da própria loja), descrição acessível obrigatória (alt text), título e texto opcionais, estado ativo (controla presença no hero público), e posição (1 a 5, sem repetição dentro da loja). CTA, link de campanha e agendamento estão fora do escopo do MVP. Contrato de entidade (docs/data-model.md §2.5 hero_banners) e contrato HTTP (GET/POST /admin/banners, PATCH/DELETE /admin/banners/{bannerId}, PUT /admin/banners/order, docs/api/openapi.yaml) já estão aprovados e são fonte de verdade — não reinventar; especificar o comportamento e os cenários de aceitação da experiência administrativa sobre esse contrato existente. O lado público (list_public_hero_banners, feature 003) já está implementado e fora do escopo desta feature."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Criar um banner (Priority: P1)

Como administradora de uma loja, quero criar um banner do hero informando
imagem, descrição acessível, textos opcionais e posição, para montar a
vitrine inicial da loja.

**Why this priority**: Sem conseguir criar um banner, não existe hero
configurável — é a base de toda a feature.

**Independent Test**: Escolher uma imagem já enviada, informar descrição
acessível e uma posição livre, e verificar que o banner aparece na lista
administrativa com os dados salvos.

**Acceptance Scenarios**:

1. **Given** a loja tem menos de 5 banners e a posição escolhida está
   livre, **When** a administradora informa imagem, descrição acessível e
   posição (com ou sem título/texto), **Then** o banner é criado, inativo
   por padrão a menos que ela marque como ativo.
2. **Given** a posição escolhida já está ocupada por outro banner
   **ativo** da mesma loja, **When** ela tenta criar um banner já ativo
   (ou tenta ativar um banner criado inativo) nessa posição, **Then** o
   sistema rejeita com uma mensagem clara em PT-BR, sem criar/ativar o
   banner nem alterar o existente. Criar um banner **inativo** numa
   posição que só tem banner inativo ou nenhum banner ativo é permitido
   (ver Edge Cases).
3. **Given** a loja já tem 5 banners, **When** ela tenta criar mais um,
   **Then** o sistema rejeita indicando que o limite foi atingido.
4. **Given** ela não informa uma descrição acessível, **When** ela tenta
   salvar, **Then** o sistema rejeita com uma mensagem clara, já que o
   campo é obrigatório.

---

### User Story 2 - Editar um banner existente (Priority: P2)

Como administradora, quero editar a imagem, os textos, a posição ou o
estado ativo de um banner já criado, para corrigir ou atualizar o hero
sem recriar o banner do zero.

**Why this priority**: Completa o ciclo de manutenção do hero depois que
já existe pelo menos um banner (User Story 1); menos crítico que a
criação inicial.

**Independent Test**: Com um banner já criado, alterar seus textos e
estado ativo, e verificar que as mudanças aparecem na lista
administrativa.

**Acceptance Scenarios**:

1. **Given** um banner existente da própria loja, **When** a
   administradora atualiza imagem, textos, posição e/ou estado ativo,
   **Then** as mudanças são salvas e refletidas na lista administrativa.
2. **Given** ela tenta salvar o banner como ativo numa posição já
   ocupada por outro banner **ativo** da mesma loja (seja porque mudou a
   posição, seja porque só mudou o estado para ativo mantendo a posição
   atual), **When** ela salva, **Then** o sistema rejeita com uma
   mensagem clara, sem alterar o banner.
3. **Given** ela tenta editar um banner de outra loja, **When** ela
   envia a alteração, **Then** o sistema nega sem revelar dados da outra
   loja (isolamento de tenant, ADR-0002).

---

### User Story 3 - Reordenar os banners (Priority: P2)

Como administradora, quero reordenar de uma vez todos os banners do
hero da própria loja, para ajustar a sequência sem editar banner por
banner.

**Why this priority**: Importante para manter o hero organizado conforme
a loja muda de foco, mas só faz sentido depois de existir mais de um
banner (depende da User Story 1).

**Independent Test**: Com 2 ou mais banners criados, enviar a nova ordem
completa e verificar que as posições exibidas mudam de acordo.

**Acceptance Scenarios**:

1. **Given** a loja tem 2 ou mais banners, **When** a administradora
   envia a nova ordem completa dos banners existentes, **Then** as
   posições são reatribuídas conforme a ordem enviada e refletidas na
   lista administrativa.
2. **Given** ela envia uma lista que não corresponde exatamente ao
   conjunto atual de banners da própria loja (faltando algum ou com um
   repetido), **When** ela tenta reordenar, **Then** o sistema rejeita a
   operação inteira com uma mensagem clara, sem aplicar nenhuma mudança
   parcial.
3. **Given** ela tenta reordenar incluindo o id de um banner de outra
   loja, **When** ela envia a reordenação, **Then** o sistema nega sem
   revelar dados da outra loja, sem aplicar nenhuma mudança (isolamento
   de tenant, ADR-0002).

---

### User Story 4 - Excluir um banner (Priority: P3)

Como administradora, quero excluir permanentemente um banner que não
faz mais sentido no hero, com uma confirmação antes de perder o banner
de vez.

**Why this priority**: Completa o CRUD do hero; menos frequente que
criar/editar/reordenar.

**Independent Test**: Com um banner existente, excluí-lo e confirmar que
ele some da lista administrativa e do hero público.

**Acceptance Scenarios**:

1. **Given** um banner existente da própria loja, **When** a
   administradora confirma a exclusão, **Then** o banner é removido
   permanentemente e deixa de aparecer na lista administrativa e no
   hero público.
2. **Given** ela aciona excluir mas cancela a confirmação, **When** ela
   cancela, **Then** o banner continua existindo sem nenhuma alteração.
3. **Given** ela tenta excluir um banner de outra loja, **When** ela
   envia a exclusão, **Then** o sistema nega sem revelar dados da outra
   loja.

---

### Edge Cases

- O que acontece com a posição dos banners restantes depois de uma
  exclusão? Nenhuma renumeração automática — as posições dos banners
  restantes não mudam sozinhas; a administradora usa editar ou reordenar
  se quiser preencher a lacuna (ver Assumptions).
- O que acontece se a administradora tentar criar ou editar um banner
  apontando para uma imagem que não pertence à própria loja? Rejeitado
  (mesma regra já aprovada em `docs/data-model.md` §2.5:
  `image_asset_id` deve apontar para asset da mesma loja).
- O que acontece com um banner inativo? Continua existindo e editável na
  área administrativa, só não aparece no hero público (`is_active`
  controla exclusivamente a presença pública, já aprovado).
- Dois banners podem ter a mesma posição? Só enquanto no máximo um deles
  estiver ativo — a checagem de posição duplicada (FR-003) só vale entre
  banners ativos (regra já aprovada em `docs/data-model.md` §2.5, ver
  Assumptions). Dois banners inativos podem compartilhar a mesma posição
  sem erro; o conflito só aparece no momento em que um segundo banner
  naquela posição tentaria ficar ativo ao mesmo tempo que o primeiro.
- O que acontece se a loja não tiver nenhum banner? A lista
  administrativa aparece vazia; o hero público também fica vazio (sem
  banner nenhum) — nenhum banner é obrigatório no MVP.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que a administradora crie um
  banner para a própria loja informando uma imagem já enviada, descrição
  acessível, título e texto opcionais, e uma posição entre 1 e 5.
- **FR-002**: O sistema DEVE rejeitar a criação de um banner quando a
  loja já tiver 5 banners.
- **FR-003**: O sistema DEVE rejeitar criar ou editar um banner **ativo**
  (seja porque está sendo criado/editado como ativo, seja porque está
  sendo ativado) para uma posição já ocupada por outro banner **ativo**
  da mesma loja. Dois banners inativos podem compartilhar posição sem
  rejeição.
- **FR-004**: O sistema DEVE rejeitar salvar um banner sem descrição
  acessível.
- **FR-005**: O sistema DEVE permitir que a administradora edite todos
  os campos editáveis de um banner da própria loja (imagem, descrição
  acessível, título, texto, posição, estado ativo).
- **FR-006**: O sistema DEVE permitir que a administradora reordene de
  uma vez todos os banners da própria loja, reatribuindo as posições
  conforme a ordem enviada.
- **FR-007**: O sistema DEVE rejeitar uma reordenação que não
  corresponda exatamente ao conjunto atual de banners da própria loja,
  sem aplicar nenhuma mudança parcial.
- **FR-008**: O sistema DEVE permitir que a administradora exclua
  permanentemente um banner da própria loja, com uma etapa de
  confirmação antes de aplicar a exclusão.
- **FR-009**: O sistema DEVE exibir, na área administrativa, os banners
  da própria loja ordenados por posição, com imagem, textos e estado
  ativo.
- **FR-010**: O sistema NÃO DEVE permitir que uma administradora crie,
  edite, exclua, reordene ou visualize banners de uma loja que não é a
  sua.

### Key Entities _(include if feature involves data)_

- **Banner do hero** (`hero_banners`, `docs/data-model.md` §2.5):
  `image_asset_id`, `accessible_description`, `title`, `text`,
  `position`, `is_active` — campos já aprovados, reusados sem alteração.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A administradora consegue criar, editar, reordenar e
  excluir banners da própria loja sem precisar de ajuda técnica.
- **SC-002**: A loja nunca acumula mais de 5 banners nem dois banners
  **ativos** na mesma posição — toda tentativa é rejeitada com uma razão
  clara.
- **SC-003**: A administradora consegue reordenar todos os banners da
  loja em uma única ação, sem precisar editar banner por banner.
- **SC-004**: Uma administradora nunca consegue ver, criar, editar,
  excluir ou reordenar banners de outra loja.
- **SC-005**: Excluir um banner sempre exige uma confirmação explícita
  antes de acontecer, sem perda acidental.

## Assumptions

- O contrato de entidade (`docs/data-model.md` §2.5) e o contrato HTTP
  (`GET`/`POST /admin/banners`, `PATCH`/`DELETE /admin/banners/{bannerId}`,
  `PUT /admin/banners/order`, `docs/api/openapi.yaml`) já aprovados são
  reaproveitados sem alteração; esta feature especifica comportamento e
  experiência administrativa sobre esse contrato existente.
- `PATCH /admin/banners/{bannerId}` é substituição completa dos campos
  editáveis (`BannerUpdate` = `BannerInput` no contrato aprovado) — editar
  um banner reenvia todos os campos editáveis, não só o que mudou.
- `PUT /admin/banners/order` espera o conjunto completo e atual dos
  banners da loja, como uma permutação — uma lista parcial, com
  duplicidade, ou com banner de outra loja é rejeitada por inteiro, não
  aplicada parcialmente.
- Excluir um banner não renumera automaticamente os banners restantes;
  a administradora usa editar ou reordenar se quiser fechar a lacuna de
  posição manualmente.
- Excluir exige confirmação explícita antes de aplicar, reusando o
  mesmo padrão de UX já aprovado para exclusão definitiva de produtos
  (PRD §4.2).
- O ciclo de vida do asset de imagem (`/admin/assets`) não é gerenciado
  por esta feature — o banner só referencia um asset já enviado pelo id,
  mesmo padrão já usado por produtos.
- O lado público dos banners (`list_public_hero_banners`, feature 003)
  já está implementado e é fora do escopo desta feature; esta feature só
  garante que os dados administrativos ficam corretos para ele consumir.
- CTA, link de campanha e agendamento de banners estão fora do escopo
  do MVP (PRD §4.4), sem campo ou comportamento correspondente.
- A unicidade de posição dentro da loja (FR-003) vale só entre banners
  **ativos** — regra já materializada em `hero_banners` (índice único
  parcial `where is_active`, `supabase/migrations/202608250000_hero_banners.sql`).
  Dois banners inativos, ou um ativo e um inativo, podem ter a mesma
  posição sem conflito; o conflito só existe entre dois banners ativos.
  `docs/data-model.md` §2.5 ("uma posição não pode se repetir dentro da
  loja") é o resumo dessa regra, não uma versão mais estrita dela.
- A lista administrativa ordena por posição; quando duas linhas
  compartilham a mesma posição (caso acima), o desempate usa
  `created_at` (mais antigo primeiro) — não há requisito de negócio para
  uma ordem diferente nesse caso raro.
- **Lacuna de privilégio identificada nesta rodada de planejamento**: a
  migration que criou `hero_banners` (feature 003) deliberadamente não
  concedeu nenhum privilégio de leitura/escrita administrativa —
  comentário no próprio arquivo: "Admin-scoped read and write are
  reserved for a future banner-management feature." Esta é essa feature;
  o plano técnico deve incluir uma migration nova concedendo
  `SELECT`/`INSERT`/`UPDATE`/`DELETE` a `authenticated`, com policies de
  RLS escopadas por `store_memberships`/`store_admin`, mesmo padrão já
  usado em `products` (feature 002) — verificado contra a migration real
  antes de escrever `tasks.md`, não assumido (lição da feature 005,
  achados A-1/A-2 do `contract-reviewer`).
