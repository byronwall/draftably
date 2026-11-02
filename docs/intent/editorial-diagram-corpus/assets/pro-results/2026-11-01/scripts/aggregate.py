#!/usr/bin/env python3
"""Recompute source counts, native run status and the human-readable file register.

This reads authored sources and actual command results. It does not assign visual ratings.
"""
from __future__ import annotations
import csv
import hashlib
import json
from pathlib import Path
import re
import shlex
import statistics
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]

def publisher_group(publisher: str) -> str:
    # Conservative independence count: all three Google-associated publishing properties merge.
    if publisher in ("Google / Chrome for Developers", "web.dev", "The Go Blog"):
        return "Google (Chrome, web.dev, Go)"
    return publisher


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path, fallback=None):
    if not path.exists():
        return fallback
    return json.loads(path.read_text())


def write_csv(name: str, rows: list[dict]) -> None:
    if not rows:
        return
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with (ROOT / name).open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v
                             for k, v in row.items()})


def lines(path: Path):
    for raw in path.read_text().splitlines():
        if not raw.strip() or raw.lstrip().startswith(("#", "//")):
            continue
        lex = shlex.shlex(raw, posix=True)
        lex.whitespace_split = True
        lex.commenters = "#"
        tokens = list(lex)
        if "//" in tokens:
            tokens = tokens[:tokens.index("//")]
        if tokens:
            yield tokens


def effort(path: Path) -> dict:
    parsed = list(lines(path))
    commands = [t[0].lstrip("+~-.") for t in parsed]
    count = lambda names: sum(c in names for c in commands)
    style_lines = style_attrs = sized_lines = note_widths = port_controls = 0
    forbidden = []
    for tokens in parsed:
        command = tokens[0].lstrip("+~-.")
        attrs = {t.split("=", 1)[0]: t.split("=", 1)[1] for t in tokens[1:] if "=" in t}
        styles = sum(k in attrs for k in ("color", "shade")) if command in ("node", "group") else 0
        if command == "theme":
            styles = 1 + len(attrs)
        if command == "theme-color":
            styles = sum(k in attrs for k in ("fill", "stroke", "ink"))
        style_attrs += styles
        style_lines += bool(styles)
        sized = command == "size" or any(k in attrs for k in ("min-width", "min-height", "unit-width"))
        sized |= command in ("diagram", "note") and "width" in attrs
        sized_lines += bool(sized)
        note_widths += command == "note" and "width" in attrs
        port_controls += command == "edge" and any(k in attrs for k in ("from", "to"))
        if command in ("pin", "nudge", "stay", "size", "theme", "theme-color") or sized or styles:
            forbidden.append(" ".join(tokens))
    return dict(non_comment_lines=len(parsed), declarations=count({"node", "group", "edge"}),
                nodes=count({"node"}), groups=count({"group"}), edges=count({"edge"}),
                layout_lines=count({"layout"}),
                refinement_lines=count({"order", "align", "near", "size", "pin", "nudge", "stay", "routing"}),
                layout_and_refinement_lines=count({"layout", "order", "align", "near", "size", "pin", "nudge", "stay", "routing"}),
                pins=count({"pin"}), nudges=count({"nudge"}), stays=count({"stay"}),
                manual_size_lines=sized_lines, note_width_lines=note_widths,
                styling_lines=style_lines, styling_assignments=style_attrs,
                explicit_port_lines=port_controls, notes=count({"note"}), legends=count({"legend"}),
                v0_restriction_violations=forbidden if path.stem == "v0" else [])


