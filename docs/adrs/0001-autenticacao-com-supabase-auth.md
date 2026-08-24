# ADR-0001 — Autenticação com Supabase Auth

- **Status:** Aceito
- **Data:** 2026-08-22
- **Escopo:** acesso da administradora da loja

## Contexto

O Wacatalog precisa permitir que administradoras mantenham o catálogo sem
cadastro público. As contas serão provisionadas pelo mantenedor, a sessão deve
permanecer ativa em dispositivo confiável e a recuperação precisa ser simples
sem induzir a administradora a compartilhar sua senha.

O produto também precisa preservar a fundação multi-tenant e impedir que
credenciais privilegiadas cheguem ao navegador.

## Decisão

O Wacatalog usará o Supabase Auth como provedor de autenticação do MVP, com o
seguinte modelo:

1. O único método de acesso será email e senha.
2. Contas serão criadas pelo mantenedor por meio da API administrativa do
   Supabase, em ambiente server-only.
3. Não haverá cadastro público, OAuth, Cognito ou MFA no MVP.
4. A administradora poderá iniciar a recuperação por email em uma interface com
   linguagem simples. O mantenedor poderá orientar o processo, mas nunca
   solicitar, registrar ou retransmitir a senha.
5. A sessão autenticada será persistente no dispositivo confiável, respeitando
   a validade e a renovação suportadas pelo Supabase. Uma sessão inválida deverá
   levar a administradora de volta ao login sem expor tokens ou credenciais.
6. A chave secreta administrativa do Supabase, incluindo a antiga
   `service_role`, permanecerá exclusivamente em ambiente confiável no
   servidor. Ela nunca será enviada ao browser, incluída em logs ou armazenada
   no repositório.

## Consequências

### Positivas

- O fluxo de acesso é pequeno e compatível com a familiaridade tecnológica da
  primeira administradora.
- O provisionamento manual mantém o controle operacional do primeiro uso e
  evita onboarding self-service fora do escopo.
- A recuperação por email reduz a necessidade de manipulação manual de senhas.
- A separação entre cliente público e operações administrativas preserva uma
  fronteira clara para segredos privilegiados.

### Negativas e riscos

- O mantenedor precisa provisionar cada conta e prestar suporte quando a
  recuperação não for concluída pela administradora.
- A entrega do email de recuperação depende da configuração e da capacidade de
  entrega do projeto Supabase.
- Sessões persistentes aumentam a importância de orientar o uso em dispositivo
  confiável e de oferecer uma saída explícita da conta.

## Regras derivadas para os documentos seguintes

- O PRD deve descrever login, logout, sessão persistente e recuperação em
  linguagem PT-BR simples, sem tela de cadastro.
- O modelo de dados e os contratos devem associar a conta administradora a uma
  loja sem permitir inferir acesso a outra loja.
- O plano de implementação deve separar clientes Supabase de uso público e
  cliente administrativo server-only.
- Testes devem cobrir login válido, sessão persistente, sessão expirada,
  recuperação e tentativa de acesso sem autorização.

## Alternativas consideradas

- **Cognito:** rejeitado porque a decisão de produto aprovou Supabase Auth e a
  comparação não agrega valor ao MVP.
- **OAuth:** rejeitado porque adiciona provedores e estados de recuperação que
  não são necessários para o primeiro uso.
- **Cadastro público:** rejeitado porque as contas serão provisionadas pelo
  mantenedor.
- **MFA:** rejeitado para o MVP; pode ser reavaliado em decisão futura de
  segurança.
- **Compartilhamento manual de senha pelo mantenedor:** rejeitado por risco de
  exposição e por contrariar a recuperação assistida sem compartilhamento de
  credenciais.

## Fontes

- `AGENTS.md` — invariantes de autenticação e segurança.
- `docs/workflow/checkpoint.md` — decisões aprovadas na etapa 03.
- `docs/workflow/stories-produto.md` — H3, H4, H5 e H9.
- [Supabase Auth — recuperação de senha](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase Auth — criação administrativa de usuários](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
