# KERS Subsystems — Website

Die Projektseite zu **[KERS Subsystems](https://github.com/KERSEX/KERS_Overlay)**, dem
Live-Telemetrie-Overlay für F1 26.

**→ https://kersex.github.io/KERS_Subsystems-Website/**

Statische Seite, eine Datei plus Assets — kein Build-Schritt, keine Abhängigkeiten,
keine externen Quellen zur Laufzeit. Schriften, Logo und Skript liegen im Repo,
damit die Seite ohne CDN auskommt.

## Ansehen

```bash
python -m http.server 8000
```

Dann `http://localhost:8000` öffnen. Ein Doppelklick auf `index.html` tut es auch.

## Aufbau

```
index.html            die gesamte Seite
assets/css/site.css   Farben und Layout — Tokens 1:1 aus dem Overlay (core.css)
assets/js/site.js     Kopfzeile, Einblenden, Tower-Nachbau, Ankerraster
assets/fonts/         Inter und Teko (woff2), aus dem Overlay übernommen
assets/img/           Logo, Icon, Favicon
bausteine.json        die Beschreibungen der Bausteine (Handarbeit)
tools/bausteine.py    schreibt Bausteinliste und Fassung aus dem Overlay in die Seite
```

## Veröffentlichen

`.github/workflows/pages.yml` legt die Seite bei jedem Push auf `main` auf GitHub Pages —
zu erreichen unter <https://kersex.github.io/KERS_Subsystems-Website/>.

Damit das greift, muss unter **Settings → Pages → Source** einmalig *GitHub Actions*
ausgewählt sein; der Workflow kann das nicht selbst nachholen. Fehlt es, bricht der Lauf
mit *„Get Pages site failed: Not Found"* ab.

## Bausteinliste und Fassung

Beides kommt aus dem Hauptprojekt, damit es nicht still veraltet:

* **Namen und Reihenfolge** der Bausteine aus `LAYOUT_TEILE` in dessen `main.py`
* **die laufende Fassung** aus dessen `static/version.txt`

`tools/bausteine.py` schreibt daraus die Karten zwischen den Marken
`<!-- BAUSTEINE:START -->` und `<!-- BAUSTEINE:ENDE -->` sowie die Felder
`data-gen="anzahl"`, `"anzahl-wort"` und `"version"`. Der Pages-Workflow ruft es
bei jedem Deploy auf und zusätzlich einmal täglich — Änderungen am Overlay
landen also auch ohne Push hier.

Von Hand:

```bash
git clone --depth 1 https://github.com/KERSEX/KERS_Overlay /tmp/overlay
python3 tools/bausteine.py --overlay /tmp/overlay
python3 tools/bausteine.py --overlay /tmp/overlay --pruefen   # nur melden
```

Die **Beschreibungen** stehen in `bausteine.json`, mit dem Schlüssel aus
`LAYOUT_TEILE`. Sie sind Prosa und können nicht aus dem Quelltext kommen — ein
neuer Baustein bekommt deshalb zunächst einen Platzhalter, und das Skript meldet
ihn auf stderr. Ein Schlüssel, den es im Overlay nicht mehr gibt, wird ebenfalls
gemeldet.

## Sonst noch pflegen

* **Schnellstart** — die vier Schritte unter `#start`, Gegenstück zur README dort.
* **Farben** — `:root` in `site.css`, gespiegelt aus `static/css/core.css`.
* **Cache** — `?v=N` an CSS und JS in `index.html` hochzählen, sonst behalten
  Browser nach einem Update die alten Dateien.

## Rechtliches

Privates Projekt, kein offizielles Produkt von EA oder Codemasters.
Alle Marken gehören ihren jeweiligen Eigentümern.
