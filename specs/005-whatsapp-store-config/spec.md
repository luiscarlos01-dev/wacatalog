# Feature Specification: WhatsApp da loja

**Feature Branch**: `005-whatsapp-store-config`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "WhatsApp da loja (PRD §4.6): a administradora configura e altera o número de WhatsApp que recebe pedidos, o sistema normaliza para o padrão internacional brasileiro, a administradora testa o número (abre o link wa.me) e confirma que a conta correta abriu, e enquanto o número não estiver válido e confirmado o envio ao cliente fica indisponível (consumido por uma feature futura de carrinho/envio). Contrato de entidade (`docs/data-model.md` §2.1 `stores`) e contrato HTTP (`PATCH /admin/store`, `POST /admin/store/whatsapp/verification`, `docs/api/openapi.yaml`) já estão aprovados e são fonte de verdade — não reinventar; especificar o comportamento e os cenários de aceitação da experiência administrativa sobre esse contrato existente."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configurar ou alterar o número de WhatsApp (Priority: P1)

Como administradora de uma loja, quero informar o número de WhatsApp que
recebe pedidos, em um formato familiar, para que o sistema o normalize e
guarde.

**Why this priority**: Sem um número configurado, não existe nada para
testar nem confirmar — é a base de toda a feature.

**Independent Test**: Informar um número em formato familiar brasileiro
(com DDD, com ou sem `+55`, com ou sem símbolos) e verificar que ele é
salvo normalizado no padrão internacional brasileiro, com o status de
verificação voltando para não confirmado.

**Acceptance Scenarios**:

1. **Given** a administradora está na própria loja, **When** ela informa
   um número de WhatsApp em formato familiar brasileiro, **Then** o
   sistema salva o número normalizado (dígitos no padrão internacional
   brasileiro) e o status de verificação fica "não confirmado".
2. **Given** um número já configurado e confirmado, **When** a
   administradora o altera para um número diferente, **Then** o novo
   número é salvo e o status de verificação volta para "não confirmado",
   mesmo que o número anterior já estivesse confirmado.
3. **Given** a administradora informa um valor que não corresponde a um
   número de telefone brasileiro válido, **When** ela tenta salvar,
   **Then** o sistema rejeita com uma mensagem clara em PT-BR, sem alterar
   o número já configurado (se houver).

---

### User Story 2 - Testar e confirmar o número (Priority: P2)

Como administradora, quero testar o número configurado abrindo o WhatsApp
correspondente e confirmar que é a conta certa, para habilitar o envio de
pedidos com segurança.

**Why this priority**: Completa o valor da feature — sem confirmação, o
número configurado não habilita nada (regra já aprovada em
`docs/data-model.md` §2.1); depende de um número já estar configurado
(User Story 1).

**Independent Test**: Com um número configurado e não confirmado, acionar
"testar", abrir o link correspondente, e confirmar; verificar que o
status muda para "confirmado" e a data de confirmação é preenchida.

**Acceptance Scenarios**:

1. **Given** um número de WhatsApp configurado e não confirmado, **When**
   a administradora aciona testar, **Then** o sistema abre o link `wa.me`
   correspondente ao número normalizado, sem preencher nenhuma mensagem.
2. **Given** a administradora abriu o teste e reconheceu a conta correta,
   **When** ela confirma, **Then** o status muda para "confirmado" e a
   data/hora da confirmação é registrada.
3. **Given** nenhum número está configurado, **When** a administradora
   tenta confirmar a verificação, **Then** o sistema rejeita a ação com
   uma mensagem clara indicando que é preciso configurar um número
   primeiro.
4. **Given** um número já confirmado, **When** a administradora aciona
   testar novamente sem alterar o número, **Then** o teste funciona
   normalmente e reconfirmar mantém o status "confirmado" (atualizando a
   data de confirmação).

---

### Edge Cases

- O que acontece se a administradora tentar configurar um número de outra
  loja ou alterar a verificação de outra loja? Negado sem revelar dados de
  outra loja (isolamento de tenant, ADR-0002).
- O que acontece se a administradora informar o mesmo número já
  configurado (nenhuma mudança real)? O sistema aceita normalmente; como o
  valor normalizado é idêntico, não há razão de negócio para resetar a
  confirmação, mas o contrato já aprovado (`docs/data-model.md` §2.1:
  "alterar o número volta o status para não confirmado") trata isso como
  qualquer chamada de atualização — ver Assumptions.
