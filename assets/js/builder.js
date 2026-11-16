/* ═══════════════════════════════════════════════════════════════════════════
   KERS Subsystems — Design Builder
   Farben, Deckkraft, Ecken, Schriften und das Layout aller Bausteine im Browser
   zusammenstellen und so exportieren, wie das Overlay es liest:

     design.json   designs/<name>/design.json  (name, author, description,
                   colors, alpha, shape, fonts, extra)
     Layout        {baustein: {ecke, dx, dy, z, groesse}} - derselbe Block wie
                   "layout" in overlay_settings.json und je Eintrag in layouts.json

   Die Lage rechnet wie Overlay.qml (lx/ly): Ankerpunkt plus Versatz in Pixeln
   des HUD-Fensters. Kein Framework, keine externen Quellen; nichts verlaesst
   den Browser - gemerkt wird nur lokal (localStorage) und im Teilen-Link.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const app = document.getElementById("bb");
  if (!app) return;

  const EN = (document.documentElement.lang || "de").slice(0, 2) === "en";
  const t = (de, en) => (EN ? en : de);
  const SPEICHER = "kers-builder-v1";
  const ANSICHT = "kers-builder-ansicht";

  /* ── Kleinkram ─────────────────────────────────────────────────────────── */
  const klon = (o) => JSON.parse(JSON.stringify(o));
  const klemm = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function hexOk(v) {
    if (typeof v !== "string") return null;
    let h = v.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(h)) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return /^#[0-9a-f]{6}$/.test(h) ? h : null;
  }
  function rgba(hex, a) {
    const h = hexOk(hex) || "#000000";
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + (a == null ? 1 : +a) + ")";
  }
  function mische(ziel, quelle) {
    Object.keys(quelle || {}).forEach((k) => {
      const v = quelle[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        if (!ziel[k] || typeof ziel[k] !== "object") ziel[k] = {};
        mische(ziel[k], v);
      } else ziel[k] = v;
    });
    return ziel;
  }
  const rund = (v, n) => Math.round(v * Math.pow(10, n)) / Math.pow(10, n);

  /* ── Bausteine: Schluessel und Namen wie LAYOUT_TEILE im Overlay ───────── */
  // sicht = Schluessel des Schalters in overlay_settings.json (nur wo eindeutig)
  // szene = in welcher Vorschau-Szene der Baustein zu sehen ist
  const TEILE = [
    { key: "tower", name: "Timing Tower", sicht: "tower", szene: ["rennen", "quali"] },
    { key: "trackmap", name: "Trackmap", sicht: "map", szene: ["rennen", "quali"] },
    { key: "racemsg", name: "Meldungs-Banner", sicht: "msgs", szene: ["rennen", "quali"] },
    { key: "flbanner", name: "Fastest-Lap-Banner", sicht: "flbanner", szene: ["rennen"] },
    { key: "lights", name: "Start-Ampel", sicht: "lights", szene: [] },
    { key: "battles", name: "Battle-Boxen", sicht: "battles", szene: ["rennen"] },
    { key: "hotlaps", name: "Hotlap-Boxen", szene: ["quali"] },
    { key: "lowerthird", name: "Lower-Third", sicht: "lowerthird", szene: ["rennen", "quali"] },
    { key: "danger", name: "Gefahrenzone", sicht: "danger", szene: ["quali"] },
    { key: "onboard", name: "Onboard", sicht: "onboard", szene: ["rennen", "quali"] },
    { key: "pitproj", name: "Pit-Projektion", sicht: "pitproj", szene: ["rennen"] },
    { key: "pitcards", name: "Boxenstopp-Karten", szene: ["rennen"] },
    { key: "champ", name: "WM-Stand", szene: [] }
  ];
  const TEIL = {};
  TEILE.forEach((x) => { TEIL[x.key] = x; });
  const ECKEN = ["tl", "tc", "tr", "lc", "cc", "rc", "bl", "bc", "br"];
  const ECKE_NAME = {
    tl: t("oben links", "top left"), tc: t("oben mittig", "top centre"), tr: t("oben rechts", "top right"),
    lc: t("links mittig", "left centre"), cc: t("Mitte", "centre"), rc: t("rechts mittig", "right centre"),
    bl: t("unten links", "bottom left"), bc: t("unten mittig", "bottom centre"), br: t("unten rechts", "bottom right")
  };

  /* ── Die beiden eingebauten Designs, 1:1 aus designs/kers und designs/f1tv ─────── */
  const KERS = {
    basis: "kers",
    colors: { accent: "#e10600", textMain: "#ffffff", textMuted: "#a6a6b4", panel: "#0e0e13", row: "#181821", rowAlt: "#101017",
      headerRow: "#0a0a0f", towerHead1: "#16161e", towerHead2: "#282832", headBg1: "#1b1b22", headBg2: "#111116", panelBorder: "#ffffff" },
    alpha: { panel: 0.94, row: 0.988, rowAlt: 0.988, headerRow: 0.994, towerHead1: 1, towerHead2: 1, headBg1: 1, headBg2: 1, panelBorder: 0.09 },
    shape: { panelRadius: 10, accentWidth: 3, rowHeight: 62 },
    fonts: { sans: "Inter", display: "Teko" },
    extra: {}
  };
  const F1TV = {
    basis: "f1tv",
    colors: { accent: "#e10600", textMain: "#ffffff", textMuted: "#9b9da8", panel: "#1d1e25", row: "#1d1e25", rowAlt: "#1d1e25",
      headerRow: "#2a2b33", towerHead1: "#1d1e25", towerHead2: "#1d1e25", headBg1: "#24252d", headBg2: "#1d1e25", panelBorder: "#ffffff" },
    alpha: { panel: 0.9, row: 0.9, rowAlt: 0.9, headerRow: 0.95, towerHead1: 0.92, towerHead2: 0.92, headBg1: 0.95, headBg2: 0.95, panelBorder: 0.06 },
    shape: { panelRadius: 4, accentWidth: 3, rowHeight: 62 },
    fonts: { sans: ["Formula1 Display", "Formula1", "Titillium Web"], display: ["Formula1 Display", "Formula1", "Titillium Web"] },
    extra: { posBg: "#14151a", p1Bg: "#e10600", lapBar: "#2a2b33", scYellow: "#ffd200", redFlag: "#e10600", gain: "#2ad04b", loss: "#e10600",
      out: "#7c7e88", purple: "#8f2ad8", focus: "#ffffff", focusBg: "#29ffffff", rowHeight: 34 }
  };
  const FARBEN = ["accent", "textMain", "textMuted", "panel", "row", "rowAlt", "headerRow", "towerHead1", "towerHead2", "headBg1", "headBg2", "panelBorder"];
  const ALPHA = ["panel", "row", "rowAlt", "headerRow", "towerHead1", "towerHead2", "headBg1", "headBg2", "panelBorder"];

  function abwandlung(basis, aend) { return mische(klon(basis), aend); }
  const VORLAGEN = [
    { id: "kers", name: "KERS", d: KERS },
    { id: "f1tv", name: "F1 TV", d: F1TV },
    { id: "papaya", name: "Papaya", d: abwandlung(KERS, { colors: { accent: "#ff8000", textMuted: "#b8a998", panel: "#100c09", row: "#1b150f", rowAlt: "#120e0a",
      headerRow: "#0b0806", towerHead1: "#17110c", towerHead2: "#33241a", headBg1: "#1f1710", headBg2: "#110d09" } }) },
    { id: "silber", name: t("Silberpfeil", "Silver Arrow"), d: abwandlung(KERS, { colors: { accent: "#27f4d2", textMuted: "#9cb0b5", panel: "#0a0f11", row: "#131b1e",
      rowAlt: "#0d1315", headerRow: "#070b0c", towerHead1: "#10181b", towerHead2: "#223038", headBg1: "#152024", headBg2: "#0b1113" }, shape: { panelRadius: 6 } }) },
    { id: "nacht", name: t("Nachtblau", "Midnight"), d: abwandlung(KERS, { colors: { accent: "#3671c6", textMuted: "#9aa6c2", panel: "#0a0d16", row: "#121828",
      rowAlt: "#0c111d", headerRow: "#070a12", towerHead1: "#0f1524", towerHead2: "#1e2a45", headBg1: "#141c30", headBg2: "#0b101c" } }) },
    { id: "gruen", name: "Racing Green", d: abwandlung(KERS, { colors: { accent: "#1fbf6e", textMuted: "#9db3a8", panel: "#08110d", row: "#0f1c16", rowAlt: "#0b1511",
      headerRow: "#060c09", towerHead1: "#0d1813", towerHead2: "#1c3328", headBg1: "#12201a", headBg2: "#09130e" }, shape: { panelRadius: 4 } }) },
    { id: "neon", name: "Neon", d: abwandlung(KERS, { colors: { accent: "#ff2bd6", textMuted: "#b19cc9", panel: "#0c0814", row: "#160f24", rowAlt: "#110b1c",
      headerRow: "#08050e", towerHead1: "#140d22", towerHead2: "#2b1a45", headBg1: "#1a1129", headBg2: "#0e0918" }, shape: { accentWidth: 4, panelRadius: 14 } }) },
    { id: "mono", name: t("Monochrom", "Monochrome"), d: abwandlung(KERS, { colors: { accent: "#f2f2f2", textMuted: "#9a9a9a", panel: "#111111", row: "#1a1a1a",
      rowAlt: "#141414", headerRow: "#0b0b0b", towerHead1: "#161616", towerHead2: "#2a2a2a", headBg1: "#1c1c1c", headBg2: "#121212" }, shape: { panelRadius: 2, accentWidth: 2 } }) },
    { id: "glas", name: t("Glas", "Glass"), d: abwandlung(KERS, { alpha: { panel: 0.58, row: 0.52, rowAlt: 0.42, headerRow: 0.66, towerHead1: 0.74, towerHead2: 0.74,
      headBg1: 0.78, headBg2: 0.66, panelBorder: 0.2 }, shape: { panelRadius: 16 } }) },
    { id: "hell", name: t("Hell", "Light"), d: abwandlung(KERS, { colors: { textMain: "#111318", textMuted: "#5b5f6b", panel: "#f3f4f7", row: "#ffffff", rowAlt: "#eceef3",
      headerRow: "#e1e4ea", towerHead1: "#ffffff", towerHead2: "#e6e9ef", headBg1: "#ffffff", headBg2: "#e9ecf1", panelBorder: "#000000" },
      alpha: { panel: 0.95, row: 0.96, rowAlt: 0.96, headerRow: 0.97, panelBorder: 0.12 } }) },
    { id: "f1papaya", name: "F1 TV Papaya", d: abwandlung(F1TV, { colors: { accent: "#ff8000" }, extra: { p1Bg: "#ff8000", purple: "#b14bff" } }) },
    { id: "f1nacht", name: t("F1 TV Nacht", "F1 TV Night"), d: abwandlung(F1TV, { colors: { panel: "#0e1220", row: "#0e1220", rowAlt: "#121729", headerRow: "#1a2035",
      towerHead1: "#0e1220", towerHead2: "#18203a", headBg1: "#161c30", headBg2: "#0e1220", accent: "#3671c6" }, extra: { p1Bg: "#3671c6", posBg: "#080b14", lapBar: "#1a2035" } }) }
  ];

  /* ── Layouts ───────────────────────────────────────────────────────────── */
  const e = (ecke, dx, dy, z, groesse) => ({ ecke: ecke, dx: dx, dy: dy, z: z, groesse: groesse || 1 });
  // Wie SettingsStore::layoutStandard() - Pit-Projektion und Gefahrenzone
  // sitzen hier aber ueber Onboard bzw. Hotlaps, statt darunter zu liegen.
  const STANDARD = {
    tower: e("tl", 48, 10, 30), trackmap: e("tr", 12, 12, 42), racemsg: e("tc", 0, 22, 46), flbanner: e("tc", 0, 84, 47),
    lights: e("tc", 0, 170, 80), battles: e("bc", 0, 28, 40), hotlaps: e("bc", 0, 28, 40), lowerthird: e("bc", 0, 380, 41),
    danger: e("bc", 0, 230, 46), onboard: e("bl", 24, 28, 44), pitproj: e("bl", 24, 296, 44), pitcards: e("br", 24, 28, 45),
    champ: e("br", 24, 40, 45)
  };
  const LAYOUT_VORLAGEN = [
    { id: "standard", name: t("Standard", "Default"), L: STANDARD },
    { id: "kompakt", name: t("Kompakt", "Compact"), L: {
      tower: e("tl", 24, 10, 30, 0.85), trackmap: e("tr", 12, 12, 42, 0.75), racemsg: e("tc", 0, 16, 46, 0.9), flbanner: e("tc", 0, 70, 47, 0.9),
      lights: e("tc", 0, 150, 80, 0.85), battles: e("bc", 0, 20, 40, 0.85), hotlaps: e("bc", 0, 20, 40, 0.85), lowerthird: e("bc", 0, 300, 41, 0.9),
      danger: e("bc", 0, 190, 46, 0.85), onboard: e("bl", 16, 20, 44, 0.85), pitproj: e("bl", 16, 248, 44, 0.85), pitcards: e("br", 16, 20, 45, 0.85),
      champ: e("br", 16, 24, 45, 0.85) } },
    { id: "gespiegelt", name: t("Gespiegelt", "Mirrored"), L: {
      tower: e("tr", 24, 10, 30), trackmap: e("tl", 12, 12, 42), racemsg: e("tc", 0, 22, 46), flbanner: e("tc", 0, 84, 47),
      lights: e("tc", 0, 170, 80), battles: e("bc", 0, 28, 40), hotlaps: e("bc", 0, 28, 40), lowerthird: e("bc", 0, 380, 41),
      danger: e("bc", 0, 230, 46), onboard: e("br", 24, 28, 44), pitproj: e("br", 24, 296, 44), pitcards: e("bl", 24, 28, 45),
      champ: e("bl", 24, 40, 45) } },
    { id: "stream", name: t("Stream mit Facecam", "Stream with facecam"), L: {
      tower: e("tl", 24, 10, 30, 0.9), trackmap: e("tr", 12, 12, 42, 0.8), racemsg: e("tc", 0, 22, 46), flbanner: e("tc", 0, 84, 47),
      lights: e("tc", 0, 170, 80), battles: e("bc", -150, 28, 40, 0.9), hotlaps: e("bc", -150, 28, 40, 0.9), lowerthird: e("bc", -150, 340, 41),
      danger: e("bc", -150, 220, 46), onboard: e("rc", 24, 40, 44, 0.9), pitproj: e("rc", 24, -170, 44, 0.9), pitcards: e("tr", 24, 360, 45, 0.9),
      champ: e("rc", 270, 40, 45, 0.85) } }
  ];

  /* ── Schriften ─────────────────────────────────────────────────────────── */
  const SCHRIFTEN = [
    ["Inter", t("eingebaut", "built in")], ["Teko", t("eingebaut", "built in")], ["Titillium Web", t("im F1-TV-Design", "ships with F1 TV")],
    ["Bahnschrift", "Windows"], ["Segoe UI", "Windows"], ["Arial", "Windows"], ["Impact", "Windows"], ["Consolas", "Windows"]
  ];
  const EIGENE = "__eigen";

  /* ── Testfeld fuer die Vorschau ────────────────────────────────────────── */
  const TEAMS = {
    RBR: ["Red Bull", "#3671C6"], MCL: ["McLaren", "#FF8000"], FER: ["Ferrari", "#E80020"], MER: ["Mercedes", "#27F4D2"],
    AMR: ["Aston Martin", "#229971"], WIL: ["Williams", "#64C4FF"], ALP: ["Alpine", "#0093CC"], HAA: ["Haas", "#B6BABD"],
    AUD: ["Audi", "#52E252"], RB: ["Racing Bulls", "#6692FF"], CAD: ["Cadillac", "#C9C9CF"]
  };
  const FELD = [
    ["VER", "Verstappen", "RBR", "M", 18], ["NOR", "Norris", "MCL", "H", 9], ["LEC", "Leclerc", "FER", "M", 17], ["PIA", "Piastri", "MCL", "H", 9],
    ["RUS", "Russell", "MER", "M", 21], ["HAM", "Hamilton", "FER", "H", 12], ["ANT", "Antonelli", "MER", "S", 4], ["ALO", "Alonso", "AMR", "M", 19],
    ["SAI", "Sainz", "WIL", "H", 14], ["ALB", "Albon", "WIL", "M", 16], ["GAS", "Gasly", "ALP", "H", 11], ["HAD", "Hadjar", "RBR", "M", 20],
    ["LAW", "Lawson", "RB", "H", 10], ["BEA", "Bearman", "HAA", "S", 3], ["HUL", "Hülkenberg", "AUD", "M", 22], ["STR", "Stroll", "AMR", "H", 13],
    ["OCO", "Ocon", "HAA", "M", 18], ["BOR", "Bortoleto", "AUD", "H", 8], ["LIN", "Lindblad", "RB", "M", 15], ["COL", "Colapinto", "ALP", "S", 6],
    ["PER", "Pérez", "CAD", "H", 12], ["BOT", "Bottas", "CAD", "M", 24]
  ];
  const REIFENFARBE = { S: "#ff3333", M: "#ffd400", H: "#f2f2f2", I: "#2bd04b", W: "#2e8bff" };
  const farbe = (f) => TEAMS[f[2]][1];

  function reifenSvg(c) {
    return '<svg viewBox="0 0 28 28" width="28" height="28"><circle cx="14" cy="14" r="14" fill="#0b0b0e"/>'
      + '<path d="M8.51 22.79A10.36 10.36 0 0 1 8.51 5.21M19.49 5.21A10.36 10.36 0 0 1 19.49 22.79" fill="none" stroke="' + c + '" stroke-width="3.08"/></svg>';
  }
  const UHR = '<svg viewBox="0 0 15 15" width="15" height="15"><circle cx="7.5" cy="7.5" r="7.5" fill="var(--b-purple)"/>'
    + '<circle cx="7.5" cy="8.3" r="3.9" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M7.5 8.3 9.7 5.9" stroke="#fff" stroke-width="1.4"/>'
    + '<rect x="6.3" y="1.2" width="2.4" height="1.6" fill="#fff"/></svg>';

  function luecke(i) { return i === 0 ? 0 : i * 1.62 + (i % 3) * 0.37 + (i > 9 ? i * 0.4 : 0); }
  function intervall(i) { return i === 0 ? 0 : luecke(i) - luecke(i - 1); }

  /* ── Vorschau-Bausteine als HTML ───────────────────────────────────────── */
  const MOCK = {
    towerKers() {
      let h = '<div class="m-tower"><div class="m-tw-kopf"><span class="m-live"><i></i>LIVE</span><span class="m-tw-titel">Grand Prix</span>'
        + '<span class="m-tw-lap">' + t("RUNDE", "LAP") + ' <b>32</b>/57</span></div>'
        + '<div class="m-tw-sp"><span>Pos</span><span></span><span>' + t("Fahrer", "Driver") + '</span><span>Leader</span><span>Interval</span>'
        + '<span class="c">' + t("Reifen", "Tyre") + '</span><span class="r">' + t("Sektoren", "Sectors") + '</span><span class="c">DRS</span></div><div>';
      const sek = ["sp", "sg", "", "sy", "sg", "", ""];
      FELD.forEach((f, i) => {
        const iv = intervall(i);
        h += '<div class="m-tr' + (i === 2 ? " fokus" : "") + '" style="--tc:' + farbe(f) + '">'
          + (f[0] === "HAM" ? '<span class="m-strafe">+5s</span>' : "")
          + '<span class="m-pos">' + (i + 1) + (i === 4 ? "<s>▲</s>" : i === 7 ? '<s class="ab">▼</s>' : "") + '</span><i class="m-strip"></i>'
          + '<span class="m-name">' + f[0] + "<small>" + TEAMS[f[2]][0] + "</small></span>"
          + '<span class="m-gap">' + (i === 0 ? "LEADER" : "+" + luecke(i).toFixed(3)) + "</span>"
          + '<span class="m-int">' + (i === 0 ? "" : "+" + iv.toFixed(3)) + "</span>"
          + '<span class="m-reifen" style="--ty:' + REIFENFARBE[f[3]] + '">' + f[3] + "</span>"
          + '<span class="m-sek"><i class="' + sek[i % 7] + '">' + (27.8 + ((i * 13) % 17) / 10).toFixed(3) + '</i><i class="' + sek[(i + 3) % 7] + '">'
          + (31.1 + ((i * 7) % 13) / 10).toFixed(3) + "</i></span>"
          + '<span class="m-drs' + (i > 0 && iv < 1 ? " an" : "") + '">DRS</span></div>';
      });
      return h + "</div></div>";
    },
    towerF1() {
      let h = '<div class="m-f1"><div class="m-f1-kopf">Grand Prix</div><div class="m-f1-lap">LAP <b>32</b> / 57</div><div class="m-f1-body">';
      FELD.forEach((f, i) => {
        h += '<div class="m-f1r' + (i === 0 ? " p1" : "") + (i === 2 ? " fokus" : "") + '" style="--tc:' + farbe(f) + '">'
          + '<span class="m-f1pos">' + (i + 1) + '</span><i class="m-f1team"></i>'
          + '<span class="m-f1name">' + f[1] + (f[0] === "HAM" ? "<em>+5</em>" : "") + (f[0] === "NOR" ? UHR : "") + "</span>"
          + '<span class="m-f1wert">' + (i === 0 ? "Leader" : "+" + luecke(i).toFixed(1)) + "</span>"
          + '<span class="m-f1reifen">' + reifenSvg(REIFENFARBE[f[3]]) + "<b>" + f[4] + "</b></span>"
          + (i > 0 && intervall(i) < 1 ? '<i class="m-f1drs"></i>' : "") + (i === 2 ? '<i class="m-f1pfeil"></i>' : "") + "</div>";
      });
      return h + '</div><div class="m-f1-fuss"></div></div>';
    },
    trackmap() {
      return '<div class="m-map"><svg viewBox="0 0 400 400" data-karte>'
        + '<path id="bbStrecke" d="M78 304C46 262 50 178 96 144L172 92C204 70 246 62 282 80C322 100 348 140 334 182C322 214 282 216 264 238C248 258 272 284 302 292C338 302 352 332 326 352C300 370 240 364 190 354L112 338C94 334 86 320 78 304Z"'
        + ' fill="none" stroke="rgba(0,0,0,.55)" stroke-width="17" stroke-linejoin="round"/>'
        + '<use href="#bbStrecke" stroke="#e9e9f0" stroke-width="9" fill="none"/>'
        + '<path d="M150 103l12 -17" stroke="var(--b-accent)" stroke-width="5"/>'
        + '<g data-punkte></g></svg></div>';
    },
    racemsg() {
      return '<div class="m-msg"><i></i><span class="m-msg-art">' + t("Rennleitung", "Race Control") + '</span><span class="m-msg-txt">'
        + t("5 Sek Strafe · Hamilton · Unsafe Release", "5 sec penalty · Hamilton · unsafe release") + "</span></div>";
    },
    flbanner() {
      return '<div class="m-flb"><span>' + UHR.replace('width="15" height="15"', 'width="26" height="26"') + '</span><span class="m-flb-art">'
        + t("Schnellste Runde", "Fastest lap") + '</span><span class="m-farbe" style="--tc:#FF8000"></span><b>Lando Norris</b><span class="m-flb-zeit">1:31.447</span></div>';
    },
    lights() {
      let h = '<div class="m-ampel">';
      for (let i = 0; i < 5; i++) h += '<div class="m-amp' + (i < 4 ? " an" : "") + '"><i></i><i></i></div>';
      return h + "</div>";
    },
    battles() {
      const box = (p, a, b, gap, runden) => '<div class="m-karte m-bat"><div class="m-kopf">Battle for P' + p + "</div>"
        + '<div class="m-bat-sub">⚔ ' + t("Kampf in", "Fight in") + " <b>" + runden + "</b> " + t("Runden", "laps") + "</div>"
        + '<div class="m-brow" style="--tc:' + farbe(a) + '"><span class="p">' + p + '</span><span class="n">' + a[1] + '</span><span class="g leer">—</span></div>'
        + '<div class="m-brow" style="--tc:' + farbe(b) + '"><span class="p">' + (p + 1) + '</span><span class="n">' + b[1] + '</span><span class="g">+' + gap + "</span></div></div>";
      return '<div class="m-reihe">' + box(4, FELD[3], FELD[4], "0.412", 3) + box(9, FELD[8], FELD[9], "0.786", 5) + "</div>";
    },
    hotlaps() {
      const box = (p, f, zeit, sek, ziel, fokus) => '<div class="m-karte m-hl' + (fokus ? " fokus" : "") + '"><div class="m-hl-kopf"><b>P' + p + '</b><span class="m-farbe" style="--tc:'
        + farbe(f) + '"></span>' + f[1] + "<span>" + t("Fliegende Runde", "Flying lap") + "</span></div>"
        + '<div class="m-hl-zeit">' + zeit + '</div><div class="m-hl-sek">' + sek.map((c) => '<i class="' + c + '"></i>').join("") + "</div>"
        + '<div class="m-hl-ziel"><span>' + ziel[0] + "</span><b" + (ziel[1][0] === "+" ? ' class="lang"' : "") + ">" + ziel[1] + "</b></div></div>";
      return '<div class="m-reihe">' + box(1, FELD[1], "1:14.2", ["sp", "sg", ""], ["Pole", "−0.124"], false)
        + box(3, FELD[2], "1:14.6", ["sg", "sy", ""], ["Pole", "+0.311"], true)
        + box(11, FELD[10], "0:48.9", ["sy", "", ""], [t("Cut-Linie", "Cut line"), "+0.042"], false) + "</div>";
    },
    lowerthird() {
      return '<div class="m-lt"><div class="m-lt-pos">P3</div><div class="m-lt-body" style="--tc:' + farbe(FELD[2]) + '"><b>Charles Leclerc</b><span>Ferrari · #16</span></div></div>';
    },
    danger() {
      return '<div class="m-karte m-dz"><div class="m-kopf">' + t("Gefahrenzone", "Danger zone") + '</div><div class="m-dz-zeile"><b>P15</b><span class="m-farbe" style="--tc:'
        + farbe(FELD[14]) + '"></span>' + FELD[14][1] + "<span>+0.214</span></div>"
        + '<div class="m-dz-uhr">' + t("Session endet in", "Session ends in") + " <b>2:41</b></div></div>";
    },
    onboard() {
      return '<div class="m-karte m-onb"><div class="m-kopf">Onboard · LEC</div><div class="m-onb-body">'
        + '<div class="m-onb-oben"><span class="m-gang">7</span><span class="m-kmh">312<small>KM/H</small></span></div>'
        + '<div class="m-balken"><i style="width:82%"></i></div>'
        + '<div class="m-pedale"><div>' + t("Gas", "Throttle") + '<i style="--w:100%"></i></div><div>' + t("Bremse", "Brake") + '<i style="--w:6%"></i></div></div>'
        + '<div class="m-balken ers"><i style="width:64%"></i></div>'
        + '<div class="m-reifen4"><i>92</i><i>94</i><i class="warm">88</i><i>90</i></div></div></div>';
    },
    pitproj() {
      return '<div class="m-karte m-pp"><div class="m-kopf">' + t("Pit-Projektion", "Pit projection") + '</div><div class="m-pp-body">'
        + '<div class="m-pp-zeile"><span class="m-farbe" style="--tc:' + farbe(FELD[2]) + '"></span>Leclerc<b>P7</b></div>'
        + "<small>" + t("käme 1,8 s vor Alonso raus", "would come out 1.8 s ahead of Alonso") + "</small></div></div>";
    },
    pitcards() {
      return '<div class="m-karte m-pc"><div class="m-kopf">Pit Stop</div><div class="m-pc-body"><span class="m-farbe" style="--tc:' + farbe(FELD[5])
        + '"></span>Hamilton<span class="m-pc-zeit">2.4<small>s</small></span></div>'
        + '<div class="m-pc-fuss"><span>M → <b>H</b></span><span>' + t("Raus auf", "Exit") + " <b>P8</b></span></div></div>";
    },
    champ() {
      let h = '<div class="m-karte m-champ"><div class="m-kopf">' + t("Fahrerwertung", "Drivers' standings") + "</div>";
      const pkt = [312, 298, 270, 251, 233, 201, 177, 140, 102, 88];
      const chg = ["+25", "+18", "+15", "+12", "+10", "+8", "+6", "+4", "+2", "+1"];
      for (let i = 0; i < 10; i++) {
        const f = FELD[i];
        h += '<div class="m-ch" style="--tc:' + farbe(f) + '"><b>' + (i + 1) + "</b><i></i><span>" + f[1] + "</span><em>" + chg[i] + "</em><strong>" + (pkt[i] + parseInt(chg[i], 10)) + "</strong></div>";
      }
      return h + "</div>";
    }
  };

  /* ── Zustand ───────────────────────────────────────────────────────────── */
  function neuerStand() {
    const sicht = {};
    TEILE.forEach((x) => { sicht[x.key] = true; });
    return {
      v: 1,
      meta: { name: t("Mein Design", "My design"), author: "", description: "" },
      vorlage: "kers",
      design: klon(KERS),
      layout: klon(STANDARD),
      sicht: sicht
    };
  }
  let S = neuerStand();
  let V = { szene: "rennen", aufl: "1920x1080", hg: "strecke", raster: false, einrasten: true, autoAnker: true, tab: "vorlagen", sichtExport: true };
  let gewaehlt = null;
  let hgBild = null;

  // Was aus Dateien, Links oder dem Speicher kommt, wird geprueft - wie das
  // Overlay mit layoutPruefen(): Grenzen einhalten, Unbekanntes weglassen.
  function layoutEintrag(w, vorgabe) {
    const r = klon(vorgabe || STANDARD.tower);
    if (!w || typeof w !== "object") return r;
    if (ECKEN.indexOf(w.ecke) >= 0) r.ecke = w.ecke;
    if (isFinite(+w.dx) && w.dx !== null && w.dx !== "") r.dx = Math.round(klemm(+w.dx, -4000, 4000));
    if (isFinite(+w.dy) && w.dy !== null && w.dy !== "") r.dy = Math.round(klemm(+w.dy, -4000, 4000));
    if (isFinite(+w.z) && w.z !== null && w.z !== "") r.z = Math.round(klemm(+w.z, 0, 100));
    if (isFinite(+w.groesse) && +w.groesse > 0) r.groesse = rund(klemm(+w.groesse, 0.5, 2), 2);
    return r;
  }
  function layoutSauber(L) {
    const r = {};
    TEILE.forEach((x) => { r[x.key] = layoutEintrag(L && L[x.key], STANDARD[x.key]); });
    return r;
  }
  function schriftSauber(v, vorgabe) {
    if (Array.isArray(v)) { const l = v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 6); return l.length ? l : vorgabe; }
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 80);
    return vorgabe;
  }
  function designSauber(d, basis) {
    const grund = klon(basis === "f1tv" ? F1TV : KERS);
    if (!d || typeof d !== "object") return grund;
    FARBEN.forEach((k) => { const h = hexOk(d.colors && d.colors[k]); if (h) grund.colors[k] = h; });
    ALPHA.forEach((k) => { const a = d.alpha && +d.alpha[k]; if (d.alpha && isFinite(a) && d.alpha[k] !== null) grund.alpha[k] = rund(klemm(a, 0, 1), 3); });
    if (d.shape) {
      if (isFinite(+d.shape.panelRadius)) grund.shape.panelRadius = Math.round(klemm(+d.shape.panelRadius, 0, 40));
      if (isFinite(+d.shape.accentWidth)) grund.shape.accentWidth = Math.round(klemm(+d.shape.accentWidth, 0, 12));
      if (isFinite(+d.shape.rowHeight)) grund.shape.rowHeight = Math.round(klemm(+d.shape.rowHeight, 24, 120));
    }
    if (d.fonts) {
      grund.fonts.sans = schriftSauber(d.fonts.sans, grund.fonts.sans);
      grund.fonts.display = schriftSauber(d.fonts.display, grund.fonts.display);
    }
    if (d.extra && typeof d.extra === "object" && !Array.isArray(d.extra)) {
      // extra ist frei - nur einfache Werte uebernehmen, nichts Verschachteltes
      Object.keys(d.extra).slice(0, 60).forEach((k) => {
        const v = d.extra[k];
        if (/^[A-Za-z_][\w]{0,40}$/.test(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) grund.extra[k] = typeof v === "string" ? v.slice(0, 120) : v;
      });
    }
    return grund;
  }
  function standSauber(x) {
    const s = neuerStand();
    if (!x || typeof x !== "object") return s;
    const basis = x.design && x.design.basis === "f1tv" ? "f1tv" : "kers";
    s.design = designSauber(x.design, basis);
    s.design.basis = basis;
    s.layout = layoutSauber(x.layout);
    if (x.sicht) TEILE.forEach((t2) => { if (typeof x.sicht[t2.key] === "boolean") s.sicht[t2.key] = x.sicht[t2.key]; });
    if (x.meta) ["name", "author", "description"].forEach((k) => { if (typeof x.meta[k] === "string") s.meta[k] = x.meta[k].slice(0, k === "description" ? 400 : 60); });
    s.vorlage = typeof x.vorlage === "string" ? x.vorlage : "";
    return s;
  }

  /* ── Verlauf: Rueckgaengig / Wiederholen ───────────────────────────────── */
  let verlauf = [], stelle = -1;
  function merke() {
    const jetzt = JSON.stringify(S);
    if (verlauf[stelle] === jetzt) return;
    verlauf = verlauf.slice(0, stelle + 1);
    verlauf.push(jetzt);
    if (verlauf.length > 150) verlauf.shift();
    stelle = verlauf.length - 1;
    sichern();
    knoepfeVerlauf();
  }
  function springe(um) {
    const ziel = stelle + um;
    if (ziel < 0 || ziel >= verlauf.length) return;
    stelle = ziel;
    S = JSON.parse(verlauf[stelle]);
    alles();
    sichern();
  }
  let sicherZeit = 0;
  function sichern() {
    clearTimeout(sicherZeit);
    sicherZeit = setTimeout(() => {
      try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (err) { /* privat: dann eben nicht */ }
    }, 250);
  }
  function ansichtSichern() {
    try { localStorage.setItem(ANSICHT, JSON.stringify(V)); } catch (err) { /* egal */ }
  }

  /* ── Grundgeruest ──────────────────────────────────────────────────────── */
  const TABS = [
    ["vorlagen", t("Vorlagen", "Presets")], ["farben", t("Farben", "Colours")], ["form", t("Form", "Shape")],
    ["layout", "Layout"], ["export", "Export"]
  ];
  const AUFL = ["1280x720", "1920x1080", "2560x1440", "3440x1440", "3840x2160"];
  const HG = [
    ["strecke", t("Strecke", "Track")], ["dunkel", t("Dunkel", "Dark")], ["hell", t("Hell", "Light")],
    ["magenta", t("Magenta (OBS)", "Magenta (OBS)")], ["gruen", t("Greenscreen", "Green screen")], ["bild", t("Eigenes Bild …", "Own image …")]
  ];

  app.innerHTML = ""
    + '<div class="bb-app">'
    + '  <div class="bb-vorschau">'
    + '    <div class="bb-leiste" role="toolbar" aria-label="' + t("Vorschau", "Preview") + '">'
    + '      <div class="bb-seg" data-gruppe="szene">'
    + '        <button type="button" data-wert="alles">' + t("Alles", "All") + "</button>"
    + '        <button type="button" data-wert="rennen">' + t("Rennen", "Race") + "</button>"
    + '        <button type="button" data-wert="quali">Quali</button></div>'
    + '      <select class="bb-sel" data-ansicht="aufl" aria-label="' + t("Auflösung des HUD", "HUD resolution") + '">'
    + AUFL.map((a) => '<option value="' + a + '">' + a.replace("x", " × ") + "</option>").join("") + "</select>"
    + '      <select class="bb-sel" data-ansicht="hg" aria-label="' + t("Hintergrund", "Background") + '">'
    + HG.map((h) => '<option value="' + h[0] + '">' + h[1] + "</option>").join("") + "</select>"
    + '      <input type="file" accept="image/*" hidden data-datei="bild">'
    + '      <button type="button" class="bb-k" data-schalter="raster" title="' + t("Raster und Mittellinien", "Grid and centre lines") + '">' + t("Raster", "Grid") + "</button>"
    + '      <button type="button" class="bb-k" data-schalter="einrasten" title="' + t("An Rändern und Mitte einrasten (Alt hält es auf)", "Snap to edges and centre (hold Alt to skip)") + '">' + t("Einrasten", "Snap") + "</button>"
    + '      <span class="bb-sp"></span>'
    + '      <button type="button" class="bb-k ico" data-tu="zurueck" title="' + t("Rückgängig (Strg+Z)", "Undo (Ctrl+Z)") + '" aria-label="' + t("Rückgängig", "Undo") + '">↶</button>'
    + '      <button type="button" class="bb-k ico" data-tu="vor" title="' + t("Wiederholen (Strg+Y)", "Redo (Ctrl+Y)") + '" aria-label="' + t("Wiederholen", "Redo") + '">↷</button>'
    + '      <button type="button" class="bb-k ico" data-tu="vollbild" title="' + t("Vollbild", "Full screen") + '" aria-label="' + t("Vollbild", "Full screen") + '">⤢</button>'
    + "    </div>"
    + '    <div class="bb-rahmen" id="bbRahmen"><div class="bb-buehne" id="bbBuehne"><div class="bb-hg"></div>'
    + '      <div class="bb-raster"></div><i class="bb-linie v"></i><i class="bb-linie h"></i></div></div>'
    + '    <div class="bb-status"><span id="bbInfo"></span><span class="bb-tipp">'
    + t("Ziehen verschiebt · Ecke unten rechts ändert die Größe · Pfeiltasten 1 px, mit Umschalt 10 px",
        "Drag to move · bottom-right corner resizes · arrow keys 1 px, with Shift 10 px") + "</span></div>"
    + "  </div>"
    + '  <aside class="bb-panel" aria-label="' + t("Einstellungen", "Settings") + '">'
    + '    <div class="bb-tabs" role="tablist">'
    + TABS.map((x) => '<button type="button" role="tab" id="bbt-' + x[0] + '" aria-controls="bbp-' + x[0] + '" data-tab="' + x[0] + '">' + x[1] + "</button>").join("")
    + "    </div>"
    + TABS.map((x) => '<div class="bb-tab" role="tabpanel" id="bbp-' + x[0] + '" aria-labelledby="bbt-' + x[0] + '" hidden></div>').join("")
    + "  </aside>"
    + "</div>";
  const toast = el("div", "bb-toast");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  let toastZeit = 0;
  function melde(text) {
    toast.textContent = text;
    toast.classList.add("da");
    clearTimeout(toastZeit);
    toastZeit = setTimeout(() => toast.classList.remove("da"), 2600);
  }

  const rahmen = document.getElementById("bbRahmen");
  const buehne = document.getElementById("bbBuehne");
  const hg = buehne.querySelector(".bb-hg");
  const linieV = buehne.querySelector(".bb-linie.v"), linieH = buehne.querySelector(".bb-linie.h");
  const info = document.getElementById("bbInfo");
  const panel = {};
  TABS.forEach((x) => { panel[x[0]] = document.getElementById("bbp-" + x[0]); });

  /* ── Bausteine auf die Buehne ──────────────────────────────────────────── */
  const TE = {};
  TEILE.forEach((x) => {
    const box = el("div", "bb-teil");
    box.dataset.teil = x.key;
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.setAttribute("aria-label", x.name);
    const inhalt = el("div", "bb-inhalt");
    const schild = el("span", "bb-schild", esc(x.name));
    const griff = el("i", "bb-griff");
    griff.title = t("Ziehen ändert die Größe", "Drag to resize");
    box.append(inhalt, schild, griff);
    buehne.insertBefore(box, buehne.querySelector(".bb-raster"));
    TE[x.key] = { box: box, inhalt: inhalt, x: 0, y: 0, w: 0, h: 0, s: 1 };
  });
  let gebauteBasis = "";
  function baueInhalte() {
    const basis = S.design.basis;
    if (basis === gebauteBasis) return;
    gebauteBasis = basis;
    buehne.classList.toggle("stil-f1tv", basis === "f1tv");
    buehne.classList.toggle("stil-kers", basis !== "f1tv");
    TEILE.forEach((x) => {
      if (x.key === "tower") TE.tower.inhalt.innerHTML = basis === "f1tv" ? MOCK.towerF1() : MOCK.towerKers();
      else if (!TE[x.key].inhalt.firstChild) TE[x.key].inhalt.innerHTML = MOCK[x.key]();
    });
    punkteAufDieKarte();
  }
  function punkteAufDieKarte() {
    const svg = TE.trackmap.inhalt.querySelector("svg");
    const pfad = svg && svg.querySelector("#bbStrecke");
    const g = svg && svg.querySelector("[data-punkte]");
    if (!pfad || !g || !pfad.getTotalLength) return;
    const laenge = pfad.getTotalLength();
    let h = "";
    FELD.slice(0, 14).forEach((f, i) => {
      const p = pfad.getPointAtLength((laenge * (0.9 - i * 0.052 - (i > 6 ? 0.03 : 0)) + laenge) % laenge);
      h += i === 2
        ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="11" fill="' + farbe(f) + '" stroke="#fff" stroke-width="3.5"/>'
        : '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7.5" fill="' + farbe(f) + '" stroke="rgba(0,0,0,.7)" stroke-width="2"/>';
    });
    g.innerHTML = h;
  }

  /* ── Design auf die Buehne: die Variablen --b-* ────────────────────────── */
  function schriftStapel(v, rest) {
    const liste = (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim().replace(/["\\]/g, "")).filter(Boolean);
    return liste.map((n) => '"' + n + '"').concat(rest).join(", ");
  }
  function argb(v, vorgabe) {
    // #AARRGGBB (Qt) -> rgba()
    const m = /^#([0-9a-f]{2})([0-9a-f]{6})$/i.exec(String(v || ""));
    if (!m) return vorgabe;
    return rgba("#" + m[2], rund(parseInt(m[1], 16) / 255, 3));
  }
  function designAnwenden() {
    const d = S.design, c = d.colors, a = d.alpha, x = d.extra || {}, st = buehne.style;
    const setz = (k, v) => st.setProperty(k, v);
    setz("--b-accent", c.accent);
    setz("--b-text", c.textMain);
    setz("--b-muted", c.textMuted);
    setz("--b-panel", rgba(c.panel, a.panel));
    setz("--b-row", rgba(c.row, a.row));
    setz("--b-rowalt", rgba(c.rowAlt, a.rowAlt));
    setz("--b-header", rgba(c.headerRow, a.headerRow));
    setz("--b-th1", rgba(c.towerHead1, a.towerHead1));
    setz("--b-th2", rgba(c.towerHead2, a.towerHead2));
    setz("--b-hb1", rgba(c.headBg1, a.headBg1));
    setz("--b-hb2", rgba(c.headBg2, a.headBg2));
    setz("--b-border", rgba(c.panelBorder, a.panelBorder));
    setz("--b-radius", d.shape.panelRadius + "px");
    setz("--b-aw", d.shape.accentWidth + "px");
    setz("--b-rowh", d.shape.rowHeight + "px");
    setz("--b-sans", schriftStapel(d.fonts.sans, ["Inter", "system-ui", "sans-serif"]));
    setz("--b-display", schriftStapel(d.fonts.display, d.basis === "f1tv" ? ["Titillium Web", "Inter", "sans-serif"] : ["Teko", "Inter", "sans-serif"]));
    setz("--b-purple", hexOk(x.purple) || "#8f2ad8");
    setz("--b-p1", hexOk(x.p1Bg) || c.accent);
    setz("--b-pos", hexOk(x.posBg) || "#14151a");
    setz("--b-lapbar", hexOk(x.lapBar) || "#2a2b33");
    setz("--b-sc", hexOk(x.scYellow) || "#ffd200");
    setz("--b-focus", hexOk(x.focus) || "#ffffff");
    setz("--b-gain", hexOk(x.gain) || "#2ad04b");
    setz("--b-loss", hexOk(x.loss) || c.accent);
    setz("--b-focusbg", argb(x.focusBg, "rgba(255,255,255,.16)"));
    setz("--b-f1w", ((+x.towerWidth > 0) ? +x.towerWidth : 340) + "px");
    setz("--b-f1rowh", ((+x.rowHeight > 0) ? +x.rowHeight : 34) + "px");
  }

  /* ── Lage: wie lx/ly in Overlay.qml ────────────────────────────────────── */
  function aufl() { const p = V.aufl.split("x"); return { W: +p[0] || 1920, H: +p[1] || 1080 }; }
  function eigenSkala(key, h0) {
    if (key !== "tower") return 1;
    const H = aufl().H, verfuegbar = (H - 40) * 0.8;
    if (S.design.basis === "f1tv") return Math.min(1.6, verfuegbar / (h0 + 2));   // + Platz fuers SC-Band
    return 1.12 * Math.min(1, verfuegbar / (h0 * 1.12));                           // Tower.qml: towerBase 1.12
  }
  function xAus(ecke, dx, w, W) {
    if (ecke === "tl" || ecke === "lc" || ecke === "bl") return dx;
    if (ecke === "tr" || ecke === "rc" || ecke === "br") return W - w - dx;
    return Math.round((W - w) / 2) + dx;
  }
  function yAus(ecke, dy, h, H) {
    if (ecke === "tl" || ecke === "tc" || ecke === "tr") return dy;
    if (ecke === "bl" || ecke === "bc" || ecke === "br") return H - h - dy;
    return Math.round((H - h) / 2) + dy;
  }
  function dxAus(ecke, x, w, W) {
    if (ecke === "tl" || ecke === "lc" || ecke === "bl") return Math.round(x);
    if (ecke === "tr" || ecke === "rc" || ecke === "br") return Math.round(W - w - x);
    return Math.round(x - (W - w) / 2);
  }
  function dyAus(ecke, y, h, H) {
    if (ecke === "tl" || ecke === "tc" || ecke === "tr") return Math.round(y);
    if (ecke === "bl" || ecke === "bc" || ecke === "br") return Math.round(H - h - y);
    return Math.round(y - (H - h) / 2);
  }
  function eckeNah(x, y, w, h, W, H) {
    const cx = x + w / 2, cy = y + h / 2;
    const sp = cx < W / 3 ? 0 : cx > (2 * W) / 3 ? 2 : 1;
    const ze = cy < H / 3 ? 0 : cy > (2 * H) / 3 ? 2 : 1;
    return ECKEN[ze * 3 + sp];
  }
  function sichtbarInSzene(key) {
    return V.szene === "alles" || TEIL[key].szene.indexOf(V.szene) >= 0;
  }
  function lageEins(key) {
    const te = TE[key], L = S.layout[key], A = aufl();
    const w0 = te.inhalt.offsetWidth, h0 = te.inhalt.offsetHeight;
    te.s = eigenSkala(key, h0) * L.groesse;
    te.w = w0 * te.s;
    te.h = h0 * te.s;
    te.x = xAus(L.ecke, L.dx, te.w, A.W);
    te.y = yAus(L.ecke, L.dy, te.h, A.H);
    te.inhalt.style.transform = "scale(" + te.s + ")";
    const b = te.box;
    b.style.width = te.w + "px";
    b.style.height = te.h + "px";
    b.style.transform = "translate(" + te.x + "px," + te.y + "px)";
    b.style.zIndex = String(L.z + 1);
    b.classList.toggle("aus", !S.sicht[key]);
    b.classList.toggle("szene-aus", !sichtbarInSzene(key));
    b.classList.toggle("unten", te.y < 40);
  }
  function lageAlle() { TEILE.forEach((x) => lageEins(x.key)); }

  let skala = 1;
  function buehneEinpassen() {
    const A = aufl();
    buehne.style.width = A.W + "px";
    buehne.style.height = A.H + "px";
    rahmen.style.aspectRatio = A.W + " / " + A.H;
    const breit = rahmen.clientWidth, hoch = rahmen.clientHeight;
    skala = Math.min(breit / A.W, hoch / A.H) || 0.1;
    const ox = (breit - A.W * skala) / 2, oy = (hoch - A.H * skala) / 2;
    buehne.style.transform = "translate(" + ox + "px," + oy + "px) scale(" + skala + ")";
    // Schild und Griff sollen trotz Verkleinerung lesbar bleiben
    buehne.style.setProperty("--bb-gegen", String(1 / skala));
    TEILE.forEach((x) => {
      const te = TE[x.key];
      te.box.querySelector(".bb-schild").style.transform = "scale(" + Math.min(3, 0.55 / skala) + ")";
      te.box.querySelector(".bb-schild").style.transformOrigin = "0 100%";
      te.box.querySelector(".bb-griff").style.transform = "scale(" + Math.min(3.2, 0.6 / skala) + ")";
    });
  }
  if ("ResizeObserver" in window) new ResizeObserver(buehneEinpassen).observe(rahmen);
  else window.addEventListener("resize", buehneEinpassen);

  function hintergrund() {
    hg.className = "bb-hg hg-" + V.hg;
    hg.style.backgroundImage = V.hg === "bild" && hgBild ? 'url("' + hgBild + '")' : "";
    buehne.classList.toggle("mit-raster", !!V.raster);
  }

  /* ── Auswahl und Anzeige darunter ──────────────────────────────────────── */
  function waehle(key, fokus) {
    gewaehlt = key && TE[key] ? key : null;
    TEILE.forEach((x) => TE[x.key].box.classList.toggle("gewaehlt", x.key === gewaehlt));
    if (gewaehlt && fokus) TE[gewaehlt].box.focus({ preventScroll: true });
    zeigeInfo();
    if (V.tab === "layout") layoutPanel();
  }
  function zeigeInfo() {
    if (!gewaehlt) {
      const A = aufl();
      info.innerHTML = t("HUD", "HUD") + " <b>" + A.W + " × " + A.H + "</b> · " + t("Baustein anklicken, um ihn zu bearbeiten", "Click a module to edit it");
      return;
    }
    const L = S.layout[gewaehlt], te = TE[gewaehlt];
    info.innerHTML = "<b>" + esc(TEIL[gewaehlt].name) + "</b> · " + ECKE_NAME[L.ecke] + " · dx <code>" + L.dx + "</code> dy <code>" + L.dy + "</code> · "
      + t("Größe", "Size") + " <code>" + L.groesse.toFixed(2) + "</code> · " + t("Ebene", "Layer") + " <code>" + L.z + "</code> · "
      + Math.round(te.w) + " × " + Math.round(te.h) + " px";
  }

  /* ── Ziehen, Groesse, Einrasten ────────────────────────────────────────── */
  let zug = null;
  function setzeLage(key, x, y, ecke) {
    const L = S.layout[key], te = TE[key], A = aufl();
    if (ecke) L.ecke = ecke;
    L.dx = klemm(dxAus(L.ecke, x, te.w, A.W), -4000, 4000);
    L.dy = klemm(dyAus(L.ecke, y, te.h, A.H), -4000, 4000);
    lageEins(key);
  }
  function rasteEin(x, y, w, h, frei) {
    const A = aufl(), weite = 10 / Math.max(skala, 0.2) * 0.5;
    let fx = null, fy = null;
    if (!V.einrasten || frei) return { x: x, y: y, fx: fx, fy: fy };
    const xs = [[0, null], [A.W - w, null], [(A.W - w) / 2, A.W / 2], [24, null], [A.W - w - 24, null]];
    const ys = [[0, null], [A.H - h, null], [(A.H - h) / 2, A.H / 2], [24, null], [A.H - h - 24, null]];
    for (const [z, linie] of xs) if (Math.abs(x - z) < weite) { x = z; fx = linie; break; }
    for (const [z, linie] of ys) if (Math.abs(y - z) < weite) { y = z; fy = linie; break; }
    return { x: Math.round(x), y: Math.round(y), fx: fx, fy: fy };
  }
  function linien(fx, fy) {
    linieV.classList.toggle("an", fx != null);
    linieH.classList.toggle("an", fy != null);
    if (fx != null) linieV.style.left = fx - 1 + "px";
    if (fy != null) linieH.style.top = fy - 1 + "px";
  }

  buehne.addEventListener("pointerdown", (ev) => {
    const box = ev.target.closest(".bb-teil");
    if (!box) { waehle(null); return; }
    if (ev.button !== 0) return;
    const key = box.dataset.teil, te = TE[key];
    waehle(key, true);
    ev.preventDefault();
    box.setPointerCapture(ev.pointerId);
    box.classList.add("zieht");
    zug = { key: key, art: ev.target.classList.contains("bb-griff") ? "groesse" : "lage", px: ev.clientX, py: ev.clientY,
      x: te.x, y: te.y, w: te.w, g: S.layout[key].groesse, bewegt: false };
  });
  buehne.addEventListener("pointermove", (ev) => {
    if (!zug) return;
    const ddx = (ev.clientX - zug.px) / skala, ddy = (ev.clientY - zug.py) / skala;
    if (Math.abs(ddx) + Math.abs(ddy) > 1) zug.bewegt = true;
    const te = TE[zug.key], A = aufl();
    if (zug.art === "lage") {
      let nx = klemm(zug.x + ddx, -te.w * 0.5, A.W - te.w * 0.5), ny = klemm(zug.y + ddy, -te.h * 0.5, A.H - te.h * 0.5);
      const r = rasteEin(nx, ny, te.w, te.h, ev.altKey);
      linien(r.fx, r.fy);
      const ecke = V.autoAnker ? eckeNah(r.x, r.y, te.w, te.h, A.W, A.H) : null;
      setzeLage(zug.key, r.x, r.y, ecke);
    } else {
      // Groesse: die obere linke Ecke bleibt, wo sie ist
      const g = rund(klemm(zug.g * (zug.w + ddx) / zug.w, 0.5, 2), 2);
      S.layout[zug.key].groesse = g;
      lageEins(zug.key);
      setzeLage(zug.key, zug.x, zug.y);
    }
    zeigeInfo();
    inspektorWerte();
  });
  function zugEnde() {
    if (!zug) return;
    const key = zug.key;
    TE[key].box.classList.remove("zieht");
    linien(null, null);
    if (zug.bewegt) { merke(); if (V.tab === "layout") layoutPanel(); }
    zug = null;
  }
  buehne.addEventListener("pointerup", zugEnde);
  buehne.addEventListener("pointercancel", zugEnde);
  buehne.addEventListener("dblclick", (ev) => {
    const box = ev.target.closest(".bb-teil");
    if (box) { zeigeTab("layout"); waehle(box.dataset.teil); }
  });

  // Tastatur: Pfeile schieben, +/- Groesse, Entf blendet aus
  document.addEventListener("keydown", (ev) => {
    const ziel = ev.target;
    const tippt = ziel && (ziel.tagName === "INPUT" || ziel.tagName === "TEXTAREA" || ziel.tagName === "SELECT" || ziel.isContentEditable);
    const strg = ev.ctrlKey || ev.metaKey;
    if (strg && !tippt && (ev.key === "z" || ev.key === "Z")) { ev.preventDefault(); springe(ev.shiftKey ? 1 : -1); return; }
    if (strg && !tippt && (ev.key === "y" || ev.key === "Y")) { ev.preventDefault(); springe(1); return; }
    if (!gewaehlt || tippt || !app.contains(ziel) && ziel !== document.body) return;
    const te = TE[gewaehlt], schritt = ev.shiftKey ? 10 : 1;
    const pfeile = { ArrowLeft: [-schritt, 0], ArrowRight: [schritt, 0], ArrowUp: [0, -schritt], ArrowDown: [0, schritt] };
    if (pfeile[ev.key]) {
      ev.preventDefault();
      setzeLage(gewaehlt, te.x + pfeile[ev.key][0], te.y + pfeile[ev.key][1]);
      zeigeInfo(); inspektorWerte(); merkeSpaeter();
    } else if (ev.key === "+" || ev.key === "=" || ev.key === "-") {
      ev.preventDefault();
      const L = S.layout[gewaehlt], x = te.x, y = te.y;
      L.groesse = rund(klemm(L.groesse + (ev.key === "-" ? -0.05 : 0.05), 0.5, 2), 2);
      lageEins(gewaehlt); setzeLage(gewaehlt, x, y);
      zeigeInfo(); inspektorWerte(); merkeSpaeter();
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      S.sicht[gewaehlt] = !S.sicht[gewaehlt];
      lageEins(gewaehlt); merke();
      if (V.tab === "layout") layoutPanel();
      melde(S.sicht[gewaehlt] ? t("Wieder eingeblendet", "Shown again") : t("Ausgeblendet — Entf holt ihn zurück", "Hidden — Delete brings it back"));
    } else if (ev.key === "Escape") {
      waehle(null);
    }
  });
  let merkZeit = 0;
  function merkeSpaeter() { clearTimeout(merkZeit); merkZeit = setTimeout(merke, 350); }

  /* ── Leiste ueber der Vorschau ─────────────────────────────────────────── */
  function leiste() {
    app.querySelectorAll('[data-gruppe="szene"] button').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wert === V.szene)));
    app.querySelector('[data-ansicht="aufl"]').value = V.aufl;
    app.querySelector('[data-ansicht="hg"]').value = V.hg;
    app.querySelectorAll("[data-schalter]").forEach((b) => b.setAttribute("aria-pressed", String(!!V[b.dataset.schalter])));
    knoepfeVerlauf();
  }
  function knoepfeVerlauf() {
    app.querySelector('[data-tu="zurueck"]').disabled = stelle <= 0;
    app.querySelector('[data-tu="vor"]').disabled = stelle >= verlauf.length - 1;
  }
  app.querySelector('[data-gruppe="szene"]').addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    V.szene = b.dataset.wert; ansichtSichern(); leiste(); lageAlle();
  });
  app.querySelector('[data-ansicht="aufl"]').addEventListener("change", (ev) => {
    V.aufl = ev.target.value; ansichtSichern(); buehneEinpassen(); lageAlle(); zeigeInfo();
  });
  const bildDatei = app.querySelector('[data-datei="bild"]');
  app.querySelector('[data-ansicht="hg"]').addEventListener("change", (ev) => {
    if (ev.target.value === "bild" && !hgBild) { bildDatei.click(); ev.target.value = V.hg; return; }
    V.hg = ev.target.value; ansichtSichern(); hintergrund();
  });
  bildDatei.addEventListener("change", () => {
    const f = bildDatei.files && bildDatei.files[0];
    if (f) bildLaden(f);
    bildDatei.value = "";
  });
  function bildLaden(f) {
    if (!/^image\//.test(f.type)) return;
    if (hgBild) URL.revokeObjectURL(hgBild);
    hgBild = URL.createObjectURL(f);
    V.hg = "bild"; ansichtSichern(); hintergrund(); leiste();
    melde(t("Bild als Hintergrund — es bleibt in deinem Browser", "Image set as background — it stays in your browser"));
  }
  app.querySelectorAll("[data-schalter]").forEach((b) => b.addEventListener("click", () => {
    V[b.dataset.schalter] = !V[b.dataset.schalter]; ansichtSichern(); leiste(); hintergrund();
  }));
  app.querySelector('[data-tu="zurueck"]').addEventListener("click", () => springe(-1));
  app.querySelector('[data-tu="vor"]').addEventListener("click", () => springe(1));
  app.querySelector('[data-tu="vollbild"]').addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (rahmen.requestFullscreen) rahmen.requestFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", () => setTimeout(buehneEinpassen, 50));

  // Ein Bild direkt auf die Vorschau ziehen
  rahmen.addEventListener("dragover", (ev) => { if (ev.dataTransfer && [...ev.dataTransfer.types].indexOf("Files") >= 0) ev.preventDefault(); });
  rahmen.addEventListener("drop", (ev) => {
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!f) return;
    ev.preventDefault();
    if (/^image\//.test(f.type)) bildLaden(f); else dateiLesen(f);
  });

  /* ── Reiter ────────────────────────────────────────────────────────────── */
  function zeigeTab(id) {
    V.tab = id; ansichtSichern();
    app.querySelectorAll(".bb-tabs [data-tab]").forEach((b) => {
      const an = b.dataset.tab === id;
      b.setAttribute("aria-selected", String(an));
      b.tabIndex = an ? 0 : -1;
    });
    TABS.forEach((x) => { panel[x[0]].hidden = x[0] !== id; });
    ({ vorlagen: vorlagenPanel, farben: farbenPanel, form: formPanel, layout: layoutPanel, export: exportPanel })[id]();
  }
  const tabLeiste = app.querySelector(".bb-tabs");
  tabLeiste.addEventListener("click", (ev) => { const b = ev.target.closest("[data-tab]"); if (b) zeigeTab(b.dataset.tab); });
  tabLeiste.addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const i = TABS.findIndex((x) => x[0] === V.tab), n = (i + (ev.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    zeigeTab(TABS[n][0]);
    tabLeiste.querySelector('[data-tab="' + TABS[n][0] + '"]').focus();
  });

  /* ── Bausteine fuer die Panels ─────────────────────────────────────────── */
  function regler(titel, wert, min, max, schritt, beimZiehen, fertig, einheit, notiz) {
    const w = el("div", "bb-regler");
    const id = "bbr" + Math.random().toString(36).slice(2, 8);
    w.innerHTML = '<span><label for="' + id + '">' + titel + "</label>" + (notiz ? "<small>" + notiz + "</small>" : "") + "</span>"
      + '<input type="range" class="bb-r" id="' + id + '" min="' + min + '" max="' + max + '" step="' + schritt + '" value="' + wert + '">'
      + '<input type="number" class="bb-in" min="' + min + '" max="' + max + '" step="' + schritt + '" value="' + wert + '" aria-label="' + esc(titel) + (einheit ? " (" + einheit + ")" : "") + '">';
    const r = w.querySelector("[type=range]"), n = w.querySelector("[type=number]");
    const fuell = () => r.style.setProperty("--p", ((r.value - min) / (max - min)) * 100 + "%");
    fuell();
    r.addEventListener("input", () => { n.value = r.value; fuell(); beimZiehen(+r.value); });
    r.addEventListener("change", () => fertig && fertig(+r.value));
    n.addEventListener("change", () => {
      const v = klemm(+n.value || 0, min, max);
      n.value = v; r.value = v; fuell(); beimZiehen(v); fertig && fertig(v);
    });
    w.setze = (v) => { r.value = v; n.value = v; fuell(); };
    return w;
  }
  function schalter(titel, an, wechsel) {
    const l = el("label", "bb-schalter");
    l.innerHTML = "<span>" + titel + '</span><input type="checkbox"' + (an ? " checked" : "") + ">";
    l.querySelector("input").addEventListener("change", (ev) => wechsel(ev.target.checked));
    return l;
  }
  function farbZeile(titel, notiz, hex, alpha, aendern, fertig) {
    const z = el("div", "bb-farbe" + (alpha != null ? " mit-alpha" : ""));
    const id = "bbf" + Math.random().toString(36).slice(2, 8);
    z.innerHTML = '<input type="color" id="' + id + '" value="' + hex + '" aria-label="' + esc(titel) + '">'
      + '<label for="' + id + '">' + titel + (notiz ? "<small>" + notiz + "</small>" : "") + "</label>"
      + '<input type="text" class="bb-in hex" value="' + hex + '" maxlength="7" spellcheck="false" aria-label="' + esc(titel) + ' (Hex)">'
      + (alpha != null ? '<div class="bb-alpha"><span>' + t("Deckkraft", "Opacity") + '</span><input type="range" min="0" max="1" step="0.01" value="' + alpha
        + '" aria-label="' + esc(titel) + " — " + t("Deckkraft", "opacity") + '"><output>' + Math.round(alpha * 100) + " %</output></div>" : "");
    const farbe = z.querySelector("[type=color]"), text = z.querySelector(".hex"), ra = z.querySelector(".bb-alpha input"), out = z.querySelector("output");
    const fuell = () => ra && ra.style.setProperty("--p", ra.value * 100 + "%");
    fuell();
    farbe.addEventListener("input", () => { text.value = farbe.value; text.removeAttribute("aria-invalid"); aendern({ hex: farbe.value }); });
    farbe.addEventListener("change", fertig);
    text.addEventListener("input", () => {
      const h = hexOk(text.value);
      if (h) { text.removeAttribute("aria-invalid"); farbe.value = h; aendern({ hex: h }); } else text.setAttribute("aria-invalid", "true");
    });
    text.addEventListener("change", () => { const h = hexOk(text.value); if (h) { text.value = h; fertig(); } });
    if (ra) {
      ra.addEventListener("input", () => { out.textContent = Math.round(ra.value * 100) + " %"; fuell(); aendern({ alpha: +ra.value }); });
      ra.addEventListener("change", fertig);
    }
    return z;
  }
  function knopf(text, cls, tu) {
    const b = el("button", "bb-k" + (cls ? " " + cls : ""), text);
    b.type = "button";
    b.addEventListener("click", tu);
    return b;
  }
  const h4 = (text, klein) => el("h4", null, esc(text) + (klein ? "<small>" + klein + "</small>" : ""));
  const hinweis = (html) => el("p", "bb-hinweis", html);

  /* ── Panel: Vorlagen ───────────────────────────────────────────────────── */
  function vorlagenPanel() {
    const p = panel.vorlagen;
    p.innerHTML = "";
    p.append(h4(t("Basis", "Base")));
    const basis = el("div", "bb-basis");
    [["kers", "KERS", t("Tower mit Sektoren und DRS, Battle-Boxen, Teko und Inter.", "Tower with sectors and DRS, battle boxes, Teko and Inter.")],
      ["f1tv", "F1 TV", t("Schmaler Tower mit vollen Namen, roter P1, Reifen als Scheibe.", "Narrow tower with full names, red P1, tyres as a disc.")]].forEach((b) => {
      const k = el("button", null, "<b>" + b[1] + "</b><span>" + b[2] + "</span>");
      k.type = "button";
      k.setAttribute("aria-pressed", String(S.design.basis === b[0]));
      k.addEventListener("click", () => {
        if (S.design.basis === b[0]) return;
        S.design = klon(b[0] === "f1tv" ? F1TV : KERS);
        S.vorlage = b[0];
        alles(); merke();
      });
      basis.append(k);
    });
    p.append(basis, hinweis(t("Die Basis legt die Szene fest — welche QML-Dateien das Design mitbringt. Farben, Ecken und Schriften stellst du darüber ein.",
      "The base sets the scene — which QML files the design brings along. Colours, corners and fonts go on top.")));

    p.append(h4(t("Farbvorlagen", "Colour presets"), t("ersetzt Farben & Form", "replaces colours & shape")));
    const raster = el("div", "bb-vorlagen");
    VORLAGEN.forEach((v) => {
      const c = v.d.colors;
      const k = el("button", "bb-vorlage", '<i><s style="background:' + c.accent + '"></s><s style="background:' + c.towerHead2 + '"></s><s style="background:' + c.row
        + '"></s><s style="background:' + c.panel + '"></s><s style="background:' + c.textMain + '"></s></i><b>' + esc(v.name) + "</b>");
      k.type = "button";
      k.setAttribute("aria-pressed", String(S.vorlage === v.id));
      k.title = v.name + " · " + (v.d.basis === "f1tv" ? "F1 TV" : "KERS");
      k.addEventListener("click", () => {
        const extraAlt = S.design.basis === v.d.basis ? S.design.extra : {};
        S.design = klon(v.d);
        if (v.id === "kers" || v.id === "f1tv") S.design.extra = klon(v.d.extra); else S.design.extra = mische(klon(v.d.extra), {});
        void extraAlt;
        S.vorlage = v.id;
        alles(); merke();
        melde(t("Vorlage „", "Preset “") + v.name + t("“ übernommen", "” applied"));
      });
      raster.append(k);
    });
    p.append(raster);
    const reihe = el("div", "bb-reihe");
    reihe.append(knopf("🎲 " + t("Würfeln", "Randomise"), "", wuerfeln), knopf(t("Aus Akzent ableiten", "Derive from accent"), "", ableiten));
    p.append(reihe, hinweis(t("<b>Würfeln</b> baut eine stimmige Palette aus einem zufälligen Farbton, <b>Ableiten</b> tönt alle Flächen passend zur Akzentfarbe.",
      "<b>Randomise</b> builds a matching palette from a random hue, <b>Derive</b> tints every surface to suit the accent colour.")));

    p.append(h4(t("Layout-Vorlagen", "Layout presets"), t("ersetzt die Lage", "replaces positions")));
    const lv = el("div", "bb-reihe");
    LAYOUT_VORLAGEN.forEach((v) => lv.append(knopf(esc(v.name), "", () => {
      S.layout = klon(v.L); lageAlle(); merke(); zeigeInfo();
      melde(t("Layout „", "Layout “") + v.name + t("“ übernommen", "” applied"));
    })));
    p.append(lv);
  }

  // Palette aus einem Farbton: dunkle, leicht getoente Flaechen, heller Akzent
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
  }
  function hueAus(hex) {
    const h = hexOk(hex) || "#e10600";
    const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return { h: 0, s: 0 };
    let hu = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hu = Math.round(hu * 60); if (hu < 0) hu += 360;
    const l = (mx + mn) / 2;
    return { h: hu, s: d / (1 - Math.abs(2 * l - 1)) };
  }
  function flaechen(h, satt) {
    const s = satt;
    return { textMuted: hsl(h, Math.min(18, s + 6), 66), panel: hsl(h, s, 5), row: hsl(h, s, 9.5), rowAlt: hsl(h, s, 7), headerRow: hsl(h, s, 4),
      towerHead1: hsl(h, s, 8), towerHead2: hsl(h, s + 6, 15), headBg1: hsl(h, s, 10), headBg2: hsl(h, s, 6.5) };
  }
  function wuerfeln() {
    const h = Math.floor(Math.random() * 360);
    const c = S.design.colors;
    c.accent = hsl(h, 85 + Math.random() * 15, 50 + Math.random() * 8);
    mische(c, flaechen((h + (Math.random() < 0.5 ? 0 : 200)) % 360, 14 + Math.random() * 14));
    if (S.design.basis === "f1tv") { S.design.extra.p1Bg = c.accent; }
    S.vorlage = "";
    alles(); merke();
  }
  function ableiten() {
    const c = S.design.colors, x = hueAus(c.accent);
    mische(c, flaechen(x.h, x.s < 0.1 ? 0 : 22));
    S.vorlage = "";
    alles(); merke();
  }

  /* ── Panel: Farben ─────────────────────────────────────────────────────── */
  const FARB_GRUPPEN = [
    [t("Grundfarben", "Base colours"), [
      ["accent", t("Akzent", "Accent"), t("Linien, Live-Punkt, Strafe · /settings kann sie ersetzen", "lines, live dot, penalty · /settings may override it")],
      ["textMain", t("Text", "Text")], ["textMuted", t("Text gedämpft", "Muted text"), t("Spaltenköpfe, Teams, Intervall", "column heads, teams, interval")]]],
    [t("Flächen", "Surfaces"), [
      ["panel", t("Panel-Grund", "Panel")], ["row", t("Zeile", "Row"), t("im Tower", "in the tower")], ["rowAlt", t("Zeile abwechselnd", "Alternate row")],
      ["headerRow", t("Spaltenkopf", "Column header")], ["panelBorder", t("Rahmen", "Border")]]],
    [t("Verläufe", "Gradients"), [
      ["towerHead1", t("Tower-Kopf links", "Tower head left")], ["towerHead2", t("Tower-Kopf rechts", "Tower head right")],
      ["headBg1", t("Kartenkopf oben", "Card head top"), "Battles, Hotlaps …"], ["headBg2", t("Kartenkopf unten", "Card head bottom")]]]
  ];
  const F1_EXTRA = [
    ["p1Bg", t("P1-Feld", "P1 box")], ["posBg", t("Platz-Feld", "Position box")], ["lapBar", t("Runden-Leiste", "Lap bar")],
    ["scYellow", "Safety Car"], ["purple", t("Schnellste Runde", "Fastest lap")], ["focus", t("Kamera-Fahrer", "Camera driver")],
    ["gain", t("Gewinn", "Gain")], ["loss", t("Verlust", "Loss")]
  ];
  function farbenPanel() {
    const p = panel.farben;
    p.innerHTML = "";
    FARB_GRUPPEN.forEach((g) => {
      p.append(h4(g[0]));
      const liste = el("div", "bb-farben");
      g[1].forEach((f) => {
        const k = f[0], hatAlpha = ALPHA.indexOf(k) >= 0;
        liste.append(farbZeile(f[1], f[2], S.design.colors[k], hatAlpha ? S.design.alpha[k] : null, (w) => {
          if (w.hex) S.design.colors[k] = w.hex;
          if (w.alpha != null) S.design.alpha[k] = rund(w.alpha, 3);
          S.vorlage = "";
          designAnwenden();
        }, merke));
      });
      p.append(liste);
    });
    if (S.design.basis === "f1tv") {
      p.append(h4(t("F1 TV extra", "F1 TV extras"), "extra"));
      const liste = el("div", "bb-farben");
      F1_EXTRA.forEach((f) => {
        const k = f[0];
        liste.append(farbZeile(f[1], "extra." + k, hexOk(S.design.extra[k]) || "#ffffff", null, (w) => {
          S.design.extra[k] = w.hex; S.vorlage = ""; designAnwenden();
        }, merke));
      });
      p.append(liste);
    }
    p.append(hinweis(t("Die Deckkraft wird im Overlay noch mit der aus <code>/settings</code> multipliziert; der Rahmen gilt unverändert.",
      "Opacity is multiplied by the one from <code>/settings</code> in the overlay; the border applies unchanged.")));
  }

  /* ── Panel: Form & Schrift ─────────────────────────────────────────────── */
  function formPanel() {
    const p = panel.form, d = S.design;
    p.innerHTML = "";
    p.append(h4(t("Formen", "Shapes"), "shape"));
    const fertig = () => merke();
    const neu = (f) => (v) => { f(v); S.vorlage = ""; designAnwenden(); lageAlle(); };
    p.append(regler(t("Ecken", "Corners"), d.shape.panelRadius, 0, 30, 1, neu((v) => { d.shape.panelRadius = v; }), fertig, "px", "panelRadius"));
    p.append(regler(t("Akzentlinien", "Accent lines"), d.shape.accentWidth, 0, 10, 1, neu((v) => { d.shape.accentWidth = v; }), fertig, "px", "accentWidth"));
    if (d.basis === "f1tv") {
      p.append(regler(t("Tower-Breite", "Tower width"), +d.extra.towerWidth > 0 ? +d.extra.towerWidth : 340, 260, 520, 2, neu((v) => { d.extra.towerWidth = v; }), fertig, "px", "extra.towerWidth"));
      p.append(regler(t("Zeilenhöhe", "Row height"), +d.extra.rowHeight > 0 ? +d.extra.rowHeight : 34, 26, 52, 1, neu((v) => { d.extra.rowHeight = v; }), fertig, "px", "extra.rowHeight"));
      p.append(regler(t("Abstand ↔ Intervall alle", "Gap ↔ interval every"), +d.extra.gapWechsel > 0 ? +d.extra.gapWechsel : 8, 2, 30, 1, (v) => { d.extra.gapWechsel = v; S.vorlage = ""; }, fertig, "s", "extra.gapWechsel"));
    } else {
      p.append(regler(t("Zeilenhöhe im Tower", "Tower row height"), d.shape.rowHeight, 36, 96, 1, neu((v) => { d.shape.rowHeight = v; }), fertig, "px", "rowHeight"));
      p.append(hinweis(t("Der Tower passt sich der Bildhöhe an: höhere Zeilen machen ihn nicht länger, sondern schmaler und luftiger.",
        "The tower fits itself to the screen height: taller rows don’t make it longer, but narrower and airier.")));
    }

    p.append(h4(t("Schriften", "Fonts"), "fonts"));
    [["sans", t("Fließtext", "Body text"), "Inter"], ["display", t("Überschriften & Zahlen", "Headings & numbers"), "Teko"]].forEach((s) => {
      const wert = d.fonts[s[0]], liste = Array.isArray(wert) ? wert : [wert];
      const bekannt = !Array.isArray(wert) && SCHRIFTEN.some((x) => x[0] === wert);
      const feld = el("div", "bb-feld");
      feld.innerHTML = "<span>" + s[1] + " <small>(" + s[0] + ")</small></span>"
        + '<select class="bb-sel">' + SCHRIFTEN.map((x) => '<option value="' + esc(x[0]) + '"' + (bekannt && x[0] === wert ? " selected" : "") + ">" + esc(x[0]) + " — " + x[1] + "</option>").join("")
        + '<option value="' + EIGENE + '"' + (bekannt ? "" : " selected") + ">" + t("Eigene …", "Custom …") + "</option></select>"
        + '<input class="bb-in" type="text" spellcheck="false" placeholder="' + t("z. B. Formula1 Display, Titillium Web", "e.g. Formula1 Display, Titillium Web") + '" value="' + esc(liste.join(", ")) + '"' + (bekannt ? " hidden" : "") + ">";
      const sel = feld.querySelector("select"), txt = feld.querySelector("input");
      sel.addEventListener("change", () => {
        if (sel.value === EIGENE) { txt.hidden = false; txt.focus(); return; }
        txt.hidden = true; d.fonts[s[0]] = sel.value; S.vorlage = ""; designAnwenden(); nachSchrift(); merke();
      });
      txt.addEventListener("change", () => {
        const l = txt.value.split(",").map((x) => x.trim()).filter(Boolean);
        d.fonts[s[0]] = l.length > 1 ? l : (l[0] || s[2]); S.vorlage = ""; designAnwenden(); nachSchrift(); merke();
      });
      p.append(feld);
    });
    p.append(hinweis(t("Eine Liste geht auch: die erste vorhandene gewinnt. Fehlt eine, bleibt es bei Inter bzw. Teko. Eigene <code>.ttf</code>/<code>.otf</code> legst du in den Ordner <code>fonts\\</code> des Designs. Windows-Schriften zeigt die Vorschau nur, wenn sie auf diesem Gerät installiert sind.",
      "A list works too: the first one present wins. If one is missing, Inter or Teko stay. Put your own <code>.ttf</code>/<code>.otf</code> into the design’s <code>fonts\\</code> folder. Windows fonts only show in the preview if they’re installed on this device.")));
  }
  function nachSchrift() {
    lageAlle();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lageAlle(); zeigeInfo(); });
  }

  /* ── Panel: Layout ─────────────────────────────────────────────────────── */
  let insp = null;
  function layoutPanel() {
    const p = panel.layout;
    p.innerHTML = "";
    p.append(h4(t("Bausteine", "Modules"), TEILE.length));
    const liste = el("ul", "bb-liste");
    TEILE.forEach((x) => {
      const L = S.layout[x.key];
      const li = el("li", (x.key === gewaehlt ? "gewaehlt " : "") + (S.sicht[x.key] ? "" : "aus"));
      const szeneHinweis = sichtbarInSzene(x.key) ? "" : " <small>(" + (x.szene.length ? x.szene.map((s) => s === "quali" ? "Quali" : t("Rennen", "Race")).join("/") : t("nur „Alles“", "“All” only")) + ")</small>";
      li.innerHTML = '<button type="button" class="bb-auge" aria-pressed="' + S.sicht[x.key] + '" title="' + t("Ein-/ausblenden", "Show/hide") + '" aria-label="' + esc(x.name) + " " + t("ein-/ausblenden", "show/hide") + '">'
        + (S.sicht[x.key] ? "●" : "○") + '</button><button type="button" class="bb-name">' + esc(x.name) + szeneHinweis + '</button><span class="bb-ecke-pill" title="' + ECKE_NAME[L.ecke] + '">' + L.ecke + "</span>";
      li.querySelector(".bb-auge").addEventListener("click", () => { S.sicht[x.key] = !S.sicht[x.key]; lageEins(x.key); merke(); layoutPanel(); });
      li.querySelector(".bb-name").addEventListener("click", () => waehle(x.key, false));
      liste.append(li);
    });
    p.append(liste);

    if (!gewaehlt) {
      p.append(el("div", "bb-insp-leer", t("Baustein in der Liste oder in der Vorschau anklicken.", "Click a module in the list or in the preview.")));
    } else {
      const key = gewaehlt, L = S.layout[key];
      const box = el("div", "bb-insp");
      box.innerHTML = '<div class="bb-insp-kopf"><b>' + esc(TEIL[key].name) + "</b></div>";
      const ak = el("div", "bb-anker-wahl");
      const raster = el("div", "bb-anker");
      raster.setAttribute("role", "group");
      raster.setAttribute("aria-label", t("Ankerpunkt", "Anchor point"));
      ECKEN.forEach((ec) => {
        const b = el("button");
        b.type = "button";
        b.title = ECKE_NAME[ec];
        b.setAttribute("aria-label", ECKE_NAME[ec]);
        b.setAttribute("aria-pressed", String(L.ecke === ec));
        b.addEventListener("click", () => {
          // Anker wechseln, Lage behalten - wie das Overlay beim ersten Ziehen
          const te = TE[key];
          setzeLage(key, te.x, te.y, ec); merke(); layoutPanel(); zeigeInfo();
        });
        raster.append(b);
      });
      const xy = el("div", "bb-xy");
      xy.innerHTML = '<label>dx <input class="bb-in" type="number" step="1" min="-4000" max="4000" data-f="dx" value="' + L.dx + '"></label>'
        + '<label>dy <input class="bb-in" type="number" step="1" min="-4000" max="4000" data-f="dy" value="' + L.dy + '"></label>';
      xy.querySelectorAll("input").forEach((i) => i.addEventListener("change", () => {
        S.layout[key][i.dataset.f] = Math.round(klemm(+i.value || 0, -4000, 4000)); lageEins(key); zeigeInfo(); merke();
      }));
      ak.append(raster, xy);
      box.append(ak, hinweis(t("Versatz in Pixeln von der Ecke bzw. Mitte, an der der Baustein hängt.", "Offset in pixels from the corner or centre the module hangs on.")));
      const rg = regler(t("Größe", "Size"), L.groesse, 0.5, 2, 0.05, (v) => {
        const te = TE[key], x = te.x, y = te.y;
        S.layout[key].groesse = rund(v, 2); lageEins(key); setzeLage(key, x, y); zeigeInfo(); inspektorWerte();
      }, merke, "×", "0.5–2.0");
      const rz = regler(t("Ebene", "Layer"), L.z, 0, 100, 1, (v) => { S.layout[key].z = v; lageEins(key); zeigeInfo(); }, merke, "", t("höher = vorn", "higher = front"));
      box.append(rg, rz);
      const reihe = el("div", "bb-reihe");
      reihe.append(
        knopf(t("Mittig ausrichten", "Centre horizontally"), "", () => { const te = TE[key], A = aufl(); setzeLage(key, Math.round((A.W - te.w) / 2), te.y, V.autoAnker ? eckeNah((A.W - te.w) / 2, te.y, te.w, te.h, A.W, A.H) : null); merke(); layoutPanel(); zeigeInfo(); }),
        knopf(t("Zurücksetzen", "Reset"), "", () => { S.layout[key] = klon(STANDARD[key]); lageEins(key); merke(); layoutPanel(); zeigeInfo(); })
      );
      box.append(reihe);
      insp = { key: key, box: box, groesse: rg, ebene: rz };
      p.append(box);
    }

    p.append(h4(t("Verhalten", "Behaviour")));
    p.append(schalter(t("Anker beim Ziehen automatisch wählen", "Pick the anchor automatically while dragging"), V.autoAnker, (v) => { V.autoAnker = v; ansichtSichern(); }));
    p.append(hinweis(t("Der Anker entscheidet, wohin ein Baustein rutscht, wenn HUD und Aufnahme verschieden groß sind: unten rechts bleibt unten rechts.",
      "The anchor decides where a module slides when HUD and capture differ in size: bottom right stays bottom right.")));
    const reihe = el("div", "bb-reihe");
    reihe.append(
      knopf(t("Alle einblenden", "Show all"), "", () => { TEILE.forEach((x) => { S.sicht[x.key] = true; }); lageAlle(); merke(); layoutPanel(); }),
      knopf(t("Standard-Layout", "Default layout"), "", () => { S.layout = klon(STANDARD); lageAlle(); merke(); layoutPanel(); zeigeInfo(); })
    );
    p.append(reihe);
  }
  function inspektorWerte() {
    if (!insp || insp.key !== gewaehlt || V.tab !== "layout") return;
    const L = S.layout[gewaehlt];
    const dx = insp.box.querySelector('[data-f="dx"]'), dy = insp.box.querySelector('[data-f="dy"]');
    if (dx && document.activeElement !== dx) dx.value = L.dx;
    if (dy && document.activeElement !== dy) dy.value = L.dy;
    insp.groesse.setze(L.groesse);
    insp.box.querySelectorAll(".bb-anker button").forEach((b, i) => b.setAttribute("aria-pressed", String(ECKEN[i] === L.ecke)));
    const pill = panel.layout.querySelectorAll(".bb-ecke-pill")[TEILE.findIndex((x) => x.key === gewaehlt)];
    if (pill) pill.textContent = L.ecke;
  }

  /* ── Export ────────────────────────────────────────────────────────────── */
  function designJson() {
    const d = S.design, o = {};
    o.name = S.meta.name || t("Mein Design", "My design");
    o.author = S.meta.author || "";
    o.description = S.meta.description || "";
    o.colors = {}; FARBEN.forEach((k) => { o.colors[k] = d.colors[k]; });
    o.alpha = {}; ALPHA.forEach((k) => { o.alpha[k] = d.alpha[k]; });
    o.shape = { panelRadius: d.shape.panelRadius, accentWidth: d.shape.accentWidth, rowHeight: d.shape.rowHeight };
    o.fonts = { sans: d.fonts.sans, display: d.fonts.display };
    o.extra = klon(d.extra || {});
    return o;
  }
  function layoutBlock() {
    const L = {};
    TEILE.forEach((x) => { const e2 = S.layout[x.key]; L[x.key] = { ecke: e2.ecke, dx: e2.dx, dy: e2.dy, z: e2.z, groesse: e2.groesse }; });
    return L;
  }
  function layoutName() { return (S.meta.name || "Builder").trim().slice(0, 40) || "Builder"; }
  function sichtWerte() {
    const o = {};
    TEILE.forEach((x) => { if (x.sicht) o[x.sicht] = !!S.sicht[x.key]; });
    return o;
  }
  // Wie die Originale: vier Leerzeichen, kurze Bloecke (ein Baustein) auf einer Zeile
  function huebsch(o) {
    return JSON.stringify(o, null, 4).replace(/\{\n\s+("ecke"[^}]*?)\n\s+\}/g, (m, innen) => "{ " + innen.replace(/,\n\s+/g, ", ") + " }");
  }
  function konsolenBefehl() {
    const body = mische({ layout: layoutBlock() }, V.sichtExport ? sichtWerte() : {});
    return "(async()=>{const h={\"Content-Type\":\"application/json\"};"
      + "await fetch(\"/api/settings\",{method:\"POST\",headers:h,body:JSON.stringify(" + JSON.stringify(body) + ")});"
      + "await fetch(\"/api/layouts\",{method:\"POST\",headers:h,body:JSON.stringify({name:" + JSON.stringify(layoutName()) + "})});"
      + "location.reload()})()";
  }
  function faerben(json) {
    return esc(json).replace(/(&quot;[^&]*?&quot;)(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|\b(true|false)\b/g, (m, s, doppel, n, b) => {
      if (s) return doppel ? '<span class="k">' + s + "</span>" + doppel : '<span class="s">' + s + "</span>";
      if (n) return '<span class="n">' + n + "</span>";
      return '<span class="n">' + b + "</span>";
    });
  }
  function laden(name, inhalt, typ) {
    const blob = new Blob([inhalt], { type: typ || "application/json" });
    const a = el("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
  async function kopiere(text, was) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = el("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); } catch (e2) { /* nichts zu machen */ }
      ta.remove();
    }
    melde((was || t("Text", "Text")) + t(" kopiert", " copied"));
  }
  function teilenLink() {
    const roh = new TextEncoder().encode(JSON.stringify(S));
    let bin = "";
    roh.forEach((b) => { bin += String.fromCharCode(b); });
    const code = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.href.split("#")[0] + "#d=" + code;
  }
  function ausLink() {
    const m = /[#&]d=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return null;
    try {
      const bin = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
      const roh = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) roh[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(roh));
    } catch (err) { return null; }
  }

  function exportPanel() {
    const p = panel.export;
    p.innerHTML = "";
    p.className = "bb-tab bb-export";
    p.append(h4(t("Dein Design", "Your design")));
    [["name", t("Name", "Name"), 60, t("erscheint in /settings", "shown in /settings")], ["author", t("Autor", "Author"), 60, ""], ["description", t("Beschreibung", "Description"), 400, ""]].forEach((f) => {
      const feld = el("label", "bb-feld");
      feld.innerHTML = "<span>" + f[1] + (f[3] ? " <small>— " + f[3] + "</small>" : "") + "</span>"
        + (f[0] === "description" ? '<textarea class="bb-in" maxlength="' + f[2] + '" rows="2"></textarea>' : '<input class="bb-in" type="text" maxlength="' + f[2] + '">');
      const i = feld.querySelector("input,textarea");
      i.value = S.meta[f[0]] || "";
      i.addEventListener("input", () => { S.meta[f[0]] = i.value; codeAuffrischen(); });
      i.addEventListener("change", merke);
      p.append(feld);
    });

    const schritt = (titel, text) => { const d = el("div", "bb-schritt"); d.append(h4(titel)); if (text) d.append(hinweis(text)); p.append(d); return d; };

    const s1 = schritt("design.json", t("Ersetzt die <code>design.json</code> in <code>data\\designs\\&lt;Name&gt;\\</code> — den Ordner legt <code>/settings</code> → <em>Design</em> → <em>Kopieren</em> an. Basis dort: <b>",
      "Replaces <code>design.json</code> in <code>data\\designs\\&lt;name&gt;\\</code> — <code>/settings</code> → <em>Design</em> → <em>Copy</em> creates that folder. Copy from: <b>")
      + (S.design.basis === "f1tv" ? "F1 TV" : "KERS") + "</b>.");
    const c1 = el("div", "bb-code", "<pre data-code=\"design\"></pre>");
    const r1 = el("div", "bb-reihe");
    r1.append(knopf("⬇ " + t("design.json laden", "Download design.json"), "voll", () => laden("design.json", huebsch(designJson()) + "\n")),
      knopf(t("Kopieren", "Copy"), "", () => kopiere(huebsch(designJson()), "design.json")));
    s1.append(c1, r1);

    const s2 = schritt(t("Layout übernehmen", "Apply the layout"), t("Am PC mit KERS <code>/settings</code> öffnen, <kbd>F12</kbd> → <em>Konsole</em>, einfügen, Enter. Das Layout gilt sofort und steht danach unter <em>Eigene Layouts</em> als „",
      "On the PC running KERS open <code>/settings</code>, <kbd>F12</kbd> → <em>Console</em>, paste, Enter. The layout applies at once and is then listed under <em>Custom layouts</em> as “")
      + esc(layoutName()) + t("“. Chrome will beim ersten Mal, dass du <code>allow pasting</code> tippst.", "”. The first time, Chrome wants you to type <code>allow pasting</code>."));
    const c2 = el("div", "bb-code umbruch", "<pre data-code=\"befehl\"></pre>");
    const r2 = el("div", "bb-reihe");
    r2.append(knopf(t("Befehl kopieren", "Copy command"), "voll", () => kopiere(konsolenBefehl(), t("Befehl", "Command"))));
    s2.append(c2, r2, schalter(t("Ein-/Ausblenden mitnehmen", "Include show/hide"), V.sichtExport, (v) => { V.sichtExport = v; ansichtSichern(); codeAuffrischen(); }));

    const s3 = schritt(t("Oder als Datei", "Or as a file"), t("<code>layouts.json</code> nach <code>data\\</code> neben die EXE legen (eine vorhandene um den Eintrag ergänzen) und KERS neu starten.",
      "Put <code>layouts.json</code> into <code>data\\</code> next to the EXE (add the entry to an existing one) and restart KERS."));
    const c3 = el("div", "bb-code", "<pre data-code=\"layouts\"></pre>");
    const r3 = el("div", "bb-reihe");
    r3.append(knopf("⬇ layouts.json", "", () => { const o = {}; o[layoutName()] = layoutBlock(); laden("layouts.json", huebsch(o) + "\n"); }),
      knopf(t("Kopieren", "Copy"), "", () => { const o = {}; o[layoutName()] = layoutBlock(); kopiere(huebsch(o), "layouts.json"); }));
    s3.append(c3, r3);

    p.append(h4(t("Teilen & sichern", "Share & save")));
    const r4 = el("div", "bb-reihe");
    r4.append(
      knopf("🔗 " + t("Link kopieren", "Copy link"), "", () => kopiere(teilenLink(), "Link")),
      knopf("⬇ " + t("Builder-Datei", "Builder file"), "", () => laden((layoutName().replace(/[^\w-]+/g, "_") || "design") + ".kers-builder.json", JSON.stringify({ kersBuilder: 1, stand: S }, null, 2) + "\n"))
    );
    p.append(r4, hinweis(t("Der Link enthält dein ganzes Design samt Layout — wer ihn öffnet, landet genau hier. Der Stand bleibt außerdem in diesem Browser gespeichert.",
      "The link holds your whole design and layout — whoever opens it lands right here. Your work is also kept in this browser.")));

    p.append(h4(t("Laden", "Load")));
    const ablage = el("label", "bb-ablage", t("<b>JSON hierher ziehen</b> oder klicken — <code>design.json</code>, <code>layouts.json</code>, <code>overlay_settings.json</code> oder eine Builder-Datei",
      "<b>Drop JSON here</b> or click — <code>design.json</code>, <code>layouts.json</code>, <code>overlay_settings.json</code> or a builder file") + '<input type="file" accept=".json,application/json" hidden>');
    const inp = ablage.querySelector("input");
    inp.addEventListener("change", () => { if (inp.files[0]) dateiLesen(inp.files[0]); inp.value = ""; });
    ablage.addEventListener("dragover", (ev) => { ev.preventDefault(); ablage.classList.add("drueber"); });
    ablage.addEventListener("dragleave", () => ablage.classList.remove("drueber"));
    ablage.addEventListener("drop", (ev) => { ev.preventDefault(); ablage.classList.remove("drueber"); const f = ev.dataTransfer.files[0]; if (f) dateiLesen(f); });
    p.append(ablage);
    const r5 = el("div", "bb-reihe");
    r5.append(knopf(t("Alles zurücksetzen", "Reset everything"), "", () => {
      if (!confirm(t("Design und Layout auf KERS-Standard zurücksetzen?", "Reset design and layout to the KERS default?"))) return;
      S = neuerStand(); alles(); merke();
    }));
    p.append(r5);
    codeAuffrischen();
  }
  function codeAuffrischen() {
    const p = panel.export;
    if (!p || p.hidden) return;
    const o = {}; o[layoutName()] = layoutBlock();
    const setz = (k, txt, roh) => { const pre = p.querySelector('[data-code="' + k + '"]'); if (pre) pre.innerHTML = roh ? esc(txt) : faerben(txt); };
    setz("design", huebsch(designJson()));
    setz("layouts", huebsch(o));
    setz("befehl", konsolenBefehl(), true);
  }

  function dateiLesen(f) {
    if (f.size > 2 * 1024 * 1024) { melde(t("Datei zu groß", "File too large")); return; }
    const r = new FileReader();
    r.onload = () => {
      let j;
      try { j = JSON.parse(String(r.result).replace(/^\uFEFF/, "")); } catch (err) { melde(t("Kein gültiges JSON", "Not valid JSON")); return; }
      importieren(j);
    };
    r.readAsText(f);
  }
  function istLayout(o) { return o && typeof o === "object" && TEILE.some((x) => o[x.key] && typeof o[x.key] === "object" && ("ecke" in o[x.key] || "dx" in o[x.key])); }
  function importieren(j) {
    if (!j || typeof j !== "object") return;
    if (j.kersBuilder && j.stand) { S = standSauber(j.stand); alles(); merke(); melde(t("Builder-Datei geladen", "Builder file loaded")); return; }
    if (j.colors || j.shape || j.fonts) {
      // design.json - die Basis laesst sich nicht sicher erkennen; Hinweis: F1-TV-Extras
      const basis = j.extra && (j.extra.p1Bg || j.extra.lapBar) ? "f1tv" : "kers";
      S.design = designSauber(j, basis); S.design.basis = basis;
      ["name", "author", "description"].forEach((k) => { if (typeof j[k] === "string") S.meta[k] = j[k].slice(0, k === "description" ? 400 : 60); });
      S.vorlage = "";
      alles(); merke(); melde(t("design.json geladen — Basis: ", "design.json loaded — base: ") + (basis === "f1tv" ? "F1 TV" : "KERS"));
      return;
    }
    if (j.layout && istLayout(j.layout)) {
      // overlay_settings.json: Layout plus Schalter
      S.layout = layoutSauber(j.layout);
      TEILE.forEach((x) => { if (x.sicht && typeof j[x.sicht] === "boolean") S.sicht[x.key] = j[x.sicht]; });
      alles(); merke(); melde(t("Layout aus den Einstellungen geladen", "Layout loaded from the settings")); return;
    }
    if (istLayout(j)) { S.layout = layoutSauber(j); alles(); merke(); melde(t("Layout geladen", "Layout loaded")); return; }
    const namen = Object.keys(j).filter((k) => istLayout(j[k]));
    if (namen.length) {
      S.layout = layoutSauber(j[namen[0]]);
      alles(); merke();
      melde(t("Layout „", "Layout “") + namen[0] + t("“ geladen", "” loaded") + (namen.length > 1 ? " (" + t("von ", "of ") + namen.length + ")" : ""));
      return;
    }
    melde(t("Damit kann der Builder nichts anfangen", "The builder can’t use this file"));
  }

  /* ── Alles neu zeichnen ────────────────────────────────────────────────── */
  function alles() {
    baueInhalte();
    designAnwenden();
    hintergrund();
    buehneEinpassen();
    lageAlle();
    leiste();
    zeigeInfo();
    zeigeTab(V.tab);
  }

  /* ── Start ─────────────────────────────────────────────────────────────── */
  try {
    const a = JSON.parse(localStorage.getItem(ANSICHT) || "null");
    if (a && typeof a === "object") {
      ["szene", "aufl", "hg", "tab"].forEach((k) => { if (typeof a[k] === "string") V[k] = a[k]; });
      ["raster", "einrasten", "autoAnker", "sichtExport"].forEach((k) => { if (typeof a[k] === "boolean") V[k] = a[k]; });
    }
  } catch (err) { /* egal */ }
  if (AUFL.indexOf(V.aufl) < 0) V.aufl = "1920x1080";
  if (V.hg === "bild" || !HG.some((h) => h[0] === V.hg)) V.hg = "strecke";
  if (!TABS.some((x) => x[0] === V.tab)) V.tab = "vorlagen";
  if (["alles", "rennen", "quali"].indexOf(V.szene) < 0) V.szene = "rennen";

  const ausDemLink = ausLink();
  if (ausDemLink) {
    S = standSauber(ausDemLink);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* egal */ }
    setTimeout(() => melde(t("Design aus dem Link geladen", "Design loaded from the link")), 400);
  } else {
    try { const g = JSON.parse(localStorage.getItem(SPEICHER) || "null"); if (g) S = standSauber(g); } catch (err) { /* frisch */ }
  }
  alles();
  merke();
  nachSchrift();
  // Erst nach dem Einblenden der Seite steht die Breite des Rahmens sicher fest.
  setTimeout(buehneEinpassen, 60);
  window.addEventListener("load", () => { buehneEinpassen(); lageAlle(); });
})();
