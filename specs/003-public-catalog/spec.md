# Feature Specification: Catálogo público

**Feature Branch**: `003-public-catalog`

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "Catálogo público da loja (PRD §4.1): cliente acessa o catálogo de uma loja por identificador público e vê produtos ativos e visíveis (nome, SKU quando houver, descrição, imagem, disponibilidade) e banners ativos do hero na ordem configurada. Contrato de entidade (`docs/data-model.md` §2.4/§2.5, §4 Consultas públicas) e contrato HTTP (`GET /stores/{storeSlug}/catalog`, `docs/api/openapi.yaml`) já estão aprovados e são fonte de verdade. Carrinho, seleção de quantidade e envio via WhatsApp (PRD §4.5/§4.6) e gestão administrativa de banners ficam fora do escopo desta feature."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver produtos publicados da loja (Priority: P1)

Como cliente de uma revendedora, quero acessar o catálogo de uma loja e ver
os produtos disponíveis para consulta, para decidir o que quero pedir.

**Why this priority**: É o valor central do catálogo público; sem isso não
existe motivo para a cliente acessar a loja.

**Independent Test**: Acessar o catálogo de uma loja com produtos ativos e
visíveis cadastrados e verificar que cada um aparece com nome, SKU (quando
houver), descrição, imagem e estado de disponibilidade, sem exigir login.

**Acceptance Scenarios**:

1. **Given** uma loja com produtos ativos e visíveis, **When** a cliente
   acessa o catálogo dessa loja, **Then** ela vê cada produto com nome, SKU
   (quando houver), descrição, imagem e se está disponível para pedido, sem
   precisar de login.
2. **Given** uma loja com produtos não visíveis, indisponíveis por
   desativação, ou pertencentes a outra loja, **When** a cliente acessa o
   catálogo, **Then** nenhum desses produtos aparece.
3. **Given** uma loja sem nenhum produto publicado, **When** a cliente acessa
   o catálogo, **Then** ela vê uma experiência clara de catálogo vazio, sem
   erro.
4. **Given** um identificador de loja que não corresponde a nenhuma loja,
   **When** a cliente tenta acessar o catálogo, **Then** ela vê uma mensagem
   clara em PT-BR informando que a loja não foi encontrada, sem detalhe
   técnico.

---

### User Story 2 - Ver banners do hero (Priority: P2)

Como cliente, quero ver os banners em destaque da loja no topo do catálogo,
para entender rapidamente do que se trata a loja ou aproveitar um destaque.

**Why this priority**: Reforça a identidade da loja e aproveita destaques,
mas o catálogo continua útil sem banners — por isso vem depois da listagem de
produtos.

**Independent Test**: Acessar o catálogo de uma loja com banners ativos
cadastrados e verificar que eles aparecem no topo, na ordem configurada, cada
um com sua descrição acessível.

**Acceptance Scenarios**:

1. **Given** uma loja com banners ativos cadastrados, **When** a cliente
   acessa o catálogo, **Then** ela vê os banners no topo, na ordem de
   posição configurada, cada um com descrição acessível e texto/título
   quando houver.
2. **Given** uma loja com banners inativos ou sem nenhum banner cadastrado,
   **When** a cliente acessa o catálogo, **Then** o catálogo é exibido sem
   erro, sem a área de banners (ou com ela vazia).

---

### Edge Cases

- O que acontece quando o identificador da loja na URL não corresponde a
  nenhuma loja? Mensagem clara de "loja não encontrada" em PT-BR, sem
  detalhe técnico (Acceptance Scenario 1.4).
- O que acontece quando a loja existe mas não tem nenhum produto publicado?
  Estado de catálogo vazio, sem erro (Acceptance Scenario 1.3).
- O que acontece quando a loja não tem nenhum banner ativo? Catálogo exibido
  normalmente sem a área de banners (Acceptance Scenario 2.2).
- O que acontece se um produto tiver `quantityAvailable = 0`? Ele continua
  aparecendo (consulta não depende de estoque), mas o estado de
  disponibilidade exibido reflete a regra já aprovada em
  `docs/data-model.md` §2.4 (disponibilidade e quantidade são estados
  independentes; carrinho, que checa os dois, é feature futura).
