"""Acceptance checkpoints from the visually reviewed 2025 class-4P source key."""

from pathlib import Path

import pytest

from narzedzia.bank import read_json


@pytest.mark.parametrize(("number", "letter"), [(1, "C"), (11, "B"), (21, "A"), (30, "B")])
def test_d5_source_backed_checkpoints(number: int, letter: str) -> None:
    root = Path(__file__).resolve().parents[2]
    directory = root / "dane" / "zadania" / f"alfik-2025-4-sp-pl-{number:03}"
    metadata = read_json(directory / "meta.json")
    assert metadata["klucz"]["litera"] == letter
    assert metadata["klucz"]["strona"] == 1
    assert metadata["klucz"]["pozycja"] == f"sekcja klasa 4P, pole {number}"
