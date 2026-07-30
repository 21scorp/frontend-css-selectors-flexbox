/* ============================================================
   MIJNLIJN — maak.js
   De studio: profiel bewerken, live poster, PNG/SVG-download.
   Alles blijft in localStorage — niets verlaat het apparaat.
   ============================================================ */

"use strict";

const SLEUTEL = "mijnlijn.v1";
const $ = (sel, el = document) => el.querySelector(sel);

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- Voorbeeldprofiel ---------- */

function voorbeeldProfiel() {
  return {
    naam: "Sam",
    geboortejaar: 1998,
    thema: "middernacht",
    formaat: "poster",
    momenten: [
      { id: uid(), jaar: 2002, titel: "Beste vriend Daan", lijnen: ["vrienden"] },
      { id: uid(), jaar: 2004, titel: "Verhuisd naar Zwolle", lijnen: ["wonen", "familie"] },
      { id: uid(), jaar: 2007, titel: "Eerste voetbaltoernooi", lijnen: ["avontuur"] },
      { id: uid(), jaar: 2010, titel: "Naar de middelbare", lijnen: ["werk", "vrienden"] },
      { id: uid(), jaar: 2012, titel: "Eerste verliefdheid", lijnen: ["liefde"] },
      { id: uid(), jaar: 2014, titel: "Zomer in Frankrijk", lijnen: ["reizen", "familie"] },
      { id: uid(), jaar: 2016, titel: "Geslaagd!", lijnen: ["werk"] },
      { id: uid(), jaar: 2017, titel: "Op kamers in Utrecht", lijnen: ["wonen"] },
      { id: uid(), jaar: 2019, titel: "Verliefd op Roos", lijnen: ["liefde"] },
      { id: uid(), jaar: 2020, titel: "Eerste echte baan", lijnen: ["werk"] },
      { id: uid(), jaar: 2022, titel: "Samenwonen met Roos", lijnen: ["liefde", "wonen"] },
      { id: uid(), jaar: 2023, titel: "Roadtrip Portugal", lijnen: ["reizen", "liefde"] },
      { id: uid(), jaar: 2024, titel: "Marathon uitgelopen", lijnen: ["avontuur"] },
      { id: uid(), jaar: 2025, titel: "Puppy Nacho", lijnen: ["familie"] },
    ],
  };
}

function leegProfiel() {
  return { naam: "", geboortejaar: 2000, thema: "middernacht", formaat: "poster", momenten: [] };
}

/* ---------- Staat ---------- */

let profiel = laad();

function laad() {
  try {
    const ruw = localStorage.getItem(SLEUTEL);
    if (!ruw) return voorbeeldProfiel();
    const p = JSON.parse(ruw);
    return { ...leegProfiel(), ...p, momenten: Array.isArray(p.momenten) ? p.momenten : [] };
  } catch {
    return voorbeeldProfiel();
  }
}

function bewaar() {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(profiel));
  } catch { /* opslag geblokkeerd — geen ramp */ }
}

let toastTimer;
function toast(tekst) {
  const el = $("#toast");
  el.textContent = tekst;
  el.classList.add("zichtbaar");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("zichtbaar"), 2400);
}

/* ---------- Poster ---------- */

function renderPoster() {
  const svg = MIJNLIJN.tekenSVG(profiel, { thema: profiel.thema, formaat: profiel.formaat });
  const houder = $("#poster-houder");
  houder.innerHTML = svg;
  schaalPoster();
}

function schaalPoster() {
  const podium = $("#podium");
  const svg = $("#poster-houder svg");
  if (!svg) return;
  const F = MIJNLIJN.FORMATEN[profiel.formaat] || MIJNLIJN.FORMATEN.poster;
  const beschikbaarB = podium.clientWidth - 48;
  const beschikbaarH = podium.clientHeight - 48;
  const schaal = Math.min(beschikbaarB / F.w, beschikbaarH / F.h, 1);
  svg.style.width = `${F.w * schaal}px`;
  svg.style.height = `${F.h * schaal}px`;
}

window.addEventListener("resize", schaalPoster);

/* ---------- Instellingen ---------- */

function renderInstellingen() {
  $("#in-naam").value = profiel.naam;
  $("#in-jaar").value = profiel.geboortejaar;

  $("#thema-chips").innerHTML = Object.entries(MIJNLIJN.THEMAS)
    .map(
      ([id, t]) => `
      <button class="chip ${profiel.thema === id ? "actief" : ""}" data-thema="${id}">
        <span class="chip-bol" style="background:${t.bg};border-color:${t.inkt}"></span>${t.naam}
      </button>`
    )
    .join("");

  const formaatNamen = { poster: "Poster (liggend)", vierkant: "Vierkant (post)", story: "Story (9:16)" };
  $("#formaat-chips").innerHTML = Object.keys(MIJNLIJN.FORMATEN)
    .map(
      (id) => `
      <button class="chip ${profiel.formaat === id ? "actief" : ""}" data-formaat="${id}">${formaatNamen[id]}</button>`
    )
    .join("");
}

$("#in-naam").addEventListener("input", (e) => {
  profiel.naam = e.target.value;
  bewaar();
  renderPoster();
});

$("#in-jaar").addEventListener("input", (e) => {
  const j = Number(e.target.value);
  if (j >= 1930 && j <= 2024) {
    profiel.geboortejaar = j;
    bewaar();
    renderPoster();
  }
});

$("#thema-chips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-thema]");
  if (!chip) return;
  profiel.thema = chip.dataset.thema;
  bewaar();
  renderInstellingen();
  renderPoster();
});

$("#formaat-chips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-formaat]");
  if (!chip) return;
  profiel.formaat = chip.dataset.formaat;
  bewaar();
  renderInstellingen();
  renderPoster();
});

