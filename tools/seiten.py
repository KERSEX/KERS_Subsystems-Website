#!/usr/bin/env python3
"""
Die HTML-Seiten aus einem gemeinsamen Rahmen und je einer Inhaltsdatei bauen —
in beiden Sprachen.

Die Seite gibt es auf Deutsch und Englisch. Beide sind echte Dateien, kein
Austausch per Skript: Deutsch liegt im Wurzelverzeichnis, Englisch unter `en/`.
So funktioniert jede Sprache auch ohne JavaScript und ist einzeln verlinkbar.

    python3 tools/seiten.py            # baut alle Seiten neu
    python3 tools/seiten.py --pruefen  # meldet nur, ob etwas zu bauen waere

Eine Inhaltsdatei beginnt mit zwei Kommentarzeilen fuer Titel und Beschreibung:

    <!-- titel: Bausteine — KERS Subsystems -->
    <!-- beschreibung: Alle Bausteine des Overlays … -->

Platzhalter im Rahmen:

    {{TITEL}} {{BESCHREIBUNG}} {{INHALT}}   aus der Inhaltsdatei
    {{V}}                                   Cache-Kennzeichen (VERSION unten)
    {{WURZEL}}                              "" oder "../", je nach Ebene
    {{ANDERE_SEITE}}                        dieselbe Seite in der anderen Sprache
    {{ALT:de}} {{ALT:en}}                   fuer die hreflang-Angaben
    {{T:pfad.zum.text}}                     Text aus seiten/texte.json
    {{AKTIV:name}}                          aria-current auf der eigenen Seite
"""

import argparse
import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
QUELLEN = WURZEL / "seiten"

# Cache-Kennzeichen an CSS und JS. Hochzaehlen, wenn sich eine der beiden Dateien
# aendert - sonst behalten Browser die alte Version (GitHub Pages laesst sie
# zwischenspeichern).
VERSION = "16"

# Deutsch liegt oben, damit die Adresse ohne Sprachkuerzel auskommt; Englisch
# darunter. Die Reihenfolge bestimmt auch, was x-default bekommt.
SPRACHEN = {"de": "", "en": "en/"}


def kopfdaten(text: str) -> tuple[str, str, str]:
    titel = re.search(r"<!--\s*titel:\s*(.*?)\s*-->", text)
    beschr = re.search(r"<!--\s*beschreibung:\s*(.*?)\s*-->", text, re.S)
    if not titel or not beschr:
        raise SystemExit("Kopfzeilen 'titel' und 'beschreibung' fehlen")
    rest = re.sub(r"<!--\s*(?:titel|beschreibung):.*?-->\s*", "", text, count=2, flags=re.S)
    return titel.group(1), " ".join(beschr.group(1).split()), rest.strip()


def hole(texte: dict, pfad: str) -> str:
    """'nav.bausteine' aus dem verschachtelten Woerterbuch holen."""
    wert = texte
    for teil in pfad.split("."):
        if not isinstance(wert, dict) or teil not in wert:
            raise SystemExit(f"Text '{pfad}' fehlt in seiten/texte.json")
        wert = wert[teil]
    return str(wert)


def baue(rahmen: str, sprache: str, name: str, inhalt: str, texte: dict) -> str:
    titel, beschreibung, rumpf = kopfdaten(inhalt)
    unterordner = SPRACHEN[sprache]
    andere = texte[sprache]["andere"]

    # Von einer Seite unter en/ zeigen die gemeinsamen Dateien eine Ebene hoeher.
    hoch = "../" if unterordner else ""
    # Dieselbe Seite in der anderen Sprache - aus en/ heraus eine Ebene zurueck.
    andere_seite = (f"{hoch}{SPRACHEN[andere]}{name}.html").replace("//", "/")

    seite = rahmen
    for marke, wert in (("{{TITEL}}", titel), ("{{BESCHREIBUNG}}", beschreibung),
                        ("{{INHALT}}", rumpf), ("{{V}}", VERSION),
                        ("{{WURZEL}}", hoch), ("{{ANDERE_SEITE}}", andere_seite)):
        seite = seite.replace(marke, wert)

    # hreflang braucht Adressen, die von dieser Seite aus stimmen.
    for kuerzel, ordner in SPRACHEN.items():
        ziel = (f"{hoch}{ordner}{name}.html").replace("//", "/")
        seite = seite.replace(f"{{{{ALT:{kuerzel}}}}}", ziel)

    seite = re.sub(r"\{\{T:([a-z_.]+)\}\}", lambda m: hole(texte[sprache], m.group(1)), seite)
    seite = re.sub(r"\{\{AKTIV:([a-z]+)\}\}",
                   lambda m: ' aria-current="page"' if m.group(1) == name else "", seite)

    offen = re.findall(r"\{\{[^}]+\}\}", seite)
    if offen:
        raise SystemExit(f"{sprache}/{name}: Platzhalter nicht ersetzt: {sorted(set(offen))}")
    return seite


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--pruefen", action="store_true",
                   help="nur melden, ob eine Seite abweicht, nichts schreiben")
    a = p.parse_args()

    rahmen = (QUELLEN / "rahmen.html").read_text(encoding="utf-8")
    texte = json.loads((QUELLEN / "texte.json").read_text(encoding="utf-8"))

    # Beide Sprachen muessen dieselben Seiten haben - sonst fuehrt der
    # Sprachumschalter irgendwo ins Leere.
    namen = {s: {q.stem for q in (QUELLEN / s).glob("*.html")} for s in SPRACHEN}
    for sprache, satz in namen.items():
        if not satz:
            raise SystemExit(f"Keine Inhaltsdateien in seiten/{sprache}/")
    fehlt = namen["de"] ^ namen["en"]
    if fehlt:
        raise SystemExit("Seiten gibt es nur in einer Sprache: " + ", ".join(sorted(fehlt)))

    geaendert = []
    for sprache, ordner in SPRACHEN.items():
        ziel_ordner = WURZEL / ordner if ordner else WURZEL
        ziel_ordner.mkdir(parents=True, exist_ok=True)
        for quelle in sorted((QUELLEN / sprache).glob("*.html")):
            neu = baue(rahmen, sprache, quelle.stem, quelle.read_text(encoding="utf-8"), texte)
            ziel = ziel_ordner / f"{quelle.stem}.html"
            alt = ziel.read_text(encoding="utf-8") if ziel.is_file() else None
            if alt == neu:
                continue
            geaendert.append(f"{ordner}{ziel.name}")
            if not a.pruefen:
                ziel.write_text(neu, encoding="utf-8")

    gesamt = sum(len(s) for s in namen.values())
    if not geaendert:
        print(f"{gesamt} Seiten sind aktuell (Kennzeichen v={VERSION})")
        return 0
    if a.pruefen:
        print("Zu bauen: " + ", ".join(geaendert))
        return 1
    print(f"{len(geaendert)} von {gesamt} Seiten gebaut: " + ", ".join(geaendert))
    return 0


if __name__ == "__main__":
    sys.exit(main())
