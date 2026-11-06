"""Authored explanation fixtures: version binding and safe publication."""

from pathlib import Path

import pytest

from narzedzia.bank import compile_bank, read_json, write_json
from narzedzia.cli import approve, approve_explanation

TASK = "alfik-test-4-sp-pl-001"


def add_guide(root: Path) -> Path:
    path = root / "zadania" / TASK / "wyjasnienie.json"
    write_json(
        path,
        {"schema": 1, "tekst": "Dwie pary dają 2 + 2 = 4 przedmioty.", "autor": "Authored fixture"},
    )
    approve_explanation(root, TASK, "test reviewer", "Arithmetic and key checked")
    return path


def test_explanation_compiles_without_changing_official_key(bank_root: Path) -> None:
    before = compile_bank(bank_root)[0]
    add_guide(bank_root)
    after = compile_bank(bank_root)[0]
    guide = after["tasks"][0]["explanation"]
    assert guide["text"] == "Dwie pary dają 2 + 2 = 4 przedmioty."
    assert guide["author"] == "Authored fixture" and len(guide["version"]) == 64
    assert before["version"] != after["version"]
    for field in ("answer", "version", "stem", "options", "source"):
        assert before["tasks"][0][field] == after["tasks"][0][field]
    assert "explanation" not in after["tasks"][1]


def test_edited_explanation_needs_new_review(bank_root: Path) -> None:
    path = add_guide(bank_root)
    record = read_json(path)
    record["tekst"] = "Zmieniony tekst wymaga ponownego sprawdzenia."
    write_json(path, record)
    with pytest.raises(ValueError, match="explanation approval is stale"):
        compile_bank(bank_root)
    approve_explanation(bank_root, TASK, "reviewer", "Reviewed revised text")
    assert compile_bank(bank_root)[0]["tasks"][0]["explanation"]["text"] == record["tekst"]


def test_reapproved_source_still_requires_explanation_review(bank_root: Path) -> None:
    add_guide(bank_root)
    path = bank_root / "zadania" / TASK / "zadanie.tex"
    path.write_text(path.read_text().replace("2+2", "1+3"))
    approve(bank_root, TASK, "reviewer", "Changed question, same answer")
    with pytest.raises(ValueError, match="explanation source is stale"):
        compile_bank(bank_root)


@pytest.mark.parametrize("text", ["", None, ["unsafe shape"], "x" * 1601])
def test_invalid_explanation_is_rejected(bank_root: Path, text: object) -> None:
    path = add_guide(bank_root)
    record = read_json(path)
    record["tekst"] = text
    write_json(path, record)
    approve_explanation(bank_root, TASK, "reviewer", "Invalid fixture")
    with pytest.raises(ValueError, match="invalid explanation text"):
        compile_bank(bank_root)
