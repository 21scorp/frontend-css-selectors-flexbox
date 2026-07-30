/* ============================================================
   VLOT — studio.js
   De studio-app: lijst, editor, live preview, PDF, opslag.
   ============================================================ */

"use strict";

/* ---------- Staat ---------- */

let staat = laadStaat();
let huidigeId = staat.facturen[0]?.id || null;
let lijstFilter = "alle";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const elLijst = $("#factuurlijst");
const elEditor = $("#editor");
const elA4 = $("#a4");
const elToast = $("#toast");

function huidige() {
  return staat.facturen.find((f) => f.id === huidigeId) || null;
}

function bewaar() {
  bewaarStaat(staat);
}

let toastTimer;
function toast(tekst) {
  elToast.textContent = tekst;
  elToast.classList.add("zichtbaar");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove("zichtbaar"), 2400);
}

/* ---------- Pad-hulpjes (data-binding) ---------- */

function leesPad(obj, pad) {
  return pad.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function schrijfPad(obj, pad, waarde) {
  const delen = pad.split(".");
  const laatste = delen.pop();
  const doel = delen.reduce((o, k) => (o[k] ??= {}), obj);
  doel[laatste] = waarde;
}

/* ---------- Lijst ---------- */

function renderLijst() {
  const items = staat.facturen
    .filter((f) => lijstFilter === "alle" || f.status === lijstFilter)
    .sort((a, b) => (b.datum || "").localeCompare(a.datum || "") || b.nummer.localeCompare(a.nummer));

  if (!items.length) {
    elLijst.innerHTML = `<li class="lijst-leeg">Nog geen documenten.<br>Klik op <strong>+ Nieuw</strong> om te beginnen.</li>`;
  } else {
    elLijst.innerHTML = items
      .map((f) => {
        const b = berekenFactuur(f);
        return `
        <li>
          <button class="factuurlijst-item ${f.id === huidigeId ? "actief" : ""}" data-id="${f.id}">
            <span class="fl-boven">
              <span>${esc(f.nummer)}</span>
              <span class="fl-status" data-s="${f.status}">${f.type === "offerte" ? "Offerte" : STATUS_LABELS[f.status]}</span>
            </span>
            <span class="fl-klant">${esc(f.klant.naam) || "<em>Zonder klant</em>"}</span>
            <span class="fl-onder">
              <span>${datumNL(f.datum)}</span>
              <span>${euro.format(b.totaal)}</span>
            </span>
          </button>
        </li>`;
      })
      .join("");
  }

  const openstaand = staat.facturen
    .filter((f) => f.type === "factuur" && f.status === "verzonden")
    .reduce((s, f) => s + berekenFactuur(f).totaal, 0);
  const betaaldDitJaar = staat.facturen
    .filter((f) => f.type === "factuur" && f.status === "betaald" && (f.datum || "").startsWith(String(new Date().getFullYear())))
    .reduce((s, f) => s + berekenFactuur(f).totaal, 0);

  $("#lijst-totaal").innerHTML = `
    <span>Openstaand <strong>${euro.format(openstaand)}</strong></span>
    <span>Betaald in ${new Date().getFullYear()} <strong>${euro.format(betaaldDitJaar)}</strong></span>`;
}

elLijst.addEventListener("click", (e) => {
  const knop = e.target.closest("[data-id]");
  if (!knop) return;
  huidigeId = knop.dataset.id;
  renderAlles();
});

$$(".filter").forEach((f) =>
  f.addEventListener("click", () => {
    lijstFilter = f.dataset.filter;
    $$(".filter").forEach((x) => x.classList.toggle("actief", x === f));
    renderLijst();
  })
);

/* ---------- Editor ---------- */

function veld(label, pad, f, extra = "", labelKlasse = "") {
  return `
    <label class="veld ${labelKlasse}"><span class="mono-label">${label}</span>
      <input data-pad="${pad}" value="${esc(leesPad(f, pad))}" ${extra} />
    </label>`;
}

function renderEditor() {
  const f = huidige();

  if (!f) {
    elEditor.innerHTML = `
      <div class="editor-leeg">
        <span class="stempel">Leeg vel</span>
        <p>Maak je eerste factuur of offerte<br>met de knop <strong>+ Nieuw</strong>.</p>
      </div>`;
    return;
  }

  const b = berekenFactuur(f);

  elEditor.innerHTML = `
    <div class="editor-kop">
      <h1>${f.type === "offerte" ? "Offerte" : "Factuur"} ${esc(f.nummer)}</h1>
      <div class="editor-kop-acties">
        <button class="knop knop-stil knop-klein" id="knop-dupliceer">Dupliceer</button>
        <button class="knop knop-stil knop-klein knop-gevaar" id="knop-verwijder">Verwijder</button>
      </div>
    </div>

    <div class="editor-sectie">
      <span class="mono-label">Document</span>
      <div class="veldrij">
        <label class="veld"><span class="mono-label">Soort</span>
          <select data-pad="type">
            <option value="factuur" ${f.type === "factuur" ? "selected" : ""}>Factuur</option>
            <option value="offerte" ${f.type === "offerte" ? "selected" : ""}>Offerte</option>
          </select>
        </label>
        ${veld("Nummer", "nummer", f)}
        <label class="veld"><span class="mono-label">Status</span>
          <select data-pad="status">
            ${Object.entries(STATUS_LABELS)
              .map(([w, l]) => `<option value="${w}" ${f.status === w ? "selected" : ""}>${l}</option>`)
              .join("")}
          </select>
        </label>
      </div>
      <div class="veldrij">
        ${veld("Datum", "datum", f, 'type="date"')}
        ${veld("Betaaltermijn (dagen)", "vervalDagen", f, 'type="number" min="0" step="1"')}
        <label class="veld"><span class="mono-label">BTW-situatie</span>
          <select data-pad="btwModus">
            <option value="normaal" ${f.btwModus === "normaal" ? "selected" : ""}>Normaal (NL BTW)</option>
            <option value="verlegd" ${f.btwModus === "verlegd" ? "selected" : ""}>BTW verlegd</option>
            <option value="kor" ${f.btwModus === "kor" ? "selected" : ""}>KOR (vrijgesteld)</option>
            <option value="eu" ${f.btwModus === "eu" ? "selected" : ""}>EU / intracommunautair</option>
            <option value="vrijgesteld" ${f.btwModus === "vrijgesteld" ? "selected" : ""}>Vrijgesteld</option>
          </select>
        </label>
      </div>
    </div>

    <div class="editor-sectie">
      <span class="mono-label">Klant</span>
      <div class="veldrij">
        ${veld("Naam / bedrijf", "klant.naam", f, "", "veld-breed")}
        ${veld("T.a.v.", "klant.tav", f)}
      </div>
      <div class="veldrij">
        ${veld("Adres", "klant.adres", f)}
      </div>
      <div class="veldrij">
        ${veld("Postcode", "klant.postcode", f)}
        ${veld("Plaats", "klant.plaats", f)}
        ${veld("BTW-id (optioneel)", "klant.btwId", f)}
      </div>
    </div>

    <div class="editor-sectie">
      <span class="mono-label">Regels</span>
      <div class="regels-koppen">
        <span>Omschrijving</span><span class="r-rechts">Aantal</span><span>Eenheid</span><span class="r-rechts">Tarief €</span><span>BTW</span><span></span>
      </div>
      <div class="regels" id="regels">
        ${f.regels.map(regelEditorHTML).join("")}
      </div>
      <button class="knop knop-stil knop-klein regel-toevoegen" id="knop-regel">+ Regel toevoegen</button>
    </div>

    <div class="editor-sectie">
      <span class="mono-label">Afronding</span>
      <div class="veldrij">
        ${veld("Korting %", "kortingPct", f, 'type="number" min="0" max="100" step="0.5"', "veld-smal")}
        <label class="veld veld-vink">
          <span class="mono-label">Betaal-QR</span>
          <span class="vink-rij">
            <input type="checkbox" data-pad="betaalQR" ${f.betaalQR !== false ? "checked" : ""} />
            <span>Scan &amp; betaal-code op de factuur</span>
          </span>
        </label>
        <div class="veld"></div>
      </div>
      <div class="veldrij">
        <label class="veld"><span class="mono-label">Notitie op factuur</span>
          <textarea data-pad="notitie" rows="2" placeholder="Bijv. projectreferentie of afspraak…">${esc(f.notitie)}</textarea>
        </label>
      </div>
    </div>

    <div class="editor-totalen" id="editor-totalen">${totalenHTML(b)}</div>
  `;

  $("#knop-regel").addEventListener("click", () => {
    f.regels.push(nieuweRegel());
    bewaar();
    renderEditor();
    renderPreview();
    $("#regels")?.lastElementChild?.querySelector("input")?.focus();
  });

  $("#knop-dupliceer").addEventListener("click", () => {
    const kopie = structuredClone(f);
    kopie.id = uid();
    kopie.nummer = nieuweFactuur(staat).nummer;
    kopie.datum = vandaagISO();
    kopie.status = "concept";
    staat.facturen.push(kopie);
    huidigeId = kopie.id;
    bewaar();
    renderAlles();
    toast(`Gedupliceerd als ${kopie.nummer}`);
  });

  $("#knop-verwijder").addEventListener("click", () => {
    if (!confirm(`${f.type === "offerte" ? "Offerte" : "Factuur"} ${f.nummer} definitief verwijderen?`)) return;
    staat.facturen = staat.facturen.filter((x) => x.id !== f.id);
    huidigeId = staat.facturen[0]?.id || null;
    bewaar();
    renderAlles();
    toast("Verwijderd");
  });
}

function regelEditorHTML(r) {
  const eenheden = ["uur", "dag", "stuk", "woord", "km", "maand", "%"];
  return `
    <div class="regel" data-regel="${r.id}">
      <input data-veld="omschrijving" value="${esc(r.omschrijving)}" placeholder="Bijv. Webdesign — homepage" />
      <input data-veld="aantal" class="r-getal" type="number" min="0" step="0.25" value="${r.aantal}" />
      <select data-veld="eenheid">
        ${eenheden.map((e) => `<option ${r.eenheid === e ? "selected" : ""}>${e}</option>`).join("")}
      </select>
      <input data-veld="prijs" class="r-getal" type="number" min="0" step="0.01" value="${r.prijs}" />
      <select data-veld="btw">
        ${[21, 9, 0].map((t) => `<option value="${t}" ${Number(r.btw) === t ? "selected" : ""}>${t}%</option>`).join("")}
      </select>
      <button class="regel-verwijder" title="Regel verwijderen" data-verwijder-regel>×</button>
    </div>`;
}

function totalenHTML(b) {
  const btw =
    b.btwGroepen.length > 0
      ? b.btwGroepen.map((g) => `<div><span>BTW ${g.tarief}%</span><span>${euro.format(g.btw)}</span></div>`).join("")
      : `<div><span>BTW</span><span>${euro.format(0)}</span></div>`;
  return `
    <div><span>Subtotaal</span><span>${euro.format(b.subtotaal)}</span></div>
    ${b.korting > 0 ? `<div><span>Korting</span><span>− ${euro.format(b.korting)}</span></div>` : ""}
    ${btw}
    <div class="et-eind"><span>Totaal</span><span>${euro.format(b.totaal)}</span></div>`;
}

/* Live binding: alle inputs in de editor */
elEditor.addEventListener("input", (e) => {
  const f = huidige();
  if (!f) return;

  const regelEl = e.target.closest("[data-regel]");
  if (regelEl && e.target.dataset.veld) {
    const regel = f.regels.find((r) => r.id === regelEl.dataset.regel);
    if (regel) {
      const v = e.target.dataset.veld;
      regel[v] = v === "aantal" || v === "prijs" || v === "btw" ? Number(e.target.value) : e.target.value;
    }
  } else if (e.target.dataset.pad) {
    let waarde = e.target.value;
    if (e.target.type === "number") waarde = Number(waarde);
    if (e.target.type === "checkbox") waarde = e.target.checked;
    schrijfPad(f, e.target.dataset.pad, waarde);
  } else {
    return;
  }

  bewaar();
  renderPreview();
  $("#editor-totalen").innerHTML = totalenHTML(berekenFactuur(f));
  renderLijstVertraagd();
});

/* Sommige wijzigingen vragen om een volledige her-render van de editor */
elEditor.addEventListener("change", (e) => {
  const f = huidige();
  if (!f) return;
  if (e.target.dataset.pad === "type" || e.target.dataset.pad === "status" || e.target.dataset.pad === "btwModus") {
    renderEditor();
    renderPreview();
    renderLijst();
  }
});

elEditor.addEventListener("click", (e) => {
  const f = huidige();
  if (!f) return;
  if (e.target.closest("[data-verwijder-regel]")) {
    const regelEl = e.target.closest("[data-regel]");
    f.regels = f.regels.filter((r) => r.id !== regelEl.dataset.regel);
    if (!f.regels.length) f.regels.push(nieuweRegel());
    bewaar();
    renderEditor();
    renderPreview();
  }
});

let lijstTimer;
function renderLijstVertraagd() {
  clearTimeout(lijstTimer);
  lijstTimer = setTimeout(renderLijst, 400);
}

/* ---------- Preview ---------- */

function renderPreview() {
  const f = huidige();
  elA4.innerHTML = f
    ? renderFactuurHTML(f, staat.bedrijf)
    : `<div style="display:grid;place-items:center;height:1123px;color:#999;font-style:italic">Geen document geselecteerd</div>`;
  renderThemaKiezer();
}

function schaalPreview() {
  const vlak = $("#preview-vlak");
  const schaal = Math.min(1, (vlak.clientWidth - 52) / 794);
  const el = $("#a4-schaal");
  el.style.transform = `scale(${schaal})`;
  el.style.width = "794px";
  el.style.height = `${Math.ceil(1123 * schaal)}px`;
}

window.addEventListener("resize", schaalPreview);

/* ---------- Thema-kiezer ---------- */

const THEMA_KLEUREN = {
  grootboek: "#1d3f8f",
  klassiek: "#111111",
  minimaal: "#9aa2b1",
  vermiljoen: "#e8491f",
};

function renderThemaKiezer() {
  const f = huidige();
  const houder = $("#thema-kiezer");
  if (!f) {
    houder.innerHTML = "";
    return;
  }
  houder.innerHTML = Object.entries(THEMA_LABELS)
    .map(
      ([w, l]) => `
      <button class="thema-chip ${f.thema === w ? "actief" : ""}" data-thema-keuze="${w}" role="radio" aria-checked="${f.thema === w}">
        <span class="bol" style="background:${THEMA_KLEUREN[w]}"></span>${l}
      </button>`
    )
    .join("");
}

$("#thema-kiezer").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-thema-keuze]");
  const f = huidige();
  if (!chip || !f) return;
  f.thema = chip.dataset.themaKeuze;
  staat.instellingen.thema = f.thema;
  bewaar();
  renderPreview();
});

