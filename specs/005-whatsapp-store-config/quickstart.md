# Quickstart — WhatsApp da loja

Este guia valida a feature sem dados de produção nem credenciais commitadas.

## Prerequisites

- Node.js `24.19.0` e pnpm `11.22.0`.
- Loja e administradora de teste já provisionadas pelas features
  001-004 (administrador A/loja A, administrador B/loja B para o
  isolamento cross-tenant).
- Nenhuma credencial real de WhatsApp é necessária — o teste só abre um
  link `wa.me`, sem enviar mensagem real (o WhatsApp do dispositivo/
  navegador que abrir a página faz isso, fora do controle desta feature).

## Application checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # normalização, validação, reset de verificação
pnpm build
pnpm test:e2e           # os dois user stories, desktop e mobile
```

## Manual validation script

1. Entrar como administrador A (loja A), sem número de WhatsApp
   configurado ainda.
2. Tentar confirmar verificação sem número configurado; confirmar
   rejeição clara.
3. Configurar um número em formato familiar (ex.: `(11) 91234-5678`);
   confirmar que é salvo normalizado e o status mostra "não confirmado".
4. Acionar testar; confirmar que abre `wa.me` com o número normalizado,
   sem mensagem pré-preenchida.
5. Confirmar a verificação; confirmar que o status muda para "confirmado"
   com data/hora.
6. Alterar para um número diferente; confirmar que o status volta pra
   "não confirmado" automaticamente.
7. Repetir como administrador B (loja B); confirmar que ele nunca vê nem
   altera o WhatsApp da loja A.
8. Repetir os passos principais em viewport mobile; confirmar contraste,
   foco visível e navegação por teclado no formulário.

## Evidence checklist (Stage 11)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`
      limpos.
- [ ] `pnpm test` cobrindo normalização (formatos aceitos/rejeitados) e
      reset de verificação ao alterar o número.
- [ ] `pnpm test:e2e` cobrindo os dois user stories, o conflito de
      confirmar sem número, e isolamento cross-tenant.
- [ ] Verificação de acessibilidade no formulário, em mobile.
- [ ] Nenhum número real de WhatsApp em fixture, log ou commit.
