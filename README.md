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

## Nog te doen

- Testen van de MPR-bestanden in woodWOP en bijsturen (ligging, boormodus, gereedschap).
- Clamex-macro van de P110 overnemen.
- Te controleren met de documentatie van Blum en Lamello: de maten in de Blum-tabel, de Clamex-maten, de plaats van TIP-ON
  en het boorbeeld van de deuvels bij de scharnierpot.

## Online zetten met GitHub Pages

Zoals de urenapp: maak een aparte repository (bijvoorbeeld `kasten`), upload de inhoud van deze map
(`index.html`, `manifest.webmanifest`, `sw.js`, `logo.png`, `.nojekyll` en de mappen `icons`, `js` en `vendor`)
en zet GitHub Pages aan via *Settings › Pages*. Verhoog bij elke nieuwe versie `VERSION` in `sw.js`.