/* ---------- Topbar-acties ---------- */

$("#knop-nieuw").addEventListener("click", () => {
  const f = nieuweFactuur(staat);
  staat.facturen.push(f);
  huidigeId = f.id;
  bewaar();
  renderAlles();
  $('[data-pad="klant.naam"]')?.focus();
});

$("#knop-print").addEventListener("click", () => {
  const f = huidige();
  if (!f) return toast("Geen document om te printen");
  const oudeTitel = document.title;
  document.title = `${f.type === "offerte" ? "Offerte" : "Factuur"}-${f.nummer}`;
  window.print();
  document.title = oudeTitel;
});

$("#knop-donker").addEventListener("click", () => {
  const donker = document.documentElement.dataset.thema !== "donker";
  document.documentElement.dataset.thema = donker ? "donker" : "licht";
  staat.instellingen.donker = donker;
  bewaar();
});

/* Export / import */
$("#knop-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(staat, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `vlot-backup-${vandaagISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Back-up gedownload");
});

$("#knop-import").addEventListener("click", () => $("#import-bestand").click());

$("#import-bestand").addEventListener("change", async (e) => {
  const bestand = e.target.files[0];
  if (!bestand) return;
  try {
    const data = JSON.parse(await bestand.text());
    if (!Array.isArray(data.facturen)) throw new Error("geen vlot-bestand");
    staat = { ...standaardStaat(), ...data };
    huidigeId = staat.facturen[0]?.id || null;
    bewaar();
    renderAlles();
    toast(`${staat.facturen.length} documenten geïmporteerd`);
  } catch {
    toast("Import mislukt: geen geldig VLOT-bestand");
  }
  e.target.value = "";
});

