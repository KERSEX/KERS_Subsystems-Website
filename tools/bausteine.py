#!/usr/bin/env python3
"""
Bausteinliste und Versionsangabe aus dem Hauptprojekt in die Seite schreiben.

Namen und Reihenfolge der Bausteine stehen in LAYOUT_TEILE in `main.py` des
Overlays, die laufende Fassung in `static/version.txt`. Beides hier abzuschreiben
hiess, es bei jeder Aenderung nachzuziehen - und genau das ist zweimal
liegengeblieben. Die Beschreibungen bleiben Handarbeit (`bausteine.json`), denn
Prosa steht nirgends im Quellcode.

    python tools/bausteine.py --overlay ../KERS_Overlay

Ohne Fund bleibt die Seite unveraendert und der Rueckgabewert ist 1 - beim
Veroeffentlichen soll ein kaputter Lauf nicht stillschweigend eine leere Liste
ausliefern.
"""

import argparse
import json
import re
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent

# Genug Zahlwoerter fuer eine Bausteinliste; darueber steht die Ziffer.
ZAHLWORT = {
    10: "Zehn", 11: "Elf", 12: "Zwoelf", 13: "Dreizehn", 14: "Vierzehn",
    15: "Fuenfzehn", 16: "Sechzehn", 17: "Siebzehn", 18: "Achtzehn",
    19: "Neunzehn", 20: "Zwanzig",
}
ZAHLWORT[12] = "Zwölf"
ZAHLWORT[15] = "Fünfzehn"


def lies_bausteine(overlay: Path) -> list[tuple[str, str]]:
    """LAYOUT_TEILE aus main.py holen - Schluessel und Beschriftung, in Reihenfolge."""
    quelle = overlay / "main.py"
    text = quelle.read_text(encoding="utf-8")
    block = re.search(r"^LAYOUT_TEILE = \[(.*?)^\]", text, re.S | re.M)
    if not block:
        raise SystemExit(f"LAYOUT_TEILE nicht gefunden in {quelle}")
    paare = re.findall(r'\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)', block.group(1))
    if not paare:
        raise SystemExit(f"LAYOUT_TEILE ist leer in {quelle}")
    return paare


def lies_version(overlay: Path) -> str:
    return (overlay / "static" / "version.txt").read_text(encoding="utf-8").strip()


def baue_karten(teile, texte) -> tuple[str, list[str]]:
    """Die Karten als HTML, dazu die Schluessel ohne eigene Beschreibung."""
    zeilen, fehlen = [], []
    for schluessel, name in teile:
        text = texte.get(schluessel)
        if not text:
            fehlen.append(schluessel)
            text = "Neu in dieser Fassung — die Beschreibung folgt."
        zeilen.append(
            '      <details class="card">\n'
            f'        <summary><h3>{name}</h3></summary>\n'
            f'        <p>{text}</p>\n'
            '      </details>'
        )
    return "\n".join(zeilen), fehlen


def ersetze_zwischen(seite: str, marke: str, neu: str) -> str:
    start, ende = f"<!-- {marke}:START -->", f"<!-- {marke}:ENDE -->"
    muster = re.compile(re.escape(start) + r".*?" + re.escape(ende), re.S)
    if not muster.search(seite):
        raise SystemExit(f"Marke {marke} fehlt in index.html")
    return muster.sub(f"{start}\n{neu}\n      {ende}", seite)


def ersetze_feld(seite: str, feld: str, wert: str) -> str:
    muster = re.compile(r'(<span data-gen="' + re.escape(feld) + r'">)(.*?)(</span>)', re.S)
    if not muster.search(seite):
        raise SystemExit(f"Feld data-gen=\"{feld}\" fehlt in index.html")
    return muster.sub(lambda m: m.group(1) + wert + m.group(3), seite)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--overlay", required=True, type=Path,
                   help="Pfad zum ausgecheckten KERS_Overlay")
    p.add_argument("--pruefen", action="store_true",
                   help="nur melden, ob die Seite aktuell waere, nichts schreiben")
    a = p.parse_args()

    if not (a.overlay / "main.py").is_file():
        raise SystemExit(f"Kein Overlay unter {a.overlay}")

    teile = lies_bausteine(a.overlay)
    version = lies_version(a.overlay)
    texte = json.loads((HIER / "bausteine.json").read_text(encoding="utf-8"))

    karten, fehlen = baue_karten(teile, texte)
    anzahl = len(teile)
    wort = ZAHLWORT.get(anzahl, str(anzahl))

    seite_datei = HIER / "index.html"
    alt = seite_datei.read_text(encoding="utf-8")
    neu = ersetze_zwischen(alt, "BAUSTEINE", karten)
    neu = ersetze_feld(neu, "anzahl", str(anzahl))
    neu = ersetze_feld(neu, "anzahl-wort", wort)
    neu = ersetze_feld(neu, "version", version)

    for k in fehlen:
        print(f"  ⚠ keine Beschreibung fuer '{k}' - bitte in bausteine.json ergaenzen",
              file=sys.stderr)
    verwaist = sorted(set(texte) - {s for s, _ in teile})
    for k in verwaist:
        print(f"  ⚠ '{k}' steht in bausteine.json, aber nicht mehr in LAYOUT_TEILE",
              file=sys.stderr)

    if neu == alt:
        print(f"Seite ist aktuell: {anzahl} Bausteine, Fassung {version}")
        return 0

    if a.pruefen:
        print(f"Seite waere zu aendern: {anzahl} Bausteine, Fassung {version}")
        return 1

    seite_datei.write_text(neu, encoding="utf-8")
    print(f"Seite aktualisiert: {anzahl} Bausteine, Fassung {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
