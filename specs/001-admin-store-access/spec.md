# Feature Specification: Acesso da administradora e escopo da loja

**Feature Branch**: `001-admin-store-access`

**Created**: 2026-08-22

**Status**: Stage 09 approved by the maintainer on 2026-08-23

**Input**: User description: "Retomar a primeira especificação do Wacatalog pela fundação de acesso autenticado da administradora e isolamento da loja."

## Clarifications

### Session 2026-08-22

- Q: Quem pode usar login e recuperação de senha? → A: Somente a administradora/revendedora com conta provisionada; clientes nunca fazem login.

### Session 2026-08-23

- Q: Como validar a tentativa de mutação cross-tenant exigida pela T036? → A: A administradora A tenta criar uma associação para a loja B pela fronteira autenticada existente; a autorização deve negar a operação sem exigir um novo endpoint de produto.
- Q: O que “dispositivo confiável” significa no MVP? → A: É o mesmo perfil de navegador enquanto a sessão de autenticação permanecer válida; não haverá checkbox nem identificação adicional de dispositivo, e a administradora deve sair explicitamente em dispositivo compartilhado.
- Q: Como tornar SC-001 e SC-005 verificáveis com apenas a primeira administradora do MVP? → A: Substituir percentuais por testes moderados determinísticos: concluir o login em até 2 minutos e iniciar a recuperação identificando o próximo passo, sem ajuda técnica nem compartilhamento de credencial.
- Q: Qual padrão mensurável deve validar contraste e foco visível? → A: WCAG 2.2 nível AA, com contraste mínimo de 4.5:1 para texto normal, 3:1 para texto grande e 3:1 para indicadores de foco e componentes de interface.
- Q: Como o E2E deve representar uma conta autenticada sem associação a uma loja? → A: Usar uma terceira conta não produtiva dedicada, com identidade confirmada e sem associação a qualquer loja; suas credenciais permanecem fora dos artefatos do projeto.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Entrar no painel da loja (Priority: P1)

Como administradora de uma loja provisionada, quero entrar com meu email e
senha para manter o catálogo da minha loja.

**Why this priority**: Sem acesso confiável ao painel, a primeira revendedora
não consegue manter o catálogo nem validar os demais fluxos administrativos.

**Independent Test**: Com uma conta provisionada e associada a uma loja,
informar credenciais válidas e verificar que o painel da própria loja fica
acessível; repetir com credenciais inválidas e verificar que o acesso não é
concedido.

**Acceptance Scenarios**:

1. **Given** uma conta provisionada e associada a uma loja, **When** a
   administradora informa email e senha válidos, **Then** ela acessa o painel
   da loja associada.
2. **Given** uma pessoa sem conta provisionada, **When** tenta criar uma conta,
   **Then** não encontra cadastro público nem consegue iniciar onboarding.
3. **Given** credenciais inválidas, **When** a pessoa tenta entrar, **Then** o
   acesso é recusado com uma mensagem simples que não revela se o email existe.
4. **Given** uma conta autenticada, **When** a administradora encerra a
   sessão, **Then** o painel deixa de ser acessível até uma nova autenticação.

### User Story 2 - Retornar no mesmo perfil de navegador (Priority: P1)

Como administradora, quero retornar ao painel no mesmo perfil de navegador sem
repetir o login enquanto minha sessão continuar válida.

**Why this priority**: Repetir credenciais em toda visita aumenta o risco de
bloqueio e dificulta o uso por uma pessoa com baixa familiaridade tecnológica.

**Independent Test**: Entrar com credenciais válidas, fechar e reabrir o
contexto do painel no mesmo perfil de navegador e verificar o retorno autenticado;
invalidar a sessão e verificar o retorno ao login.

**Acceptance Scenarios**:

1. **Given** uma sessão válida no mesmo perfil de navegador, **When** a
   administradora retorna ao painel, **Then** continua autenticada sem informar
   a senha novamente.
2. **Given** uma sessão expirada ou invalidada, **When** a administradora
   acessa o painel, **Then** é encaminhada ao login e nenhum token ou dado
   privado é exibido.
3. **Given** uma sessão válida, **When** a administradora acessa uma área
   administrativa diretamente, **Then** a sessão é reconhecida antes de
   apresentar dados da loja.

### User Story 3 - Recuperar o acesso da revendedora sem compartilhar a senha (Priority: P2)

Como revendedora com conta provisionada que não consegue entrar, quero iniciar a
recuperação com instruções claras e pedir ajuda ao mantenedor sem compartilhar
minha senha.

