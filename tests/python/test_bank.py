from pathlib import Path

import pytest

from narzedzia.bank import compile_bank, read_json, verify_math, write_json
from narzedzia.cli import approve


def meta(root: Path, number: int = 1) -> Path:
    return root / "zadania" / f"alfik-test-4-sp-pl-{number:03}" / "meta.json"


def test_smoke_source_to_publishable_bank(bank_root: Path) -> None:
    bank, report, assets = compile_bank(bank_root)
    verify_math(bank)
    assert bank["schema"] == 1
    assert len(bank["tasks"]) == 2 and assets == {}
    assert report["alfik-test-4-sp-pl"]["complete"] is True
    assert bank["tasks"][0]["answer"] == "D"
    assert len(bank["version"]) == 64
    assert bank == compile_bank(bank_root)[0]


def test_partial_edition_still_supplies_training(bank_root: Path) -> None:
    path = meta(bank_root, 2)
    record = read_json(path)
    record["stan"] = "szkic"
    write_json(path, record)
    bank, report, _ = compile_bank(bank_root)
    assert len(bank["tasks"]) == 1
    assert bank["editions"][0]["complete"] is False
    assert report["alfik-test-4-sp-pl"]["excluded"][0]["reason"] == "szkic"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("grupa", ["liczby", "logika"]),
        ("tag", None),
        ("tag", "unknown"),
        ("klucz", {}),
        ("punkty", 5),
    ],
)
def test_invalid_approved_record_fails(bank_root: Path, field: str, value: object) -> None:
    path = meta(bank_root)
    record = read_json(path)
    record[field] = value
    write_json(path, record)
    with pytest.raises(ValueError, match="alfik-test-4-sp-pl-001"):
        compile_bank(bank_root)


def test_manual_content_change_invalidates_approval(bank_root: Path) -> None:
    path = meta(bank_root).parent / "zadanie.tex"
    path.write_text(path.read_text().replace("2+2", "2+3"))
    with pytest.raises(ValueError, match="approval is stale"):
        compile_bank(bank_root)


def test_image_option_keeps_letter_and_missing_image_fails(bank_root: Path) -> None:
    path = meta(bank_root).parent / "zadanie.tex"
    image = path.parent / "square.svg"
    image.write_text('<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>')
    path.write_text(path.read_text().replace(r"{C}3", r"{C}\rysunek{square.svg}{Kwadrat}"))
    approve(bank_root, "alfik-test-4-sp-pl-001", "reviewer", "C image checked")
    bank, _, assets = compile_bank(bank_root)
    assert bank["tasks"][0]["options"]["C"][0]["type"] == "image"
    assert len(assets) == 1
    image.unlink()
    with pytest.raises(ValueError, match="alfik-test-4-sp-pl-001"):
        compile_bank(bank_root)


def test_math_is_checked_by_actual_browser_renderer(bank_root: Path) -> None:
    path = meta(bank_root).parent / "zadanie.tex"
    path.write_text(path.read_text().replace("2+2", r"\unknown{x}"))
    approve(bank_root, "alfik-test-4-sp-pl-001", "reviewer", "malformed math test")
    bank, _, _ = compile_bank(bank_root)
    with pytest.raises(ValueError, match="alfik-test-4-sp-pl-001"):
        verify_math(bank)


def test_publication_scope_and_cancelled_edition(bank_root: Path) -> None:
    path = bank_root / "edycje" / "alfik-test-4-sp-pl.json"
    edition = read_json(path)
    edition["publikacja"]["zadania"] = [1]
    edition["anulowane"] = [2]
    write_json(path, edition)
    record = read_json(meta(bank_root, 2))
    record["klucz"].update(litera=None, pelny_kredyt=True, uwagi="Authored cancellation rule")
    write_json(meta(bank_root, 2), record)
    for number in (1, 2):
        approve(bank_root, f"alfik-test-4-sp-pl-{number:03}", "reviewer", "publication scope")
    bank, report, _ = compile_bank(bank_root)
    assert len(bank["tasks"]) == 1
    assert bank["editions"][0]["complete"] is False
    assert report["alfik-test-4-sp-pl"]["excluded"][0]["reason"] == "no publication decision"


def test_pending_source_revision_blocks_old_bank(bank_root: Path) -> None:
    write_json(bank_root / "propozycje" / "alfik-test-4-sp-pl" / "revision.json", {})
    with pytest.raises(ValueError, match="source update awaits review"):
        compile_bank(bank_root)


def test_multiple_official_answers_and_full_credit(bank_root: Path) -> None:
    first = read_json(meta(bank_root))
    first["klucz"]["litery"] = ["D", "E"]
    write_json(meta(bank_root), first)
    second = read_json(meta(bank_root, 2))
    second["klucz"].update(litera=None, pelny_kredyt=True, uwagi="All choices and blank accepted")
    write_json(meta(bank_root, 2), second)
    path = bank_root / "edycje" / "alfik-test-4-sp-pl.json"
    edition = read_json(path)
    edition["anulowane"] = [2]
    write_json(path, edition)
    for number in (1, 2):
        approve(bank_root, f"alfik-test-4-sp-pl-{number:03}", "reviewer", "Authored key exceptions")
    bank, report, _ = compile_bank(bank_root)
    assert bank["tasks"][0]["acceptedAnswers"] == ["D", "E"]
    assert bank["tasks"][1]["answer"] is None
    assert bank["tasks"][1]["awardAll"] is True
    assert "acceptedAnswers" not in bank["tasks"][1]
    assert report["alfik-test-4-sp-pl"]["complete"] is True


@pytest.mark.parametrize("letters", [[], ["E"], ["D", "D"], ["D", "F"], "DE"])
def test_invalid_accepted_answers_rejected(bank_root: Path, letters: object) -> None:
    record = read_json(meta(bank_root))
    record["klucz"]["litery"] = letters
    write_json(meta(bank_root), record)
    approve(bank_root, "alfik-test-4-sp-pl-001", "reviewer", "Invalid key test")
    with pytest.raises(ValueError, match="invalid accepted key letters"):
        compile_bank(bank_root)


def test_full_credit_requires_explicit_cancellation(bank_root: Path) -> None:
    record = read_json(meta(bank_root))
    record["klucz"].update(litera=None, pelny_kredyt=True, uwagi="Missing edition cancellation")
    write_json(meta(bank_root), record)
    approve(bank_root, "alfik-test-4-sp-pl-001", "reviewer", "Invalid cancellation test")
    with pytest.raises(ValueError, match="full credit requires documented cancellation"):
        compile_bank(bank_root)
