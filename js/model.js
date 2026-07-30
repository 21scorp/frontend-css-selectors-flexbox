/* ============================================================
   VLOT — model.js
   Datamodel, opslag (localStorage) en berekeningen.
   Geen server, geen account: alles blijft bij de gebruiker.
   ============================================================ */

"use strict";

const VLOT_SLEUTEL = "vlot.v1";

/* ---------- Hulpjes ---------- */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const vandaagISO = () => new Date().toISOString().slice(0, 10);

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

const getal = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function datumNL(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function plusDagen(iso, dagen) {
  const d = new Date((iso || vandaagISO()) + "T12:00:00");
  d.setDate(d.getDate() + (Number(dagen) || 0));
  return d.toISOString().slice(0, 10);
}

/* ---------- Standaardstaat ---------- */

function leegBedrijf() {
  return {
    naam: "",
    adres: "",
    postcode: "",
    plaats: "",
    email: "",
    telefoon: "",
    kvk: "",
    btwId: "",
    iban: "",
    voet: "",
    logo: "",
  };
}

function nieuweRegel() {
  return { id: uid(), omschrijving: "", aantal: 1, eenheid: "uur", prijs: 0, btw: 21 };
}

function nieuweFactuur(staat) {
  const jaar = new Date().getFullYear();
  const bestaande = staat.facturen
    .map((f) => /^(\d{4})-(\d+)$/.exec(f.nummer))
    .filter((m) => m && Number(m[1]) === jaar)
    .map((m) => Number(m[2]));
  const volgende = (bestaande.length ? Math.max(...bestaande) : 0) + 1;

  return {
    id: uid(),
    type: "factuur",
    nummer: `${jaar}-${String(volgende).padStart(3, "0")}`,
    datum: vandaagISO(),
    vervalDagen: 14,
    status: "concept",
    thema: staat.instellingen.thema || "grootboek",
    klant: { naam: "", tav: "", adres: "", postcode: "", plaats: "", email: "", btwId: "" },
    regels: [nieuweRegel()],
    btwModus: "normaal",
    kortingPct: 0,
    notitie: "",
    betaalQR: true,
  };
}

/**
 * Bouwt de EPC-QR-payload ("Scan & betaal", door alle NL/EU bank-apps
 * ondersteund). Retourneert null als de gegevens onvolledig zijn.
 */
function epcPayload(f, bedrijf, totaal) {
  const iban = (bedrijf.iban || "").replace(/\s+/g, "").toUpperCase();
  const naam = (bedrijf.naam || "").trim();
  if (!iban || !naam || totaal < 0.01 || totaal > 999999999.99) return null;
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    "", // BIC is optioneel sinds versie 002
    naam.slice(0, 70),
    iban,
    "EUR" + totaal.toFixed(2),
    "",
    "",
    `Factuur ${f.nummer}`.slice(0, 140),
  ].join("\n");
}

function standaardStaat() {
  return {
    versie: 1,
    bedrijf: leegBedrijf(),
    instellingen: { thema: "grootboek", donker: false },
    facturen: [],
  };
}

/* ---------- Opslag ---------- */

function laadStaat() {
  try {
    const ruw = localStorage.getItem(VLOT_SLEUTEL);
    if (!ruw) return standaardStaat();
    const data = JSON.parse(ruw);
    const basis = standaardStaat();
    return {
      ...basis,
      ...data,
      bedrijf: { ...basis.bedrijf, ...(data.bedrijf || {}) },
      instellingen: { ...basis.instellingen, ...(data.instellingen || {}) },
      facturen: Array.isArray(data.facturen) ? data.facturen : [],
    };
  } catch {
    return standaardStaat();
  }
}

function bewaarStaat(staat) {
  try {
    localStorage.setItem(VLOT_SLEUTEL, JSON.stringify(staat));
  } catch {
    /* opslag vol of geblokkeerd — stil falen, de app blijft werken */
  }
}

/* ---------- Berekeningen ---------- */

/**
 * Rekent een factuur volledig door.
 * Retourneert: { regels:[{...regel, bedrag}], subtotaal, korting, grondslag,
 *               btwGroepen:[{tarief, grondslag, btw}], btwTotaal, totaal, btwNoot }
 */
function berekenFactuur(f) {
  const regels = f.regels.map((r) => ({
    ...r,
    bedrag: (Number(r.aantal) || 0) * (Number(r.prijs) || 0),
  }));

  const subtotaal = regels.reduce((s, r) => s + r.bedrag, 0);
  const kortingPct = Math.min(100, Math.max(0, Number(f.kortingPct) || 0));
  const korting = subtotaal * (kortingPct / 100);
  const grondslag = subtotaal - korting;

  const btwActief = f.btwModus === "normaal";
  const groepen = new Map();

  if (btwActief && subtotaal > 0) {
    for (const r of regels) {
      const tarief = Number(r.btw) || 0;
      const deel = r.bedrag * (1 - kortingPct / 100);
      const g = groepen.get(tarief) || { tarief, grondslag: 0, btw: 0 };
      g.grondslag += deel;
      g.btw += deel * (tarief / 100);
      groepen.set(tarief, g);
    }
  }

  const btwGroepen = [...groepen.values()].sort((a, b) => b.tarief - a.tarief);
  const btwTotaal = btwGroepen.reduce((s, g) => s + g.btw, 0);

  const noten = {
    normaal: "",
    verlegd: "BTW verlegd naar de afnemer" + (f.klant.btwId ? ` (${f.klant.btwId})` : "") + ", art. 12 Wet OB.",
    kor: "Vrijgesteld van OB o.g.v. artikel 25 Wet OB (kleineondernemersregeling).",
    eu: "Intracommunautaire prestatie — BTW verlegd (0%), art. 138 BTW-richtlijn.",
    vrijgesteld: "Vrijgesteld van BTW.",
  };

  return {
    regels,
    subtotaal,
    kortingPct,
    korting,
    grondslag,
    btwGroepen,
    btwTotaal,
    totaal: grondslag + btwTotaal,
    btwNoot: noten[f.btwModus] || "",
  };
}

/* ---------- Statuslabels ---------- */

const STATUS_LABELS = {
  concept: "Concept",
  verzonden: "Verzonden",
  betaald: "Betaald",
};

const THEMA_LABELS = {
  grootboek: "Grootboek",
  klassiek: "Klassiek",
  minimaal: "Minimaal",
  vermiljoen: "Vermiljoen",
};
