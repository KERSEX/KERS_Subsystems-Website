# KERS Subsystems — Website

Die Projektseite zu **[KERS Subsystems](https://github.com/KERSEX/KERS_Overlay)**, dem
Live-Telemetrie-Overlay für F1 26.

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
```

## Veröffentlichen

`.github/workflows/pages.yml` legt die Seite bei jedem Push auf `main` auf GitHub Pages.
Einmalig unter **Settings → Pages → Source** *GitHub Actions* auswählen.

## Inhalte pflegen

Ändert sich etwas am Overlay, sind das die Stellen:

* **Bausteine** — die Karten unter `#bausteine`. Reihenfolge und Namen kommen aus
  `LAYOUT_TEILE` in `main.py` des Hauptprojekts.
* **Schnellstart** — die vier Schritte unter `#start`, Gegenstück zur README dort.
* **Farben** — `:root` in `site.css`, gespiegelt aus `static/css/core.css`.

## Rechtliches

Privates Projekt, kein offizielles Produkt von EA oder Codemasters.
Alle Marken gehören ihren jeweiligen Eigentümern.
