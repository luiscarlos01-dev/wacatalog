#!/usr/bin/env python3
"""Remind Codex about canonical documentation gates after relevant edits."""

from __future__ import annotations

import json
import re
import sys
from typing import Any


TARGET_PATTERNS = (
    re.compile(r"docs/adrs/[A-Za-z0-9._/-]+\.md"),
    re.compile(r"docs/prd/[A-Za-z0-9._/-]+\.md"),
    re.compile(r"docs/data-model\.md"),
    re.compile(r"docs/api/openapi\.ya?ml"),
    re.compile(r"specs/[A-Za-z0-9._-]+/data-model\.md"),
    re.compile(r"specs/[A-Za-z0-9._-]+/contracts/[A-Za-z0-9._/-]+"),
)

MUTATING_BASH = re.compile(
    r"(?:^|[;&|]\s*)(?:cp|install|mkdir|mv|perl\s+-pi|rm|sed\s+-i|tee|touch|truncate)\b"
    r"|(?:^|\s)(?:>>|>)\s*",
    re.MULTILINE,
)


def extract_targets(text: str) -> set[str]:
    return {match.group(0) for pattern in TARGET_PATTERNS for match in pattern.finditer(text)}


def input_text(payload: dict[str, Any]) -> str:
    tool_name = payload.get("tool_name")
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return ""

    command = tool_input.get("command")
    if not isinstance(command, str):
        return ""

    if tool_name == "apply_patch":
        edited_lines = re.findall(
            r"^\*\*\* (?:Add|Delete|Update) File: (.+)$", command, re.MULTILINE
        )
        return "\n".join(edited_lines)

    if tool_name == "Bash" and MUTATING_BASH.search(command):
        return command

    return ""


def reminder_for(targets: set[str]) -> str:
    canonical = sorted(path for path in targets if path.startswith("docs/"))
    feature = sorted(path for path in targets if path.startswith("specs/"))
    reminders: list[str] = []

    if canonical:
        reminders.append(
            "Documento canônico alterado: "
            + ", ".join(canonical)
            + ". Pare no gate humano correspondente antes de editar o próximo "
            "documento da cadeia ADR → PRD → data-model → OpenAPI. Ao fechar "
            "a cadeia, execute o docs-consistency-checker read-only."
        )

    if feature:
        reminders.append(
            "Artefato de feature alterado: "
            + ", ".join(feature)
            + ". specs/ não é fonte canônica; após aprovação da feature, "
            "consolide o delta em docs/ seguindo a ordem canônica."
        )

    return " ".join(reminders)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, TypeError):
        return 0

    if not isinstance(payload, dict) or payload.get("hook_event_name") != "PostToolUse":
        return 0

    targets = extract_targets(input_text(payload))
    if not targets:
        return 0

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": reminder_for(targets),
                }
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
