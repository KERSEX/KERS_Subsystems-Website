/* ═══════════════════════════════════════════════════════════════════════════
   KERS Subsystems — Projektseite
   Drei kleine Dinge: Kopfzeile, Einblenden beim Scrollen, und die beiden
   Schaustücke (Timing-Tower-Nachbau, Ankerraster).
   Kein Framework, keine externen Quellen — die Seite lädt komplett aus sich selbst.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var sanft = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Kopfzeile: Hintergrund ab dem ersten Scrollen ───────────────────────── */
  var nav = document.getElementById("nav");
  function navStand() { nav.classList.toggle("solid", window.scrollY > 12); }
  navStand();
  window.addEventListener("scroll", navStand, { passive: true });

  /* ── Sprachwahl merken ───────────────────────────────────────────────────── */
  // Der Umschalter im Kopf ist ein normaler Link. Beim Klick wird die Wahl
  // festgehalten - ohne das wuerde die Erkennung im <head> sofort zurueckleiten.
  var sprachwahl = document.getElementById("sprachwahl");
  if (sprachwahl) {
    sprachwahl.addEventListener("click", function () {
      try { localStorage.setItem("kers-sprache", sprachwahl.getAttribute("lang")); } catch (e) {}
    });
  }

  // Wer automatisch umgeleitet wurde, bekommt einmal einen Hinweis mit dem Weg
  // zurueck - stillschweigend die Sprache zu wechseln ist unhoeflich.
  try {
    if (sessionStorage.getItem("kers-umgeleitet") && sprachwahl) {
      sessionStorage.removeItem("kers-umgeleitet");
      var hinweis = document.createElement("div");
      hinweis.className = "sprachhinweis";
      hinweis.innerHTML = '<span></span><a href="' + sprachwahl.getAttribute("href") + '"></a>' +
                          '<button type="button" aria-label="OK">×</button>';
      var andere = sprachwahl.getAttribute("lang");
      hinweis.querySelector("span").textContent = andere === "de"
        ? "This page opened in English."
        : "Diese Seite wurde auf Deutsch geöffnet.";
      var zurueck = hinweis.querySelector("a");
      zurueck.textContent = andere === "de" ? "Auf Deutsch ansehen" : "View in English";
      zurueck.addEventListener("click", function () {
        try { localStorage.setItem("kers-sprache", andere); } catch (e) {}
      });
      hinweis.querySelector("button").addEventListener("click", function () {
        hinweis.classList.remove("da");
        // Wer wegklickt, hat die Sprache angenommen - sonst käme der Hinweis wieder.
        try { localStorage.setItem("kers-sprache", document.documentElement.lang); } catch (e) {}
      });
      document.body.appendChild(hinweis);
      requestAnimationFrame(function () { hinweis.classList.add("da"); });
    }
  } catch (e) {}

  /* ── Menü auf schmalen Fenstern ──────────────────────────────────────────── */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  burger.addEventListener("click", function () {
    var offen = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(offen));
    burger.setAttribute("aria-label",
      offen ? (burger.dataset.zu || "Menü schließen") : (burger.dataset.auf || "Menü öffnen"));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  /* ── Einblenden beim Scrollen ────────────────────────────────────────────── */
  // Alles, was weiter unten steht, kommt beim Herunterscrollen herein: die
  // Karten und Kacheln einzeln, die uebrigen Abschnitte als Ganzes. Der
  // Kopfbereich ist ausgenommen - der laeuft schon beim Laden per CSS.
  document.querySelectorAll(".sec, .band, .download").forEach(function (abschnitt) {
    if (abschnitt.closest(".hero")) return;
    abschnitt.classList.add("reveal");
  });
  var zuZeigen = document.querySelectorAll(".card, .thema, .way, .reveal");
  if (sanft || !("IntersectionObserver" in window)) {
    zuZeigen.forEach(function (el) { el.classList.add("in"); });
  } else {
    var beobachter = new IntersectionObserver(function (eintraege) {
      // Karten laufen versetzt ein, damit das Raster nicht auf einen Schlag springt.
      // Der Verzug zaehlt innerhalb des gemeldeten Schwungs - unabhaengig davon,
      // wie viele Spalten das Raster gerade hat.
      var rang = 0;
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var verzug = Math.min(rang++, 6) * 70;
        setTimeout(function () { e.target.classList.add("in"); }, verzug);
        beobachter.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    zuZeigen.forEach(function (el) { beobachter.observe(el); });
  }

  /* ── Die Eckdaten zaehlen einmal hoch ────────────────────────────────────── */
  // Nur die reine Zahl wird hochgezaehlt; alles drumherum (Bindestrich, "Hz")
  // bleibt stehen, sonst zappelt die Zeile in der Breite.
  if (!sanft && "IntersectionObserver" in window) {
    var zahlen = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        zahlen.unobserve(e.target);
        zaehleHoch(e.target);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".hero-facts strong").forEach(function (el) {
      var text = el.textContent;
      if (/\d/.test(text) && !/[-–]/.test(text)) zahlen.observe(el);
    });
  }

  function zaehleHoch(el) {
    var text = el.textContent;
    // Die letzte Zahl im Text ist die, die zaehlt (bei "10-120 Hz" also 120).
    var treffer = text.match(/(\d+)(?!.*\d)/);
    if (!treffer) return;
    var ziel = parseInt(treffer[1], 10);
    if (ziel < 2) return;                        // bei 0 oder 1 lohnt es nicht
    var vorher = text.slice(0, treffer.index), nachher = text.slice(treffer.index + treffer[1].length);
    var start = performance.now(), dauer = 900;

    (function schritt(jetzt) {
      var t = Math.min(1, (jetzt - start) / dauer);
      var weich = 1 - Math.pow(1 - t, 3);        // schnell los, sanft aus
      el.textContent = vorher + Math.round(ziel * weich) + nachher;
      if (t < 1) requestAnimationFrame(schritt);
      else el.textContent = text;                // am Ende exakt der Originaltext
    })(start);
  }

  /* ── Wechselnder Halbsatz in der Ueberschrift ────────────────────────────── */
  var wechsel = document.getElementById("wechsel");
  if (wechsel && !sanft) {
    var SAETZE = ["in Zahlen.", "in Echtzeit.", "auf einen Blick.",
                  "auf den Punkt.", "sofort lesbar."];
    var stelle = 0;

    setInterval(function () {
      stelle = (stelle + 1) % SAETZE.length;
      // Ausblenden, Text tauschen, wieder einblenden - zwei Haelften derselben Bewegung.
      wechsel.animate([{ opacity: 1, transform: "translateY(0)" },
                       { opacity: 0, transform: "translateY(-.22em)" }],
                      { duration: 260, easing: "cubic-bezier(.4, 0, 1, 1)" })
        .onfinish = function () {
          wechsel.textContent = SAETZE[stelle];
          wechsel.animate([{ opacity: 0, transform: "translateY(.22em)" },
                           { opacity: 1, transform: "translateY(0)" }],
                          { duration: 320, easing: "cubic-bezier(0, 0, .2, 1)" });
        };
    }, 3200);
  }

  /* ── Bausteine weich auf- und zuklappen ──────────────────────────────────── */
  // <details> kennt von sich aus keine Animation - es springt. Deshalb faengt das
  // Skript den Klick ab, faehrt die Hoehe des Textes hoch bzw. runter und setzt
  // `open` erst danach. Ohne Skript bleibt das Aufklappen erhalten, nur eben hart.
  if (!sanft) {
    document.querySelectorAll(".card").forEach(function (karte) {
      var kopf = karte.querySelector("summary");
      var text = karte.querySelector("p");
      if (!kopf || !text) return;
      var laeuft = null;
      var ziel = null;          // wohin der laufende Lauf will

      kopf.addEventListener("click", function (e) {
        e.preventDefault();

        // Einen abgebrochenen Lauf zuerst zu Ende denken: `open` wird sonst nie
        // gesetzt, und der naechste Klick liefe in die falsche Richtung.
        if (laeuft) {
          laeuft.cancel();
          laeuft = null;
          karte.open = ziel;
          text.classList.remove("klappt");
        }

        var warOffen = karte.open;
        // Zum Messen muss der Text im Fluss stehen - beim Oeffnen also zuerst auf.
        if (!warOffen) karte.open = true;

        var hoehe = text.scrollHeight;
        var polster = getComputedStyle(text).paddingBottom;
        text.classList.add("klappt");
        ziel = !warOffen;

        var zu = { height: "0px", paddingBottom: "0px", opacity: 0 };
        var auf = { height: hoehe + "px", paddingBottom: polster, opacity: 1 };

        laeuft = text.animate(
          warOffen ? [auf, zu] : [zu, auf],
          { duration: 300, easing: "cubic-bezier(.4, 0, .2, 1)" }
        );

        laeuft.onfinish = function () {
          laeuft = null;
          text.classList.remove("klappt");
          karte.open = !warOffen;      // beim Zuklappen erst jetzt, sonst waere der Text sofort weg
        };
      });
    });
  }

  /* ── Ankerraster: Baustein zieht auf den angeklickten Ankerpunkt ─────────── */
  var ghost = document.getElementById("ghost");
  if (ghost) {
    // Werte in Prozent des Rahmens; der Baustein ist 44 % breit und 30 % hoch.
    var ECKEN = {
      tl: [4, 6],  tc: [28, 6],  tr: [52, 6],
      lc: [4, 35], cc: [28, 35], rc: [52, 35],
      bl: [4, 64], bc: [28, 64], br: [52, 64]
    };
    var knoepfe = document.querySelectorAll(".anchor");
    function setzeAnker(name) {
      var p = ECKEN[name] || ECKEN.tl;
      ghost.style.left = p[0] + "%";
      ghost.style.top = p[1] + "%";
      knoepfe.forEach(function (k) { k.setAttribute("aria-pressed", String(k.dataset.a === name)); });
    }
    setzeAnker("tl");
    document.getElementById("anchorFrame").addEventListener("click", function (e) {
      var knopf = e.target.closest(".anchor");
      if (knopf) setzeAnker(knopf.dataset.a);
    });
  }

  /* ── Battle-Box: der Countdown bis zum Zweikampf ─────────────────────────── */
  // Zeigt, was den Baustein ausmacht: nicht der Abstand, sondern die Hochrechnung,
  // in wie vielen Runden der Hintermann dran ist. Der Abstand schrumpft, der
  // Zähler fällt, beim Überholen tauschen die Zeilen und es geht von vorn los.
  (function () {
    var rahmen = document.getElementById("bboxRows");
    if (!rahmen) return;

    var PAARE = [
      [{ kurz: "Russell", farbe: "var(--t-mercedes)" }, { kurz: "Piastri", farbe: "var(--t-mclaren)" }],
      [{ kurz: "Leclerc", farbe: "var(--t-ferrari)" },  { kurz: "Alonso",  farbe: "var(--t-aston)" }],
      [{ kurz: "Norris",  farbe: "var(--t-mclaren)" },  { kurz: "Sainz",   farbe: "var(--t-williams)" }]
    ];
    var kopf = document.getElementById("bboxHead");
    var zaehler = document.getElementById("bboxLaps");
    var einheit = document.getElementById("bboxUnit");

    var paar = 0, platz = 4, abstand = 1.4, runden = 3;

    function baue() {
      rahmen.innerHTML = "";
      PAARE[paar].forEach(function (d, i) {
        var el = document.createElement("div");
        el.className = "brow";
        el.style.setProperty("--tc", d.farbe);
        el.style.transform = "translateY(" + (i * 44) + "px)";
        el.innerHTML = (i === 1 ? '<span class="gap-bar"><i></i></span>' : '') +
          '<span class="bd-pos">' + (platz + i) + '</span>' +
          '<span class="bd-name">' + d.kurz + '</span>' +
          '<span class="bd-gap' + (i === 0 ? ' fuehrt' : '') + '">' +
          (i === 0 ? '—' : '+' + abstand.toFixed(3)) + '</span>';
        rahmen.appendChild(el);
      });
      kopf.textContent = "Battle for P" + platz;
    }

    function zeigeAbstand() {
      var g = rahmen.querySelectorAll(".bd-gap")[1];
      if (g) g.textContent = "+" + abstand.toFixed(3);
      var balken = rahmen.querySelector(".gap-bar i");
      // Voll = dicht dran: 1,5 s Abstand entsprechen leerem Balken.
      if (balken) balken.style.width = Math.max(0, Math.min(100, (1.5 - abstand) / 1.5 * 100)) + "%";
    }

    function setzeRunden(n) {
      runden = n;
      zaehler.textContent = n;
      zaehler.classList.toggle("jetzt", n <= 1);
      einheit.textContent = n === 1 ? "Runde" : "Runden";
      zaehler.classList.remove("pop");
      void zaehler.offsetWidth;      // Neustart der Animation erzwingen
      zaehler.classList.add("pop");
    }

    baue();
    zeigeAbstand();
    if (sanft) return;

    setInterval(function () {
      abstand = Math.max(0.08, abstand - 0.16 - Math.random() * 0.1);
      zeigeAbstand();

      if (abstand < 0.3) {
        // Überholt: die beiden tauschen, danach beginnt der nächste Kampf.
        var zeilen = rahmen.querySelectorAll(".brow");
        zeilen[0].style.transform = "translateY(44px)";
        zeilen[1].style.transform = "translateY(0)";
        setTimeout(function () {
          paar = (paar + 1) % PAARE.length;
          platz = [4, 6, 2][paar];
          abstand = 1.2 + Math.random() * 0.5;
          baue();
          zeigeAbstand();
          setzeRunden(3);
        }, 900);
      } else {
        var ziel = abstand < 0.7 ? 1 : abstand < 1.1 ? 2 : 3;
        if (ziel !== runden) setzeRunden(ziel);
      }
    }, 1600);
  })();

  /* ── Timing-Tower-Nachbau ────────────────────────────────────────────────── */
  var body = document.getElementById("towerBody");
  if (!body) return;

  var ZEILE = 54;                       // Zeilenhöhe, muss zu .trow im CSS passen
  var REIFEN = ["s", "m", "h"];
  // Näher am Original (static/parts/tower.js): die Zeile trägt außer Platz und
  // Abständen auch zwei Sektorzeiten, ein DRS-Feld und - wo fällig - die
  // Strafen-Pille, die links aus der Zeile ragt.
  var FELD = [
    { kurz: "VER", team: "Red Bull",  farbe: "var(--t-redbull)" },
    { kurz: "NOR", team: "McLaren",   farbe: "var(--t-mclaren)" },
    { kurz: "LEC", team: "Ferrari",   farbe: "var(--t-ferrari)" },
    { kurz: "RUS", team: "Mercedes",  farbe: "var(--t-mercedes)" },
    { kurz: "PIA", team: "McLaren",   farbe: "var(--t-mclaren)" },
    { kurz: "HAM", team: "Ferrari",   farbe: "var(--t-ferrari)", strafe: "+5s" },
    { kurz: "ALO", team: "Aston",     farbe: "var(--t-aston)" },
    { kurz: "SAI", team: "Williams",  farbe: "var(--t-williams)" }
  ];
  // Sektorfarben wie im Overlay: sp lila (Bestzeit), sg grün (persönlich best), sy gelb.
  var SEKTORFARBEN = ["sp", "sg", "sy", ""];

  function sektorzeit() { return (28 + Math.random() * 6).toFixed(3); }
  function sektorfarbe() { return SEKTORFARBEN[Math.floor(Math.random() * SEKTORFARBEN.length)]; }

  // Zustand je Fahrer: sichtbarer Platz, Abstände, Reifen, Sektoren, DRS.
  var fahrer = FELD.map(function (f, i) {
    return {
      daten: f,
      platz: i,
      luecke: i === 0 ? 0 : 1.2 + i * 1.35 + Math.random(),
      intervall: i === 0 ? 0 : 0.4 + Math.random() * 1.8,
      reifen: REIFEN[i % 3],
      sektor1: sektorzeit(), sektor2: sektorzeit(),
      farbe1: sektorfarbe(), farbe2: sektorfarbe(),
      drs: i % 3 === 1,
      el: null
    };
  });

  function zeit(s) { return s.toFixed(3); }

  // Zeilen einmal bauen; danach wandert nur noch transform — genau wie im Overlay,
  // wo die Zeilen absolut liegen und ihre Y-Position aus dem Platz kommt.
  fahrer.forEach(function (f) {
    var el = document.createElement("div");
    el.className = "trow";
    el.innerHTML =
      (f.daten.strafe ? '<span class="t-pen">' + f.daten.strafe + '</span>' : '') +
      '<div class="t-pos"><span class="num"></span><span class="chg"></span></div>' +
      '<div class="t-strip" style="--tc:' + f.daten.farbe + '"></div>' +
      '<div class="t-name">' + f.daten.kurz + '<small>' + f.daten.team + '</small></div>' +
      '<div class="t-gap"></div>' +
      '<div class="t-int"></div>' +
      '<div class="t-tyre ty-' + f.reifen + '">' + f.reifen.toUpperCase() + '</div>' +
      '<div class="t-sec"><span class="s1"></span><span class="s2"></span></div>' +
      '<div class="t-drs">DRS</div>';
    body.appendChild(el);
    f.el = el;
  });

  function zeichne() {
    fahrer.forEach(function (f) {
      var el = f.el;
      el.style.transform = "translateY(" + (f.platz * ZEILE) + "px)";
      el.dataset.even = f.platz % 2 === 0 ? "1" : "0";
      // Der Kamera-Fahrer ist im Overlay hell umrandet - hier fest der zweite Platz.
      el.className = "trow rank-" + (f.platz + 1) + (f.platz === 1 ? " fokus" : "")
                   + (f.platz === fahrer.length - 1 ? " letzte" : "");
      el.querySelector(".num").textContent = f.platz + 1;
      el.querySelector(".t-gap").textContent = f.platz === 0 ? "LEADER" : "+" + zeit(f.luecke);
      el.querySelector(".t-int").textContent = f.platz === 0 ? "—" : "+" + zeit(f.intervall);
      el.querySelector(".s1").className = "s1 " + f.farbe1;
      el.querySelector(".s2").className = "s2 " + f.farbe2;
      el.querySelector(".s1").textContent = f.sektor1;
      el.querySelector(".s2").textContent = f.sektor2;
      el.querySelector(".t-drs").classList.toggle("an", f.drs);
    });
  }
  zeichne();

  if (sanft) return;   // Ruhiges Bild für alle, die Bewegung abbestellt haben.

  // Abstände atmen leicht — sonst wirkt der Tower wie ein Standbild.
  setInterval(function () {
    fahrer.forEach(function (f) {
      if (f.platz === 0) return;
      f.luecke = Math.max(0.15, f.luecke + (Math.random() - 0.5) * 0.22);
      f.intervall = Math.max(0.08, f.intervall + (Math.random() - 0.5) * 0.16);
      f.el.querySelector(".t-gap").textContent = "+" + zeit(f.luecke);
      f.el.querySelector(".t-int").textContent = "+" + zeit(f.intervall);
      if (Math.random() < 0.25) {
        f.sektor1 = sektorzeit(); f.farbe1 = sektorfarbe();
        f.sektor2 = sektorzeit(); f.farbe2 = sektorfarbe();
        f.drs = Math.random() < 0.4;
      }
    });
    zeichne();
  }, 900);

  // Ab und zu ein Überholmanöver: zwei benachbarte Plätze tauschen, mit Pfeil.
  setInterval(function () {
    var oben = 1 + Math.floor(Math.random() * (fahrer.length - 2));
    var a = fahrer.find(function (f) { return f.platz === oben; });
    var b = fahrer.find(function (f) { return f.platz === oben + 1; });
    if (!a || !b) return;

    a.platz = oben + 1; b.platz = oben;
    var g = a.luecke; a.luecke = b.luecke; b.luecke = g;
    zeichne();

    pfeil(b, "up"); pfeil(a, "down");
  }, 4200);

  function pfeil(f, richtung) {
    var el = f.el.querySelector(".chg");
    el.textContent = richtung === "up" ? "▲" : "▼";
    el.classList.add(richtung);
    setTimeout(function () { el.textContent = ""; el.classList.remove(richtung); }, 2200);
  }

  // Rundenzähler, damit der Kopf mitlebt.
  var lap = document.getElementById("lapNo"), n = 32;
  setInterval(function () { n = n >= 57 ? 1 : n + 1; lap.textContent = n; }, 9000);
})();
