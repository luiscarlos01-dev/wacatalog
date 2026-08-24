#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path


HOOK = Path(__file__).with_name("documentation_review.py")


def run_hook(tool_name: str, command: str) -> dict[str, object] | None:
    payload = {
        "hook_event_name": "PostToolUse",
        "tool_name": tool_name,
        "tool_input": {"command": command},
    }
    result = subprocess.run(
        [sys.executable, str(HOOK)],
        input=json.dumps(payload),
        capture_output=True,
        check=True,
        text=True,
    )
    return json.loads(result.stdout) if result.stdout else None


class DocumentationReviewHookTest(unittest.TestCase):
    def test_apply_patch_reports_canonical_document(self) -> None:
        output = run_hook(
            "apply_patch",
            "*** Begin Patch\n*** Update File: docs/prd/wacatalog-mvp.md\n*** End Patch",
        )

        self.assertIsNotNone(output)
        context = output["hookSpecificOutput"]["additionalContext"]  # type: ignore[index]
        self.assertIn("gate humano", context)
        self.assertIn("docs-consistency-checker", context)

    def test_apply_patch_ignores_non_documentation_file(self) -> None:
        output = run_hook(
            "apply_patch",
            "*** Begin Patch\n*** Update File: src/app.tsx\n*** End Patch",
        )

        self.assertIsNone(output)

    def test_read_only_bash_command_is_ignored(self) -> None:
        output = run_hook("Bash", "sed -n '1,80p' docs/data-model.md")

        self.assertIsNone(output)

    def test_mutating_bash_command_reports_canonical_document(self) -> None:
        output = run_hook("Bash", "touch docs/data-model.md")

        self.assertIsNotNone(output)

    def test_feature_contract_requests_canonical_consolidation(self) -> None:
        output = run_hook(
            "apply_patch",
            "*** Begin Patch\n*** Add File: specs/001-catalog/contracts/catalog.yaml\n*** End Patch",
        )

        self.assertIsNotNone(output)
        context = output["hookSpecificOutput"]["additionalContext"]  # type: ignore[index]
        self.assertIn("não é fonte canônica", context)


if __name__ == "__main__":
    unittest.main()
