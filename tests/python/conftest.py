"""Tiny authored data; no historical PDFs or network calls."""

from pathlib import Path

import pytest

from narzedzia.bank import digest, write_json
from narzedzia.cli import approve


@pytest.fixture
def bank_root(tmp_path: Path) -> Path:
    root = tmp_path / "bank"
    edition = {
        "id_edycji": "alfik-test-4-sp-pl",
        "id_konkursu": "alfik",
        "rok": 2025,
        "kategoria": "4-sp",
        "klasy": [4],
        "wariant": "pl",
        "oczekiwane": [{"numer": 1, "punkty": 3}, {"numer": 2, "punkty": 4}],
        "czas_sekundy": 240,
        "punktacja": {"start_cwiartki": 8, "kara_cwiartki_za_punkt": 1},
        "wersja_regul": "fixture-v1",
        "zrodlo_regul": "https://example.org/rules",
        "reguly_sprawdzone": True,
        "budzety_sekundy": {"3": 90, "4": 150, "5": 210},
        "publikacja": {"decyzja": "test", "podstawa": "authored fixture", "zadania": "wszystkie"},
        "dokumenty": [
            {
                "id": role,
                "rodzaj": role,
                "organizator": "Test author",
                "rok": 2025,
                "id_konkursu": "alfik",
                "kategoria": "4-sp",
                "wariant": "pl",
                "sha256": digest(role),
                "wersja": "1",
                "plik": f"{role}.pdf",
                "url": f"https://example.org/{role}.pdf",
                "strony": 1,
            }
            for role in ("arkusz", "klucz")
        ],
    }
    write_json(root / "edycje" / "alfik-test-4-sp-pl.json", edition)
    write_json(
        root / "slowniki" / "tematy.json",
        {
            "grupy": {"liczby": {"nazwa": "Liczby", "opis": "Obliczenia"}},
            "tagi": {"mnozenie": {"nazwa": "Mnożenie", "opis": "Równe grupy"}},
        },
    )
    for number, points in ((1, 3), (2, 4)):
        identity = f"alfik-test-4-sp-pl-{number:03}"
        directory = root / "zadania" / identity
        directory.mkdir(parents=True)
        (directory / "zadanie.tex").write_text(
            "\\begin{tresc}Ile to \\(2+2\\)?\\end{tresc}\n"
            + "\n".join(
                f"\\begin{{wariant}}{{{letter}}}{i}\\end{{wariant}}"
                for i, letter in enumerate("ABCDE", 1)
            ),
            encoding="utf-8",
        )
        write_json(
            directory / "meta.json",
            {
                "id": identity,
                "id_edycji": edition["id_edycji"],
                "numer": number,
                "punkty": points,
                "latex": "zadanie.tex",
                "grupa": "liczby",
                "tag": "mnozenie",
                "stan": "szkic",
                "tresc_zrodlo": {"dokument": "arkusz", "strony": [1]},
                "klucz": {
                    "dokument": "klucz",
                    "strona": 1,
                    "pozycja": f"class 4, {number}",
                    "litera": "D",
                },
            },
        )
        approve(root, identity, "test-reviewer", "Authored fixture verified")
    return root