/* ---------- Bedrijfsdialoog ---------- */

const dlgBedrijf = $("#dialoog-bedrijf");
let logoTijdelijk = null; // null = ongewijzigd, "" = verwijderd, string = nieuw

function toonLogoPreview(bron) {
  const img = $("#logo-preview");
  const weg = $("#knop-logo-weg");
  img.hidden = !bron;
  weg.hidden = !bron;
  if (bron) img.src = bron;
}

$("#knop-bedrijf").addEventListener("click", () => {
  const form = $("#form-bedrijf");
  for (const [k, v] of Object.entries(staat.bedrijf)) {
    if (form.elements[k]) form.elements[k].value = v || "";
  }
  logoTijdelijk = null;
  toonLogoPreview(staat.bedrijf.logo);
  dlgBedrijf.showModal();
});

$("#knop-logo-kies").addEventListener("click", () => $("#logo-bestand").click());

$("#knop-logo-weg").addEventListener("click", () => {
  logoTijdelijk = "";
  toonLogoPreview("");
});

$("#logo-bestand").addEventListener("change", (e) => {
  const bestand = e.target.files[0];
  if (!bestand) return;
  const lezer = new FileReader();
  lezer.onload = () => {
    // SVG bewaren zoals-ie is; bitmaps verkleinen naar max 480px breed
    if (bestand.type === "image/svg+xml") {
      logoTijdelijk = lezer.result;
      toonLogoPreview(logoTijdelijk);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const schaal = Math.min(1, 480 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * schaal);
      c.height = Math.round(img.height * schaal);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      logoTijdelijk = c.toDataURL("image/png");
      toonLogoPreview(logoTijdelijk);
    };
    img.src = lezer.result;
  };
  lezer.readAsDataURL(bestand);
  e.target.value = "";
});

dlgBedrijf.addEventListener("close", () => {
  if (dlgBedrijf.returnValue !== "bewaar") return;
  const form = $("#form-bedrijf");
  for (const k of Object.keys(staat.bedrijf)) {
    if (form.elements[k]) staat.bedrijf[k] = form.elements[k].value.trim();
  }
  if (logoTijdelijk !== null) staat.bedrijf.logo = logoTijdelijk;
  bewaar();
  renderPreview();
  toast("Bedrijfsgegevens bewaard");
});

/* Wisselknop editor ↔ voorbeeld op kleinere schermen */
$("#knop-preview-wissel").addEventListener("click", (e) => {
  const aan = document.body.classList.toggle("toon-preview");
  e.target.textContent = aan ? "Bewerken" : "Voorbeeld";
  e.target.setAttribute("aria-pressed", String(aan));
  if (aan) schaalPreview();
});

/* ---------- Start ---------- */

function renderAlles() {
  renderLijst();
  renderEditor();
  renderPreview();
  schaalPreview();
}

if (staat.instellingen.donker) document.documentElement.dataset.thema = "donker";
renderAlles();
