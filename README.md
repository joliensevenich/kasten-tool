# Kasten tool

Kasten samenstellen in 3D, met per paneel alle boringen, groeven en uitsparingen, een zaaglijst en een beslaglijst.
Werkt op gsm, tablet en pc, ook offline. Projecten blijven op het toestel; met een projectbestand zet je ze over naar een ander toestel.

## Wat er al in zit (stap 0)

- 20 kasttypes (onderkasten, kolomkasten, bovenkasten), elk aanpasbaar: maten, plint, top of regels, rug (groef, opgeschroefd, geen),
  zichtzijden, opliggende of inliggende fronten, greep / TIP-ON / push-open / houten greeplijst, en een vrije indeling in vakken
  (deuren, lades, open vakken, toestellen met verluchting, klepdeur).
- Per paneel: zaagmaat (= eindmaat), kantenband per kant (1 of 2 mm, aanpasbaar) en een tekening met alle bewerkingen:
  deuvels Ø8 × 35 om de 50,5 mm met schroefgaten ertussen, Clamex bij zichtzijden, rugwandgroef 8,7 × 10, systeemboringen,
  montageplaten (Ø5, 37 mm, 32 mm), scharnierpotten Ø35, greepgaten, ladegeleiders (LEGRABOX, TANDEMBOX, MOVENTO),
  uitsparingen voor plint en greeplijst.
- 3D-weergave van één kast of een heel project, met fronten verbergen of doorzichtig maken en panelen uit elkaar schuiven.
- Zaaglijst en beslag, ook als Excel-bestand.
- Alle constructiematen in *Instellingen*.

## MPR-export voor woodWOP (HOMAG P110)

Per project: *MPR-bestanden (woodWOP)* maakt een zipbestand met per kast een map en per paneel een `.mpr`-programma
(klassiek MPR 4.0-formaat, dat woodWOP 7/8 inleest). Per paneel kun je het programma ook bekijken.

- Ligging: X langs de lengte (nerf), Y dwars, nulpunt linksvoor; zijde A (met de meeste bewerkingen) naar boven.
- Boringen: verticaal (`BohrVert`) en in de kant (`BohrHoriz`); woodWOP kiest de boor op diameter.
- Rugwandgroef: zagen (`Nuten`) of frezen (`Tasche`), in te stellen bij *Instellingen › Machine*.
- Uitsparingen: gefreesd met frees 130; frees 101 en 130 komen uit het programma GERY.mprx.
- De regels komen uit de programma's van de P110 in `voorbeelden/mpr` (14-10-2026): deuvels 30/62 … P−89/P−57 (≤ 130 ertussen),
  schroeven Ø4 (één minder dan deuvels, 45 … P−72), Clamex P-14 als component-macro (Lamello_router / Lamello_4s_45) met een deuvel
  op ±50,5, rugwandgroef hart 23,65 van achter, rijboring 37 van voor en 65 vóór de rug, potten Ø35×14 op 22,5, ophangbeslag Ø10.
- Ligging zoals de P110-programma's: binnenkant boven, voorkant op Y = 0; deuren met de scharnierkant op Y = 0.
- In `voorbeelden/test Kasten tool - hangkast zoals K02` staan testprogramma's. **Controleer alles eerst in de simulatie van woodWOP.**

## Schets inlezen (foto)

In een project: *Schets inlezen (foto)*. Teken per wand een vooraanzicht (perspectief mag) op gewoon papier, niet op schaal,
met de maten erbij en per kast een code of gewone woorden. Het voorbeeldblad met alle codes staat in het venster en in
`voorbeelden/Schets voorbeeld.pdf`. Claude leest de foto; je krijgt eerst een lijst om na te kijken, daarna worden het gewone
kasten die je aanpast zoals altijd (niet goed: ↶ zet alles terug).

Ook ronde kanten (R300 = kwartrond, HR = halfrond, KOP = eilandkop, GOLF/DRUPPEL = vrije vorm, ROPEN = open), eilanden
met kasten rug aan rug (EILAND, de achterkant apart getekend) en verticale verdelingen (|3 of |400|200) worden gelezen.
Een kast die bovenop de onderkasten staat (OP), een tablet (werkblad) op de onderkasten, een boognis (open stuk met een
gebogen opening, kasttype "Boognis") en een losse ronde zuil (ZUIL) worden ook gelezen, en het blad mag
gedraaid zijn. Een kast die niet in de lijst staat, teken je met haar vakken en een naam (bv. "tv-meubel"): de app maakt ze en bewaart
ze als eigen kasttype.

### API-sleutel aanmaken

Het lezen gebeurt met de Claude API van Anthropic. Daarvoor heb je een eigen API-sleutel nodig (los van een Claude-abonnement).

1. **Account maken**: ga naar [console.anthropic.com](https://console.anthropic.com) en maak een account aan met je e-mailadres.
2. **Tegoed opladen**: ga naar *Billing* (of *Plans & Billing*), voeg een betaalkaart toe en laad een klein bedrag op
   (bv. 5 euro). Zonder tegoed werkt de sleutel niet. Een foto lezen kost enkele eurocent.
3. **Sleutel aanmaken**: ga naar *API Keys*, druk op *Create Key* en geef ze een naam (bv. "Kasten tool").
   Je krijgt een lange code die begint met `sk-ant-…`. **Kopieer ze meteen**: je kunt ze achteraf niet meer bekijken
   (kwijt = gewoon een nieuwe maken).
4. **In de app plakken**: open een project › *Schets inlezen (foto)* › plak de code bij *API-sleutel*. De app onthoudt ze
   alleen op dat toestel; op een ander toestel plak je ze opnieuw.

Let op:

- De sleutel is zoals een wachtwoord van je betaalaccount: geef ze aan niemand en zet ze niet in een bericht of op een foto.
  Vertrouw je het niet meer, verwijder ze dan bij *API Keys* en maak een nieuwe.
- Bij *Billing* kun je een maximumbedrag per maand instellen.
- "De API-sleutel klopt niet": de code is niet volledig gekopieerd. "Geen tegoed": er moet nog geld op je account.
- De foto gaat naar Anthropic om gelezen te worden; je hebt dus internet nodig. Sonnet is snel en goedkoop, Opus leest
  moeilijk handschrift beter (keuze in het venster).

## Nog te doen

- Testen van de MPR-bestanden in woodWOP en bijsturen (ligging, boormodus, gereedschap).
- Clamex-macro van de P110 overnemen.
- Te controleren met de documentatie van Blum en Lamello: de maten in de Blum-tabel, de Clamex-maten, de plaats van TIP-ON
  en het boorbeeld van de deuvels bij de scharnierpot.

## Online zetten met GitHub Pages

Zoals de urenapp: maak een aparte repository (bijvoorbeeld `kasten`), upload de inhoud van deze map
(`index.html`, `manifest.webmanifest`, `sw.js`, `logo.png`, `.nojekyll` en de mappen `icons`, `js` en `vendor`)
en zet GitHub Pages aan via *Settings › Pages*. Verhoog bij elke nieuwe versie `VERSION` in `sw.js`.
