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
seiten/texte.json     Navigation, Fußzeile und Umschalter je Sprache
seiten/de/*.html      der deutsche Inhalt je Seite, mit Titel und Beschreibung im Kopf
seiten/en/*.html      dasselbe auf Englisch
tools/seiten.py       setzt Rahmen und Inhalt zusammen → *.html und en/*.html
tools/bausteine.py    schreibt Bausteinliste und Version aus dem Overlay in seiten/
bausteine.json        die Beschreibungen der Bausteine je Sprache (Handarbeit)
assets/css/site.css   Farben und Layout — Tokens 1:1 aus dem Overlay (core.css)
assets/js/site.js     Kopfzeile, Einblenden, Tower- und Battle-Nachbau, Ankerraster
assets/fonts/         Inter und Teko (woff2), aus dem Overlay übernommen
assets/img/           Logo, Icon, Favicon
*.html                erzeugt — nicht von Hand ändern, sondern seiten/ bearbeiten
```

Die Seite besteht aus einer Startseite mit den Themen als Kacheln und je einer
Unterseite dahinter: `besonders`, `bausteine`, `layout`, `regie`, `obs`, `start`
und `technik`.

## Zwei Sprachen

Deutsch liegt im Wurzelverzeichnis, Englisch unter `en/`. Beides sind echte
Dateien — kein Austausch per Skript, jede Sprache funktioniert also auch ohne
JavaScript und ist einzeln verlinkbar (`hreflang` steht in jedem Kopf).

Welche Sprache jemand sieht, entscheidet ein kleines Skript im `<head>`, noch
vor dem ersten Anstrich:

1. Eine früher getroffene Wahl (`localStorage`, Schlüssel `kers-sprache`) gilt.
2. Sonst die Sprache des Geräts: beginnt sie mit `de`, bleibt es Deutsch, alles
   andere bekommt Englisch.

Wer automatisch umgeleitet wurde, sieht einmal einen Hinweis mit dem Weg zurück;
das Kürzel oben rechts (`DE`/`EN`) wechselt jederzeit und merkt sich die Wahl.
Ohne JavaScript findet keine Umleitung statt — dann bleibt es bei der Adresse,
die aufgerufen wurde.

**Eine neue Seite braucht beide Sprachen.** `tools/seiten.py` bricht ab, wenn
eine Datei nur in einem der beiden Ordner liegt — sonst führte der Umschalter
dort ins Leere.

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

## Bausteinliste, Version und Größe

Das kommt aus dem Hauptprojekt, damit es nicht still veraltet:

* **Namen und Reihenfolge** der Bausteine aus `LAYOUT_TEILE` — seit 0.3.0 in
  `src/server/constants.cpp`, davor in `main.py` (das ab 0.3.0 nur noch als
  Vorlage im Stand von 0.2.6 liegen bleibt)
* **die Version** und **die Dateigröße** der EXE aus dem neuesten GitHub-Release —
  der Download-Knopf lädt genau dessen Anhängsel

`tools/bausteine.py` schreibt daraus die Karten zwischen den Marken
`<!-- BAUSTEINE:START -->` und `<!-- BAUSTEINE:ENDE -->`, die Felder
`data-gen="anzahl"`, `"anzahl-wort"`, `"version"` und `"groesse"` sowie
`seiten/stand.json` — in die Quellen unter `seiten/`, aus denen `tools/seiten.py`
danach die Seiten baut. Der Pages-Workflow holt das Overlay dafür im Stand des
neuesten Releases, nicht des Standardzweigs, und ruft beides bei jedem Deploy auf
und zusätzlich einmal täglich.

Von Hand, in dieser Reihenfolge:

```bash
git clone --depth 1 https://github.com/KERSEX/KERS_Overlay /tmp/overlay
python3 tools/bausteine.py --overlay /tmp/overlay
python3 tools/seiten.py
```

Scheitert die Anfrage an GitHub, fällt das Skript für die Version auf
`static/version.txt` zurück, lässt die Größe stehen, wie sie ist, und sagt es auf
stderr. Die Größe rechnet es wie das Programm selbst und der Explorer
(1 MB = 1024 × 1024 Byte), damit auf der Seite dieselbe Zahl steht wie auf dem
Update-Knopf.

Die **Beschreibungen** stehen in `bausteine.json`, je Sprache und mit dem
Schlüssel aus `LAYOUT_TEILE`. Sie sind Prosa und können nicht aus dem Quelltext kommen — ein
neuer Baustein bekommt deshalb zunächst einen Platzhalter, und das Skript meldet
ihn auf stderr. Ein Schlüssel, den es im Overlay nicht mehr gibt, wird ebenfalls
gemeldet.

## Text für die nächste Version vorab

Was erst ab einer bestimmten Version stimmt, steht in einer Weiche — als ganze
Zeilen oder mitten im Satz, in Inhaltsdateien wie im Rahmen:

```html
<!-- AB 0.3.0 -->so ist es ab 0.3.0<!-- SONST -->so ist es bisher<!-- ENDE -->
```

Das Gegenstück ist `VOR`: Inhalt, der nur gilt, solange die Version noch
*nicht* draußen ist — eine Ankündigung, die mit dem Release von selbst
verschwindet:

```html
<!-- VOR 0.3.0 -->Bald: 0.3.0<!-- ENDE -->
```

Der `SONST`-Teil darf bei beiden fehlen; verschachteln geht nicht. `tools/seiten.py` stellt
jede Weiche nach der Version in `seiten/stand.json`. So kann der Text für die
nächste Version schon auf `main` liegen, ohne dass die Seite etwas verspricht,
was der Download noch nicht kann — mit dem Release springt sie beim nächsten
Tageslauf von selbst um, sofort über *Actions → Deploy to GitHub Pages → Run
workflow*. Eine **Vorabversion** (Pre-release) zählt dabei nicht: GitHub nennt
sie nicht „latest", also bleiben Seite und Download-Knopf auf dem letzten
richtigen Release.

Vorschau, als wäre die Version schon draußen (danach normal neu bauen):

```bash
python3 tools/seiten.py --stand 0.3.0
python3 tools/seiten.py
```

Ist eine Version draußen, meldet `tools/seiten.py` das bei jedem Lauf — dann
können die `SONST`-Teile hinter `AB` und die `VOR`-Blöcke raus.

## Sonst noch pflegen

* **Schnellstart** — die vier Schritte unter `#start`, Gegenstück zur README dort.
* **Farben** — `:root` in `site.css`, gespiegelt aus `static/css/core.css`.
* **Cache** — `VERSION` in `tools/seiten.py` hochzählen, sonst behalten Browser
  nach einem Update die alten CSS- und JS-Dateien.

## Rechtliches

Privates Projekt, kein offizielles Produkt von EA oder Codemasters.
Alle Marken gehören ihren jeweiligen Eigentümern.
