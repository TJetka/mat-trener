"""Command-line import, review and publication pipeline."""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sys
from datetime import UTC, datetime
from pathlib import Path

from narzedzia.bank import (
    compile_bank,
    digest,
    file_hash,
    read_json,
    require,
    review_hash,
    validate_edition,
    verify_math,
    write_json,
)
from narzedzia.pdf_import import extract_key, extract_tasks, pdf_text

LOGGER = logging.getLogger(__name__)


def prepare_manifest(
    template: Path,
    year: int,
    paper: Path,
    key: Path,
    paper_url: str,
    key_url: str,
    section: str,
    heading: str,
    output: Path,
) -> None:
    """Register PDF identities using an existing edition's shape, pending rule review."""
    require(not output.exists(), "manifest output exists; choose a new filename")
    edition = read_json(template)
    identity = f"{edition['id_konkursu']}-{year}-{edition['kategoria']}-{edition['wariant']}"
    edition.update(
        {
            "id_edycji": identity,
            "rok": year,
            "rok_szkolny": f"{year}/{year + 1}",
            "reguly_sprawdzone": False,
            "anulowane": [],
            "publikacja": {},
        }
    )
    organizer = edition["dokumenty"][0]["organizator"]
    edition["dokumenty"] = []
    files = {}
    for role, path, url in (("arkusz", paper, paper_url), ("klucz", key, key_url)):
        require(url.startswith("https://"), "provide an HTTPS source URL")
        text = pdf_text(path)
        source_id = f"{identity}-{role}"
        hashed = file_hash(path)
        files[source_id] = str(path.resolve())
        edition["dokumenty"].append(
            {
                "id": source_id,
                "rodzaj": role,
                "organizator": organizer,
                "rok": year,
                "id_konkursu": edition["id_konkursu"],
                "kategoria": edition["kategoria"],
                "wariant": edition["wariant"],
                "sha256": hashed,
                "wersja": hashed[:12],
                "plik": path.name,
                "url": url,
                "strony": text.count("\f"),
            }
        )
    write_json(
        output,
        {"edycja": edition, "pliki": files, "sekcja_klucza": section, "naglowek_arkusza": heading},
    )


def import_manifest(path: Path, root: Path) -> dict:
    """Import text drafts without overwriting edits; changed sources become proposals."""
    incoming = read_json(path)
    edition = incoming["edycja"]
    texts = {}
    files = {}
    for source in edition["dokumenty"]:
        source_path = Path(incoming["pliki"][source["id"]]).expanduser()
        if not source_path.is_absolute():
            source_path = path.parent / source_path
        source_path = source_path.resolve(strict=True)
        require(source_path.suffix.lower() == ".pdf", "only PDF input is allowed")
        actual_hash = file_hash(source_path)
        require(source["sha256"] == actual_hash, f"{source['id']}: source hash mismatch")
        files[source["id"]] = source_path
        texts[source["rodzaj"]] = pdf_text(source_path)
        require(str(edition["rok"]) in texts[source["rodzaj"]], "source year not found")
    validate_edition(edition)
    normalized = " ".join(texts["arkusz"].split()).lower()
    require(incoming["naglowek_arkusza"].lower() in normalized, "paper class/variant mismatch")
    expected = [task["numer"] for task in edition["oczekiwane"]]
    key_source = next(source for source in edition["dokumenty"] if source["rodzaj"] == "klucz")
    paper_source = next(source for source in edition["dokumenty"] if source["rodzaj"] == "arkusz")
    answers = extract_key(
        pdf_text(files[key_source["id"]], bbox=True), incoming["sekcja_klucza"], expected
    )
    extracted = extract_tasks(texts["arkusz"], expected)
    identity = edition["id_edycji"]
    edition_path = root / "edycje" / f"{identity}.json"
    if edition_path.exists():
        previous = read_json(edition_path)
        # Publication decisions may be added after import; never reset them.
        old = {key: value for key, value in previous.items() if key != "publikacja"}
        new = {key: value for key, value in edition.items() if key != "publikacja"}
        if old == new:
            return {"status": "unchanged", "edition": identity, "tasks": len(extracted)}
        proposal = root / "propozycje" / identity / f"{digest(edition)}.json"
        if not proposal.exists():
            write_json(
                proposal,
                {
                    "edycja": edition,
                    "poprzednia_sha256": digest(previous),
                    "zadania": [
                        {"numer": q.number, "latex": q.latex, "klucz": answers[q.number]}
                        for q in extracted
                    ],
                },
            )
        return {"status": "review-required", "edition": identity, "proposal": str(proposal)}
    # Complete extraction succeeds before the first source write.
    for task in extracted:
        task_id = f"{identity}-{task.number:03}"
        directory = root / "zadania" / task_id
        require(not directory.exists(), f"refusing to overwrite existing task: {task_id}")
    write_json(edition_path, edition)
    for task in extracted:
        task_id = f"{identity}-{task.number:03}"
        directory = root / "zadania" / task_id
        directory.mkdir(parents=True)
        (directory / "zadanie.tex").write_text(task.latex, encoding="utf-8")
        metadata = {
            "id": task_id,
            "id_edycji": identity,
            "numer": task.number,
            "punkty": edition["oczekiwane"][task.number - 1]["punkty"],
            "latex": "zadanie.tex",
            "grupa": None,
            "tag": None,
            "stan": "szkic",
            "tresc_zrodlo": {"dokument": paper_source["id"], "strony": list(task.pages)},
            "klucz": {"dokument": key_source["id"], **answers[task.number]},
        }
        write_json(directory / "meta.json", metadata)
    return {
        "status": "created",
        "edition": identity,
        "tasks": len(extracted),
        "inputHash": digest(edition),
    }