**Why this priority**: A recuperação reduz bloqueios operacionais sem criar um
processo manual de troca de credenciais ou exposição de segredos.

**Independent Test**: Solicitar recuperação para uma conta de revendedora
provisionada, verificar as instruções e o caminho de suporte; repetir com um
email não provisionado e confirmar que a resposta não permite enumerar contas.

**Acceptance Scenarios**:

1. **Given** uma revendedora com conta provisionada e sem acesso, **When** informa seu email na
   recuperação, **Then** recebe uma confirmação neutra e instruções simples
   para continuar por um canal seguro.
2. **Given** um email não provisionado, **When** alguém solicita recuperação,
   **Then** a resposta mantém a mesma linguagem neutra e não confirma a
   existência de uma conta.
3. **Given** uma revendedora que pede suporte, **When** consulta as
   instruções, **Then** é orientada a não enviar sua senha, token ou código de
   recuperação ao mantenedor.
4. **Given** um cliente consultando o catálogo público, **When** navega pela
   aplicação, **Then** não precisa fazer login e não recebe fluxo de sessão ou
   recuperação de senha.
5. **Given** uma revendedora com um link de recuperação válido, **When** define
   uma nova senha, **Then** consegue entrar com a nova senha sem expor a senha
   anterior.

### User Story 4 - Operar somente a loja autorizada (Priority: P1)

Como mantenedor, quero que cada administradora opere apenas a loja à qual foi
associada para preservar o isolamento entre lojas.

**Why this priority**: O produto é multi-tenant desde o primeiro uso; uma
falha de escopo poderia expor ou alterar dados de outra loja.

**Independent Test**: Criar duas lojas com administradoras distintas, ler o
contexto autorizado e tentar acessar ou alterar um recurso tenant-owned da loja
oposta, verificando negação sem vazamento de conteúdo.

**Acceptance Scenarios**:

1. **Given** uma administradora associada à loja A, **When** acessa o painel,
   **Then** vê somente a identidade e os dados administrativos da loja A.
2. **Given** uma administradora da loja A, **When** tenta acessar um recurso
   identificado como pertencente à loja B, **Then** a operação é negada sem
   revelar se o recurso ou a loja B existem.
3. **Given** uma conta autenticada sem associação a uma loja, **When** tenta
   acessar o painel, **Then** o acesso administrativo é recusado.
4. **Given** uma conta associada a uma loja, **When** executa uma operação
   administrativa, **Then** a autorização usa a associação efetiva da conta e
   não uma loja informada pela interface ou pela URL.
5. **Given** uma administradora da loja A autenticada com uma sessão comum,
   **When** tenta criar pela fronteira autenticada uma associação para a loja B,
   **Then** a autorização recusa a operação sem criar ou alterar dados e sem
   revelar conteúdo da loja B.

### Edge Cases

- Email ou senha vazios, malformados ou com espaços extras devem receber
  orientação clara sem expor detalhes internos.
- Em dispositivo compartilhado, a administradora deve encerrar a sessão
  explicitamente; enquanto válida, a sessão continua limitada à loja resolvida
  pela associação e nunca autoriza outra loja.
- A conta pode estar autenticada, mas sem uma membership existente com o papel
  permitido; nesse caso, não há acesso administrativo.
- O encerramento da sessão deve ser seguro mesmo quando a administradora já
  estiver em uma página administrativa aberta.
- Falhas temporárias no envio da recuperação devem orientar a tentativa
  posterior ou o contato com o mantenedor sem solicitar a senha.
- O fluxo não deve oferecer caminhos de cadastro, OAuth, MFA ou troca manual de
  senha pelo mantenedor no MVP.
- Clientes do catálogo público não devem ser redirecionados para login nem
  compartilhar o fluxo de recuperação da revendedora.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST permitir login somente para contas previamente
  provisionadas, usando email e senha.
- **FR-002**: O sistema MUST NOT oferecer cadastro público, OAuth, Cognito ou
  MFA nesta feature.
- **FR-003**: O sistema MUST recusar credenciais inválidas com uma mensagem
  segura e compreensível, sem confirmar a existência de outra conta.
- **FR-004**: O sistema MUST permitir que a administradora encerre sua sessão
  explicitamente.
- **FR-005**: O sistema MUST manter a sessão no mesmo perfil de navegador
  enquanto ela permanecer válida e renovável segundo as regras do serviço de
  autenticação aprovado. O MVP não terá checkbox de confiança nem identificação
  adicional do dispositivo.
