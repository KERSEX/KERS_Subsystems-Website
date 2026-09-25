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
    {{ALT:de}} {{ALT:en}}                   fuer die hreflang-Angaben (absolut)
    {{URL}} {{BASIS}}                       Adresse dieser Seite / der Seite (absolut)
    {{T:pfad.zum.text}}                     Text aus seiten/texte.json
    {{AKTIV:name}}                          aria-current auf der eigenen Seite

Text, der erst ab einer bestimmten Version des Overlays stimmt, steht in einer
Weiche - in Inhaltsdateien wie im Rahmen, auch mitten im Satz:

    <!-- AB 0.3.0 -->so ist es ab 0.3.0<!-- SONST -->so ist es bisher<!-- ENDE -->

Das Gegenstueck ist VOR: Inhalt, der nur gilt, solange die Version noch NICHT
draussen ist - eine Ankuendigung, die mit dem Release von selbst verschwindet:

    <!-- VOR 0.3.0 -->Bald: 0.3.0<!-- ENDE -->

Der SONST-Teil darf fehlen. Welche Version gilt, steht in seiten/stand.json -
dort traegt tools/bausteine.py die des neuesten Releases ein. So steht Text fuer
die naechste Version schon vorher bereit und geht mit dem Release von selbst
live, ohne dass die Seite bis dahin verspricht, was der Download noch nicht
kann. Weichen lassen sich nicht verschachteln.

    python3 tools/seiten.py --stand 0.3.0   # Vorschau, als waere 0.3.0 draussen
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
VERSION = "23"

# Deutsch liegt oben, damit die Adresse ohne Sprachkuerzel auskommt; Englisch
# darunter. Die Reihenfolge bestimmt auch, was x-default bekommt.
SPRACHEN = {"de": "", "en": "en/"}

# Wo die Seite liegt. Vorschaubild, hreflang und canonical brauchen volle
# Adressen - Discord, WhatsApp und Suchmaschinen werten relative Pfade dort nicht.
BASIS = "https://kersex.github.io/KERS_Subsystems-Website/"


def adresse(ordner: str, name: str) -> str:
    """Volle Adresse einer Seite; die Startseite ohne index.html."""
    return BASIS + ordner + ("" if name == "index" else f"{name}.html")

WEICHE = re.compile(
    r"(?P<vor>^[ \t]*)?<!--\s*(?P<art>AB|VOR)\s+(?P<ab>\d+(?:\.\d+)*)\s*-->(?P<neu>.*?)"
    r"(?:<!--\s*SONST\s*-->(?P<bisher>.*?))?<!--\s*ENDE\s*-->(?P<nach>[ \t]*\n)?",
    re.S | re.M)
WEICHEN_REST = re.compile(r"<!--\s*(?:(?:AB|VOR)\s+[\d.]+|SONST|ENDE)\s*-->")


def als_zahlen(version: str) -> tuple[int, ...]:
    return tuple(int(t) for t in version.split("."))


def stand_lesen() -> str:
    """Die Version des neuesten Releases, wie tools/bausteine.py sie eingetragen hat."""
    datei = QUELLEN / "stand.json"
    if not datei.is_file():
        raise SystemExit("seiten/stand.json fehlt - erst tools/bausteine.py laufen lassen")
    version = json.loads(datei.read_text(encoding="utf-8")).get("version", "")
    if not re.fullmatch(r"\d+(?:\.\d+)*", version):
        raise SystemExit(f"seiten/stand.json: keine brauchbare Version ({version!r})")
    return version


