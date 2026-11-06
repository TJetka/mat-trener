"""Validate source records and compile a deterministic, attributed public bank."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

from narzedzia.latex import parse_latex

TOOL_VERSION = "0.1.0"


def read_json(path: Path) -> dict:
    """Read a UTF-8 JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: expected JSON object")
    return value


def write_json(path: Path, value: object) -> None:
    """Write a generated artifact atomically, using canonical formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def digest(value: object) -> str:
    """Hash a JSON value independently of dictionary insertion order."""
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(data.encode()).hexdigest()


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: object, message: str) -> None:
    if not condition:
        raise ValueError(message)


def local_file(directory: Path, name: str) -> Path:
    """Resolve a regular file strictly within its record directory."""
    path = (directory / name).resolve(strict=True)
    require(path.is_relative_to(directory.resolve()) and path.is_file(), "unsafe file path")
    return path


def review_hash(metadata: dict, edition: dict, directory: Path) -> str:
    """Bind approval to content, metadata, every asset, rules and source versions."""
    content = {key: value for key, value in metadata.items() if key not in {"stan", "weryfikacja"}}
    tex = local_file(directory, metadata["latex"])
    nodes = parse_latex(tex.read_text(encoding="utf-8"), str(tex))
    images = sorted({n["file"] for part in nodes.values() for n in part if n["type"] == "image"})
    return digest(
        {
            "metadata": content,
            "edition": edition,
            "latex": file_hash(tex),
            "images": {name: file_hash(local_file(directory, name)) for name in images},
        }
    )


def validate_image(path: Path) -> None:
    """Reject empty images and active/external SVG content before packaging."""
    data = path.read_bytes()
    require(len(data) > 10, f"empty image: {path.name}")
    if path.suffix.lower() == ".svg":
        root = ET.fromstring(data)
        tags = {
            "svg",
            "g",
            "path",
            "rect",
            "circle",
            "ellipse",
            "line",
            "polyline",
            "polygon",
            "text",
            "tspan",
            "title",
            "desc",
        }
        for element in root.iter():
            require(element.tag.split("}")[-1] in tags, f"unsafe SVG element: {path.name}")
            for name, value in element.attrib.items():
                require(
                    not name.lower().startswith("on")
                    and name.split("}")[-1] not in {"href", "style"}
                    and not re.search(r"url\s*\(|javascript:", value, re.IGNORECASE),
                    f"unsafe SVG attribute: {path.name}",
                )
    else:
        signatures = {
            ".png": b"\x89PNG\r\n\x1a\n",
            ".jpg": b"\xff\xd8",
            ".jpeg": b"\xff\xd8",
            ".webp": b"RIFF",
        }
        require(data.startswith(signatures[path.suffix.lower()]), f"invalid image: {path.name}")


def validate_edition(edition: dict) -> None:
    """Check edition identity, source pairing, explicit scoring and publication scope."""
    for name in (
        "id_edycji",
        "id_konkursu",
        "kategoria",
        "wariant",
        "wersja_regul",
        "zrodlo_regul",
    ):
        require(isinstance(edition.get(name), str) and edition[name].strip(), f"missing {name}")
    require(re.fullmatch(r"[a-z0-9-]+", edition["id_edycji"]), "invalid edition ID")
    require(type(edition.get("rok")) is int, "invalid year")
    require(isinstance(edition.get("klasy"), list) and 4 in edition["klasy"], "missing grade 4")
    require(all(type(grade) is int for grade in edition["klasy"]), "invalid grades")
    expected = edition.get("oczekiwane", [])
    require(
        expected and [q["numer"] for q in expected] == list(range(1, len(expected) + 1)),
        "invalid expected task numbers",
    )
    require(
        all(type(q["punkty"]) is int and q["punkty"] in (3, 4, 5) for q in expected),
        "invalid expected points",
    )
    require(
        type(edition.get("czas_sekundy")) is int and edition["czas_sekundy"] > 0, "invalid duration"
    )
    for key in ("start_cwiartki", "kara_cwiartki_za_punkt"):
        require(
            type(edition.get("punktacja", {}).get(key)) is int and edition["punktacja"][key] >= 0,
            f"invalid scoring: {key}",
        )
    require(set(edition.get("budzety_sekundy", {})) == {"3", "4", "5"}, "missing time budgets")
    require(
        all(type(v) is int and v > 0 for v in edition["budzety_sekundy"].values()),
        "invalid time budgets",
    )
    require(edition.get("reguly_sprawdzone") is True, "edition rules need verification")
    sources = edition.get("dokumenty", [])
    require(len({s["id"] for s in sources}) == len(sources), "duplicate source ID")
    require({s["rodzaj"] for s in sources} >= {"arkusz", "klucz"}, "missing paper/key")
    for source in sources:
        require(source["rodzaj"] in {"arkusz", "klucz", "errata"}, "invalid document role")
        for key in ("rok", "id_konkursu", "kategoria", "wariant"):
            require(source.get(key) == edition[key], f"source mismatch: {source['id']}, {key}")
        require(re.fullmatch(r"[0-9a-f]{64}", source.get("sha256", "")), "invalid source hash")
        for key in ("organizator", "wersja", "plik"):
            require(isinstance(source.get(key), str) and source[key], f"missing source {key}")
        require(re.match(r"https://", source.get("url", "")), "missing HTTPS source attribution")
        require(type(source.get("strony")) is int and source["strony"] > 0, "invalid page count")


def compile_bank(root: Path) -> tuple[dict, dict, dict[str, Path]]:
    """Compile approved records only; any broken approved record fails the entire build.

    Returns bank, per-edition report and relative public image paths mapped to sources.
    Drafts and publication exclusions remain explicit in the report.
    """
    dictionaries = read_json(root / "slowniki" / "tematy.json")
    editions = {}
    report: dict[str, dict] = {}
    for path in sorted((root / "edycje").glob("*.json")):
        edition = read_json(path)
        validate_edition(edition)
        identity = edition["id_edycji"]
        require(
            path.stem == identity and identity not in editions, f"duplicate edition: {identity}"
        )
        require(
            not list((root / "propozycje" / identity).glob("*.json")),
            f"{identity}: source update awaits review",
        )
        editions[identity] = edition
        report[identity] = {
            "expected": len(edition["oczekiwane"]),
            "approved": 0,
            "excluded": [],
            "complete": False,
        }
    tasks = []
    seen = set()
    assets: dict[str, Path] = {}
    for metadata_path in sorted((root / "zadania").glob("*/meta.json")):
        metadata = read_json(metadata_path)
        identity = metadata.get("id", metadata_path.parent.name)
        try:
            require(identity not in seen, "duplicate task ID")
            seen.add(identity)
            edition = editions[metadata["id_edycji"]]
            status = metadata.get("stan")
            require(status in {"szkic", "do-wyjasnienia", "zatwierdzone"}, "unknown review state")
            if status != "zatwierdzone":
                report[edition["id_edycji"]]["excluded"].append({"id": identity, "reason": status})
                continue
            number = metadata["numer"]
            require(
                type(number) is int and 1 <= number <= len(edition["oczekiwane"]),
                "invalid task number",
            )
            require(identity == f"{edition['id_edycji']}-{number:03}", "unstable task ID")
            require(metadata_path.parent.name == identity, "directory/ID mismatch")
            require(
                type(metadata["punkty"]) is int
                and metadata["punkty"] == edition["oczekiwane"][number - 1]["punkty"],
                "points disagree with edition",
            )
            group, tag = metadata.get("grupa"), metadata.get("tag")
            require(
                isinstance(group, str) and group in dictionaries["grupy"], "invalid single group"
            )
            require(isinstance(tag, str) and tag in dictionaries["tagi"], "invalid single tag")
            review = metadata.get("weryfikacja", {})
            require(
                review.get("osoba") and review.get("data") and review.get("uwagi"),
                "missing review evidence",
            )
            require(
                review.get("sha256") == review_hash(metadata, edition, metadata_path.parent),
                "approval is stale; recheck content/key/assets/rules",
            )
            sources = {s["id"]: s for s in edition["dokumenty"]}
            paper, key = metadata.get("tresc_zrodlo", {}), metadata.get("klucz", {})
            require(
                paper.get("dokument") in sources and key.get("dokument") in sources,
                "missing source reference",
            )
            require(sources[paper["dokument"]]["rodzaj"] == "arkusz", "wrong paper role")
            require(sources[key["dokument"]]["rodzaj"] in {"klucz", "errata"}, "wrong key role")
            require(
                isinstance(paper.get("strony"), list) and paper["strony"], "missing paper pages"
            )
            require(
                all(
                    type(p) is int and 1 <= p <= sources[paper["dokument"]]["strony"]
                    for p in paper["strony"]
                ),
                "invalid paper pages",
            )
            require(
                type(key.get("strona")) is int
                and 1 <= key["strona"] <= sources[key["dokument"]]["strony"],
                "invalid key page",
            )
            require(
                key.get("litera") in list("ABCDE") and key.get("pozycja"),
                "invalid key letter/location",
            )
            tex = local_file(metadata_path.parent, metadata["latex"])
            parsed = parse_latex(tex.read_text(encoding="utf-8"), str(tex))
            for nodes in parsed.values():
                for node in nodes:
                    if node["type"] == "image":
                        image = local_file(metadata_path.parent, node["file"])
                        validate_image(image)
                        destination = f"rysunki/{identity}/{file_hash(image)[:16]}-{image.name}"
                        assets[destination] = image
                        node["file"] = destination
            rights = edition.get("publikacja", {})
            permitted = rights.get("zadania", [])
            if not (
                rights.get("decyzja")
                and rights.get("podstawa")
                and (permitted == "wszystkie" or number in permitted)
            ):
                report[edition["id_edycji"]]["excluded"].append(
                    {"id": identity, "reason": "no publication decision"}
                )
                continue
            tasks.append(
                {
                    "id": identity,
                    "editionId": edition["id_edycji"],
                    "number": number,
                    "points": metadata["punkty"],
                    "group": group,
                    "tag": tag,
                    "stem": parsed["stem"],
                    "options": {key: parsed[key] for key in "ABCDE"},
                    "answer": key["litera"],
                    "version": review["sha256"],
                    "source": {"paper": paper, "key": key},
                }
            )
            report[edition["id_edycji"]]["approved"] += 1
        except (KeyError, TypeError, ValueError, OSError, ET.ParseError) as error:
            raise ValueError(f"{identity}: {error}") from error
    compiled_editions = []
    profiles = {}
    for identity, edition in editions.items():
        found = {q["number"] for q in tasks if q["editionId"] == identity}
        complete = found == {q["numer"] for q in edition["oczekiwane"]}
        complete = complete and not edition.get("anulowane", [])
        report[identity]["complete"] = complete
        profile_id = f"{edition['id_konkursu']}/{edition['kategoria']}"
        profile = {
            "id": profile_id,
            "contest": edition["id_konkursu"],
            "category": edition["kategoria"],
            "grades": edition["klasy"],
            "trainingSeconds": edition["budzety_sekundy"],
        }
        require(
            profile_id not in profiles or profiles[profile_id] == profile,
            f"conflicting training profile: {profile_id}",
        )
        profiles[profile_id] = profile
        compiled_editions.append(
            {
                "id": identity,
                "profileId": profile_id,
                "year": edition["rok"],
                "grades": edition["klasy"],
                "complete": complete,
                "expected": [
                    {"number": q["numer"], "points": q["punkty"]} for q in edition["oczekiwane"]
                ],
                "durationSeconds": edition["czas_sekundy"],
                "rulesVersion": edition["wersja_regul"],
                "startQuarters": edition["punktacja"]["start_cwiartki"],
                "penaltyQuartersPerPoint": edition["punktacja"]["kara_cwiartki_za_punkt"],
                "documents": edition["dokumenty"],
            }
        )
    bank = {
        "schema": 1,
        "profiles": list(profiles.values()),
        "editions": compiled_editions,
        "tasks": tasks,
        "dictionary": dictionaries,
    }
    bank["version"] = digest(bank)
    bank["provenance"] = {
        "toolVersion": TOOL_VERSION,
        "inputHash": bank["version"],
        "randomSeed": None,
        "config": {"publicationOnly": True},
    }
    try:
        bank["provenance"]["gitSha"] = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        bank["provenance"]["gitSha"] = None
    # Copy only assets actually reachable from published tasks.
    used = {
        node["file"]
        for task in tasks
        for nodes in [task["stem"], *task["options"].values()]
        for node in nodes
        if node["type"] == "image"
    }
    return bank, report, {name: assets[name] for name in used}


def verify_math(bank: dict) -> None:
    """Use the same vendored KaTeX as the browser; invalid formulas stop the build."""
    script = Path(__file__).with_name("check-math.mjs")
    result = subprocess.run(
        ["node", str(script), "--stdin"],
        input=json.dumps(bank),
        text=True,
        capture_output=True,
        check=False,
    )
    require(result.returncode == 0, result.stderr.strip() or "KaTeX validation failed")
