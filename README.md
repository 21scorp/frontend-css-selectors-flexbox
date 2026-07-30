# MIJNLIJN — de metrokaart van jouw leven

Elke liefde een lijn. Elke verhuizing een station. Elke reis een overstap.

**MIJNLIJN** verandert jouw levensverhaal in een prachtige metrokaart-poster.
Je vult je momenten in (eerste liefde, op kamers, die ene zomer, je eerste baan),
kiest een stijl, en downloadt een kaart die letterlijk van niemand anders kan zijn —
want hij bestaat alleen van jou.

> Open `index.html` voor de productpagina, of `maak.html` om direct te beginnen.

## Waarom dit werkt

- **Uniek per persoon** — geen twee kaarten zijn hetzelfde; het is een portret in metrokaartvorm
- **Gemaakt om te delen** — poster-, vierkant- (feed) en story-formaat (9:16); op mobiel deel je
  de kaart met één tik via de deelknop rechtstreeks naar Instagram, WhatsApp of Snapchat
- **Het perfecte-cadeau-verhaal** — maak stiekem de kaart van je moeder, oma, beste vriend
  of partner; printen, lijsten, klaar. Kosten: € 0. Kans op tranen: aanzienlijk
- **Privé by design** — geen account, geen servers, geen tracking; alle herinneringen blijven
  in de browser van de maker

## Wat de kaart kan

- **Zeven levenslijnen**: Liefde, Vrienden, Werk & studie, Wonen, Reizen, Avontuur, Familie
- **Snakende tijdlijn**: de jaren slingeren als een echte metrolijn over de poster, met
  concentrische haarspeldbochten zoals op echte vervoerskaarten
- **Stations & overstappen**: een moment op één lijn wordt een halte; een moment op meerdere
  lijnen (verhuisd mét je gezin) wordt automatisch een overstapstation
- **Begin- en eindhalte**: GEBOREN {jaar} en VANDAAG, met gestippelde lijnen richting toekomst
- **Drie thema's**: Middernacht (gloeiend nachtnetwerk), Papier (klassieke kaart), Neon
- **Drie formaten**: poster (liggend), vierkant (Instagram-post), story (9:16)
- **Export**: hoge-resolutie PNG (2×) en SVG (oneindig schaalbaar, voor drukwerk)

## Techniek

Bewust zonder frameworks of dependencies: HTML, CSS en vanilla JavaScript.

| Bestand | Rol |
| --- | --- |
| `index.html` + `css/thuis.css` | productpagina met live gerenderde demo-posters |
| `maak.html` + `css/maak.css` + `js/maak.js` | de studio: momenten invullen, live voorbeeld, export |
| `js/kaart.js` | de metrokaart-renderer (profiel → SVG-poster) |
| `css/stijl.css` | ontwerptokens en gedeelde componenten |

De renderer bouwt de kaart als één SVG-string: tijd-naar-positie-mapping over snakende
rijen, per spoor een eigen haarspeldstraal zodat alle bochten concentrisch nesten,
capsule-stations over meerdere sporen, jaarmarkeringen, legenda en titelblok.
PNG-export gebeurt client-side via canvas op 2× resolutie.

## Huisstijl

Eigen identiteit: „nachtelijk vervoersnetwerk" — diep marineblauw met puntraster,
zeven felle lijnkleuren met gloed, geometrische kapitalen, mono-details en een
eigen roundel-logo. Bestaat nergens anders.

## Verdienmodel (roadmap)

1. **HD-posterdownload** — gratis tot 1350px; drukklare 300-dpi A2-export als kleine aankoop
2. **Print-on-demand** — kaart direct als geprinte poster/canvas laten bezorgen (marge per order)
3. **Cadeaumodus Plus** — extra thema's en een "onthulmoment"-animatie als eenmalige upgrade
4. **Social-first groei** — elke gedeelde kaart draagt het roundel-logo: het product marketeert zichzelf

## Licentie

© 2026. Alle rechten voorbehouden tot een licentie is gekozen.