def approve(root: Path, identity: str, reviewer: str, note: str) -> None:
    """Record an explicit reviewer attestation bound to the exact task/source bytes."""
    require(
        identity and all(c in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in identity),
        "invalid task ID",
    )
    path = root / "zadania" / identity / "meta.json"
    metadata = read_json(path)
    edition = read_json(root / "edycje" / f"{metadata['id_edycji']}.json")
    require(metadata.get("grupa") and metadata.get("tag"), "classify the task before approval")
    metadata["stan"] = "zatwierdzone"
    metadata["weryfikacja"] = {
        "osoba": reviewer,
        "data": datetime.now(UTC).isoformat(),
        "uwagi": note,
        "sha256": review_hash(metadata, edition, path.parent),
    }
    write_json(path, metadata)


def inventory(directory: Path) -> dict:
    """Inventory local PDFs without copying or modifying them."""
    items = []
    for path in sorted(directory.rglob("*.pdf")):
        text = pdf_text(path)
        items.append(
            {
                "file": str(path.relative_to(directory)),
                "sha256": file_hash(path),
                "pages": text.count("\f"),
                "textCharacters": len(text.strip()),
                "needsOCR": len(text.strip()) < 100,
            }
        )
    return {"files": items, "count": len(items), "inputHash": digest(items)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    register = subparsers.add_parser("przygotuj-import")
    register.add_argument("--template", type=Path, required=True)
    register.add_argument("--year", type=int, required=True)
    register.add_argument("--paper", type=Path, required=True)
    register.add_argument("--key", type=Path, required=True)
    register.add_argument("--paper-url", required=True)
    register.add_argument("--key-url", required=True)
    register.add_argument("--section", required=True)
    register.add_argument("--heading", required=True)
    register.add_argument("--output", type=Path, required=True)
    importer = subparsers.add_parser("importuj")
    importer.add_argument("--manifest", type=Path, required=True)
    for name in ("sprawdz", "buduj"):
        command = subparsers.add_parser(name)
        command.add_argument("--output", type=Path, default=Path("public"))
        command.add_argument("--report", type=Path, default=Path("raporty/bank.json"))
    reviewer = subparsers.add_parser("zatwierdz")
    reviewer.add_argument("--id", required=True)
    reviewer.add_argument("--reviewer", required=True)
    reviewer.add_argument("--note", required=True)
    scanner = subparsers.add_parser("inwentaryzuj")
    scanner.add_argument("--directory", type=Path, required=True)
    scanner.add_argument("--output", type=Path, required=True)
    for command in (importer, reviewer, *[subparsers.choices[n] for n in ("sprawdz", "buduj")]):
        command.add_argument("--bank", type=Path, default=Path("dane"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    try:
        if args.command == "przygotuj-import":
            prepare_manifest(
                args.template,
                args.year,
                args.paper,
                args.key,
                args.paper_url,
                args.key_url,
                args.section,
                args.heading,
                args.output,
            )
        elif args.command == "importuj":
            print(json.dumps(import_manifest(args.manifest, args.bank), ensure_ascii=False))
        elif args.command == "zatwierdz":
            approve(args.bank, args.id, args.reviewer, args.note)
        elif args.command == "inwentaryzuj":
            result = inventory(args.directory)
            require(not args.output.exists(), "inventory output exists; choose a new filename")
            write_json(args.output, result)
            print(f"Inventoried {result['count']} PDFs")
        else:
            bank, report, assets = compile_bank(args.bank)
            verify_math(bank)
            write_json(args.report, report)
            if args.command == "buduj":
                for name, path in assets.items():
                    destination = args.output / name
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(path, destination)
                write_json(args.output / "bank.json", bank)
            for edition, row in report.items():
                print(
                    f"{edition}: {row['approved']}/{row['expected']} approved, "
                    f"{len(row['excluded'])} excluded, complete={row['complete']}"
                )
        return 0
    except (ValueError, KeyError, OSError) as error:
        LOGGER.error("%s", error)
        return 1


if __name__ == "__main__":
    sys.exit(main())