- **FR-006**: O sistema MUST encaminhar sessões expiradas ou inválidas ao login
  antes de exibir dados administrativos.
- **FR-007**: O sistema MUST oferecer recuperação de acesso por email somente
  para contas provisionadas de administradoras/revendedoras, em linguagem
  simples e sem solicitar, registrar ou retransmitir senhas.
- **FR-008**: O sistema MUST usar respostas neutras no início da recuperação,
  independentemente de o email estar ou não associado a uma conta.
- **FR-009**: O sistema MUST associar cada conta administrativa a uma loja
  provisionada e a um papel permitido para o MVP.
- **FR-010**: O sistema MUST permitir acesso administrativo apenas quando a
  sessão autenticada possuir associação autorizada à loja alvo.
- **FR-011**: O sistema MUST aplicar o escopo da loja em toda leitura e
  mutação administrativa coberta por esta feature.
- **FR-012**: O sistema MUST NOT aceitar o identificador de loja fornecido pela
  interface como prova suficiente de autorização.
- **FR-013**: O sistema MUST negar tentativas de acesso entre lojas sem revelar
  a existência, identidade ou conteúdo da loja não autorizada.
- **FR-014**: O provisionamento de contas e associações MUST permanecer uma
  operação do mantenedor, sem exposição de credenciais privilegiadas à
  administradora ou ao navegador.
- **FR-015**: Todas as telas e mensagens da feature MUST usar linguagem clara
  em PT-BR, funcionar em mobile e desktop e oferecer navegação por teclado,
  foco visível e mensagens de erro associadas aos campos. Contraste e foco MUST
  cumprir WCAG 2.2 nível AA: mínimo de 4.5:1 para texto normal, 3:1 para texto
  grande e 3:1 para indicadores de foco e componentes de interface.
- **FR-016**: O sistema MUST manter clientes fora do fluxo administrativo; o
  catálogo público não exigirá login, não criará sessão administrativa e não
  exibirá recuperação de senha.

### Key Entities

- **Conta administrativa**: identidade autenticável provisionada pelo
  mantenedor, com email e estado de acesso; não representa uma loja por si só.
- **Loja**: catálogo e unidade de tenancy que possui identidade pública e dados
  administrativos próprios.
- **Associação de loja**: vínculo entre uma conta e uma loja, com o papel
  administrativo permitido no MVP.
- **Sessão**: estado temporário que permite retornar ao painel no mesmo perfil
  de navegador enquanto continuar válido.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em um teste moderado, a primeira administradora consegue concluir
  um login válido e chegar ao painel em até 2 minutos, sem orientação técnica.
- **SC-002**: 100% dos cenários de teste com duas lojas negam leitura e mutação
  entre lojas, sem expor dados da loja não autorizada.
- **SC-003**: 100% das sessões expiradas ou encerradas exigem nova autenticação
  antes de qualquer dado administrativo ser apresentado.
- **SC-004**: 100% das telas de acesso não exibem opção de cadastro público nem
  solicitam senha ao iniciar recuperação.
- **SC-005**: Em um teste moderado, a primeira administradora consegue iniciar
  a recuperação e identificar o próximo passo sem orientação técnica e sem
  compartilhar senha, token ou código de recuperação.
- **SC-006**: 100% dos cenários definidos de retorno com sessão válida permitem
  acessar o painel no mesmo perfil de navegador sem novo login.
- **SC-007**: Uma revendedora com link de recuperação válido consegue definir
  uma nova senha e entrar novamente sem que a senha anterior seja exibida ou
  registrada.

## Assumptions

- O mantenedor provisiona previamente a conta, a loja e a associação antes do
  teste do fluxo administrativo.
- Os testes de isolamento usam duas contas administrativas associadas às suas
  respectivas lojas e uma terceira conta com identidade confirmada sem
  associação a qualquer loja; nenhuma credencial entra no repositório ou nos
  logs.
- O MVP associa a administradora da primeira loja a uma única loja; seleção
  entre múltiplas lojas não faz parte desta feature.
- O email informado para recuperação é um canal disponível para a
  administradora; problemas de entrega são tratados pelo caminho de suporte do
  mantenedor.
- Somente contas provisionadas da administradora/revendedora usam login,
  sessão, logout e recuperação de senha.
- Clientes consultam o catálogo público sem autenticação e não possuem conta no
  MVP.
- A identidade pública da loja é mantida pelo mantenedor e não é editável por
  esta feature.
- Produtos, banners, uploads, configuração de WhatsApp e operações de catálogo
  serão implementados em features posteriores, usando a associação criada
  aqui.