def weichen_stellen(text: str, stand: str, ort: str, erfuellt: set) -> str:
    """Jede Weiche auf den Zweig stellen, der zur Version passt."""
    jetzt = als_zahlen(stand)

    def stelle(m: re.Match) -> str:
        art, ab = m.group("art"), m.group("ab")
        neu, bisher = m.group("neu"), m.group("bisher") or ""
        if WEICHEN_REST.search(neu) or WEICHEN_REST.search(bisher):
            raise SystemExit(f"{ort}: Weiche '{art} {ab}' enthaelt eine weitere - "
                             "Weichen lassen sich nicht verschachteln")
        erschienen = jetzt >= als_zahlen(ab)
        if erschienen:
            erfuellt.add((ort, ab))
        # AB: der erste Teil ab dieser Version. VOR: der erste Teil bis dahin.
        zweig = neu if erschienen == (art == "AB") else bisher

        vor, nach = m.group("vor"), m.group("nach")
        if vor is None or nach is None:                 # mitten in einer Zeile
            return (vor or "") + zweig + (nach or "")
        # Die Weiche nimmt ganze Zeilen ein - dann auch ganze Zeilen einsetzen,
        # sonst bleiben leere, eingerueckte Zeilen im fertigen HTML zurueck.
        if not zweig.strip():
            return ""
        if zweig.startswith("\n"):                     # Marken auf eigenen Zeilen
            return zweig[1:].rstrip(" \t")
        return vor + zweig.strip() + "\n"              # alles auf einer Zeile

    text = WEICHE.sub(stelle, text)
    rest = WEICHEN_REST.search(text)
    if rest:
        raise SystemExit(f"{ort}: '{rest.group(0)}' ohne Gegenstueck")
    return text


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


def baue(rahmen: str, sprache: str, name: str, inhalt: str, texte: dict,
         stand: str, erfuellt: set) -> str:
    rahmen = weichen_stellen(rahmen, stand, "rahmen.html", erfuellt)
    inhalt = weichen_stellen(inhalt, stand, f"{sprache}/{name}.html", erfuellt)
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
                        ("{{WURZEL}}", hoch), ("{{ANDERE_SEITE}}", andere_seite),
                        ("{{URL}}", adresse(unterordner, name)), ("{{BASIS}}", BASIS)):
        seite = seite.replace(marke, wert)

    # hreflang verlangt volle Adressen.
    for kuerzel, ordner in SPRACHEN.items():
        seite = seite.replace(f"{{{{ALT:{kuerzel}}}}}", adresse(ordner, name))

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
    p.add_argument("--stand", metavar="VERSION",
                   help="so bauen, als waere diese Version die neueste (Vorschau); "
                        "ohne Angabe gilt seiten/stand.json")
    a = p.parse_args()
    stand = a.stand or stand_lesen()
    if not re.fullmatch(r"\d+(?:\.\d+)*", stand):
        raise SystemExit(f"--stand: keine Version ({stand!r})")
    erfuellt: set = set()

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
            neu = baue(rahmen, sprache, quelle.stem, quelle.read_text(encoding="utf-8"), texte,
                       stand, erfuellt)
            ziel = ziel_ordner / f"{quelle.stem}.html"
            alt = ziel.read_text(encoding="utf-8") if ziel.is_file() else None
            if alt == neu:
                continue
            geaendert.append(f"{ordner}{ziel.name}")
            if not a.pruefen:
                ziel.write_text(neu, encoding="utf-8")

    # Ist eine Version draussen, sind ihre Weichen entschieden: SONST-Teile hinter
    # AB und ganze VOR-Bloecke werden nie wieder gebraucht. Ein Hinweis, damit
    # alte Zweige nicht ewig im Quelltext mitlaufen.
    for ab in sorted({ab for _, ab in erfuellt}, key=als_zahlen):
        orte = sorted({o for o, v in erfuellt if v == ab})
        print(f"  Hinweis: {ab} ist draussen (Stand {stand}) - in den Weichen dazu koennen "
              f"die SONST-Teile hinter AB und die VOR-Bloecke raus: {', '.join(orte)}")

    gesamt = sum(len(s) for s in namen.values())
    if not geaendert:
        print(f"{gesamt} Seiten sind aktuell (Stand {stand}, Kennzeichen v={VERSION})")
        return 0
    if a.pruefen:
        print("Zu bauen: " + ", ".join(geaendert))
        return 1
    print(f"{len(geaendert)} von {gesamt} Seiten gebaut (Stand {stand}): " + ", ".join(geaendert))
    return 0


if __name__ == "__main__":
    sys.exit(main())
