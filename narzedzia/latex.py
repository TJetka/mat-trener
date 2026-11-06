"""Parse the documented task subset; never execute TeX."""

from __future__ import annotations

import re
from pathlib import PurePosixPath
from typing import TypedDict


class Node(TypedDict, total=False):
    type: str
    text: str
    display: bool
    file: str
    alt: str


class LatexError(ValueError):
    """An unsupported construct with a source location."""


def parse_latex(source: str, filename: str = "zadanie.tex") -> dict[str, list[Node]]:
    """Return stem/A–E nodes. Only the explicit PRD subset is accepted."""
    result: dict[str, list[Node]] = {}
    cursor = 0
    start = re.compile(r"\\begin\{(tresc|wariant)\}(?:\{([A-E])\})?")

    def fail(message: str, position: int) -> None:
        line = source.count("\n", 0, position) + 1
        column = position - source.rfind("\n", 0, position)
        raise LatexError(f"{filename}:{line}:{column}: {message}")

    while cursor < len(source):
        if source[cursor].isspace():
            cursor += 1
            continue
        match = start.match(source, cursor)
        if not match:
            fail("expected tresc or wariant environment", cursor)
        assert match is not None
        environment, letter = match.groups()
        if (environment == "tresc" and letter) or (environment == "wariant" and not letter):
            fail("invalid environment argument", cursor)
        key = "stem" if environment == "tresc" else str(letter)
        if key in result:
            fail(f"duplicate {key}", cursor)
        close = rf"\end{{{environment}}}"
        end = source.find(close, match.end())
        if end < 0:
            fail(f"missing {close}", cursor)
        nodes: list[Node] = []
        position = match.end()
        while position < end:
            if source[position] == "\\":
                if source.startswith((r"\(", r"\["), position):
                    display = source[position + 1] == "["
                    delimiter = r"\]" if display else r"\)"
                    stop = source.find(delimiter, position + 2, end)
                    if stop < 0:
                        fail("unclosed math", position)
                    text = source[position + 2 : stop].strip()
                    if not text:
                        fail("empty math", position)
                    nodes.append({"type": "math", "text": text, "display": display})
                    position = stop + 2
                    continue
                picture = re.match(r"\\rysunek\{([^{}]+)\}\{([^{}]+)\}", source[position:end])
                if picture:
                    file, alt = picture.groups()
                    path = PurePosixPath(file)
                    if (
                        path.is_absolute()
                        or len(path.parts) != 1
                        or not re.fullmatch(r"[A-Za-z0-9_.-]+", file)
                        or path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".svg"}
                        or not alt.strip()
                    ):
                        fail("invalid local image path or alt text", position)
                    nodes.append({"type": "image", "file": file, "alt": alt.strip()})
                    position += picture.end()
                    continue
                if source[position : position + 2] in {r"\%", r"\&", r"\_", r"\#", r"\$"}:
                    nodes.append({"type": "text", "text": source[position + 1]})
                    position += 2
                    continue
                fail("unsupported TeX command", position)
            stop = position + 1
            while stop < end and source[stop] != "\\":
                stop += 1
            text = source[position:stop]
            if re.search(r"[{}$%]", text):
                fail("use supported math delimiters and escaped special characters", position)
            if text.strip() or (nodes and stop < end):
                nodes.append({"type": "text", "text": text})
            position = stop
        if not nodes:
            fail(f"empty {key}", cursor)
        result[key] = nodes
        cursor = end + len(close)
    if list(result) != ["stem", "A", "B", "C", "D", "E"]:
        fail("require one tresc then five variants A–E in order", 0)
    return result