def main():
    sources, efforts, validations, warnings, measures, ratings, integrity, diagnostics = [], [], [], [], [], [], [], []
    cases = []
    for metadata in (ROOT / "corpus").glob("*/item.json"):
        item = read_json(metadata)
        cases.append((item["id"], metadata.parent, item))
    for case_id, folder, item in sorted(cases):
        original = next(iter(sorted(folder.glob("reference.*"))), None)
        review = read_json(folder / "review.json", {})
        source = {k: item.get(k, "unknown") for k in (
            "id", "slug", "title", "publisher", "author", "publication_date", "access_date",
            "page_url", "image_url", "figure", "license", "patterns", "principal_objects",
            "reading_path", "merit", "confirmation_case")}
        source.update(folder=str(folder.relative_to(ROOT)),
                      publisher_group=publisher_group(item["publisher"]),
                      domain=item.get("domain", "software/computing" if int(case_id[1:]) <= 22 else "adjacent"),
                      reference_file=str(original.relative_to(ROOT)) if original else "MISSING",
                      reference_bytes=original.stat().st_size if original else 0,
                      reference_sha256=sha(original) if original else "MISSING")
        sources.append(source)
        for stage in ("v0", "v1", "v2"):
            path = folder / f"{stage}.draft"
            if not path.exists():
                validations.append(dict(id=case_id, stage=stage, status="missing-source"))
                continue
            counts = effort(path)
            efforts.append(dict(id=case_id, stage=stage, **counts,
                                refinement_cycles=review.get("refinement_cycles", "unrecorded"),
                                authoring_minutes="not-measured"))
            result = read_json(folder / f"{stage}.validation.json", {})
            codes = {k: v.get("exit_code") for k, v in result.get("commands", {}).items()}
            matches = result.get("source_sha256") == sha(path)
            valid = codes.get("check") == 0 and codes.get("inspect") == 0 and codes.get("svg") == 0 and matches
            rendered = valid and codes.get("shoot") == 0 and (folder / f"{stage}.png").exists()
            validations.append(dict(id=case_id, stage=stage,
                status="validated-and-rendered" if rendered else "validated-svg" if valid else "authored-unvalidated",
                source_sha256=sha(path), validation_matches_source=matches,
                **{k + "_exit": codes.get(k, "not-run") for k in ("check", "inspect", "svg", "shoot")},
                log=result.get("log", "MISSING")))
            if result.get("log"):
                check = ROOT / result["log"] / "check.stdout.log"
                for line in check.read_text().splitlines() if check.exists() else []:
                    if not line.startswith(("warning", "error", "info")):
                        continue
                    code = re.search(r"\[([^]]+)\]$", line)
                    entry=dict(id=case_id, stage=stage, level=line.split()[0],
                               code=code[1] if code else ("error" if line.startswith("error") else "unlabeled-info"), message=line)
                    diagnostics.append(entry)
                    if not line.startswith("info"):
                        warnings.append(entry)
            geo = read_json(folder / f"{stage}.geometry.json", {})
            measures.append(dict(id=case_id, stage=stage, **geo.get("metrics", {})))
            rated = review.get("stages", {}).get(stage, {})
            ratings.append(dict(id=case_id, stage=stage, **rated,
                                v0_readability_vs_reference=review.get("v0_readability_vs_reference", "unrecorded"),
                                stopping_reason=review.get("stopping_reason", "unrecorded"),
                                dsl_nastiness=review.get("dsl_nastiness", "unrecorded")))
        frozen = read_json(folder / "v0-frozen.json", {})
        integrity.append(dict(id=case_id, v0_sha256=sha(folder / "v0.draft"),
                              freeze_matches=frozen.get("sha256") == sha(folder / "v0.draft")))
    for filename, rows in [("sources.csv", sources), ("effort.csv", efforts), ("validation.csv", validations),
                           ("warnings.csv", warnings), ("render-metrics.csv", measures),
                           ("ratings.csv", ratings), ("freeze-integrity.csv", integrity),
                           ("diagnostics.csv", diagnostics)]:
        write_csv(filename, rows)
    summary = dict(accepted=len(sources), publishers=sorted(set(s["publisher"] for s in sources)),
                   independent_publisher_groups=sorted(set(s["publisher_group"] for s in sources)),
                   authored=len(efforts), validated=sum(v["status"].startswith("validated") for v in validations),
                   rendered=sum(v["status"] == "validated-and-rendered" for v in validations),
                   comparisons=len(list((ROOT / "corpus").glob("*/comparison.png"))),
                   detail_comparisons=len(list((ROOT / "corpus").glob("*/details/comparison.png"))),
                   confirmation_cases=[s["id"] for s in sources if s["confirmation_case"] is True],
                   v0_freeze_mismatches=[r["id"] for r in integrity if not r["freeze_matches"]],
                   v0_restriction_violations=[r["id"] for r in efforts if r["v0_restriction_violations"]],
                   readability_counts=dict(Counter(r["v0_readability_vs_reference"] for r in ratings if r["stage"]=="v0")),
                   ratings_by_stage={s:{axis:{"median":statistics.median(r[axis] for r in ratings if r["stage"]==s and axis in r),
                                               "counts":dict(sorted(Counter(r[axis] for r in ratings if r["stage"]==s and axis in r).items()))}
                                         for axis in ("quality","fidelity","semantic") if any(r["stage"]==s and axis in r for r in ratings)}
                                     for s in ("v0","v1","v2")},
                   effort_by_stage={s: {"median_lines": statistics.median(r["non_comment_lines"] for r in efforts if r["stage"] == s),
                                        "total_pins": sum(r["pins"] for r in efforts if r["stage"] == s),
                                        "total_nudges": sum(r["nudges"] for r in efforts if r["stage"] == s)}
                                    for s in ("v0", "v1", "v2") if any(r["stage"] == s for r in efforts)})
    (ROOT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