- O que acontece se a administradora fechar a aba do teste sem confirmar?
  Nada muda; o número continua configurado e não confirmado, sem limite de
  tentativas.
- O que acontece com o link de teste se o número tiver um formato
  inesperado que passou na validação mas não corresponde a um WhatsApp
  real? Fora do controle do sistema — a confirmação manual da
  administradora é exatamente o mecanismo que cobre esse caso (PRD §4.6);
  o sistema não valida contra uma API do WhatsApp.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que a administradora configure ou
  altere o número de WhatsApp da própria loja, aceitando formatos
  familiares de número brasileiro (com/sem código do país, com/sem
  símbolos de formatação).
- **FR-002**: O sistema DEVE normalizar o número aceito para o padrão
  internacional brasileiro (dígitos, prefixo `55`) antes de salvar.
- **FR-003**: O sistema DEVE rejeitar, com mensagem clara em PT-BR, um
  valor que não corresponda a um número de telefone brasileiro válido,
  sem alterar o número já configurado.
- **FR-004**: O sistema DEVE voltar o status de verificação para "não
  confirmado" sempre que o número for alterado com sucesso, mesmo que o
  número anterior estivesse confirmado.
- **FR-005**: O sistema DEVE permitir que a administradora abra um link
  `wa.me` gerado a partir do número normalizado, sem nenhuma mensagem
  pré-preenchida, para testar a conta correspondente.
- **FR-006**: O sistema DEVE permitir que a administradora confirme a
  verificação do número configurado, registrando o status "confirmado" e
  a data/hora da confirmação.
- **FR-007**: O sistema DEVE rejeitar a confirmação de verificação quando
  não houver nenhum número configurado, com mensagem clara indicando a
  causa.
- **FR-008**: O sistema NÃO DEVE permitir que uma administradora configure
  ou confirme o número de WhatsApp de uma loja que não é a sua.
- **FR-009**: O sistema DEVE exibir, na área administrativa, o número
  configurado (ou sua ausência) e o status atual de verificação.

### Key Entities _(include if feature involves data)_

- **Loja** (`stores`, `docs/data-model.md` §2.1): `whatsapp_number`,
  `whatsapp_verification_status`, `whatsapp_verified_at` — campos já
  aprovados, reusados sem alteração.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A administradora consegue configurar o número de WhatsApp
  da própria loja em um formato familiar, sem precisar saber o formato
  internacional de antemão.
- **SC-002**: Alterar o número sempre volta o status para "não
  confirmado", sem exceção, mesmo vindo de um número já confirmado.
- **SC-003**: A administradora consegue testar e confirmar o número em
  até dois passos (abrir o teste, confirmar), sem orientação técnica.
- **SC-004**: Nenhuma tentativa de confirmar verificação sem número
  configurado é aceita.
- **SC-005**: Uma administradora nunca configura nem confirma o número de
  WhatsApp de outra loja.

## Assumptions

- O contrato de entidade (`docs/data-model.md` §2.1) e o contrato HTTP
  (`PATCH /admin/store`, `POST /admin/store/whatsapp/verification`,
  `docs/api/openapi.yaml`) já aprovados são reaproveitados sem alteração;
  esta feature especifica comportamento e experiência administrativa sobre
  esse contrato existente.
- Não existe fluxo para "remover" o número (voltar a `null`) — o contrato
  aprovado (`UpdateWhatsappRequest.whatsappNumber` obrigatório) só permite
  substituir por outro número válido. Fora do escopo desta feature.
- Reenviar o mesmo número já configurado é tratado como uma atualização
  normal (reseta a confirmação), seguindo a regra já aprovada; não é um
  caso especial otimizado para preservar a confirmação.
- O algoritmo de normalização/validação de número brasileiro é decisão do
  plano técnico (regras de DDD, 8 vs. 9 dígitos), não deste documento; o
  formato final já está fixado pelo contrato aprovado (`^55[0-9]{10,11}$`,
  visto em `PublicCatalog`).
- O consumo do status de verificação pelo carrinho/envio ao cliente (PRD
  §4.5) é uma feature futura; esta feature só mantém o estado corretamente,
  não implementa o carrinho.
- Sem meta de performance numérica; volume de teste segue a mesma loja já
  usada nas features anteriores.
