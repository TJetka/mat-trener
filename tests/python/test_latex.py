import pytest

from narzedzia.latex import LatexError, parse_latex


def source(stem: str = "Ola ma \\(3\\) kredki.") -> str:
    return f"\\begin{{tresc}}{stem}\\end{{tresc}}\n" + "\n".join(
        f"\\begin{{wariant}}{{{letter}}}{i}\\end{{wariant}}" for i, letter in enumerate("ABCDE")
    )


def test_polish_text_math_paragraph_and_image() -> None:
    parsed = parse_latex(source("Żółw.\n\n\\[\\frac{1}{2}\\]\\rysunek{plan.png}{Dwa pola}"))
    assert list(parsed) == ["stem", "A", "B", "C", "D", "E"]
    assert [n["type"] for n in parsed["stem"]] == ["text", "math", "image"]
    assert parsed["stem"][1] == {"type": "math", "text": r"\frac{1}{2}", "display": True}
    assert parsed["stem"][2]["alt"] == "Dwa pola"


@pytest.mark.parametrize(
    "stem",
    [
        r"\input{secret}",
        r"\(x",
        r"\rysunek{../x.png}{x}",
        r"\rysunek{https://evil/x.png}{x}",
        r"$x$",
        r"\textbf{x}",
    ],
)
def test_rejects_unsupported_constructs_with_location(stem: str) -> None:
    with pytest.raises(LatexError, match=r"example.tex:1:\d+:"):
        parse_latex(source(stem), "example.tex")


def test_requires_ordered_unique_five_variants() -> None:
    with pytest.raises(LatexError, match="duplicate"):
        parse_latex(source().replace("{E}", "{A}"))
    with pytest.raises(LatexError, match="five variants"):
        parse_latex(source().split(r"\begin{wariant}{E}")[0])


def test_spaces_between_adjacent_math_nodes_are_not_lost() -> None:
    parsed = parse_latex(source(r"\(3\) \(4\)"))
    assert parsed["stem"][1] == {"type": "text", "text": " "}
