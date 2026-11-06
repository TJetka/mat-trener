from pathlib import Path

import pytest

from narzedzia.bank import file_hash, read_json, write_json
from narzedzia.cli import import_manifest, prepare_manifest
from narzedzia.pdf_import import extract_key, extract_tasks


def key_xml(section: str = "klasa 4P", letters: str = "BC") -> str:
    def line(text: str, x: int, y: int) -> str:
        return (
            f'<line><word xMin="{x}" xMax="{x + 12}" yMin="{y}" '
            f'yMax="{y + 10}">{text}</word></line>'
        )

    header = '<line><word xMin="100" xMax="145" yMin="10" yMax="20">' + section + "</word></line>"
    rows = "".join(
        line(str(n), 100, n * 20 + 10)
        + line(letter, 125, n * 20 + 10)
        + line("E", 160, n * 20 + 10)
        for n, letter in enumerate(letters, 1)
    )
    return (
        '<html xmlns="http://www.w3.org/1999/xhtml"><body><page>'
        + header
        + rows
        + "</page></body></html>"
    )


PAPER = """2025 klasa 4 szkoły podstawowej
Zadania po 3 punkty
1. Ile to 1 + 1?
A) 1 B) 2 C) 3 D) 4 E) 5
Zadania po 4 punkty
2. Ile to 1 + 2?
A) 1 B) 2 C) 3 D) 4 E) 5
\f"""


def test_key_is_spatial_and_requires_exact_section() -> None:
    answers = extract_key(key_xml(), "klasa 4P", [1, 2])
    assert [answers[n]["litera"] for n in (1, 2)] == ["B", "C"]
    assert answers[2]["pozycja"] == "sekcja klasa 4P, pole 2"
    with pytest.raises(ValueError, match="one exact key section"):
        extract_key(key_xml(), "klasa 2,3,4L", [1, 2])
    with pytest.raises(ValueError, match="Incomplete"):
        extract_key(key_xml(letters="B"), "klasa 4P", [1, 2])


def test_text_drafts_keep_variants_and_pages() -> None:
    tasks = extract_tasks(PAPER, [1, 2])
    assert tasks[0].pages == (1,)
    assert "Zadania" not in tasks[0].latex
    assert r"\begin{wariant}{B} 2" in tasks[0].latex
    with pytest.raises(ValueError, match="five options"):
        extract_tasks(PAPER.replace("C) 3", ""), [1, 2])


def test_idempotence_preserves_corrections_and_revision_is_proposal(
    bank_root: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    edition = read_json(bank_root / "edycje" / "alfik-test-4-sp-pl.json")
    files = {}
    for doc in edition["dokumenty"]:
        source = tmp_path / f"{doc['id']}.pdf"
        source.write_bytes(b"%PDF authored dummy")
        files[doc["id"]] = str(source)
        doc["sha256"] = file_hash(source)
    manifest = tmp_path / "import.json"
    write_json(
        manifest,
        {
            "edycja": edition,
            "pliki": files,
            "sekcja_klucza": "klasa 4P",
            "naglowek_arkusza": "klasa 4 szkoły podstawowej",
        },
    )
    monkeypatch.setattr(
        "narzedzia.cli.pdf_text", lambda path, bbox=False: key_xml() if bbox else PAPER
    )
    destination = tmp_path / "imported"
    assert import_manifest(manifest, destination)["status"] == "created"
    tex = destination / "zadania" / "alfik-test-4-sp-pl-001" / "zadanie.tex"
    tex.write_text("manual correction")
    assert import_manifest(manifest, destination)["status"] == "unchanged"
    assert tex.read_text() == "manual correction"
    incoming = read_json(manifest)
    incoming["edycja"]["dokumenty"][1]["wersja"] = "2"
    write_json(manifest, incoming)
    assert import_manifest(manifest, destination)["status"] == "review-required"
    assert tex.read_text() == "manual correction"
    assert len(list((destination / "propozycje").rglob("*.json"))) == 1


def test_key_variant_mismatch_stops_import(
    bank_root: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    edition = read_json(bank_root / "edycje" / "alfik-test-4-sp-pl.json")
    files = {}
    for doc in edition["dokumenty"]:
        path = tmp_path / f"{doc['id']}.pdf"
        path.write_bytes(b"%PDF")
        doc["sha256"] = file_hash(path)
        files[doc["id"]] = str(path)
    edition["dokumenty"][1]["wariant"] = "other"
    manifest = tmp_path / "wrong.json"
    write_json(manifest, {"edycja": edition, "pliki": files})
    monkeypatch.setattr("narzedzia.cli.pdf_text", lambda path: PAPER)
    with pytest.raises(ValueError, match="source mismatch"):
        import_manifest(manifest, tmp_path / "out")
    assert not (tmp_path / "out").exists()


def test_registration_requires_new_rules_review(
    bank_root: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    paper, key = tmp_path / "paper.pdf", tmp_path / "key.pdf"
    paper.write_bytes(b"authored paper")
    key.write_bytes(b"authored key")
    monkeypatch.setattr("narzedzia.cli.pdf_text", lambda path: "fixture\f")
    output = tmp_path / "registered.json"
    prepare_manifest(
        bank_root / "edycje" / "alfik-test-4-sp-pl.json",
        2026,
        paper,
        key,
        "https://example.org/paper.pdf",
        "https://example.org/key.pdf",
        "klasa 4P",
        "klasa 4",
        output,
    )
    manifest = read_json(output)
    assert manifest["edycja"]["reguly_sprawdzone"] is False
    assert manifest["edycja"]["publikacja"] == {}
    assert manifest["edycja"]["id_edycji"] == "alfik-2026-4-sp-pl"
    assert manifest["edycja"]["dokumenty"][0]["sha256"] == file_hash(paper)
