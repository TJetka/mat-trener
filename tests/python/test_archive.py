"""Acceptance checks against reviewed, checked-in archive records; no PDF/network IO."""

from pathlib import Path

from narzedzia.bank import compile_bank, read_json

ROOT = Path(__file__).resolve().parents[2] / "dane"


def test_all_available_class_iv_years_are_complete_and_attributed() -> None:
    bank, report, assets = compile_bank(ROOT)
    assert [edition["year"] for edition in bank["editions"]] == [
        *range(2005, 2020),
        *range(2021, 2026),
    ]
    assert len(bank["tasks"]) == 600
    assert all(row["complete"] and row["approved"] == 30 for row in report.values())
    for edition in bank["editions"]:
        tasks = [task for task in bank["tasks"] if task["editionId"] == edition["id"]]
        assert [task["number"] for task in tasks] == list(range(1, 31))
        assert sum(task["points"] for task in tasks) == 120
        assert {doc["rodzaj"] for doc in edition["documents"]} == {"arkusz", "klucz"}
        assert all(doc["url"].startswith("https://jersz.pl/") for doc in edition["documents"])
    for year, number in [(2006, 7), (2008, 2)]:
        task = next(t for t in bank["tasks"] if t["id"] == f"alfik-{year}-4-sp-pl-{number:03}")
        assert list(task["options"]) == list("ABCDE")
        for option in task["options"].values():
            assert option[0]["type"] == "image"
            assert assets[option[0]["file"]].is_file()


def test_archive_key_exceptions_preserve_official_evidence() -> None:
    pair = read_json(ROOT / "zadania/alfik-2012-4-sp-pl-014/meta.json")
    assert pair["klucz"]["litery"] == ["D", "E"]
    cancelled = read_json(ROOT / "zadania/alfik-2018-4-sp-pl-016/meta.json")
    assert cancelled["klucz"]["litera"] is None
    assert cancelled["klucz"]["pelny_kredyt"] is True
    assert "brak odpowiedzi" in cancelled["klucz"]["uwagi"]
    report_key = read_json(ROOT / "zadania/alfik-2021-4-sp-pl-001/meta.json")
    assert report_key["klucz"]["strona"] == 3


def test_archive_clock_notation_and_footer_boundaries() -> None:
    clock = (ROOT / "zadania/alfik-2006-4-sp-pl-003/zadanie.tex").read_text()
    assert all(time in clock for time in ["13:10", "14:15", "15:25", "16:35", "17:40"])
    for path in (ROOT / "zadania").glob("*/zadanie.tex"):
        text = path.read_text()
        assert not any(
            footer in text
            for footer in ["PARTNERZY", "PATRONI", "Zapraszamy do konkursu", "COPYRIGHT"]
        )
