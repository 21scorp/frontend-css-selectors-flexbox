/* ============================================================
   VLOT — factuur-render.js
   Rendert een factuur-object naar het A4-document (HTML).
   Wordt gebruikt voor de live preview én voor de PDF-print.
   ============================================================ */

"use strict";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function regelHTML(r, i) {
  const eenheid = r.eenheid && r.eenheid !== "stuk" ? ` ${esc(r.eenheid)}` : "×";
  return `
    <tr>
      <td class="f-nr">${String(i + 1).padStart(2, "0")}</td>
      <td class="f-omschrijving">${esc(r.omschrijving) || "<span class='f-leeg'>Omschrijving…</span>"}</td>
      <td class="f-aantal">${getal.format(Number(r.aantal) || 0)}${eenheid}</td>
      <td class="f-prijs">${euro.format(Number(r.prijs) || 0)}</td>
      <td class="f-btwkolom">${Number(r.btw)}%</td>
      <td class="f-bedrag">${euro.format(r.bedrag)}</td>
    </tr>`;
}

function renderFactuurHTML(f, bedrijf) {
  const b = berekenFactuur(f);
  const vervalt = plusDagen(f.datum, f.vervalDagen);
  const isOfferte = f.type === "offerte";
  const titel = isOfferte ? "Offerte" : "Factuur";

  const btwRijen =
    f.btwModus === "normaal"
      ? b.btwGroepen
          .map(
            (g) => `
        <div class="f-totaalrij">
          <span>BTW ${g.tarief}% over ${euro.format(g.grondslag)}</span>
          <span>${euro.format(g.btw)}</span>
        </div>`
          )
          .join("")
      : `<div class="f-totaalrij"><span>BTW</span><span>${euro.format(0)}</span></div>`;

  const kortingRij =
    b.korting > 0
      ? `<div class="f-totaalrij f-korting"><span>Korting ${getal.format(b.kortingPct)}%</span><span>− ${euro.format(b.korting)}</span></div>`
      : "";

  const status =
    !isOfferte && f.status === "betaald"
      ? `<div class="f-stempel f-stempel-betaald">Voldaan</div>`
      : "";

  const klantregels = [
    f.klant.naam && `<strong>${esc(f.klant.naam)}</strong>`,
    f.klant.tav && `t.a.v. ${esc(f.klant.tav)}`,
    f.klant.adres && esc(f.klant.adres),
    [f.klant.postcode, f.klant.plaats].filter(Boolean).map(esc).join("&nbsp;&nbsp;"),
    f.klant.btwId && `BTW-id: ${esc(f.klant.btwId)}`,
  ]
    .filter(Boolean)
    .join("<br>");

  const bedrijfsregels = [
    esc(bedrijf.adres),
    [bedrijf.postcode, bedrijf.plaats].filter(Boolean).map(esc).join("&nbsp;&nbsp;"),
    esc(bedrijf.email),
    esc(bedrijf.telefoon),
  ]
    .filter(Boolean)
    .join("<br>");

  const meta = [
    bedrijf.kvk && `KVK ${esc(bedrijf.kvk)}`,
    bedrijf.btwId && `BTW ${esc(bedrijf.btwId)}`,
    bedrijf.iban && `IBAN ${esc(bedrijf.iban)}`,
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  const betaalblok = isOfferte
    ? `<p class="f-betaal">Deze offerte is geldig tot <strong>${datumNL(vervalt)}</strong>.</p>`
    : `<p class="f-betaal">Graag betalen vóór <strong>${datumNL(vervalt)}</strong>${
        bedrijf.iban ? ` op <strong>${esc(bedrijf.iban)}</strong>` : ""
      } o.v.v. <strong>${esc(f.nummer)}</strong>.</p>`;

  let qrBlok = "";
  if (!isOfferte && f.betaalQR !== false && f.status !== "betaald" && typeof QR !== "undefined") {
    const payload = epcPayload(f, bedrijf, b.totaal);
    if (payload) {
      qrBlok = `
      <div class="f-qr">
        ${QR.qrSVG(payload, 92)}
        <span class="f-qr-tekst"><strong>Scan &amp; betaal</strong><br>met je bank-app</span>
      </div>`;
    }
  }

  return `
  <article class="factuur thema-${esc(f.thema)}" lang="nl">
    <header class="f-kop">
      <div class="f-afzender">
        ${bedrijf.logo ? `<img class="f-logo-img" src="${bedrijf.logo}" alt="" />` : ""}
        <div class="f-logo">${esc(bedrijf.naam) || "<span class='f-leeg'>Jouw bedrijfsnaam</span>"}</div>
        <div class="f-afzender-detail">${bedrijfsregels}</div>
      </div>
      <div class="f-titelblok">
        <h1 class="f-titel">${titel}</h1>
        <table class="f-metatabel">
          <tr><th>Nummer</th><td>${esc(f.nummer)}</td></tr>
          <tr><th>Datum</th><td>${datumNL(f.datum)}</td></tr>
          <tr><th>${isOfferte ? "Geldig tot" : "Vervaldatum"}</th><td>${datumNL(vervalt)}</td></tr>
        </table>
      </div>
    </header>

    <section class="f-adressering">
      <div class="f-aan">
        <span class="f-label">${isOfferte ? "Offerte voor" : "Factuur aan"}</span>
        <div class="f-aan-detail">${klantregels || "<span class='f-leeg'>Klantgegevens…</span>"}</div>
      </div>
      ${status}
    </section>

    <table class="f-tabel">
      <thead>
        <tr>
          <th class="f-nr">Nr</th>
          <th class="f-omschrijving">Omschrijving</th>
          <th class="f-aantal">Aantal</th>
          <th class="f-prijs">Tarief</th>
          <th class="f-btwkolom">BTW</th>
          <th class="f-bedrag">Bedrag</th>
        </tr>
      </thead>
      <tbody>
        ${b.regels.map(regelHTML).join("")}
      </tbody>
    </table>

    <section class="f-onder">
      <div class="f-noot">
        ${f.notitie ? `<p>${esc(f.notitie)}</p>` : ""}
        ${b.btwNoot ? `<p class="f-btwnoot">${esc(b.btwNoot)}</p>` : ""}
        ${betaalblok}
        ${qrBlok}
      </div>
      <div class="f-totalen">
        <div class="f-totaalrij"><span>Subtotaal</span><span>${euro.format(b.subtotaal)}</span></div>
        ${kortingRij}
        ${btwRijen}
        <div class="f-totaalrij f-eind"><span>Totaal</span><span>${euro.format(b.totaal)}</span></div>
      </div>
    </section>

    <footer class="f-voet">
      <span>${meta}</span>
      ${bedrijf.voet ? `<span class="f-voet-tekst">${esc(bedrijf.voet)}</span>` : ""}
    </footer>
  </article>`;
}
