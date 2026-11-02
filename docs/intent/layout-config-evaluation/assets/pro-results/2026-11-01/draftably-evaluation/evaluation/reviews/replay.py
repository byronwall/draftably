#!/usr/bin/env python3
"""Portable launcher for recovered, previously executed review snippets.

This launcher was added at packaging time and was not used for the original
checks. It substitutes only the bundle-root literal. See README.md.
"""
from __future__ import annotations

import argparse
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
BUNDLE = HERE.parents[1]
SCRIPTS = {
    "edit-integrity": "executed_heldout_edit_integrity.py",
    "edit-arithmetic": "executed_heldout_edit_arithmetic.py",
    "preoutcome-routing": "executed_preoutcome_routing_validation.py",
    "routing": "executed_heldout_routing_reconciliation.py",
    "routing-decision": "executed_routing_decision_followup.py",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("check", choices=SCRIPTS)
    parser.add_argument(
        "--write-review-json",
        action="store_true",
        help="Allow the two routing snippets to write review JSON, as they did originally.",
    )
    args = parser.parse_args()
    if args.check in ("routing", "routing-decision") and not args.write_review_json:
        parser.error(
            "This recovered snippet writes data/analysis/heldout-routing-review.json. "
            "Use --write-review-json in a replay copy of the bundle."
        )
    path = HERE / SCRIPTS[args.check]
    source = path.read_text()
    originals = [
        "root=pathlib.Path('deliverables')",
        "root=pathlib.Path('/workspace/scratch/8279601ec156/deliverables')",
    ]
    replacement = "root=pathlib.Path(" + repr(str(BUNDLE)) + ")"
    matched = [literal for literal in originals if literal in source]
    if len(matched) != 1:
        raise RuntimeError("Expected exactly one known original bundle-root literal.")
    source = source.replace(matched[0], replacement, 1)
    sys.dont_write_bytecode = True
    print(
        "Replaying the recovered snippet; only its root path is substituted: "
        + str(path),
        file=sys.stderr,
    )
    exec(compile(source, str(path), "exec"), {"__name__": "__main__", "__file__": str(path)})


if __name__ == "__main__":
    main()
