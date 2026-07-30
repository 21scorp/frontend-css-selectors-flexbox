# VLOT — Facturen die kloppen, zonder gedoe

**VLOT** is een factuurstudio voor zzp'ers en freelancers die **volledig in de browser** draait.
Geen account, geen cloud, geen abonnement, geen tracking — wél professionele facturen en
offertes als perfecte A4-PDF, in dertig seconden.

> Open `index.html` voor de productpagina, of ga direct naar `studio.html` om te factureren.

## Waarom dit bestaat

Bestaande factuurtools vragen een account, een abonnement en — het belangrijkste — **jouw
volledige omzetadministratie op hun servers**. Voor iemand die vijf facturen per maand
stuurt is dat absurd. VLOT keert het om: de software komt naar jou, je cijfers blijven thuis.

## Wat het kan

- **Scan & betaal-QR** — elke factuur krijgt een EPC-betaal-QR (IBAN + bedrag + kenmerk) die
  elke Nederlandse/Europese bank-app kan scannen; de QR-encoder is zelf geschreven, zonder
  dependencies, en geverifieerd tegen een onafhankelijke decoder
- **Facturen én offertes** — wissel per document; een offerte krijgt automatisch een geldigheidsdatum
- **Live A4-preview** — wat je ziet is exact de PDF die je verstuurt
- **Alle Nederlandse BTW-situaties** — 21%/9%/0% per regel, BTW verlegd (art. 12 Wet OB),
  KOR (art. 25 Wet OB), intracommunautair en vrijgesteld — inclusief de juiste wettelijke vermelding
- **Automatische nummering** — doorlopend per jaar (`2026-001`, `2026-002`, …)
- **Vier factuurthema's** — Grootboek, Klassiek, Minimaal en Vermiljoen; wisselen zonder opnieuw typen
- **Status & overzicht** — concept / verzonden / betaald, met openstaand saldo en jaaromzet
- **Kortingen** — percentueel, netjes verrekend in de BTW-grondslag per tarief
- **Logo-upload** — afbeelding wordt client-side verkleind en lokaal bewaard; SVG blijft vectorscherp
- **Werkt offline** — service worker cachet de hele app na de eerste keer laden
- **Back-up in eigen hand** — exporteer/importeer je hele administratie als één JSON-bestand
- **Donkere modus** — voor de nachtelijke boekhouder
- **PDF met juiste bestandsnaam** — `Factuur-2026-001.pdf`, via de printdialoog van je browser

## Techniek

Bewust *zonder* framework, bundler of dependencies: drie HTML-pagina's, vanilla CSS en
vanilla JavaScript. Daardoor:

- laadt de app in een oogwenk en werkt hij offline na de eerste keer laden;
- is de volledige broncode in een kwartier te auditen (belangrijk voor een privacy-claim);
- is hosten gratis op elke statische host (GitHub Pages, Netlify, een USB-stick).

| Bestand | Rol |
| --- | --- |
| `index.html` + `css/site.css` | productpagina |
| `studio.html` + `css/studio.css` | de studio-app |
| `css/factuur.css` | het factuurdocument zelf (scherm én print), incl. thema's |
| `css/print.css` | reduceert de afdruk tot exact één A4 |
| `css/tokens.css` | ontwerptokens: kleuren, typografie, licht/donker |
| `js/qr.js` | QR-encoder (ISO/IEC 18004, byte-modus, EC-M) voor de betaal-QR |
| `js/model.js` | datamodel, localStorage, BTW-berekeningen, EPC-payload |
| `js/factuur-render.js` | factuurobject → A4-HTML |
| `js/studio.js` | de app: lijst, editor, preview, export/import |

## Huisstijl: „Hollands Grootboek × Risograph"

Een eigen visuele taal die je nergens anders tegenkomt: warm papier met millimeterraster,
inktblauw en vermiljoen als riso-inkten, ledger-cijfers in monospace, stempels die net
scheef staan. Serieus genoeg voor de Belastingdienst, karaktervol genoeg om je klant te
laten glimlachen.

## Verdienmodel (roadmap)

Het product is zo gebouwd dat er meerdere richtingen open liggen:

1. **Pro-themapakket** — extra factuurthema's + eigen logo-upload als eenmalige aankoop (bijv. € 19)
2. **Template-verkoop** — de broncode als white-label pakket voor webbureaus die het
   onder eigen merk aan hun klanten geven
3. **Sponsoring/partnerlink** — één integere partner (bijv. een boekhoudkoppeling) op de productpagina
4. **Betaalde uitbreidingen** — urenregistratie, herinneringen, kwartaal-BTW-overzicht

Doordat er geen servers zijn, is elke verkochte euro vrijwel volledig marge.

## Licentie

© 2026. Alle rechten voorbehouden tot een licentie is gekozen.