/* ---------- Momenten ---------- */

function renderMomenten() {
  const houder = $("#momenten");
  const gesorteerd = [...profiel.momenten].sort((a, b) => a.jaar - b.jaar);

  houder.innerHTML = gesorteerd
    .map(
      (m) => `
    <div class="moment" data-id="${m.id}">
      <div class="moment-boven">
        <input class="moment-jaar" type="number" min="1930" max="2026" value="${m.jaar}" data-veld="jaar" aria-label="Jaar" />
        <input class="moment-titel" value="${m.titel.replace(/"/g, "&quot;")}" placeholder="Wat gebeurde er?" maxlength="34" data-veld="titel" aria-label="Titel" />
        <button class="moment-weg" title="Verwijder moment" data-weg>×</button>
      </div>
      <div class="moment-lijnen">
        ${MIJNLIJN.LIJNEN.map(
          (l) => `
          <button class="lijnknop ${m.lijnen.includes(l.id) ? "aan" : ""}" data-lijn="${l.id}"
            style="--lk:${l.kleur}" title="${l.naam}">${l.naam.replace("lijn", "").replace(" & studie", "/studie")}</button>`
        ).join("")}
      </div>
    </div>`
    )
    .join("") || `<p class="leeg">Nog geen momenten. Klik op <strong>+ Moment</strong> of laad het voorbeeld.</p>`;
}

$("#momenten").addEventListener("input", (e) => {
  const wrap = e.target.closest("[data-id]");
  if (!wrap) return;
  const m = profiel.momenten.find((x) => x.id === wrap.dataset.id);
  if (!m) return;
  if (e.target.dataset.veld === "jaar") m.jaar = Number(e.target.value);
  if (e.target.dataset.veld === "titel") m.titel = e.target.value;
  bewaar();
  renderPoster();
});

$("#momenten").addEventListener("click", (e) => {
  const wrap = e.target.closest("[data-id]");
  if (!wrap) return;
  const m = profiel.momenten.find((x) => x.id === wrap.dataset.id);
  if (!m) return;

  if (e.target.closest("[data-weg]")) {
    profiel.momenten = profiel.momenten.filter((x) => x.id !== m.id);
    bewaar();
    renderMomenten();
    renderPoster();
    return;
  }

  const lijnKnop = e.target.closest("[data-lijn]");
  if (lijnKnop) {
    const id = lijnKnop.dataset.lijn;
    m.lijnen = m.lijnen.includes(id) ? m.lijnen.filter((x) => x !== id) : [...m.lijnen, id];
    lijnKnop.classList.toggle("aan");
    bewaar();
    renderPoster();
  }
});

$("#knop-moment").addEventListener("click", () => {
  profiel.momenten.push({ id: uid(), jaar: new Date().getFullYear(), titel: "", lijnen: [] });
  bewaar();
  renderMomenten();
  const laatste = $("#momenten").querySelector(".moment:last-child .moment-titel");
  laatste?.focus();
});

/* ---------- Acties ---------- */

$("#knop-voorbeeld").addEventListener("click", () => {
  profiel = voorbeeldProfiel();
  bewaar();
  renderAlles();
  toast("Voorbeeld geladen — maak 'm nu van jou");
});

$("#knop-wissen").addEventListener("click", () => {
  if (!confirm("Alles wissen en opnieuw beginnen?")) return;
  profiel = leegProfiel();
  bewaar();
  renderAlles();
});

function bestandsnaam(ext) {
  const naam = (profiel.naam || "mijn-leven").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `mijnlijn-${naam}.${ext}`;
}

$("#knop-svg").addEventListener("click", () => {
  const svg = MIJNLIJN.tekenSVG(profiel, { thema: profiel.thema, formaat: profiel.formaat });
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = bestandsnaam("svg");
  a.click();
  URL.revokeObjectURL(a.href);
  toast("SVG gedownload");
});

/* Poster → hoge-resolutie PNG-blob (gedeeld door download én deel) */
function maakPNGBlob() {
  return new Promise((klaar, faal) => {
    const F = MIJNLIJN.FORMATEN[profiel.formaat] || MIJNLIJN.FORMATEN.poster;
    const svgTekst = MIJNLIJN.tekenSVG(profiel, { thema: profiel.thema, formaat: profiel.formaat });
    const schaal = 2;
    const blob = new Blob([svgTekst], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = F.w * schaal;
      c.height = F.h * schaal;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((png) => (png ? klaar(png) : faal(new Error("geen png"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      faal(new Error("svg laadde niet"));
    };
    img.src = url;
  });
}

$("#knop-download").addEventListener("click", async () => {
  try {
    const png = await maakPNGBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = bestandsnaam("png");
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Poster gedownload — deel 'm gerust!");
  } catch {
    toast("Downloaden mislukte — probeer het nog eens");
  }
});

/* Deelknop alleen tonen als het apparaat bestanden kan delen (mobiel) */
if (navigator.canShare && navigator.canShare({ files: [new File([""], "t.png", { type: "image/png" })] })) {
  $("#knop-deel").hidden = false;
}

$("#knop-deel").addEventListener("click", async () => {
  try {
    const png = await maakPNGBlob();
    const bestand = new File([png], bestandsnaam("png"), { type: "image/png" });
    await navigator.share({
      files: [bestand],
      title: "Mijn leven als metrokaart",
      text: "Kijk, mijn leven als metrokaart — gemaakt met MIJNLIJN.",
    });
  } catch (e) {
    if (e && e.name !== "AbortError") toast("Delen lukte niet — download 'm dan gewoon");
  }
});

/* ---------- Start ---------- */

function renderAlles() {
  renderInstellingen();
  renderMomenten();
  renderPoster();
}

renderAlles();
