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

  /* ── Menü auf schmalen Fenstern ──────────────────────────────────────────── */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  burger.addEventListener("click", function () {
    var offen = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(offen));
    burger.setAttribute("aria-label", offen ? "Menü schließen" : "Menü öffnen");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  /* ── Einblenden beim Scrollen ────────────────────────────────────────────── */
  var zuZeigen = document.querySelectorAll(".card, .reveal");
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

  /* ── Timing-Tower-Nachbau ────────────────────────────────────────────────── */
  var body = document.getElementById("towerBody");
  if (!body) return;

  var ZEILE = 46;                       // Zeilenhöhe, muss zu .trow im CSS passen
  var REIFEN = ["s", "m", "h"];
  var FELD = [
    { kurz: "VER", team: "Red Bull",  farbe: "var(--t-redbull)" },
    { kurz: "NOR", team: "McLaren",   farbe: "var(--t-mclaren)" },
    { kurz: "LEC", team: "Ferrari",   farbe: "var(--t-ferrari)" },
    { kurz: "RUS", team: "Mercedes",  farbe: "var(--t-mercedes)" },
    { kurz: "PIA", team: "McLaren",   farbe: "var(--t-mclaren)" },
    { kurz: "HAM", team: "Ferrari",   farbe: "var(--t-ferrari)" },
    { kurz: "ALO", team: "Aston",     farbe: "var(--t-aston)" },
    { kurz: "SAI", team: "Williams",  farbe: "var(--t-williams)" }
  ];

  // Zustand je Fahrer: sichtbarer Platz, Abstände, Reifen.
  var fahrer = FELD.map(function (f, i) {
    return {
      daten: f,
      platz: i,
      luecke: i === 0 ? 0 : 1.2 + i * 1.35 + Math.random(),
      intervall: i === 0 ? 0 : 0.4 + Math.random() * 1.8,
      reifen: REIFEN[i % 3],
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
      '<div class="t-pos"><span class="num"></span><span class="chg"></span></div>' +
      '<div class="t-strip" style="--tc:' + f.daten.farbe + '"></div>' +
      '<div class="t-name">' + f.daten.kurz + '<small>' + f.daten.team + '</small></div>' +
      '<div class="t-gap"></div>' +
      '<div class="t-int"></div>' +
      '<div class="t-tyre ty-' + f.reifen + '">' + f.reifen.toUpperCase() + '</div>';
    body.appendChild(el);
    f.el = el;
  });

  function zeichne() {
    fahrer.forEach(function (f) {
      var el = f.el;
      el.style.transform = "translateY(" + (f.platz * ZEILE) + "px)";
      el.dataset.even = f.platz % 2 === 0 ? "1" : "0";
      el.className = "trow rank-" + (f.platz + 1);
      el.querySelector(".num").textContent = f.platz + 1;
      el.querySelector(".t-gap").textContent = f.platz === 0 ? "LEADER" : "+" + zeit(f.luecke);
      el.querySelector(".t-int").textContent = f.platz === 0 ? "—" : "+" + zeit(f.intervall);
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
    });
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
