/* ============================================================
   VLOT — qr.js
   Compacte QR-encoder (byte-modus, foutcorrectie M) zonder
   externe afhankelijkheden. Gebaseerd op het QR-algoritme
   zoals beschreven in ISO/IEC 18004.
   Publieke API:
     qrMatrix(tekst)      → 2D-array van booleans
     qrSVG(tekst, maat)   → SVG-string (vierkant, `maat` px)
   ============================================================ */

"use strict";

const QR = (() => {
  /* EC-codewoorden per blok en aantal blokken, niveau M, versie 1..40 */
  const EC_PER_BLOK = [10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
  const AANTAL_BLOKKEN = [1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];

  function ruweModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }

  const dataCapaciteit = (ver) =>
    Math.floor(ruweModules(ver) / 8) - EC_PER_BLOK[ver - 1] * AANTAL_BLOKKEN[ver - 1];

  /* ---- Reed-Solomon over GF(256) ---- */
  function rsDeler(graad) {
    const d = new Uint8Array(graad);
    d[graad - 1] = 1;
    let wortel = 1;
    for (let i = 0; i < graad; i++) {
      for (let j = 0; j < graad; j++) {
        d[j] = gfMaal(d[j], wortel);
        if (j + 1 < graad) d[j] ^= d[j + 1];
      }
      wortel = gfMaal(wortel, 0x02);
    }
    return d;
  }

  function rsRest(data, deler) {
    const rest = new Uint8Array(deler.length);
    for (const b of data) {
      const factor = b ^ rest[0];
      rest.copyWithin(0, 1);
      rest[rest.length - 1] = 0;
      for (let i = 0; i < deler.length; i++) rest[i] ^= gfMaal(deler[i], factor);
    }
    return rest;
  }

  function gfMaal(a, b) {
    let p = 0;
    for (let i = 7; i >= 0; i--) {
      p = (p << 1) ^ ((p >>> 7) * 0x11d);
      p ^= ((b >>> i) & 1) * a;
    }
    return p & 0xff;
  }

  /* ---- Bitbuffer ---- */
  function bits() {
    const arr = [];
    return {
      arr,
      duw(waarde, lengte) {
        for (let i = lengte - 1; i >= 0; i--) arr.push((waarde >>> i) & 1);
      },
    };
  }

  /* ---- Encodering (byte-modus) ---- */
  function encodeer(tekst) {
    const bytes = new TextEncoder().encode(tekst);

    let ver = 1;
    while (ver <= 40) {
      const capBits = dataCapaciteit(ver) * 8;
      const telBits = ver <= 9 ? 8 : 16;
      if (4 + telBits + bytes.length * 8 <= capBits) break;
      ver++;
    }
    if (ver > 40) throw new Error("tekst te lang voor QR");

    const b = bits();
    b.duw(0b0100, 4);
    b.duw(bytes.length, ver <= 9 ? 8 : 16);
    for (const x of bytes) b.duw(x, 8);

    const capBits = dataCapaciteit(ver) * 8;
    b.duw(0, Math.min(4, capBits - b.arr.length));
    if (b.arr.length % 8) b.duw(0, 8 - (b.arr.length % 8));
    for (let vul = 0xec; b.arr.length < capBits; vul ^= 0xec ^ 0x11) b.duw(vul, 8);

    const dataWoorden = new Uint8Array(b.arr.length / 8);
    b.arr.forEach((bit, i) => (dataWoorden[i >> 3] |= bit << (7 - (i & 7))));

    /* Blokken splitsen + EC toevoegen */
    const numBlokken = AANTAL_BLOKKEN[ver - 1];
    const ecLen = EC_PER_BLOK[ver - 1];
    const totWoorden = Math.floor(ruweModules(ver) / 8);
    const korteLen = Math.floor(totWoorden / numBlokken) - ecLen;
    const aantalLang = totWoorden % numBlokken;

    const blokken = [];
    let pos = 0;
    for (let i = 0; i < numBlokken; i++) {
      const len = korteLen + (i < numBlokken - aantalLang ? 0 : 1);
      const dat = dataWoorden.slice(pos, pos + len);
      pos += len;
      blokken.push({ dat, ec: rsRest(dat, rsDeler(ecLen)) });
    }

    /* Interleaven */
    const alle = [];
    const maxDat = korteLen + 1;
    for (let i = 0; i < maxDat; i++)
      for (const blok of blokken) if (i < blok.dat.length) alle.push(blok.dat[i]);
    for (let i = 0; i < ecLen; i++) for (const blok of blokken) alle.push(blok.ec[i]);

    return { ver, woorden: alle };
  }

  /* ---- Matrix opbouwen ---- */
  function maakMatrix(ver, woorden) {
    const maat = ver * 4 + 17;
    const mod = Array.from({ length: maat }, () => new Array(maat).fill(false));
    const functie = Array.from({ length: maat }, () => new Array(maat).fill(false));

    const zet = (x, y, donker) => {
      mod[y][x] = donker;
      functie[y][x] = true;
    };

    /* Zoekpatronen + separators */
    for (const [cx, cy] of [[3, 3], [maat - 4, 3], [3, maat - 4]]) {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= maat || y >= maat) continue;
          const afst = Math.max(Math.abs(dx), Math.abs(dy));
          zet(x, y, afst !== 2 && afst !== 4);
        }
    }

    /* Timingpatronen */
    for (let i = 8; i < maat - 8; i++) {
      if (!functie[6][i]) zet(i, 6, i % 2 === 0);
      if (!functie[i][6]) zet(6, i, i % 2 === 0);
    }

    /* Uitlijnpatronen */
    if (ver > 1) {
      const n = Math.floor(ver / 7) + 2;
      const stap = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (2 * n - 2)) * 2;
      const posities = [6];
      for (let p = maat - 7, i = 0; i < n - 1; i++, p -= stap) posities.push(p);
      posities.sort((a, b) => a - b);
      const laatste = posities.length - 1;
      for (let i = 0; i <= laatste; i++)
        for (let j = 0; j <= laatste; j++) {
          /* de drie hoeken overlappen met zoekpatronen: overslaan */
          if ((i === 0 && j === 0) || (i === 0 && j === laatste) || (i === laatste && j === 0)) continue;
          const cy = posities[i], cx = posities[j];
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              zet(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
    }

    /* Formaatinfo-gebied reserveren (invullen na maskkeuze) */
    for (let i = 0; i <= 8; i++) {
      if (!functie[8][i]) zet(i, 8, false);
      if (!functie[i][8]) zet(8, i, false);
      if (i < 8) {
        if (!functie[8][maat - 1 - i]) zet(maat - 1 - i, 8, false);
        if (!functie[maat - 1 - i][8]) zet(8, maat - 1 - i, false);
      }
    }
    zet(8, maat - 8, true); // vaste donkere module

    /* Versie-info (ver >= 7) */
    if (ver >= 7) {
      let rest = ver;
      for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
      const bitsV = (ver << 12) | rest;
      for (let i = 0; i < 18; i++) {
        const bit = ((bitsV >>> i) & 1) === 1;
        const a = maat - 11 + (i % 3), b2 = Math.floor(i / 3);
        zet(a, b2, bit);
        zet(b2, a, bit);
      }
    }

    /* Data plaatsen (zigzag) */
    let bitIndex = 0;
    const totaalBits = woorden.length * 8;
    for (let rechts = maat - 1; rechts >= 1; rechts -= 2) {
      if (rechts === 6) rechts = 5;
      for (let vert = 0; vert < maat; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = rechts - j;
          const omhoog = ((rechts + 1) & 2) === 0;
          const y = omhoog ? maat - 1 - vert : vert;
          if (functie[y][x] || bitIndex >= totaalBits) continue;
          mod[y][x] = ((woorden[bitIndex >> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
      }
    }

    return { maat, mod, functie };
  }

  const MASKERS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function pasMaskToe(m, keuze) {
    for (let y = 0; y < m.maat; y++)
      for (let x = 0; x < m.maat; x++)
        if (!m.functie[y][x] && MASKERS[keuze](x, y)) m.mod[y][x] = !m.mod[y][x];
  }

  function zetFormaatInfo(m, keuze) {
    /* niveau M = 0b00 */
    const data = (0b00 << 3) | keuze;
    let rest = data;
    for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    const bitsF = ((data << 10) | rest) ^ 0x5412;
    const s = m.maat;
    const bit = (i) => ((bitsF >>> i) & 1) === 1;

    for (let i = 0; i <= 5; i++) m.mod[i][8] = bit(i);
    m.mod[7][8] = bit(6);
    m.mod[8][8] = bit(7);
    m.mod[8][7] = bit(8);
    for (let i = 9; i < 15; i++) m.mod[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) m.mod[8][s - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m.mod[s - 15 + i][8] = bit(i);
    m.mod[s - 8][8] = true;
  }

  function strafScore(m) {
    const s = m.maat;
    let score = 0;
    /* N1: reeksen van 5+ gelijke modules */
    for (let y = 0; y < s; y++) {
      for (let x = 0, run = 0, kleur = null; x <= s; x++) {
        const c = x < s ? m.mod[y][x] : null;
        if (c === kleur) run++;
        else {
          if (run >= 5) score += run - 2;
          kleur = c;
          run = 1;
        }
      }
    }
    for (let x = 0; x < s; x++) {
      for (let y = 0, run = 0, kleur = null; y <= s; y++) {
        const c = y < s ? m.mod[y][x] : null;
        if (c === kleur) run++;
        else {
          if (run >= 5) score += run - 2;
          kleur = c;
          run = 1;
        }
      }
    }
    /* N2: 2×2 blokken */
    for (let y = 0; y < s - 1; y++)
      for (let x = 0; x < s - 1; x++) {
        const c = m.mod[y][x];
        if (c === m.mod[y][x + 1] && c === m.mod[y + 1][x] && c === m.mod[y + 1][x + 1]) score += 3;
      }
    /* N4: donker-aandeel */
    let donker = 0;
    for (const rij of m.mod) for (const c of rij) if (c) donker++;
    const pct = (donker * 100) / (s * s);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function qrMatrix(tekst) {
    const { ver, woorden } = encodeer(tekst);
    let beste = null, besteScore = Infinity, besteKeuze = 0;
    for (let keuze = 0; keuze < 8; keuze++) {
      const m = maakMatrix(ver, woorden);
      pasMaskToe(m, keuze);
      zetFormaatInfo(m, keuze);
      const sc = strafScore(m);
      if (sc < besteScore) {
        besteScore = sc;
        beste = m;
        besteKeuze = keuze;
      }
    }
    return beste.mod;
  }

  function qrSVG(tekst, maatPx = 96) {
    const mod = qrMatrix(tekst);
    const n = mod.length;
    const stil = 2; // stille zone in modules
    const tot = n + stil * 2;
    let pad = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (mod[y][x]) pad += `M${x + stil} ${y + stil}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tot} ${tot}" width="${maatPx}" height="${maatPx}" shape-rendering="crispEdges"><rect width="${tot}" height="${tot}" fill="#fff"/><path d="${pad}" fill="#1a2233"/></svg>`;
  }

  return { qrMatrix, qrSVG };
})();
