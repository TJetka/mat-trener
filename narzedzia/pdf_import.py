"""Read local PDFs through Poppler; extract explicitly bounded key columns."""

from __future__ import annotations

import re
import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ExtractedTask:
    number: int
    pages: tuple[int, ...]
    latex: str


def pdf_text(path: Path, *, bbox: bool = False) -> str:
    """Extract a PDF, without a shell. XML coordinates use PDF points."""
    path = path.resolve(strict=True)
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"PDF required: {path.name}")
    mode = "-bbox-layout" if bbox else "-layout"
    try:
        result = subprocess.run(
            ["pdftotext", mode, str(path), "-"],
            check=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except FileNotFoundError as error:
        raise ValueError("Install Poppler (pdftotext) before importing PDFs") from error
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        raise ValueError(f"PDF extraction failed: {path.name}") from error
    return result.stdout


def extract_key(xml: str, section: str, expected: list[int]) -> dict[int, dict[str, object]]:
    """Read rows within the exact header's column; never collapse neighboring blanks."""
    root = ET.fromstring(xml)
    matches = []
    for page_number, page in enumerate(root.iter("{http://www.w3.org/1999/xhtml}page"), 1):
        lines = []
        for line in page.iter("{http://www.w3.org/1999/xhtml}line"):
            words = list(line.iter("{http://www.w3.org/1999/xhtml}word"))
            text = " ".join(word.text or "" for word in words)
            lines.append((text, words))
        headers = [(text, words) for text, words in lines if text.strip() == section]
        for _, words in headers:
            x0 = min(float(word.attrib["xMin"]) for word in words) - 5
            x1 = max(float(word.attrib["xMax"]) for word in words) + 5
            y0 = max(float(word.attrib["yMax"]) for word in words)
            selected = [
                word
                for word in page.iter("{http://www.w3.org/1999/xhtml}word")
                if x0 <= float(word.attrib["xMin"]) < x1
                and float(word.attrib["xMax"]) <= x1
                and float(word.attrib["yMin"]) > y0
            ]
            rows: dict[int, list[ET.Element]] = {}
            for word in selected:
                # Match printed number/letter by baseline, independently of neighboring columns.
                baseline = round(float(word.attrib["yMax"]))
                rows.setdefault(baseline, []).append(word)
            answers = {}
            for row in rows.values():
                ordered = sorted(row, key=lambda word: float(word.attrib["xMin"]))
                parts = [word.text or "" for word in ordered]
                if len(parts) == 2 and parts[0].isdigit():
                    number = int(parts[0])
                    if number in answers:
                        raise ValueError(f"Duplicate key row {section}, {number}")
                    if parts[1] not in "ABCDE" or len(parts[1]) != 1:
                        raise ValueError(f"Unresolved/cancelled key: {section}, {number}")
                    answers[number] = {
                        "litera": parts[1],
                        "strona": page_number,
                        "pozycja": f"sekcja {section}, pole {number}",
                        "bbox": [
                            float(ordered[-1].attrib[name])
                            for name in ("xMin", "yMin", "xMax", "yMax")
                        ],
                    }
            if set(answers) != set(expected):
                raise ValueError(f"Incomplete or unreadable key section: {section}")
            matches.append(answers)
    if len(matches) != 1:
        raise ValueError(f"Expected one exact key section {section!r}; found {len(matches)}")
    return matches[0]


def extract_tasks(text: str, expected: list[int]) -> list[ExtractedTask]:
    """Prepare text-only drafts, preserving option order and 1-based page provenance."""
    starts = list(re.finditer(r"(?m)^\s*(\d{1,2})\.\s+", text))
    tasks = []
    for index, match in enumerate(starts):
        number = int(match.group(1))
        stop = starts[index + 1].start() if index + 1 < len(starts) else len(text)
        raw = text[match.end() : stop]
        raw = re.split(r"©|COPYRIGHT", raw)[0]
        raw = re.sub(r"(?m)^\s*Zadania po \d punk(?:ty|tów)\s*$", "", raw)
        options = list(re.finditer(r"\b([A-E])\)\s*", raw))
        if [option.group(1) for option in options] != list("ABCDE"):
            raise ValueError(f"Task {number}: require visual transcription of five options")

        def plain(value: str) -> str:
            value = " ".join(value.split())
            for character in "%&#_$":
                value = value.replace(character, "\\" + character)
            return value

        stem = plain(raw[: options[0].start()])
        latex = f"\\begin{{tresc}}\n{stem}\n\\end{{tresc}}\n"
        for position, option in enumerate(options):
            end = options[position + 1].start() if position < 4 else len(raw)
            value = plain(raw[option.end() : end])
            if not value:
                raise ValueError(f"Task {number}: image answer needs manual transcription")
            latex += f"\\begin{{wariant}}{{{option.group(1)}}} {value} \\end{{wariant}}\n"
        start_page = text.count("\f", 0, match.end()) + 1
        end_page = start_page + raw.rstrip().count("\f")
        tasks.append(ExtractedTask(number, tuple(range(start_page, end_page + 1)), latex))
    if [task.number for task in tasks] != expected:
        raise ValueError("Extracted task numbers do not match the edition manifest")
    return tasks
