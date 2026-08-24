# Hooks de revisão automática

## Instalação local

Ative os hooks no clone com:

```sh
git config core.hooksPath .githooks
```

O `post-commit` chama `codex review --commit HEAD`, lê o contrato aprovado e os
patterns aplicáveis e grava o relatório fora do repositório, dentro de `.git/`.
O `pre-push` só permite o push quando o relatório do commit atual termina com
`VERDICT: PASS` e todos os checks obrigatórios disponíveis foram aprovados.

## Fluxo de correção

```text
commit
  → post-commit dispara contract-reviewer
  → PASS → pre-push permite
  → BLOCKED → implementer lê o relatório, corrige e cria novo commit
  → post-commit revisa novamente
```

O hook não altera código automaticamente e não faz amend do commit. Se o CLI
Codex, autenticação ou rede estiverem indisponíveis, o status fica bloqueado;
indisponibilidade nunca equivale a aprovação.