- O que acontece se a imagem de um produto ou banner falhar ao carregar no
  navegador da cliente? Comportamento de fallback de imagem é requisito de
  UI geral (PRD §7), não redefinido por esta feature.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE resolver uma loja pelo identificador público
  (slug) da URL e retornar uma experiência de "loja não encontrada" quando
  nenhuma loja corresponder.
- **FR-002**: O sistema DEVE listar, no catálogo público, somente produtos
  com estado ativo e visível da loja resolvida.
- **FR-003**: O sistema DEVE exibir, para cada produto listado: nome, SKU
  (quando houver), descrição, imagem e estado de disponibilidade para
  pedido.
- **FR-004**: O sistema NÃO DEVE expor preço, dado de associação/membership,
  credencial ou qualquer dado administrativo no catálogo público.
- **FR-005**: O sistema DEVE exibir, no topo do catálogo, somente banners
  ativos da loja resolvida, na ordem de posição configurada, até o máximo de
  cinco.
- **FR-006**: O sistema DEVE exibir uma experiência de catálogo vazio, sem
  erro, quando a loja não tiver produtos publicados.
- **FR-007**: O sistema DEVE exibir o catálogo sem área de banners, sem
  erro, quando a loja não tiver banners ativos.
- **FR-008**: O sistema NÃO DEVE exigir autenticação nem sessão para
  visualizar o catálogo público.
- **FR-009**: O sistema DEVE derivar todo produto e banner exibido
  exclusivamente da loja resolvida pelo slug da URL, nunca misturando
  conteúdo de outra loja.
- **FR-010**: O sistema DEVE exibir o catálogo em PT-BR simples, utilizável
  em dispositivo móvel, com navegação por teclado, foco visível e suporte a
  preferência de movimento reduzido (PRD §7).

### Key Entities _(include if feature involves data)_

- **Loja (pública)**: subconjunto público da loja resolvida por slug — nome
  e identificador público; nenhum dado de associação/administração é
  exposto. Contrato já aprovado em `docs/data-model.md` §2.1/§4.
- **Produto (público)**: subconjunto público de um produto ativo e visível
  — nome, SKU quando houver, descrição, imagem, disponibilidade. Contrato já
  aprovado em `docs/data-model.md` §2.4/§4.
- **Banner (público)**: subconjunto público de um banner ativo — imagem,
  descrição acessível, título/texto quando houver, posição. Contrato já
  aprovado em `docs/data-model.md` §2.5/§4.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A cliente encontra e visualiza o catálogo de uma loja válida
  sem precisar de login ou orientação técnica.
- **SC-002**: A cliente nunca vê, no catálogo público, um produto não
  visível, desativado, ou pertencente a outra loja.
- **SC-003**: A cliente vê os banners ativos na ordem configurada quando
  existirem, e uma experiência limpa quando não existirem, sem nenhum caso
  resultando em erro visível.
- **SC-004**: Acessar um identificador de loja inexistente resulta numa
  mensagem clara em PT-BR, sem expor detalhe técnico nem confirmar/negar a
  existência de dados administrativos.
- **SC-005**: O catálogo é utilizável e legível num viewport mobile típico,
  cumprindo os limiares de contraste e foco já validados pela feature 001
  (WCAG 2.2 AA — 4.5:1 texto normal, 3:1 texto grande/foco).

## Assumptions

- O catálogo consome, sem alteração, o contrato já aprovado
  `GET /stores/{storeSlug}/catalog` (`docs/api/openapi.yaml`) e as regras de
  consulta pública já aprovadas (`docs/data-model.md` §4-5).
- `hero_banners` (tabela) é materializada nesta feature porque o catálogo
  público lê dela — sem a tabela, a consulta pública não roda. O CRUD
  administrativo de banners (`/admin/banners*`, já aprovado em contrato)
  fica fora do escopo: dados de teste são inseridos diretamente via
  fixture/SQL, sem UI administrativa. Mesma separação já usada entre a
  feature 002 (produtos) e uma futura feature de gestão de banners.
- Carrinho, seleção de quantidade e envio via WhatsApp (PRD §4.5/§4.6) estão
  fora do escopo. Os campos `whatsappAvailable`/`whatsappNumber` do contrato
  `PublicCatalog` são recebidos pela resposta da API mas não têm UI nesta
  feature.
- Preço não existe em nenhum estado do produto (consistente com as features
  anteriores).
- Sem paginação ou busca explícitas no PRD para o volume esperado do MVP
  (até 50 produtos por loja, PRD §4.8/§9).
