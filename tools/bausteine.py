#!/usr/bin/env python3
"""
Bausteinliste und Versionsangabe aus dem Hauptprojekt in die Seite schreiben.

Namen und Reihenfolge der Bausteine stehen in LAYOUT_TEILE in `main.py` des
Overlays; die Version kommt aus dem neuesten GitHub-Release, weil der
Download-Knopf genau dessen Anhaengsel laedt. Beides hier abzuschreiben
hiess, es bei jeder Aenderung nachzuziehen - und genau das ist zweimal
liegengeblieben. Die Beschreibungen bleiben Handarbeit (`bausteine.json`), denn
Prosa steht nirgends im Quellcode.

    python3 tools/bausteine.py --overlay ../KERS_Overlay

Geschrieben wird in die QUELLEN unter seiten/ - die fertigen HTML-Dateien baut
danach tools/seiten.py daraus. Ohne Fund bricht der Lauf ab, statt still eine
leere Liste auszuliefern.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
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


def _tag_zu_version(tag: str) -> str | None:
    """Aus 'KERS_SubsystemsV0.2.6' die 0.2.6 holen."""
    treffer = re.search(r"(\d+\.\d+\.\d+)", tag or "")
    return treffer.group(1) if treffer else None


def _neuester_release(repo: str) -> str | None:
    """Den Tag des neuesten Releases holen; None, wenn das nicht geht."""
    ziel = f"https://api.github.com/repos/{repo}/releases/latest"
    bitte = urllib.request.Request(ziel, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "KERS-Subsystems-Website",
    })
    # In GitHub Actions liegt ein Token bereit; ohne ihn greift das Limit fuer
    # anonyme Anfragen, was fuer einen Aufruf je Lauf reicht.
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        bitte.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(bitte, timeout=20) as antwort:
            return json.load(antwort).get("tag_name")
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as fehler:
        print(f"  ⚠ Release nicht abrufbar ({fehler}) - falle auf version.txt zurueck",
              file=sys.stderr)
        return None


def lies_version(overlay: Path, repo: str) -> str:
    """Die Version, die auch wirklich zum Download passt.

    Der Knopf auf der Seite laedt das Anhaengsel des NEUESTEN RELEASES. Die
    version.txt im Zweig main kann davon abweichen, sobald an der naechsten
    Version gearbeitet wird - dann stuende auf der Seite eine Version, die es
    zum Herunterladen noch gar nicht gibt. Deshalb zaehlt der Release; die
    version.txt bleibt nur der Rueckfall, wenn die Anfrage scheitert.
    """
    tag = _neuester_release(repo)
    if tag:
        version = _tag_zu_version(tag)
        if version:
            return version
        print(f"  ⚠ Aus dem Tag '{tag}' war keine Version zu lesen", file=sys.stderr)
    return (overlay / "static" / "version.txt").read_text(encoding="utf-8").strip()


def baue_karten(teile, texte) -> tuple[str, list[str]]:
    """Die Karten als HTML, dazu die Schluessel ohne eigene Beschreibung."""
    zeilen, fehlen = [], []
    for schluessel, name in teile:
        text = texte.get(schluessel)
        if not text:
            fehlen.append(schluessel)
            text = "Neu in dieser Version — die Beschreibung folgt."
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
    p.add_argument("--repo", default="KERSEX/KERS_Overlay",
                   help="woher der neueste Release kommt")
    a = p.parse_args()

    if not (a.overlay / "main.py").is_file():
        raise SystemExit(f"Kein Overlay unter {a.overlay}")

    teile = lies_bausteine(a.overlay)
    version = lies_version(a.overlay, a.repo)
    texte = json.loads((HIER / "bausteine.json").read_text(encoding="utf-8"))

    karten, fehlen = baue_karten(teile, texte)
    anzahl = len(teile)
    wort = ZAHLWORT.get(anzahl, str(anzahl))

    for k in fehlen:
        print(f"  ⚠ keine Beschreibung fuer '{k}' - bitte in bausteine.json ergaenzen",
              file=sys.stderr)
    for k in sorted(set(texte) - {s for s, _ in teile}):
        print(f"  ⚠ '{k}' steht in bausteine.json, aber nicht mehr in LAYOUT_TEILE",
              file=sys.stderr)

    # Die Marken und Felder liegen ueber mehrere Quelldateien verteilt: die Liste
    # in seiten/bausteine.html, die Anzahl auch auf der Startseite, die Version
    # im Download-Abschnitt. Jede Datei bekommt, was in ihr vorkommt.
    geaendert = []
    for quelle in sorted((HIER / "seiten").glob("*.html")):
        alt = quelle.read_text(encoding="utf-8")
        neu = alt
        if "<!-- BAUSTEINE:START -->" in neu:
            neu = ersetze_zwischen(neu, "BAUSTEINE", karten)
        for feld, wert in (("anzahl", str(anzahl)), ("anzahl-wort", wort), ("version", version)):
            if f'data-gen="{feld}"' in neu:
                neu = ersetze_feld(neu, feld, wert)
        if neu != alt:
            geaendert.append(quelle.name)
            if not a.pruefen:
                quelle.write_text(neu, encoding="utf-8")

    if not geaendert:
        print(f"Quellen sind aktuell: {anzahl} Bausteine, Version {version}")
        return 0
    if a.pruefen:
        print(f"Zu aendern waere: {', '.join(geaendert)} ({anzahl} Bausteine, Version {version})")
        return 1
    print(f"Aktualisiert: {', '.join(geaendert)} ({anzahl} Bausteine, Version {version})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
