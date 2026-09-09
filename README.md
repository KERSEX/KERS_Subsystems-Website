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
seiten/rahmen.html    Kopfzeile, Navigation und Fußbereich — einmal für alle Seiten
seiten/*.html         der Inhalt je Seite, mit Titel und Beschreibung im Kopf
tools/seiten.py       setzt Rahmen und Inhalt zusammen → die *.html im Wurzelverzeichnis
tools/bausteine.py    schreibt Bausteinliste und Fassung aus dem Overlay in seiten/
bausteine.json        die Beschreibungen der Bausteine (Handarbeit)
assets/css/site.css   Farben und Layout — Tokens 1:1 aus dem Overlay (core.css)
assets/js/site.js     Kopfzeile, Einblenden, Tower- und Battle-Nachbau, Ankerraster
assets/fonts/         Inter und Teko (woff2), aus dem Overlay übernommen
assets/img/           Logo, Icon, Favicon
*.html                erzeugt — nicht von Hand ändern, sondern seiten/ bearbeiten
```

Die Seite besteht aus einer Startseite mit den Themen als Kacheln und je einer
Unterseite dahinter: `besonders`, `bausteine`, `layout`, `regie`, `obs`, `start`
und `technik`.

## Seiten bauen

```bash
python3 tools/seiten.py            # baut alle Seiten neu
python3 tools/seiten.py --pruefen  # meldet nur, ob etwas abweicht
```

Geändert wird immer in `seiten/` — die Dateien im Wurzelverzeichnis werden dabei
überschrieben. Das Cache-Kennzeichen `?v=N` steht als `VERSION` oben in
`tools/seiten.py`; nach einer Änderung an CSS oder JS dort hochzählen.

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
`data-gen="anzahl"`, `"anzahl-wort"` und `"version"` — in die Quellen unter
`seiten/`, aus denen `tools/seiten.py` danach die Seiten baut. Der Pages-Workflow
ruft beides bei jedem Deploy auf und zusätzlich einmal täglich — Änderungen am
Overlay landen also auch ohne Push hier.

Von Hand, in dieser Reihenfolge:

```bash
git clone --depth 1 https://github.com/KERSEX/KERS_Overlay /tmp/overlay
python3 tools/bausteine.py --overlay /tmp/overlay
python3 tools/seiten.py
```

Die **Beschreibungen** stehen in `bausteine.json`, mit dem Schlüssel aus
`LAYOUT_TEILE`. Sie sind Prosa und können nicht aus dem Quelltext kommen — ein
neuer Baustein bekommt deshalb zunächst einen Platzhalter, und das Skript meldet
ihn auf stderr. Ein Schlüssel, den es im Overlay nicht mehr gibt, wird ebenfalls
gemeldet.

## Sonst noch pflegen

* **Schnellstart** — die vier Schritte unter `#start`, Gegenstück zur README dort.
* **Farben** — `:root` in `site.css`, gespiegelt aus `static/css/core.css`.
* **Cache** — `VERSION` in `tools/seiten.py` hochzählen, sonst behalten Browser
  nach einem Update die alten CSS- und JS-Dateien.

## Rechtliches

Privates Projekt, kein offizielles Produkt von EA oder Codemasters.
Alle Marken gehören ihren jeweiligen Eigentümern.
