/* ============================================================
   MIJNLIJN — kaart.js
   De metrokaart-renderer: tekent van een levensprofiel een
   volwaardige metrokaart-poster als SVG. Puur vanilla JS.

   De tijd "slingert" als een metrolijn over de poster: rijen
   van links naar rechts en terug, verbonden met concentrische
   haarspeldbochten — precies zoals op echte vervoerskaarten.

   API:  MIJNLIJN.tekenSVG(profiel, opties) → SVG-string
         profiel = { naam, geboortejaar, momenten:[{jaar, titel, lijnen:[id]}] }
         opties  = { formaat: 'poster'|'vierkant'|'story',
                     thema:   'middernacht'|'papier'|'neon' }
   ============================================================ */

"use strict";

const MIJNLIJN = (() => {

  /* ---------- Lijnen (de levensgebieden) ---------- */

  const LIJNEN = [
    { id: "liefde",   naam: "Liefdeslijn",  kleur: "#FF3B6B" },
    { id: "vrienden", naam: "Vriendenlijn", kleur: "#FF9F1C" },
    { id: "werk",     naam: "Werk & studielijn", kleur: "#2D7DFF" },
    { id: "wonen",    naam: "Woonlijn",     kleur: "#2EC66D" },
    { id: "reizen",   naam: "Reislijn",     kleur: "#FFD23F" },
    { id: "avontuur", naam: "Avontuurlijn", kleur: "#9B5DE5" },
    { id: "familie",  naam: "Familielijn",  kleur: "#00C2D1" },
  ];

  /* ---------- Thema's ---------- */

  const THEMAS = {
    middernacht: {
      naam: "Middernacht",
      bg: "#0B1B33",
      inkt: "#F2F6FF",
      zacht: "#8FA3C4",
      raster: "rgba(143,163,196,0.10)",
      station: "#0B1B33",
      gloed: true,
    },
    papier: {
      naam: "Papier",
      bg: "#F5EFE2",
      inkt: "#14213D",
      zacht: "#8A8267",
      raster: "rgba(20,33,61,0.10)",
      station: "#F5EFE2",
      gloed: false,
    },
    neon: {
      naam: "Neon",
      bg: "#08080C",
      inkt: "#FFFFFF",
      zacht: "#6E6E86",
      raster: "rgba(110,110,134,0.12)",
      station: "#08080C",
      gloed: true,
    },
  };

  /* ---------- Formaten ---------- */

  const FORMATEN = {
    poster:   { w: 1600, h: 1131, rijen: 2, titelH: 150, legendaH: 100, marge: 76 },
    vierkant: { w: 1350, h: 1350, rijen: 3, titelH: 190, legendaH: 150, marge: 72 },
    story:    { w: 1080, h: 1920, rijen: 4, titelH: 240, legendaH: 220, marge: 60 },
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  /* ---------- Hoofdfunctie ---------- */

  function tekenSVG(profiel, opties = {}) {
    const F = FORMATEN[opties.formaat] || FORMATEN.poster;
    const T = THEMAS[opties.thema] || THEMAS.middernacht;
    const u = F.w / 1600;

    const naam = (profiel.naam || "").trim();
    const t0 = Number(profiel.geboortejaar) || 2000;
    const nu = new Date();
    const tEind = nu.getFullYear() + nu.getMonth() / 12 + 0.2;

    const momenten = (profiel.momenten || [])
      .filter((m) => m.titel && Number(m.jaar) >= t0 && Number(m.jaar) <= tEind)
      .map((m) => ({ ...m, t: Math.min(Number(m.jaar) + 0.45, tEind - 0.05) }))
      .sort((a, b) => a.t - b.t);

    const actief = LIJNEN.filter((l) => momenten.some((m) => (m.lijnen || []).includes(l.id)));
    const k = actief.length;
    const slotVan = new Map(actief.map((l, i) => [l.id, i]));

    const span = Math.max(tEind - t0, 1);
    let R = F.rijen;
    if (span < 6) R = 1;
    else if (span < 10) R = Math.min(R, 2);
    else if (span < 16) R = Math.min(R, 3);
    const perRij = span / R;

    /* ---------- Geometrie ---------- */

    const kaderX = F.marge;
    const kaderB = F.w - F.marge;
    const mapTop = F.titelH + 26 * u;
    const mapBot = F.h - F.legendaH - 20 * u;
    const rijH = (mapBot - mapTop) / R;

    const dikte = Math.max(5 * u, Math.min(8.5 * u, (rijH * 0.32) / Math.max(k, 1)));
    const gap = Math.max(dikte * 1.75, Math.min(22 * u, (rijH * 0.36) / Math.max(k - 1, 1)));
    const bundelH = (k - 1) * gap;

    /* Haarspeldbocht: basisstraal + ruimte voor alle sporen */
    const basis = 26 * u;
    const spelPad = basis + bundelH;          // horizontale ruimte van een haarspeld
    const trackPad = spelPad + 12 * u;        // sporen eindigen hier vóór de kaderrand
    const xTrackL = kaderX + trackPad;
    const xTrackR = kaderB - trackPad;
    const stInzet = 26 * u;                   // stations iets binnen de spooruiteinden

    /* Labels boven de bundel: reserveer ruimte, bundel iets lager in de rij */
    const rijCentrum = (r) => mapTop + rijH * r + rijH * 0.56;
    const slotY = (r, s) => {
      const orde = r % 2 === 0 ? s : k - 1 - s;
      return rijCentrum(r) - bundelH / 2 + orde * gap;
    };
    const orde = (r, s) => (r % 2 === 0 ? s : k - 1 - s);

    const rijX = (r, t) => {
      const frac = Math.min(1, Math.max(0, (t - (t0 + r * perRij)) / perRij));
      const bin = xTrackL + stInzet + frac * (xTrackR - xTrackL - 2 * stInzet);
      return r % 2 === 0 ? bin : F.w - bin;
    };
    const rijVan = (t) => Math.min(R - 1, Math.floor((t - t0) / perRij));

    /* ---------- Lijnpad met haarspeldbochten ---------- */

    function lijnPad(s) {
      const d = [];
      for (let r = 0; r < R; r++) {
        const y = slotY(r, s);
        const naarRechts = r % 2 === 0;
        const xA = naarRechts ? xTrackL : xTrackR;
        const xB = naarRechts ? xTrackR : xTrackL;
        if (r === 0) d.push(`M ${xA} ${y}`);
        d.push(`L ${xB} ${y}`);

        if (r < R - 1) {
          /* Haarspeld: kwartbocht → verticaal → kwartbocht.
             Straal per spoor zodat alle bochten concentrisch zijn. */
          const o = orde(r, s);
          const rH = basis + (k - 1 - o) * gap;
          const dir = naarRechts ? 1 : -1;
          const veeg = naarRechts ? 1 : 0;
          const y2 = slotY(r + 1, s);
          const xV = xB + dir * rH;
          d.push(`A ${rH} ${rH} 0 0 ${veeg} ${xV} ${y + rH}`);
          d.push(`L ${xV} ${y2 - rH}`);
          d.push(`A ${rH} ${rH} 0 0 ${veeg} ${xB} ${y2}`);
        }
      }
      return d.join(" ");
    }

    /* ---------- SVG opbouwen ---------- */

    const out = [];
    const kop = `'Futura','Avenir Next','Century Gothic','Trebuchet MS',sans-serif`;
    const mono = `ui-monospace,'SF Mono','Cascadia Mono',Menlo,Consolas,monospace`;

    out.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F.w} ${F.h}" width="${F.w}" height="${F.h}">`
    );

    out.push(`<defs><filter id="ml-gloed" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${6 * u}"/></filter></defs>`);

    /* Achtergrond + puntraster */
    out.push(`<rect width="${F.w}" height="${F.h}" fill="${T.bg}"/>`);
    const rasterStap = 44 * u;
    let punten = "";
    for (let y = rasterStap; y < F.h; y += rasterStap)
      for (let x = rasterStap; x < F.w; x += rasterStap)
        punten += `M${x} ${y}h0.01`;
    out.push(`<path d="${punten}" stroke="${T.raster}" stroke-width="${2.4 * u}" stroke-linecap="round"/>`);

    /* Kader */
    out.push(`<rect x="${26 * u}" y="${26 * u}" width="${F.w - 52 * u}" height="${F.h - 52 * u}"
      fill="none" stroke="${T.inkt}" stroke-width="${2 * u}" opacity="0.9" rx="${6 * u}"/>`);
    out.push(`<rect x="${34 * u}" y="${34 * u}" width="${F.w - 68 * u}" height="${F.h - 68 * u}"
      fill="none" stroke="${T.inkt}" stroke-width="${0.8 * u}" opacity="0.35" rx="${4 * u}"/>`);

    /* ---------- Titelblok ---------- */

    const titel = naam ? `HET LEVEN VAN ${naam.toUpperCase()}` : "MIJN LEVEN ALS METROKAART";
    const groot = Math.min((opties.formaat === "story" ? 60 : 58) * u,
      ((kaderB - kaderX) - 120 * u) / Math.max(titel.length * 0.62, 1));
    out.push(`<text x="${kaderX}" y="${F.titelH - 54 * u}" font-family="${kop}" font-weight="800"
      font-size="${groot}" letter-spacing="${2 * u}" fill="${T.inkt}">${esc(titel)}</text>`);
    out.push(`<text x="${kaderX}" y="${F.titelH - 16 * u}" font-family="${mono}" font-weight="500"
      font-size="${14.5 * u}" letter-spacing="${4 * u}" fill="${T.zacht}">METROKAART · ${t0} — VANDAAG · ${momenten.length} STATIONS</text>`);

    /* Roundel rechtsboven */
    out.push(roundel(kaderB - 44 * u, F.titelH - 62 * u, 32 * u, kop));

    if (k === 0) {
      out.push(`<text x="${F.w / 2}" y="${(mapTop + mapBot) / 2}" text-anchor="middle"
        font-family="${kop}" font-size="${22 * u}" fill="${T.zacht}">Voeg momenten met een lijn toe om jouw kaart te zien…</text>`);
    }

    /* ---------- Lijnen ---------- */

    if (T.gloed) {
      for (const l of actief) {
        out.push(`<path d="${lijnPad(slotVan.get(l.id))}" fill="none" stroke="${l.kleur}"
          stroke-width="${dikte * 2.2}" opacity="0.25" filter="url(#ml-gloed)"/>`);
      }
    }

    for (const l of actief) {
      out.push(`<path d="${lijnPad(slotVan.get(l.id))}" fill="none" stroke="${l.kleur}"
        stroke-width="${dikte}" stroke-linecap="round"/>`);
    }

    /* ---------- Jaarmarkeringen ---------- */

    for (let jaar = t0; jaar <= Math.floor(tEind); jaar++) {
      const r = rijVan(jaar);
      const x = rijX(r, Math.max(jaar, t0));
      const yOnder = rijCentrum(r) + bundelH / 2 + 15 * u;
      const groot5 = jaar % 5 === 0 || jaar === t0;
      out.push(`<line x1="${x}" y1="${yOnder}" x2="${x}" y2="${yOnder + (groot5 ? 10 : 5) * u}"
        stroke="${T.zacht}" stroke-width="${1.6 * u}" opacity="${groot5 ? 0.9 : 0.5}"/>`);
      if (groot5)
        out.push(`<text x="${x}" y="${yOnder + 27 * u}" text-anchor="middle" font-family="${mono}"
          font-size="${12 * u}" fill="${T.zacht}">${jaar}</text>`);
    }

    /* ---------- Stations ---------- */

    const perRijTeller = new Map();
    for (const m of momenten) {
      const betrokken = (m.lijnen || []).filter((id) => slotVan.has(id));
      if (!betrokken.length) continue;
      const r = rijVan(m.t);
      const x = rijX(r, m.t);
      const ys = betrokken.map((id) => slotY(r, slotVan.get(id)));
      const yMin = Math.min(...ys), yMax = Math.max(...ys);

      if (betrokken.length > 1) {
        const rr = dikte * 0.95;
        out.push(`<rect x="${x - rr}" y="${yMin - rr}" width="${rr * 2}" height="${yMax - yMin + rr * 2}"
          rx="${rr}" fill="${T.station}" stroke="${T.inkt}" stroke-width="${2.6 * u}"/>`);
      } else {
        const kleur = actief.find((l) => l.id === betrokken[0]).kleur;
        out.push(`<circle cx="${x}" cy="${ys[0]}" r="${dikte * 0.85}" fill="${T.station}"
          stroke="${kleur}" stroke-width="${2.8 * u}"/>`);
      }

      /* Labels: allemaal schuin omhoog, afwisselend dichtbij/ver voor lucht */
      const teller = perRijTeller.get(r) || 0;
      perRijTeller.set(r, teller + 1);
      const bundelTop = rijCentrum(r) - bundelH / 2;
      const afstand = (teller % 2 === 0 ? 14 : 40) * u;
      const labelY = Math.min(yMin, bundelTop) - dikte - afstand;

      out.push(`<line x1="${x}" y1="${yMin - dikte}" x2="${x}" y2="${labelY + 4 * u}"
        stroke="${T.zacht}" stroke-width="${1.1 * u}" opacity="${teller % 2 === 0 ? 0 : 0.55}"/>`);
      out.push(`<g transform="translate(${x} ${labelY}) rotate(-34)">
        <text font-family="${kop}" font-weight="650" font-size="${14.5 * u}" fill="${T.inkt}"
          text-anchor="start" letter-spacing="${0.4 * u}">${esc(m.titel)}<tspan
          font-family="${mono}" font-weight="400" font-size="${10.5 * u}" fill="${T.zacht}" dx="${6 * u}">${m.jaar}</tspan></text>
      </g>`);
    }

    /* ---------- Begin- en eindhalte ---------- */

    if (k > 0) {
      /* GEBOREN */
      const yC0 = rijCentrum(0);
      const xStart = xTrackL;
      out.push(halte(xStart, rijCentrum(0) - bundelH / 2, rijCentrum(0) + bundelH / 2, dikte, u, T));
      out.push(`<text x="${xStart - 16 * u}" y="${yC0 + 5 * u}" text-anchor="end"
        font-family="${kop}" font-weight="800" font-size="${14 * u}" letter-spacing="${1.8 * u}"
        fill="${T.inkt}" transform="rotate(-90 ${xStart - 16 * u} ${yC0 + 5 * u})"
        >GEBOREN ${t0}</text>`);

      /* VANDAAG + gestippelde toekomst */
      const rL = R - 1;
      const naarRechts = rL % 2 === 0;
      const xEind = naarRechts ? xTrackR : xTrackL;
      const dir = naarRechts ? 1 : -1;
      const yCE = rijCentrum(rL);

      for (const l of actief) {
        const y = slotY(rL, slotVan.get(l.id));
        const vanX = xEind + dir * dikte * 2.6;
        out.push(`<line x1="${vanX}" y1="${y}" x2="${vanX + dir * 42 * u}" y2="${y}"
          stroke="${l.kleur}" stroke-width="${dikte}" stroke-linecap="round"
          stroke-dasharray="0.1 ${dikte * 2}" opacity="0.7"/>`);
      }
      out.push(halte(xEind, yCE - bundelH / 2, yCE + bundelH / 2, dikte, u, T));
      out.push(`<text x="${xEind + dir * 16 * u}" y="${yCE + 5 * u}"
        text-anchor="${naarRechts ? "start" : "end"}"
        font-family="${kop}" font-weight="800" font-size="${14 * u}" letter-spacing="${1.8 * u}"
        fill="${T.inkt}" transform="rotate(-90 ${xEind + dir * 16 * u} ${yCE + 5 * u})"
        >VANDAAG</text>`);
    }

    /* ---------- Legenda + voet ---------- */

    const legY = F.h - F.legendaH + 6 * u;
    out.push(`<line x1="${kaderX}" y1="${legY}" x2="${kaderB}" y2="${legY}"
      stroke="${T.inkt}" stroke-width="${1.2 * u}" opacity="0.5"/>`);

    const legFont = 13 * u;
    const merkRuimte = 210 * u;
    let lx = kaderX;
    let ly = legY + 32 * u;
    for (const l of actief) {
      const breedte = 46 * u + l.naam.length * legFont * 0.6 + 20 * u;
      if (lx + breedte > kaderB - merkRuimte) {
        lx = kaderX;
        ly += 28 * u;
      }
      out.push(`<line x1="${lx}" y1="${ly}" x2="${lx + 32 * u}" y2="${ly}" stroke="${l.kleur}"
        stroke-width="${6 * u}" stroke-linecap="round"/>`);
      out.push(`<text x="${lx + 42 * u}" y="${ly + 4.5 * u}" font-family="${kop}" font-weight="600"
        font-size="${legFont}" fill="${T.inkt}">${esc(l.naam)}</text>`);
      lx += breedte;
    }

    /* Merk + schaal rechtsonder */
    out.push(`<text x="${kaderB}" y="${legY + 30 * u}" text-anchor="end" font-family="${kop}"
      font-weight="800" font-size="${15 * u}" letter-spacing="${3 * u}" fill="${T.inkt}">MIJNLIJN</text>`);
    out.push(`<text x="${kaderB}" y="${legY + 48 * u}" text-anchor="end" font-family="${mono}"
      font-size="${10 * u}" letter-spacing="${1.3 * u}" fill="${T.zacht}">de metrokaart van jouw leven</text>`);

    out.push(`</svg>`);
    return out.join("\n");
  }

  /* Eindhalte: capsule over de hele bundel, met kernstreep */
  function halte(x, yTop, yBot, dikte, u, T) {
    const rr = dikte * 1.15;
    return `<rect x="${x - rr}" y="${yTop - rr - dikte * 0.4}" width="${rr * 2}"
        height="${yBot - yTop + (rr + dikte * 0.4) * 2}" rx="${rr}"
        fill="${T.station}" stroke="${T.inkt}" stroke-width="${3.4 * u}"/>
      <line x1="${x}" y1="${yTop + dikte * 0.2}" x2="${x}" y2="${yBot - dikte * 0.2}"
        stroke="${T.inkt}" stroke-width="${2.2 * u}" opacity="0.8"/>`;
  }

  /* Roundel-logo */
  function roundel(cx, cy, r, kop) {
    return `<g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FF3B6B" stroke-width="${r * 0.28}"/>
      <rect x="${cx - r * 1.5}" y="${cy - r * 0.34}" width="${r * 3}" height="${r * 0.68}"
        rx="${r * 0.12}" fill="#2D7DFF"/>
      <text x="${cx}" y="${cy + r * 0.15}" text-anchor="middle" font-family="${kop}" font-weight="800"
        font-size="${r * 0.4}" letter-spacing="${r * 0.06}" fill="#fff">MIJNLIJN</text>
    </g>`;
  }

  return { tekenSVG, LIJNEN, THEMAS, FORMATEN };
})();
