#!/usr/bin/env python3
"""
Die HTML-Seiten aus einem gemeinsamen Rahmen und je einer Inhaltsdatei bauen.

Seit die Seite aus einer Startseite und sieben Unterseiten besteht, stuenden
Kopfzeile, Navigation und Fussbereich achtmal da - und wuerden auseinanderlaufen,
sobald man eine davon vergisst. Sie stehen deshalb einmal in `seiten/rahmen.html`
und werden hier eingesetzt.

    python3 tools/seiten.py            # baut alle Seiten neu
    python3 tools/seiten.py --pruefen  # meldet nur, ob etwas zu bauen waere

Eine Inhaltsdatei beginnt mit zwei Kommentarzeilen, aus denen Titel und
Beschreibung kommen:

    <!-- titel: Bausteine — KERS Subsystems -->
    <!-- beschreibung: Alle Bausteine des Overlays … -->

Im Rahmen stehen die Platzhalter {{TITEL}}, {{BESCHREIBUNG}}, {{INHALT}}, {{V}}
(das Cache-Kennzeichen) und {{AKTIV:name}} - letzteres wird auf der eigenen Seite
zu aria-current und sonst zu nichts.
"""

import argparse
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
QUELLEN = WURZEL / "seiten"

# Cache-Kennzeichen an CSS und JS. Hochzaehlen, wenn sich eine der beiden Dateien
# aendert - sonst behalten Browser die alte Version (GitHub Pages laesst sie
# zwischenspeichern).
VERSION = "9"


def kopfdaten(text: str) -> tuple[str, str, str]:
    """Titel und Beschreibung aus den Kommentarzeilen ziehen, Rest zurueckgeben."""
    titel = re.search(r"<!--\s*titel:\s*(.*?)\s*-->", text)
    beschr = re.search(r"<!--\s*beschreibung:\s*(.*?)\s*-->", text, re.S)
    if not titel or not beschr:
        raise SystemExit("Kopfzeilen 'titel' und 'beschreibung' fehlen")
    rest = re.sub(r"<!--\s*(?:titel|beschreibung):.*?-->\s*", "", text, count=2, flags=re.S)
    return titel.group(1), " ".join(beschr.group(1).split()), rest.strip()


def baue(rahmen: str, name: str, inhalt: str) -> str:
    titel, beschreibung, rumpf = kopfdaten(inhalt)
    seite = rahmen.replace("{{TITEL}}", titel)
    seite = seite.replace("{{BESCHREIBUNG}}", beschreibung)
    seite = seite.replace("{{INHALT}}", rumpf)
    seite = seite.replace("{{V}}", VERSION)
    # Der Punkt der eigenen Seite wird in der Navigation markiert.
    seite = re.sub(r"\{\{AKTIV:([a-z]+)\}\}",
                   lambda m: ' aria-current="page"' if m.group(1) == name else "",
                   seite)
    return seite


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--pruefen", action="store_true",
                   help="nur melden, ob eine Seite abweicht, nichts schreiben")
    a = p.parse_args()

    rahmen = (QUELLEN / "rahmen.html").read_text(encoding="utf-8")
    offen = re.findall(r"\{\{(?!TITEL|BESCHREIBUNG|INHALT|V|AKTIV:)([A-Za-z:]+)\}\}", rahmen)
    if offen:
        raise SystemExit(f"Unbekannte Platzhalter im Rahmen: {sorted(set(offen))}")

    quellen = sorted(q for q in QUELLEN.glob("*.html") if q.name != "rahmen.html")
    if not quellen:
        raise SystemExit(f"Keine Inhaltsdateien in {QUELLEN}")

    geaendert = []
    for quelle in quellen:
        name = quelle.stem
        neu = baue(rahmen, name, quelle.read_text(encoding="utf-8"))
        ziel = WURZEL / f"{name}.html"
        alt = ziel.read_text(encoding="utf-8") if ziel.is_file() else None
        if alt == neu:
            continue
        geaendert.append(ziel.name)
        if not a.pruefen:
            ziel.write_text(neu, encoding="utf-8")

    if not geaendert:
        print(f"{len(quellen)} Seiten sind aktuell (Kennzeichen v={VERSION})")
        return 0
    if a.pruefen:
        print("Zu bauen: " + ", ".join(geaendert))
        return 1
    print(f"{len(geaendert)} von {len(quellen)} Seiten gebaut: " + ", ".join(geaendert))
    return 0


if __name__ == "__main__":
    sys.exit(main())
