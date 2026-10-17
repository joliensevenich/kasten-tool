'use strict';
// Schets inlezen: een foto van een handgetekend vooraanzicht (niet op schaal, maten erbij geschreven) wordt door Claude
// gelezen en omgezet in gewone kasten. Eerst een lijst om na te kijken, dan worden de kasten gemaakt zoals met de hand.

// MARK: - Codes op de schets

const SCHETS_CODES = [
  ['O', 'Onderkast', 'onderkast'],
  ['H', 'Hangkast (bovenkast)', 'hangkast, bovenkast'],
  ['K', 'Kolomkast (hoge kast)', 'kolomkast, hoge kast'],
  ['D1 / D2', '1 of 2 deuren', 'deur, 2 deuren'],
  ['L3', '3 lades', '3 lades'],
  ['L2+1', '2 lades boven, 1 grote onder', '2 lades + 1 grote'],
  ['KL', 'Klepdeur (hangkast)', 'klep'],
  ['OPEN', 'Zonder fronten (open kast)', 'open kast'],
  ['G', 'Greeploos (greeplijst)', 'greeploos'],
  ['SP', 'Spoelbakkast', 'spoelbak'],
  ['KP', 'Kookplaat (met lades)', 'kookplaat'],
  ['OV', 'Oven', 'oven'],
  ['MG', 'Microgolf', 'microgolf'],
  ['KK', 'Koelkast', 'koelkast'],
  ['WM / DK', 'Wasmachine / droogkast', 'wasmachine, droogkast'],
  ['X VW', 'Open ruimte, bv. vaatwasser (geen kast)', 'vaatwasser, vrij'],
  ['P50', 'Paslat van 50 mm', 'paslat 50'],
  ['ZP', 'Zijpaneel (afwerkpaneel) aan de zijkant', 'zijpaneel, afwerkpaneel'],
  ['LP2', '2 legplanken', '2 legplanken'],
  ['|3 / |400|200', 'Vak verticaal verdeeld: 3 gelijke delen, of breedtes 400 en 200', 'in 3 verdeeld'],
  ['R300', 'Ronde kant, kwartrond met straal 300 (aan de kant waar hij getekend is)', 'kwartrond 300, rond'],
  ['HR', 'Halfrond over de hele diepte', 'halfrond'],
  ['KOP', 'Ronde kop van een eiland (kasten rug aan rug)', 'eilandkop, ronde kop'],
  ['GOLF / DRUPPEL', 'Vrije vorm (golf, druppel, S-bocht, ellips) met de uitsteek erbij', 'golf 300, druppel'],
  ['ROPEN', 'Ronde kant open, met ronde legplanken', 'open rond'],
  ['ZUIL', 'Losse ronde zuil (breedte en hoogte erbij)', 'ronde zuil'],
  ['OP', 'Kast staat op de onderkasten (niet aan de muur)', 'staat op de onderkasten'],
];

// Gangbare korpusmaten als de schets en het project niets zeggen.
const SCHETS_STANDAARD = { onder: { hoogte: 720, diepte: 560 }, kolom: { hoogte: 2100, diepte: 560 }, hang: { hoogte: 700, diepte: 350 } };

const TOESTEL_NIS = { Oven: 590, Microgolf: 450, Koelkast: 1780, Wasmachine: 870, Droogkast: 870, Toestel: 590 };

// Leesopdracht voor Claude. Het antwoord komt via een tool met een vast schema (SCHETS_SCHEMA), dus altijd geldige JSON.
const SCHETS_PROMPT = `Je leest een handgetekende schets van keukenkasten of kasten en zet ze om in kasten voor een tekenprogramma.

HOE DE SCHETS GETEKEND IS
- Het blad kan GEDRAAID zijn (bv. een kwartslag, de tekening dwars op het blad): bepaal eerst hoe het blad gedraaid
  is aan de hand van de schrijfrichting van de getallen en waar de vloer is (de langste rij onderkasten staat op de vloer),
  en lees alles alsof het rechtop staat. Zeg in "opmerkingen" hoe je het gedraaid hebt.
- Ruitjespapier: de ruitjes zeggen niets over de maten.
- Per wand een vooraanzicht van links naar rechts, vaak in perspectief: je ziet dan ook bovenkanten, zijkanten en diepte.
  De zijkanten in perspectief zijn GEEN aparte kasten. Breedtes en indeling lees je op de voorkanten.
- NIET op schaal: een geschreven maat gaat altijd voor op de getekende grootte. Maten in mm; "60" of "60 cm" = 600 mm,
  "2,1 m" = 2100 mm.
- Waar GEEN maat staat (breedte van een kast in een rij, hoogte van een boog, een vak): schat ze uit de VERHOUDINGEN van
  de tekening ten opzichte van de maten die er wel staan (bv. een kast die half zo breed getekend is als een stuk van
  1500 ≈ 750), zodat het resultaat in verhouding is met de schets; rond af op 10 mm en zet in "onzeker" dat het geschat is.
  Kasten die even groot getekend zijn, krijgen dezelfde maat; breedtes in een rij tellen op tot de totaalmaat. Een getal onder of boven een kast is zijn breedte; een maatlijn aan de zijkant is een hoogte; een maat
  langs een schuine (wijkende) lijn is de diepte.
- Hoogte en diepte staan vaak maar één keer per rij: laat ze dan leeg bij de andere kasten van die rij.
- Een totaalmaat over de hele wand (bv. "3200" over alles): zet die in "totaal" en controleer dat de breedtes optellen.
  Klopt het niet, zeg het in "opmerkingen" en kies de lezing die wel optelt als je een cijfer twijfelachtig vond.

CODES (codes en gewone woorden door elkaar mogelijk)
${SCHETS_CODES.map(([c, n, w]) => `- ${c}: ${n} (in woorden: ${w})`).join('\n')}
- Vak met een kruis (X) of "vrij": open ruimte zonder kast (soort "leeg"), bv. vaatwasser of dampkap.
- Smal vakje met P en een getal: paslat (soort "paslat", breedte = het getal).
- Een vak in een kast met een streep ertussen = een volgend vak (van boven naar onder), met zijn eigen code.

ZIJPANELEN
- Een dik getekende of gearceerde zijkant, "ZP", of een paneel naast een kast tot de vloer of het werkblad: zijpaneel.

KAST OP DE ONDERKASTEN
- Een kast die bovenop de onderkasten staat (niet aan de muur hangt, de onderkant rust op de onderrij): rij "boven",
  "staatOp": true, soort "kolom" als ze hoog is (deuren over een grote hoogte) anders "hang". Haar hoogte = van de
  bovenkant van de onderkasten tot haar bovenkant (een totale hoogte van de vloer min de hoogte van de onderrij).

VRAGEN AAN DE GEBRUIKER
- Doel: het resultaat moet voor 99 % kloppen. Twijfel je over iets dat echt verschil maakt (wat een element is, hoe het
  blad gedraaid is, of iets op de onderkasten staat of hangt, een ronde kant, een tablet, een ontbrekende maat die je niet
  goed kunt schatten, aantal lades, de vorm van een boog ...), stel er dan een vraag over in "vragen" (hoogstens 6, de
  belangrijkste eerst). Elke vraag: kort en concreet, met 2 tot 4 "opties" (korte antwoorden, je beste gok eerst) en in
  "waarom" wat er van afhangt. Vul de kasten intussen in met je beste gok. Geen vragen als alles duidelijk is.

BOOGNIS (open stuk met een gebogen opening)
- Een open stuk (vaak naast een kast, op de onderkasten) waarvan de opening recht is langs de zijkanten en onderaan en
  bovenaan één grote boog heeft (een gebogen lijn binnen een rechthoek): soort "nis", met "boog": "links" = hoogte waar
  de boog de linkerkant raakt, "rechts" = idem rechts, "top" = hoogste punt van de boog (allemaal vanaf de onderkant van
  de nis), "piek" = plaats van het hoogste punt in % van de breedte vanaf links. Schat die uit de tekening als er geen
  maten staan (de schets is niet op schaal: zeg het in "onzeker"). Een "zuil" of "opening" met een boog is meestal dit.

TABLET / WERKBLAD
- Een blad over de onderkasten (dikke band bovenop de onderrij, vaak met dezelfde ronde uiteinden): zet bij de wand
  "werkblad": {"dikte": getal of null, "overstek": getal of null}. Kasten die op de onderkasten staan, staan op dit blad.

RONDE ZUIL
- Een losstaande ronde zuil (een grote boog of cilinder, "zuil", "kolom rond") naast een kast: een eigen element met
  soort "zuil", "breedte" = de breedte van de zuil, "hoogte", en "rond" met vorm "half" (rond aan beide kanten, zoals een
  cilinder of afgeronde zuil) of "vrij" (een organische bolling, met "uitsteek"); "rond.uitvoering": "open" als er
  legplanken in getekend zijn. Staat de zuil op de onderkasten: rij "boven" en "staatOp": true.

RONDE OMKASTINGEN (ronde kanten)
- Een afgeronde hoek of zijkant naast een kast (in perspectief: een boog op de bovenkant en de onderkant, of gebogen
  arcering), "R300", "r=300", "rond", "kwartrond", "halfrond", "ronde kop": zet "rond" bij de kast waaraan hij vastzit.
- vorm "kwart": een kwartcirkel op de voorhoek (boog van de voorkant naar de zijkant), daarachter recht tot de muur.
  "radius" = de straal (R300 → 300). Een recht stuk vooraan vóór de boog: "breedte" = totale breedte van de ronde kant.
- vorm "half": een halve cirkel over de hele diepte (van voor naar achter), bv. aan het einde van een vrijstaande kast.
- vorm "kop2": de ronde kop van een eiland met kasten rug aan rug (de halve cirkel loopt over beide kasten); "radius" als
  er een maat staat, anders leeg. Zet dan de wand op "eiland": true (zie hieronder).
- vorm "vrij": een organische vorm (golf, druppel, S-bocht, ellips): "vrijVorm" en "uitsteek" (hoe ver hij uitsteekt).
- "uitvoering": "open" als er legplanken in de ronde kant getekend zijn (open ronde vakken, "open rond"), anders "dicht".
- "kant": "links" of "rechts" van die kast; "beide" als beide kanten rond zijn.
- Een rij met een ronde afwerking links en rechts: de eerste kast van de rij krijgt "rond" links, de laatste "rond" rechts
  (één kast alleen: "beide"). Een maat zoals 300 bij een afgeronde hoek is de radius.
- Een totaalmaat over een rij met ronde uiteinden is inclusief de ronde stukken (kwartrond: de radius per kant).

EILAND
- Een vrijstaand blok (geen muur erachter, of het woord EILAND), vaak met kasten aan beide kanten (rug aan rug): "eiland": true.
  De achterkant is dan meestal apart getekend (eronder of ernaast).
  "kasten" = de kasten aan de voorkant (van links naar rechts zoals getekend), "achterzijde" = de kasten aan de andere kant,
  ook van links naar rechts zoals je ze VANAF DE VOORKANT ziet (dus de kast achter de linkse voorkast eerst).

RIJEN
- "rij": "onder" = op de vloer (onderkasten en kolomkasten), "boven" = hangkasten.
- In de bovenrij is "x" het begin vanaf de linkerkant van de wand in mm, afgeleid uit de maten van de onderrij
  (een hangkast boven een onderkast begint op dezelfde x). Kolomkasten staan in de rij "onder".

INDELING
- Elke combinatie van vakken mag: een kast die niet in de codes past (tv-meubel, dressoir, boekenkast, nis met lades
  ...) beschrijf je gewoon met haar vakken van boven naar onder. Geef zo'n kast een korte naam in "nieuwType"
  (bv. "TV-meubel met 2 lades"); een gewone onder-, hang- of kolomkast krijgt geen nieuwType.
- Verticale verdeling in een vak (staande schotten/middenstijlen): "kolommen" = aantal gelijke delen, of "kolomBreedtes"
  = de geschreven breedtes van links naar rechts (bv. 400 en 200). "vasteLegplanken" = aantal vaste (niet verstelbare)
  legplanken als die zo aangeduid zijn; gewone legplanken in "legplanken".
- Een onderkast zonder info: één vak "deur". L2+1 = vak lade aantal 2 en daaronder vak lade aantal 1.
  Kookplaat (KP) zonder verdere info: 2 lades. Spoelbak (SP): vak deur en "spoelbak": true.
- Vul "tekst" met wat er letterlijk bij de kast staat, en "onzeker" met wat je niet zeker kon lezen (anders leeg).`;

// Antwoordvorm in tekst: eerst kort nadenken, dan de JSON (zo leest Claude de schets nauwkeuriger dan met een verplichte tool).
const SCHETS_VORM = `
ANTWOORD
1. Schrijf eerst kort tussen <analyse> en </analyse> wat je ziet: per wand de rijen van links naar rechts met de geschreven
   maten en codes, ronde kanten, zijpanelen, eiland, en of de breedtes optellen tot een totaalmaat.
2. Geef daarna de kasten als JSON in een blok \`\`\`json ... \`\`\`, in deze vorm (velden die je niet weet: null of weglaten):
{"wanden":[{"naam":"Wand 1","eiland":false,"totaal":null,"werkblad":null,
  "kasten":[{"rij":"onder","soort":"onder","x":0,"breedte":600,"hoogte":720,"diepte":560,
    "vakken":[{"type":"lade","aantal":3}],"open":false,"greeploos":false,"spoelbak":false,"zijpaneelLinks":false,"zijpaneelRechts":false,
    "rond":{"kant":"links","vorm":"kwart","radius":300,"breedte":null,"uitvoering":"dicht","legplanken":null,"vrijVorm":null,"uitsteek":null},
    "nieuwType":null,"tekst":"O L3 R300","onzeker":null}],
  "achterzijde":[]}],
 "plintHoogte":null,"bovenOnderkant":null,"hoogteTotVloer":false,"opmerkingen":[],
 "vragen":[{"vraag":"Staat de kast met deuren op de onderkasten of hangt ze aan de muur?","opties":["Op de onderkasten","Aan de muur"],"waarom":"bepaalt de hoogte en de plint"}]}
Vakken: {"type":"deur","deuren":2,"legplanken":1}, {"type":"lade","aantal":3}, {"type":"klep"}, {"type":"open","legplanken":2},
{"type":"toestel","naam":"Oven","nis":590}; verticaal verdeeld: "kolommen":3 of "kolomBreedtes":[400,200]; "vasteLegplanken":1.
"soort": onder | hang | kolom | leeg | paslat | zuil | nis (met "boog":{"links":..,"rechts":..,"top":..,"piek":..}).
"werkblad" bij de wand: {"dikte":38,"overstek":20} als er een tablet/blad op de onderkasten ligt. "rij": onder | boven. "staatOp": true = staat op de onderkasten. "rond" = null als er geen ronde kant is.
vorm: kwart | half | kop2 | vrij; vrijVorm: ellips | golf | druppel | s.`;

const SCHETS_ITEM = {
  type: 'object',
  properties: {
    rij: { type: 'string', enum: ['onder', 'boven'] },
    soort: { type: 'string', enum: ['onder', 'hang', 'kolom', 'leeg', 'paslat', 'zuil', 'nis'] },
    boog: { type: ['object', 'null'], properties: { links: { type: ['number', 'null'] }, rechts: { type: ['number', 'null'] }, top: { type: ['number', 'null'] }, piek: { type: ['number', 'null'] } } },
    staatOp: { type: 'boolean' },
    x: { type: ['number', 'null'] },
    breedte: { type: ['number', 'null'] }, hoogte: { type: ['number', 'null'] }, diepte: { type: ['number', 'null'] },
    vakken: { type: 'array', items: { type: 'object', properties: {
      type: { type: 'string', enum: ['deur', 'lade', 'klep', 'open', 'toestel'] },
      deuren: { type: ['number', 'null'] }, aantal: { type: ['number', 'null'] }, legplanken: { type: ['number', 'null'] },
      naam: { type: ['string', 'null'], enum: ['Oven', 'Microgolf', 'Koelkast', 'Wasmachine', 'Droogkast', 'Toestel', null] },
      nis: { type: ['number', 'null'] }, hoogte: { type: ['number', 'null'] },
      kolommen: { type: ['number', 'null'] }, kolomBreedtes: { type: ['array', 'null'], items: { type: 'number' } }, vasteLegplanken: { type: ['number', 'null'] } }, required: ['type'] } },
    open: { type: 'boolean' }, greeploos: { type: 'boolean' }, spoelbak: { type: 'boolean' },
    zijpaneelLinks: { type: 'boolean' }, zijpaneelRechts: { type: 'boolean' },
    rond: { type: ['object', 'null'], properties: {
      kant: { type: 'string', enum: ['links', 'rechts', 'beide'] },
      vorm: { type: 'string', enum: ['kwart', 'half', 'kop2', 'vrij'] },
      radius: { type: ['number', 'null'] }, breedte: { type: ['number', 'null'] },
      uitvoering: { type: 'string', enum: ['dicht', 'open'] }, legplanken: { type: ['number', 'null'] },
      vrijVorm: { type: ['string', 'null'], enum: ['ellips', 'golf', 'druppel', 's', null] }, uitsteek: { type: ['number', 'null'] } },
      required: ['kant', 'vorm'] },
    nieuwType: { type: ['string', 'null'] },
    tekst: { type: ['string', 'null'] }, onzeker: { type: ['string', 'null'] },
  },
  required: ['rij', 'soort'],
};
const SCHETS_SCHEMA = {
  type: 'object',
  properties: {
    wanden: { type: 'array', items: { type: 'object', properties: {
      naam: { type: 'string' }, eiland: { type: 'boolean' }, totaal: { type: ['number', 'null'] },
      werkblad: { type: ['object', 'null'], properties: { dikte: { type: ['number', 'null'] }, overstek: { type: ['number', 'null'] } } },
      kasten: { type: 'array', items: SCHETS_ITEM }, achterzijde: { type: 'array', items: SCHETS_ITEM } }, required: ['kasten'] } },
    plintHoogte: { type: ['number', 'null'] }, bovenOnderkant: { type: ['number', 'null'] }, hoogteTotVloer: { type: 'boolean' },
    opmerkingen: { type: 'array', items: { type: 'string' } },
    vragen: { type: 'array', items: { type: 'object', properties: { vraag: { type: 'string' }, opties: { type: 'array', items: { type: 'string' } }, waarom: { type: ['string', 'null'] } }, required: ['vraag'] } },
  },
  required: ['wanden'],
};

// MARK: - Voorbeeldblad (PDF)

function schetsVoorbeeldPdf() {
  const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ink = () => doc.setDrawColor(20, 40, 110), txt = () => doc.setTextColor(20, 40, 110);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Schets voor de Kasten tool: voorbeeld', 15, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(60);
  doc.text(doc.splitTextToSize('Teken per wand een vooraanzicht van links naar rechts, op gewoon papier. Niet op schaal: de app gebruikt alleen de maten die je erbij schrijft. '
    + 'Zet in elke kast een code (of gewone woorden) en de breedte eronder. Hoogte één keer per rij aan de zijkant, diepte één keer per rij. '
    + 'In perspectief tekenen mag: dan ziet de app ook zijpanelen (ZP), ronde kanten (R300, HR, KOP) en de diepte langs de schuine lijn. '
    + 'Een kast die niet in de lijst staat, teken je gewoon met haar vakken: de app maakt er een nieuwe kast (en een eigen kasttype) van. '
    + 'Neem de foto recht van boven, met goed licht, het hele blad in beeld.', 180), 15, 25);

  // Voorbeeldtekening (bewust niet op schaal)
  ink(); txt(); doc.setLineWidth(0.5);
  const y0 = 142, bx = 24;                    // vloerlijn onderkasten (bovenkant plint)
  const onder = [['O L3', 600, 28], ['O D2 SP', 800, 34], ['X VW', 600, 22], ['O KP', 900, 36], ['P50', 50, 6]];
  let x = bx;
  const hO = 30;
  doc.setFontSize(10);
  for (const [code, w, pw] of onder) {
    if (code.startsWith('X')) { doc.setLineDashPattern([1.5, 1.2], 0); doc.rect(x, y0 - hO, pw, hO); doc.line(x, y0 - hO, x + pw, y0); doc.line(x + pw, y0 - hO, x, y0); doc.setLineDashPattern([], 0); }
    else doc.rect(x, y0 - hO, pw, hO);
    if (code === 'O L3') for (let i = 1; i < 3; i++) doc.line(x, y0 - hO + i * hO / 3, x + pw, y0 - hO + i * hO / 3);
    if (code === 'O KP') doc.line(x, y0 - hO / 2, x + pw, y0 - hO / 2);
    doc.setFont('helvetica', 'bold');
    if (code === 'P50') doc.text('P', x + pw / 2, y0 - hO / 2, { align: 'center' });
    else {
      // label in een vrij stuk: bovenste lade / bovenste helft, met witte achtergrond (ook over het kruis)
      const ty = code === 'O L3' ? y0 - hO + hO / 6 + 1.3 : code === 'O KP' ? y0 - hO + hO / 4 + 1.3 : y0 - hO / 2 + 1.3;
      const tw = doc.getTextWidth(code) + 2;
      doc.setFillColor(255, 255, 255); doc.rect(x + pw / 2 - tw / 2, ty - 3.6, tw, 4.8, 'F');
      doc.text(code, x + pw / 2, ty, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(String(w), x + pw / 2, y0 + 6, { align: 'center' });
    x += pw;
  }
  // kolomkast rechts
  const kw = 26, kh = 82;
  doc.rect(x, y0 - kh, kw, kh); doc.line(x, y0 - 56, x + kw, y0 - 56); doc.line(x, y0 - 40, x + kw, y0 - 40);
  doc.setFont('helvetica', 'bold'); doc.text('K', x + kw / 2, y0 - 68, { align: 'center' }); doc.text('OV', x + kw / 2, y0 - 47, { align: 'center' }); doc.text('MG', x + kw / 2, y0 - 30, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.text('600', x + kw / 2, y0 + 6, { align: 'center' });
  const xEnd = x + kw;
  // hangkasten boven (met een gat boven de kookplaat)
  const yh = y0 - hO - 18, hh = 24;
  const boven = [['H D1', 600, 28], ['H D2', 800, 34], ['H KL', 600, 22]];
  x = bx;
  for (const [code, w, pw] of boven) {
    doc.rect(x, yh - hh, pw, hh);
    doc.setFont('helvetica', 'bold'); doc.text(code, x + pw / 2, yh - hh / 2 + 1, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text(String(w), x + pw / 2, yh + 4.5, { align: 'center' });
    x += pw;
  }
  doc.setFontSize(8); doc.text(['(dampkap:', 'geen kast)'], x + 13, yh - hh / 2, { align: 'center' });
  doc.setFontSize(10);
  doc.rect(x + 26, yh - hh, 14, hh); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(['H', 'OPEN'], x + 33, yh - hh / 2 - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('400', x + 33, yh + 4.5, { align: 'center' });
  // Perspectief: bovenvlak van de onderkasten, zijkant van de kolomkast, zijpaneel links (ZP).
  const ox = 9, oy = -6;
  doc.line(bx, y0 - hO, bx + ox, y0 - hO + oy);
  doc.line(bx + ox, y0 - hO + oy, xEnd - kw, y0 - hO + oy);
  doc.line(xEnd, y0, xEnd + ox, y0 + oy); doc.line(xEnd, y0 - kh, xEnd + ox, y0 - kh + oy); doc.line(xEnd + ox, y0 + oy, xEnd + ox, y0 - kh + oy);
  doc.line(xEnd - kw, y0 - kh, xEnd - kw + ox, y0 - kh + oy); doc.line(xEnd - kw + ox, y0 - kh + oy, xEnd + ox, y0 - kh + oy);
  doc.setFontSize(8.5); doc.text('560', xEnd + ox / 2 + 1.5, y0 + oy / 2 + 3.5, { angle: Math.atan2(-oy, ox) * 180 / Math.PI });
  // zijpaneel: dik, gearceerd, tot de vloer
  const zx = bx - 3;
  doc.rect(zx, y0 - hO, 3, hO + 8);
  for (let yy = y0 - hO + 2; yy < y0 + 8; yy += 2.5) doc.line(zx, yy, zx + 3, yy - 2);
  doc.line(zx, y0 - hO, zx + ox, y0 - hO + oy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('ZP', zx - 1, y0 - hO - 2, { align: 'right' }); doc.setFont('helvetica', 'normal');
  // Ronde kant links aan de hangkasten (kwartrond R300): boog op de boven- en onderkant, gebogen arcering.
  for (const yy of [yh - hh, yh]) doc.lines([[-5, 0, -6.5, oy * 0.45, -6.5 + ox * 0.35, oy]], bx, yy, [1, 1], 'S');
  doc.line(bx - 5.6, yh - hh + oy * 0.3, bx - 5.6, yh + oy * 0.3);
  for (const dx of [1.6, 3.2, 4.5]) doc.line(bx - dx, yh - hh + 0.4 + oy * 0.08 * dx, bx - dx, yh - 0.4 + oy * 0.08 * dx);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('R300', bx - 7.5, yh - hh - 3, { align: 'right' }); doc.setFont('helvetica', 'normal');
  // maatlijnen hoogte
  const dim = (xx, ya, yb, label) => { doc.line(xx, ya, xx, yb); doc.line(xx - 1.5, ya, xx + 1.5, ya); doc.line(xx - 1.5, yb, xx + 1.5, yb); doc.text(label, xx - 2, (ya + yb) / 2, { angle: 90, align: 'center' }); };
  dim(bx - 9, y0, y0 - hO, '720');
  dim(bx - 13, yh, yh - hh, '700');
  dim(xEnd + ox + 6, y0 + oy, y0 - kh + oy, '2100');
  doc.line(bx - 12, y0 + 9, xEnd + 16, y0 + 9);
  doc.setFontSize(9); doc.text('vloer', xEnd + 12, y0 + 12, { align: 'right' });
  doc.text('plint 100   ·   diepte onder 560   ·   diepte boven 350   ·   onderkant hangkasten 1400', bx, y0 + 17);
  doc.setTextColor(120); doc.setFontSize(8);
  doc.text('Getekend zonder schaal: de 50 mm paslat mag even breed lijken als een kast, de breedte staat eronder.', bx, y0 + 22);

  // Codelijst
  // Voorbeeld 2: eiland met ronde kop (voorkant en achterzijde apart getekend, de kop als halve cirkel).
  {
    ink(); txt(); doc.setLineWidth(0.5); doc.setFontSize(10);
    const ey = 205, ex = 40, eh = 24;
    doc.setFont('helvetica', 'bold'); doc.text('EILAND', 15, ey - eh - 8); doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5); doc.text('voorkant', ex + 40, ey - eh - 3, { align: 'center' }); doc.text('achterzijde (zoals je ze vanaf de voorkant ziet)', ex + 120, ey - eh - 3, { align: 'center' }); doc.setFontSize(10);
    const rij = (x0, items) => { let x = x0; for (const [code, w, pw] of items) { doc.rect(x, ey - eh, pw, eh); doc.setFont('helvetica', 'bold'); doc.text(code, x + pw / 2, ey - eh / 2 + 1, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.text(String(w), x + pw / 2, ey + 4.5, { align: 'center' }); x += pw; } };
    // ronde kop links aan de voorkant: halve boog op boven- en onderkant
    for (const yy of [ey - eh, ey]) doc.lines([[-6, 0, -9, -3, -9, -6]], ex, yy, [1, 1], 'S');
    doc.line(ex - 8.6, ey - eh - 4, ex - 8.6, ey - 4);
    for (const dx of [2, 4, 6]) doc.line(ex - dx, ey - eh + 0.5 - dx * 0.25, ex - dx, ey - 0.5 - dx * 0.25);
    doc.setFont('helvetica', 'bold'); doc.text('KOP', ex - 11, ey - eh / 2, { align: 'right' }); doc.setFont('helvetica', 'normal');
    rij(ex, [['O L3', 600, 30], ['O D2', 800, 40]]);
    rij(ex + 85, [['O OPEN', 600, 30], ['O D2', 800, 40]]);
    doc.setFontSize(8.5); doc.text('diepte 600 · hoogte 720', ex, ey + 11);
  }
  // Voorbeeld 3: een nieuwe kast (niet in de lijst): vakken tekenen en een naam erbij.
  {
    ink(); txt(); doc.setLineWidth(0.5); doc.setFontSize(10);
    const ty = 262, tx = 40, tw = 70, th = 30;
    doc.setFont('helvetica', 'bold'); doc.text('NIEUWE KAST', 15, ty - th - 8); doc.setFont('helvetica', 'normal');
    doc.rect(tx, ty - th, tw, th); doc.line(tx, ty - th / 2, tx + tw, ty - th / 2); doc.line(tx, ty - th / 4, tx + tw, ty - th / 4);
    for (let i = 1; i < 3; i++) doc.line(tx + i * tw / 3, ty - th, tx + i * tw / 3, ty - th / 2);
    doc.setFont('helvetica', 'bold'); doc.text('open |3', tx + tw / 2, ty - th - 2, { align: 'center' }); doc.text('L2', tx + tw + 3, ty - th / 4 + 1);
    doc.setFont('helvetica', 'normal'); doc.text('1200', tx + tw / 2, ty + 4.5, { align: 'center' });
    dim(tx - 6, ty, ty - th, '500');
    doc.setFont('helvetica', 'bold'); doc.text('"tv-meubel"', tx + tw + 14, ty - th / 2); doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5); doc.text(doc.splitTextToSize('De app maakt deze kast met 3 open vakken boven en 2 lades onder, en bewaart ze als eigen kasttype "tv-meubel".', 66), tx + tw + 14, ty - th / 2 + 6);
  }

  // Codelijst op een tweede blad (de lijst is te lang voor onder de tekening).
  doc.addPage();
  let y = 20;
  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Codes (of schrijf gewone woorden)', 15, y);
  y += 6; doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold'); doc.text('Code', 15, y); doc.text('Betekenis', 48, y); doc.text('In woorden mag ook', 128, y);
  doc.setLineWidth(0.2); doc.setDrawColor(150); doc.line(15, y + 1.5, 195, y + 1.5);
  doc.setFont('helvetica', 'normal');
  for (const [c, n, w] of SCHETS_CODES) {
    y += 5.6; doc.setFont('helvetica', 'bold'); doc.text(c, 15, y); doc.setFont('helvetica', 'normal');
    const nl = doc.splitTextToSize(n, 76); doc.text(nl, 48, y); doc.setTextColor(90); doc.text(w, 128, y); doc.setTextColor(0);
    y += (nl.length - 1) * 4.2;
  }
  y += 10;
  doc.setFont('helvetica', 'bold'); doc.text('Combineren:', 15, y); doc.setFont('helvetica', 'normal');
  const uitleg = [
    'Ronde kant: zet R300 (kwartrond, straal 300), HR (halfrond) of KOP (eilandkop) aan de kant waar hij zit; ROPEN = open met ronde legplanken. Een vrije vorm: GOLF 300 / DRUPPEL 250 (uitsteek).',
    'Eiland met kasten rug aan rug: schrijf EILAND erbij en teken de achterkant eronder (van links naar rechts zoals je ze vanaf de voorkant ziet).',
    'Het blad mag gedraaid zijn (de tekening dwars): de app zoekt zelf waar de vloer is.',
    'Nieuwe kast: teken de vakken (bv. open vak |3 boven, 2 lades onder) en schrijf er een naam bij, bv. "tv-meubel".','O L3 = onderkast met 3 lades  ·  K OV MG = kolomkast met oven en microgolf  ·  H D2 G = hangkast met 2 deuren, greeploos.',
    'In woorden bv.: "onderkast 3 lades 600", "hoge kast oven + microgolf", "open bovenkast 2 legplanken".',
    'De vakken van een hoge kast teken je van boven naar onder met een streep ertussen, met de code in elk vak.'];
  for (const u of uitleg) for (const l of doc.splitTextToSize(u, 147)) { doc.text(l, 48, y); y += 4.6; }
  return { blob: doc.output('blob'), name: 'Schets voorbeeld.pdf' };
}

// MARK: - Foto lezen met Claude

const SCHETS_KEY = 'kasten.claudeKey', SCHETS_MODEL = 'kasten.claudeModel';
const schetsGet = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const schetsSet = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* geen opslag */ } };

/** Foto verkleinen (lange zijde max 1800 px) en als JPEG base64 teruggeven. */
async function schetsImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('De foto kan niet geopend worden.')); i.src = url; });
    const sc = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    return { dataUrl, base64: dataUrl.split(',')[1] };
  } finally { URL.revokeObjectURL(url); }
}

/** Antwoord van Claude opschonen: velden die als JSON-tekst terugkomen (bv. "wanden": "[...]") alsnog omzetten. */
function schetsNormaal(x) {
  if (typeof x === 'string') {
    const t = x.trim();
    if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) { try { return schetsNormaal(JSON.parse(t)); } catch { return x; } }
    return x;
  }
  if (Array.isArray(x)) return x.map(schetsNormaal);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, schetsNormaal(v)]));
  return x;
}
/** JSON herstellen: commentaar, komma's voor } of ], typografische aanhalingstekens, en een afgebroken einde afsluiten. */
function schetsJsonHerstel(t) {
  let x = t.replace(/[\u201C\u201D\u201E]/g, '"').replace(/[\u2018\u2019]/g, "'")
    .replace(/\/\/[^\n"]*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/,\s*([}\]])/g, '$1');
  // Afgebroken (te lang antwoord): open strings, objecten en lijsten sluiten.
  const stack = []; let inStr = false, esc = false;
  for (const ch of x) {
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{' || ch === '[') stack.push(ch); else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inStr) x += '"';
  x = x.replace(/,\s*$/, '');
  while (stack.length) x += stack.pop() === '{' ? '}' : ']';
  return x.replace(/,\s*([}\]])/g, '$1');
}
/** JSON uit een tekstantwoord: het ```json-blok, anders van de eerste { tot de laatste }; zo nodig hersteld. */
function schetsJsonUitTekst(text) {
  const blok = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const kand = [blok?.[1], (() => { const a = text.indexOf('{', text.indexOf('</analyse>') + 1), b = text.lastIndexOf('}'); return a >= 0 && b > a ? text.slice(a, b + 1) : null; })(),
    (() => { const a = text.indexOf('{'), b = text.lastIndexOf('}'); return a >= 0 && b > a ? text.slice(a, b + 1) : null; })()].filter(Boolean);
  // Een antwoord dat een lijst is ([...]).
  { const a = text.indexOf('['), b = text.lastIndexOf(']'); if (a >= 0 && b > a && (text.indexOf('{') < 0 || a < text.indexOf('{'))) kand.unshift(text.slice(a, b + 1)); }
  // Ook een open ```json-blok zonder sluiting (afgebroken antwoord).
  const open = text.match(/```(?:json)?\s*([\s\S]*)$/i)?.[1];
  if (open) kand.push(open);
  for (const k of kand) { try { return JSON.parse(k); } catch { /* volgende */ } }
  for (const k of kand) { try { return JSON.parse(schetsJsonHerstel(k)); } catch { /* volgende */ } }
  return null;
}
const schetsHeeftKasten = d => Array.isArray(d?.wanden) && d.wanden.some(w => Array.isArray(w?.kasten) && w.kasten.length);
/** Andere vormen van het antwoord omzetten naar { wanden: [...] } (een lijst kasten, een lijst wanden, één wand). */
function schetsVorm(d) {
  if (!d) return d;
  if (Array.isArray(d)) d = d.length && Array.isArray(d[0]?.kasten) ? { wanden: d } : { wanden: [{ naam: 'Wand 1', kasten: d }] };
  if (!Array.isArray(d.wanden)) {
    if (Array.isArray(d.kasten)) d = { ...d, wanden: [{ naam: d.naam || 'Wand 1', kasten: d.kasten, werkblad: d.werkblad, totaal: d.totaal, eiland: d.eiland, achterzijde: d.achterzijde }] };
    else if (d.wand && Array.isArray(d.wand.kasten)) d = { ...d, wanden: [d.wand] };
  }
  return d;
}
/** Ontbrekende velden aanvullen, zodat de controlelijst en het maken nooit vastlopen. */
function schetsSchoon(d) {
  d.opmerkingen = Array.isArray(d.opmerkingen) ? d.opmerkingen.map(String) : [];
  d.vragen = (Array.isArray(d.vragen) ? d.vragen : []).filter(q => q && q.vraag).slice(0, 6)
    .map(q => ({ vraag: String(q.vraag), opties: (Array.isArray(q.opties) ? q.opties : []).map(String).slice(0, 4), waarom: q.waarom ? String(q.waarom) : '' }));
  for (const w of d.wanden) for (const lijst of ['kasten', 'achterzijde']) {
    w[lijst] = (Array.isArray(w[lijst]) ? w[lijst] : []).filter(it => it && typeof it === 'object');
    for (const it of w[lijst]) {
      if (!['onder', 'hang', 'kolom', 'leeg', 'paslat', 'zuil', 'nis'].includes(it.soort)) it.soort = it.rij === 'boven' ? 'hang' : 'onder';
      if (it.rij !== 'boven' && it.rij !== 'onder') it.rij = it.soort === 'hang' ? 'boven' : 'onder';
      it.vakken = (Array.isArray(it.vakken) ? it.vakken : []).filter(v => v && typeof v === 'object' && v.type);
      if (it.rond && !(it.rond.kant && it.rond.vorm)) it.rond = null;
    }
  }
  return d;
}

async function schetsVraag(key, payload) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = body?.error?.message || `HTTP ${r.status}`;
    throw new Error(r.status === 401 ? 'De API-sleutel klopt niet.' : r.status === 429 ? 'Te veel aanvragen of geen tegoed meer op je API-account.'
      : r.status === 529 || r.status === 503 ? 'De dienst van Anthropic is even overbelast; probeer het over een minuut opnieuw.' : `${msg} (fout ${r.status})`);
  }
  return body;
}

/**
 * Schets lezen. vorige = { data, antwoorden: [{ vraag, antwoord }] }: de eerste lezing en de antwoorden van de gebruiker op
 * de vragen; Claude past de lezing dan aan (en stelt alleen nog vragen als iets echt onduidelijk blijft).
 */
async function schetsLezen(base64, key, model, vorige = null) {
  const beeld = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } };
  schetsLezen.laatsteAntwoord = '';
  const vraagTekst = vorige ? `Lees deze schets. Je eerste lezing was:\n${JSON.stringify({ ...vorige.data, vragen: undefined })}\n\n`
    + `De gebruiker beantwoordde je vragen:\n${vorige.antwoorden.map((a, i) => `${i + 1}. ${a.vraag} → ${a.antwoord}`).join('\n')}\n\n`
    + 'Pas de lezing aan met die antwoorden (ze gaan voor op je eerste gok) en geef de volledige JSON opnieuw in dezelfde vorm. '
    + 'Stel alleen nog vragen over iets dat echt onduidelijk blijft en nog niet gevraagd is; anders "vragen": [].' : 'Lees deze schets.';
  // 1. Tekst: eerst een korte analyse, dan de JSON.
  let fout = null;
  try {
    const body = await schetsVraag(key, { model, max_tokens: 16000, system: SCHETS_PROMPT + SCHETS_VORM,
      messages: [{ role: 'user', content: [beeld, { type: 'text', text: vraagTekst }] }] });
    const text = (body.content ?? []).filter(c => c.type === 'text').map(c => c.text).join('');
    schetsLezen.laatsteAntwoord = text;
    const data = schetsVorm(schetsNormaal(schetsJsonUitTekst(text)));
    if (schetsHeeftKasten(data)) return schetsSchoon(data);
    fout = body.stop_reason === 'max_tokens' ? 'Eerste poging: het antwoord was te lang.' : `Eerste poging: geen kasten gevonden in het antwoord${text ? '' : ' (leeg antwoord)'}.`;
  } catch (err) {
    if (/API-sleutel|tegoed|overbelast/.test(err.message)) throw err;
    fout = `Eerste poging: ${err.message}`;
  }
  // 2. Nog eens, met het formulier (tool) aangeboden; niet verplicht, want niet elk model aanvaardt een verplichte tool.
  let body;
  try {
    body = await schetsVraag(key, { model, max_tokens: 16000, system: SCHETS_PROMPT + SCHETS_VORM,
      tools: [{ name: 'kasten', description: 'Geef hiermee de kasten die op de schets staan, per wand.', input_schema: SCHETS_SCHEMA }],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: [beeld, { type: 'text', text: `${vraagTekst} Geef de kasten met de tool "kasten" (of als JSON-blok).` }] }] });
  } catch (err) {
    throw new Error(`${fout ?? ''} Tweede poging: ${err.message}`.trim());
  }
  const tool = (body.content ?? []).find(c => c.type === 'tool_use' && c.name === 'kasten');
  let data = schetsVorm(schetsNormaal(tool?.input));
  if (!schetsHeeftKasten(data)) {
    const text2 = (body.content ?? []).filter(c => c.type === 'text').map(c => c.text).join('');
    if (text2) schetsLezen.laatsteAntwoord = text2;
    data = schetsVorm(schetsNormaal(schetsJsonUitTekst(text2)));
  }
  if (schetsHeeftKasten(data)) return schetsSchoon(data);
  throw new Error(`${fout ?? ''} Tweede poging: ook geen kasten.${body.stop_reason === 'max_tokens' ? ' Het antwoord was te lang: probeer één wand per foto.' : ''}`.trim());
}

// MARK: - Van gelezen schets naar kasten

/** Breedte van een ronde kant buiten de kast (kwartrond: breedte of radius, halfrond: halve diepte, vrij: uitsteek). */
const schetsRondB = (r, diepte) => !r ? 0 : r.vorm === 'vrij' ? Number(r.uitsteek) || 300
  : r.vorm === 'half' || r.vorm === 'kop2' ? (Number(diepte) || 560) / 2 : Number(r.breedte) || Number(r.radius) || 300;

const num0 = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Preset-id voor een gelezen kast. */
function schetsPreset(it) {
  const eerst = it.vakken?.[0]?.type;
  if (it.soort === 'hang') return eerst === 'klep' ? 'boven-klep' : 'boven-deuren';
  if (it.soort === 'nis') return 'boognis';
  if (it.soort === 'kolom' || it.soort === 'zuil') return 'kolom';
  if (it.spoelbak) return 'spoelbak';
  return it.greeploos ? 'onder-greeploos' : 'onder-greep';
}

/** Vakken van de schets → secties van de kast. */
function schetsSecties(it) {
  const out = [];
  for (const v of it.vakken ?? []) {
    const h = num0(v.hoogte);
    if (v.type === 'lade') out.push(sec('lade', { lades: Math.max(1, num0(v.aantal) ?? 1), hoogte: h }));
    else if (v.type === 'toestel') {
      const naam = TOESTEL_NIS[v.naam] ? v.naam : 'Toestel';
      out.push(sec('toestel', { toestel: naam, nis: num0(v.nis) ?? TOESTEL_NIS[naam], hoogte: h }));
    } else if (v.type === 'klep') out.push(sec('klep', { legplanken: num0(v.legplanken) ?? 1, hoogte: h }));
    else if (v.type === 'open') out.push(sec('open', { legplanken: num0(v.legplanken) ?? 1, hoogte: h }));
    else out.push(sec('deur', { legplanken: num0(v.legplanken) ?? (it.soort === 'hang' ? 2 : 1), hoogte: h }));
    // Verticale verdeling en vaste legplanken (uitgewerkt zodra de breedte en de hoogte gekend zijn).
    const last = out[out.length - 1];
    if (['deur', 'open', 'klep'].includes(last.type)) {
      if (Array.isArray(v.kolomBreedtes) && v.kolomBreedtes.length > 1) last._kolomBreedtes = v.kolomBreedtes.map(Number).filter(x => x > 0);
      else if (num0(v.kolommen) > 1) last._kolommen = Math.round(num0(v.kolommen));
      if (num0(v.vasteLegplanken) > 0) last._vast = Math.round(num0(v.vasteLegplanken));
    }
  }
  return out;
}

const schetsRondTekst = r => `${r.uitvoering === 'open' ? 'open ' : ''}${{ kwart: 'kwartrond', half: 'halfrond', kop2: 'eilandkop', vrij: `vrije vorm ${r.vrijVorm ?? ''}` }[r.vorm] ?? 'rond'}${r.radius ? ` R${r.radius}` : ''}${r.uitsteek ? ` ${r.uitsteek}` : ''} ${r.kant}`;

/** Korte omschrijving van de vakken voor de controlelijst. */
function schetsVakTekst(it) {
  if (it.soort === 'leeg') return 'open ruimte (geen kast)';
  if (it.soort === 'paslat') return 'paslat';
  if (it.soort === 'nis') return `boognis${it.boog?.top ? ` (top ${it.boog.top}` + (it.boog.links ? `, zijkanten ${it.boog.links}/${it.boog.rechts ?? it.boog.links}` : '') + ')' : ''}${it.staatOp ? ' · staat op de onderkasten' : ''}`;
  if (it.soort === 'zuil') return `ronde zuil${it.rond?.vorm === 'vrij' ? ' (vrije vorm)' : ''}${it.rond?.uitvoering === 'open' ? ', open' : ''}${it.staatOp ? ' · staat op de onderkasten' : ''}`;
  return (it.vakken ?? []).map(v => v.type === 'lade' ? `${v.aantal ?? 1} lade${(v.aantal ?? 1) > 1 ? 's' : ''}` : v.type === 'toestel' ? (v.naam || 'toestel')
    : v.type === 'deur' ? `${v.deuren === 2 ? '2 deuren' : v.deuren === 1 ? '1 deur' : 'deur(en)'}` : v.type === 'klep' ? 'klep' : 'open vak')
    .map((t, i) => { const v = it.vakken[i]; return t + (v.kolomBreedtes?.length > 1 ? ` (${v.kolomBreedtes.join('|')})` : v.kolommen > 1 ? ` (in ${v.kolommen})` : ''); }).join(' / ')
    + (it.rond ? ` · ${schetsRondTekst(it.rond)}` : '') + (it.staatOp ? ' · staat op de onderkasten' : '')
    + (it.spoelbak ? ' · spoelbak' : '') + (it.greeploos ? ' · greeploos' : '') + (it.open ? ' · zonder fronten' : '')
    + (it.zijpaneelLinks ? ' · zijpaneel links' : '') + (it.zijpaneelRechts ? ' · zijpaneel rechts' : '');
}

/** Kasten maken in het project. opts: { plint, totVloer, bovenOnderkant } */
function schetsMaakKasten(p, data, opts) {
  const made = [], nieuweTypes = [], notes = [];
  let wandX = 0;
  for (const wand of data.wanden ?? []) {
    const items = (wand.kasten ?? []).filter(it => !it._weg);
    const rijOnder = items.filter(it => it.rij !== 'boven' && it.soort !== 'hang' && !it.staatOp);
    const rijBoven = items.filter(it => it.rij === 'boven' || it.soort === 'hang' || it.staatOp);
    // Onderrij: posities uit de breedtes na elkaar (de schets is niet op schaal); paslatten horen bij de buurkast.
    // Maten die maar één keer per rij op de schets staan, gelden voor de hele rij.
    const eerste = (pred, key) => num0(items.find(it => pred(it) && num0(it[key]) !== null)?.[key]);
    const rijMaat = {
      onder: { hoogte: eerste(it => it.soort === 'onder', 'hoogte'), diepte: eerste(it => it.soort === 'onder' || it.soort === 'kolom', 'diepte') },
      kolom: { hoogte: eerste(it => it.soort === 'kolom', 'hoogte'), diepte: eerste(it => it.soort === 'kolom' || it.soort === 'onder', 'diepte') },
      hang: { hoogte: eerste(it => it.soort === 'hang', 'hoogte'), diepte: eerste(it => it.soort === 'hang', 'diepte') },
    };
    // Ontbrekende breedtes in de onderrij: de rest van de totaalmaat (min de ronde uiteinden) gelijk verdelen.
    if (num0(wand.totaal)) {
      const rij = rijOnder.filter(it => it.soort !== 'paslat' || num0(it.breedte));
      const zonder = rij.filter(it => num0(it.breedte) === null && it.soort !== 'paslat');
      if (zonder.length) {
        const rondB = it => it.soort === 'zuil' || it.rond?.vorm === 'kop2' || !it.rond ? 0
          : (it.rond.kant === 'beide' ? 2 : 1) * schetsRondB(it.rond, num0(it.diepte) ?? rijMaat[it.soort]?.diepte);
        const vast = rij.reduce((t2, it) => t2 + (num0(it.breedte) ?? 0) + rondB(it), 0);
        const elk = Math.round((num0(wand.totaal) - vast) / zonder.length / 10) * 10;
        if (elk > 100) for (const it of zonder) { it.breedte = elk; it.onzeker = [it.onzeker, `breedte ${elk} = rest van de totaalmaat gelijk verdeeld`].filter(Boolean).join('; '); }
      }
    }
    // Kasten op de onderkasten zonder breedte: de rest van de lengte gelijk verdelen.
    if (num0(wand.totaal)) {
      const op = rijBoven.filter(it => it.staatOp && !['leeg', 'paslat'].includes(it.soort));
      const zonder = op.filter(it => num0(it.breedte) === null);
      if (zonder.length) {
        const elk = Math.round((num0(wand.totaal) - op.reduce((t2, it) => t2 + (num0(it.breedte) ?? 0), 0)) / zonder.length / 10) * 10;
        if (elk > 100) for (const it of zonder) { it.breedte = elk; it.onzeker = [it.onzeker, `breedte ${elk} = rest van de lengte`].filter(Boolean).join('; '); }
      }
    }
    const placed = [];
    let x = 0, wandBreedte = 0;
    const plaats = (rij, boven) => {
      let cx = 0, prev = null, pendingLinks = 0;
      for (const it of rij) {
        const w = num0(it.breedte) ?? 0;
        if (boven && num0(it.x) !== null) cx = Math.max(cx, num0(it.x));
        if (it.soort === 'paslat') {
          if (prev && !prev.k.paslat?.rechts) prev.k.paslat = { ...(prev.k.paslat ?? {}), rechts: w };
          else pendingLinks = w;
          cx += w; continue;
        }
        if (it.soort === 'leeg') { cx += w; prev = null; continue; }
        // Ronde kant links: die neemt plaats in de rij (de kast begint erna).
        const rondLinks = it.soort !== 'zuil' && it.rond?.vorm !== 'kop2' && (it.rond?.kant === 'links' || it.rond?.kant === 'beide') ? schetsRondB(it.rond, num0(it.diepte) ?? rijMaat[it.soort]?.diepte) : 0;
        const rondRechts = it.soort !== 'zuil' && it.rond?.vorm !== 'kop2' && (it.rond?.kant === 'rechts' || it.rond?.kant === 'beide') ? schetsRondB(it.rond, num0(it.diepte) ?? rijMaat[it.soort]?.diepte) : 0;
        cx += rondLinks;
        const k = createCabinet(p, schetsPreset(it));
        const eigen = new Set(k.eigen ?? []);
        const secs = schetsSecties(it);
        if (secs.length) k.secties = secs;
        const deur = (it.vakken ?? []).find(v => v.type === 'deur' && v.deuren);
        if (deur) { k.deuren = String(deur.deuren); }
        if (it.greeploos) { k.greep = 'greeplijst'; eigen.add('greep'); }
        if (it.open) k.zonderFronten = true;
        if (it.zijpaneelLinks || it.zijpaneelRechts) k.zijpaneel = { links: !!it.zijpaneelLinks, rechts: !!it.zijpaneelRechts };
        // Ronde zuil: een smalle kolomkast met aan beide kanten een ronde afwerking (halfrond: straal = halve diepte),
        // zodat de buitenmaat de breedte van de zuil is.
        if (it.soort === 'nis') {
          const bg = it.boog ?? {};
          // Op de onderkasten of een tablet: geen bodem nodig.
          k.boog = { links: num0(bg.links), rechts: num0(bg.rechts), top: num0(bg.top), piek: num0(bg.piek) ?? 35, bodem: !it.staatOp };
          k.secties = [sec('open', { legplanken: 0 })];
          // Even diep als de kast ernaast.
          if (num0(it.diepte) === null && prev) it.diepte = Number(prev.k.diepte) || null;
        }
        if (it.soort === 'zuil') {
          const r = it.rond ?? {};
          const vorm = r.vorm === 'vrij' ? 'vrij' : 'half';
          const dz = num0(it.diepte) ?? Math.min(w || 600, 600);
          it.rond = { kant: 'beide', vorm, uitvoering: r.uitvoering === 'open' ? 'open' : 'dicht', legplanken: num0(r.legplanken), vrijVorm: r.vrijVorm, uitsteek: num0(r.uitsteek) ?? (vorm === 'vrij' ? Math.round((w || 600) / 3) : null) };
          it.diepte = dz;
          it._kastBreedte = Math.max(150, (w || 600) - (vorm === 'half' ? dz : 2 * (it.rond.uitsteek || 0)));
          if (!(it.vakken ?? []).length) it.vakken = [{ type: 'open', legplanken: it.rond.uitvoering === 'open' ? 0 : 3 }];
          k.secties = schetsSecties(it);
          if (it.rond.uitvoering !== 'open') k.zonderFronten = !it.vakken.some(v => v.type === 'deur' || v.type === 'lade');
        }
        if (it.rond?.kant && it.rond?.vorm) {
          const r = it.rond;
          // Eilandkop zonder kasten rug aan rug: halfrond over de diepte van deze kast.
          const vorm = r.vorm === 'kop2' && !wand.eiland ? 'half' : r.vorm;
          k.rond = { kant: r.kant, vorm, uitvoering: r.uitvoering === 'open' ? 'open' : 'dicht', radius: num0(r.radius), breedte: num0(r.breedte),
            legplanken: num0(r.legplanken), vrijVorm: vorm === 'vrij' ? (VRIJE_VORMEN[r.vrijVorm] ? r.vrijVorm : 'ellips') : undefined, uitsteek: num0(r.uitsteek) };
        }
        if (pendingLinks) { k.paslat = { ...(k.paslat ?? {}), links: pendingLinks }; pendingLinks = 0; }
        if (w) k.breedte = it._kastBreedte ?? w;
        if (it.staatOp) { k.plint = 'geen'; eigen.add('plint'); }
        const isOnderOfKolom = it.soort !== 'hang';
        if (isOnderOfKolom && opts.plint != null) { k.plintHoogte = opts.plint; eigen.add('plintHoogte'); }
        const rm = it.staatOp ? {} : rijMaat[it.soort] ?? {};
        let h = num0(it.hoogte) ?? rm.hoogte;
        if (h && isOnderOfKolom && opts.totVloer && k.plint !== 'geen') h -= Number(k.plintHoogte) || 0;
        if (h) { k.hoogte = h; eigen.add('hoogte'); }
        const d = num0(it.diepte) ?? rm.diepte;
        if (d) { k.diepte = d; eigen.add('diepte'); }
        // Nog altijd leeg (niet op de schets, geen projectstandaard): gangbare maten.
        const def = SCHETS_STANDAARD[it.soort === 'zuil' || it.soort === 'nis' ? 'kolom' : it.soort] ?? SCHETS_STANDAARD.onder;
        if (!(Number(k.hoogte) > 0)) k.hoogte = def.hoogte;
        if (!(Number(k.diepte) > 0)) k.diepte = def.diepte;
        if (!(Number(k.breedte) > 0)) k.breedte = 600;
        if (k.plint !== 'geen' && !(Number(k.plintHoogte) > 0)) k.plintHoogte = 100;
        k.eigen = [...eigen];
        // Verticale verdeling (middenstijlen, hart vanaf links) en vaste legplanken gelijk verdeeld.
        const t = cabinetSettings(k, S()).plaat, Wk = Number(k.breedte);
        const zones = k.secties.some(sc => sc._vast) ? buildCabinet(k, S()).zones ?? [] : [];
        k.secties.forEach((sc, si) => {
          if (sc._kolomBreedtes) {
            let acc = 0;
            sc.stijlen = sc._kolomBreedtes.slice(0, -1).map(bw => { acc += bw; return Math.round(Math.min(Wk - t - 10, Math.max(t + 10, acc)) * 10) / 10; });
          } else if (sc._kolommen) {
            const n = sc._kolommen, c = (Wk - 2 * t - (n - 1) * t) / n;
            sc.stijlen = Array.from({ length: n - 1 }, (_, j) => Math.round((t + (j + 1) * c + (j + 0.5) * t) * 10) / 10);
          }
          if (sc._vast && zones[si]) {
            const hh = zones[si].open1 - zones[si].open0, m = sc._vast, c = (hh - m * t) / (m + 1);
            sc.vasteLegplanken = Array.from({ length: m }, (_, j) => ({ hoogte: Math.round(((j + 1) * c + j * t) * 10) / 10, deel: 0 }));
          }
          delete sc._kolomBreedtes; delete sc._kolommen; delete sc._vast;
        });
        k.notitie = it.tekst ? `Schets: ${it.tekst}` : undefined;
        if (it.nieuwType && it._bewaar !== false) nieuweTypes.push({ naam: it.nieuwType, k });
        p.kasten.push(k);
        const rondL = it.soort === 'zuil' ? (it.rond.vorm === 'half' ? Number(k.diepte) / 2 : Number(it.rond.uitsteek) || 0) : 0;
        placed.push({ k, it, x: cx + rondL, boven });
        made.push(k);
        prev = { k };
        cx += w + rondRechts;
      }
      return cx;
    };
    x = plaats(rijOnder, false);
    const xb = plaats(rijBoven, true);
    wandBreedte = Math.max(x, xb);
    // Eiland: de kasten aan de achterzijde staan rug aan rug, 180° gedraaid (van links naar rechts gezien vanaf de voorkant).
    const voor = placed.slice();
    let achter = [];
    if (wand.eiland && (wand.achterzijde ?? []).some(it => !it._weg)) {
      const n0 = placed.length;
      wandBreedte = Math.max(wandBreedte, plaats((wand.achterzijde ?? []).filter(it => !it._weg).map(it => ({ ...it, rij: 'onder' })), false));
      achter = placed.slice(n0);
    }
    const Zb = achter.length ? Math.max(...achter.map(q => Number(q.k.diepte) || 0)) : 0;
    // Hoogte van de hangkasten: opgegeven onderkant, anders boven gelijk met een kolomkast op deze wand, anders projectstandaard.
    // Kasten op de onderkasten: niet dieper dan het rechte stuk dat boven een ronde hoek (kwartrond) overblijft,
    // zodat ze niet over de boog uitsteken: diepte onderkast − radius (de fronten liggen dan gelijk met het begin van de boog).
    const rondOnder = placed.filter(q => !q.boven && !achter.includes(q) && q.it.rond && (q.it.rond.vorm === 'kwart' || q.it.rond.vorm === 'vrij'));
    if (rondOnder.length) {
      const maxD = Math.min(...rondOnder.map(q => Number(q.k.diepte) - (q.it.rond.vorm === 'vrij' ? Number(q.it.rond.uitsteek) || 300 : Number(q.it.rond.radius) || 300)));
      for (const q of placed.filter(q2 => q2.boven && q2.it.staatOp)) {
        if (maxD > 100 && Number(q.k.diepte) > maxD) {
          q.k.diepte = Math.round(maxD);
          q.k.eigen = [...new Set([...(q.k.eigen ?? []), 'diepte'])];
          notes.push(`${q.k.code}: ${Math.round(maxD)} diep (diepte onderkast min de radius van de ronde hoek eronder), zodat ze niet over de boog uitsteekt.`);
        }
      }
    }
    const kolom = placed.find(q => q.it.soort === 'kolom' && !q.it.staatOp);
    // Tablet (werkblad) op de onderrij: een werkblad over de onderkasten; kasten die erop staan komen er bovenop.
    const tabletDikte = wand.werkblad ? (num0(wand.werkblad.dikte) ?? 38) : 0;
    if (wand.werkblad) {
      const ids = placed.filter(q => !q.boven && !achter.includes(q) && q.it.soort !== 'kolom').map(q => q.k.id);
      if (ids.length) p.werkbladen = [...(p.werkbladen ?? []), { id: uid(), naam: `Tablet ${wand.naam || ''}`.trim(), kasten: ids, materiaal: 'plaat', dikte: tabletDikte,
        voor: num0(wand.werkblad.overstek) ?? 20, links: 0, rechts: 0, uitsparingen: [] }];
    }
    for (const q of placed) {
      const k = q.k;
      const plint = k.plint === 'geen' ? 0 : Number(k.plintHoogte) || 0;
      let y = plint;
      if (q.boven && q.it.staatOp) {
        // Staat op de onderkasten: op de bovenkant van de onderkast eronder (of de hoogste van de onderrij).
        const onder = placed.filter(o => !o.boven && o.x < q.x + Number(k.breedte) - 1 && o.x + Number(o.k.breedte) > q.x + 1);
        const bron = onder.length ? onder : placed.filter(o => !o.boven);
        y = (bron.length ? Math.max(...bron.map(o => (o.k.plint === 'geen' ? 0 : Number(o.k.plintHoogte) || 0) + Number(o.k.hoogte))) : 0) + tabletDikte;
      } else if (q.boven) {
        if (opts.bovenOnderkant) y = opts.bovenOnderkant;
        else if (kolom) y = (kolom.k.plint === 'geen' ? 0 : Number(kolom.k.plintHoogte) || 0) + Number(kolom.k.hoogte) - Number(k.hoogte);
        else y = Number(p.bovenHoogte) || 1400;
      }
      if (achter.includes(q)) Object.assign(k, { plaatsing: 'vrij', posX: wandX + q.x + Number(k.breedte), posY: y, posZ: Zb, rot: 180 });
      else Object.assign(k, { plaatsing: 'vrij', posX: wandX + q.x, posY: y, posZ: Zb, rot: 0 });
    }
    void voor;
    wandX += wandBreedte + 1000;      // volgende wand ernaast; met Verplaatsen zet je hem in de hoek
  }
  // Nieuwe kasttypes bewaren (bij "Kast toevoegen", in elk project).
  for (const { naam, k } of nieuweTypes) {
    const kast = JSON.parse(JSON.stringify(k));
    for (const key of ['id', 'code', 'plaatsing', 'posX', 'posY', 'posZ', 'rot', 'uitsparing', 'notitie']) delete kast[key];
    if (!(S().eigenKasten ?? []).some(x => x.naam === naam)) S().eigenKasten = [...(S().eigenKasten ?? []), { id: uid(), naam, kast }];
  }
  if (nieuweTypes.length) Store.save();
  made.nieuweTypes = nieuweTypes.map(x => x.naam);
  made.notes = notes;
  return made;
}

// MARK: - Venster

function openSketchImport(p, onDone) {
  const st = { fase: 'foto', foto: null, data: null, fout: null, bezig: false, ronde: 0, antwoorden: {} };
  // Na het lezen: de optelling nakijken (opmerking als de breedtes niet optellen tot de totaalmaat).
  const nakijken = () => {
    for (const w of st.data.wanden ?? []) if (w.totaal) {
      const rondB = it => !it.rond ? 0 : (it.rond.kant === 'beide' ? 2 : 1) * (it.rond.vorm === 'vrij' ? Number(it.rond.uitsteek) || 300
        : it.rond.vorm === 'half' || it.rond.vorm === 'kop2' ? (Number(it.diepte) || 560) / 2 : Number(it.rond.breedte) || Number(it.rond.radius) || 300);
      const rij = (w.kasten ?? []).filter(it => it.rij !== 'boven' && it.soort !== 'hang' && !it.staatOp);
      if (rij.some(it => num0(it.breedte) === null && it.soort !== 'paslat')) continue;    // ontbrekende breedtes worden verdeeld
      const som = rij.reduce((t, it) => t + (Number(it.breedte) || 0) + rondB(it), 0);
      if (Math.abs(som - w.totaal) > 1) st.data.opmerkingen.push(`${w.naam || 'Wand'}: de breedtes van de onderrij tellen op tot ${som}, de totaalmaat is ${w.totaal}. Kijk de breedtes na.`);
    }
  };
  // Lezen (of opnieuw lezen met de antwoorden) en daarna vragen of de controlelijst tonen.
  const lees = async (vorige) => {
    const key = schetsGet(SCHETS_KEY), model = schetsGet(SCHETS_MODEL) || 'claude-sonnet-5-5';
    st.bezig = true; st.fout = null; render();
    try {
      st.data = await schetsLezen(st.foto.base64, key, model, vorige);
      if (!st.data.wanden?.some(w => w.kasten?.length)) throw new Error('Er werden geen kasten herkend. Neem de foto recht van boven met goed licht.');
      nakijken();
      st.ronde += 1; st.antwoorden = {};
      st.fase = st.data.vragen.length && st.ronde <= 2 ? 'vragen' : 'controle';
    } catch (err) { st.fout = `Lezen lukte niet: ${err.message}`; if (vorige) st.fase = 'vragen'; }
    st.bezig = false; render();
  };
  const body = el(`<div class="content" id="sk"></div>`);
  const sheet = openSheet({ title: 'Schets inlezen', left: { label: 'Annuleer' }, body, wide: true });
  const render = () => {
    const key = schetsGet(SCHETS_KEY), model = schetsGet(SCHETS_MODEL) || 'claude-sonnet-5-5';
    if (st.fase === 'foto') {
      body.innerHTML = `
        <div class="group"><div class="group-body">
          <button class="row link" type="button" id="sk-vb"><span class="icon-label">${icon('download')}Voorbeeldblad met de codes (PDF)</span><span class="chev">${icon('right')}</span></button>
        </div><div class="group-footer">Teken per wand een vooraanzicht op gewoon papier, niet op schaal: alleen de maten die je erbij schrijft tellen. Codes of gewone woorden mogen allebei.</div></div>
        <div class="group"><div class="group-header">Lezen met Claude</div><div class="group-body">
          ${row('API-sleutel', `<input class="input-plain" id="sk-key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(key)}">`)}
          ${row('Model', selectHTML('sk-model', [['claude-sonnet-5-5', 'Sonnet (snel, goedkoop)'], ['claude-opus-5-5', 'Opus (leest moeilijk handschrift beter)']], model))}
        </div><div class="group-footer">De sleutel maak je op console.anthropic.com (API keys). Ze blijft alleen op dit toestel. De foto gaat naar Anthropic om gelezen te worden; dat kost enkele eurocent per foto.</div></div>
        <div class="group"><div class="group-body">
          <label class="row button" for="sk-cam"><span class="icon-label">${icon('eye')}Foto nemen (camera)</span></label>
          <input type="file" id="sk-cam" accept="image/*" capture="environment" style="display:none">
          <label class="row button" for="sk-file"><span class="icon-label">${icon('upload')}Foto kiezen (foto's of bestanden)</span></label>
          <input type="file" id="sk-file" accept="image/*" style="display:none">
        </div></div>
        ${st.foto ? `<div class="group"><div class="group-body" style="padding:8px"><img src="${st.foto.dataUrl}" style="max-width:100%;border-radius:8px"></div></div>
          <div class="group"><div class="group-body"><button class="row button" type="button" id="sk-go" ${st.bezig ? 'disabled' : ''}>${st.bezig ? 'Bezig met lezen… (even geduld)' : 'Schets lezen'}</button></div></div>` : ''}
        ${st.fout ? `<div class="group"><div class="group-body"><div class="row"><span class="row-sub" style="color:var(--red, #c00)">${esc(st.fout)}</span></div></div></div>
          ${schetsLezen.laatsteAntwoord ? `<details class="group"><summary class="group-header" style="cursor:pointer;text-transform:none">Antwoord van Claude bekijken</summary><div class="group-body" style="padding:10px"><pre style="white-space:pre-wrap;font-size:11px;max-height:300px;overflow:auto;margin:0">${esc(schetsLezen.laatsteAntwoord.slice(0, 6000))}</pre></div></details>` : ''}` : ''}`;
      $('#sk-vb', body).addEventListener('click', () => { const d = schetsVoorbeeldPdf(); shareFile(d.blob, d.name); });
      $('#sk-key', body).addEventListener('change', e => schetsSet(SCHETS_KEY, e.target.value.trim()));
      $('#sk-model', body).addEventListener('change', e => schetsSet(SCHETS_MODEL, e.target.value));
      for (const id of ['#sk-cam', '#sk-file']) $(id, body).addEventListener('change', async e => {
        const f = e.target.files?.[0];
        if (!f) return;
        try { st.foto = await schetsImage(f); st.fout = null; } catch (err) { st.fout = err.message; }
        render();
      });
      $('#sk-go', body)?.addEventListener('click', async () => {
        const k2 = $('#sk-key', body).value.trim();
        if (!k2) { st.fout = 'Vul eerst je API-sleutel in.'; render(); return; }
        schetsSet(SCHETS_KEY, k2);
        schetsSet(SCHETS_MODEL, $('#sk-model', body)?.value || model);
        st.ronde = 0;
        await lees(null);
      });
      return;
    }
    if (st.fase === 'vragen') {
      // Vragen van Claude: per vraag de keuzes als knoppen, of zelf een antwoord typen.
      const d0 = st.data;
      body.innerHTML = `
        ${st.foto ? `<details class="group"><summary class="group-header" style="cursor:pointer">Foto bekijken</summary><div class="group-body" style="padding:8px"><img src="${st.foto.dataUrl}" style="max-width:100%;border-radius:8px"></div></details>` : ''}
        <div class="group"><div class="group-body"><div class="row"><span class="row-sub">Om het zo juist mogelijk te maken heb ik nog ${d0.vragen.length === 1 ? 'een vraag' : `${d0.vragen.length} vragen`}. Kies een antwoord of typ zelf iets; een vraag zonder antwoord blijft mijn beste gok.</span></div></div></div>
        ${d0.vragen.map((q, i) => `<div class="group"><div class="group-header" style="text-transform:none">${i + 1}. ${esc(q.vraag)}</div><div class="group-body">
          ${q.opties.map((o, j) => `<button class="row link" type="button" data-q="${i}" data-o="${j}" style="${st.antwoorden[i] === o ? 'font-weight:600' : ''}"><span>${st.antwoorden[i] === o ? '● ' : '○ '}${esc(o)}</span></button>`).join('')}
          <div class="row"><div class="row-fill"><input class="input-plain" id="sk-qa-${i}" placeholder="Zelf antwoorden…" value="${esc(q.opties.includes(st.antwoorden[i]) ? '' : st.antwoorden[i] ?? '')}"></div></div>
        </div>${q.waarom ? `<div class="group-footer">${esc(q.waarom)}</div>` : ''}</div>`).join('')}
        ${st.fout ? `<div class="group"><div class="group-body"><div class="row"><span class="row-sub" style="color:var(--red, #c00)">${esc(st.fout)}</span></div></div></div>` : ''}
        <div class="group"><div class="group-body">
          <button class="row button" type="button" id="sk-antw" ${st.bezig ? 'disabled' : ''}>${st.bezig ? 'Bezig met verwerken… (even geduld)' : 'Antwoorden verwerken'}</button>
          <button class="row link" type="button" id="sk-skip"><span>Overslaan, naar de lijst</span><span class="chev">${icon('right')}</span></button>
        </div></div>`;
      $$('[data-q]', body).forEach(b => b.addEventListener('click', () => { st.antwoorden[Number(b.dataset.q)] = d0.vragen[Number(b.dataset.q)].opties[Number(b.dataset.o)]; render(); }));
      d0.vragen.forEach((q, i) => $(`#sk-qa-${i}`, body).addEventListener('input', e => { if (e.target.value.trim()) st.antwoorden[i] = e.target.value.trim(); else delete st.antwoorden[i]; }));
      $('#sk-skip', body).addEventListener('click', () => { st.fase = 'controle'; render(); });
      $('#sk-antw', body).addEventListener('click', async () => {
        const antwoorden = d0.vragen.map((q, i) => ({ vraag: q.vraag, antwoord: st.antwoorden[i] })).filter(a => a.antwoord);
        if (!antwoorden.length) { st.fase = 'controle'; render(); return; }
        await lees({ data: d0, antwoorden });
      });
      return;
    }
    // Controle: lijst per wand, aanpasbaar.
    const d = st.data;
    const soorten = [['onder', 'Onderkast'], ['kolom', 'Kolomkast'], ['hang', 'Hangkast'], ['nis', 'Boognis'], ['zuil', 'Ronde zuil'], ['leeg', 'Open ruimte'], ['paslat', 'Paslat']];
    const rondOpts = [['', 'Geen ronde kant'], ...['kwart', 'half', 'kop2', 'vrij'].flatMap(v => ['links', 'rechts', 'beide'].map(kt => [`${v}-${kt}`, `${{ kwart: 'Kwartrond', half: 'Halfrond', kop2: 'Eilandkop', vrij: 'Vrije vorm' }[v]} ${kt}`]))];
    // Maatveld met een korte letter ervoor (B breedte, H hoogte, D diepte, R radius).
    const skNum = (letter, id, val, ph) => `<label style="display:inline-flex;align-items:center;gap:4px"><span class="row-sub" style="min-width:12px">${letter}</span><input class="input-num" id="${id}" type="number" placeholder="${ph}" value="${val ?? ''}" style="width:78px"></label>`;
    const lijsten = w => [...(w.kasten ?? []), ...(w.eiland ? w.achterzijde ?? [] : [])];
    const totaal = (d.wanden ?? []).reduce((t, w) => t + lijsten(w).filter(it => !it._weg && !['leeg', 'paslat'].includes(it.soort)).length, 0);
    body.innerHTML = `
      ${st.foto ? `<details class="group"><summary class="group-header" style="cursor:pointer">Foto bekijken</summary><div class="group-body" style="padding:8px"><img src="${st.foto.dataUrl}" style="max-width:100%;border-radius:8px"></div></details>` : ''}
      ${(d.wanden ?? []).map((w, wi) => [['kasten', (w.eiland ? `${w.naam || `Wand ${wi + 1}`} · eiland, voorkant` : (w.naam || `Wand ${wi + 1}`)) + (w.werkblad ? ` · met tablet ${w.werkblad.dikte ?? 38} mm` : '')], ...(w.eiland && w.achterzijde?.length ? [['achterzijde', `${w.naam || `Wand ${wi + 1}`} · eiland, achterzijde (rug aan rug)`]] : [])].map(([lijst, titel]) => `<div class="group"><div class="group-header">${esc(titel)}</div><div class="group-body">
        ${lijst === 'kasten' ? `<div class="row" style="gap:8px"><span class="row-label">Tablet (werkblad) op de onderkasten</span>${w.werkblad ? skNum('dikte', `sk-wbd-${wi}`, w.werkblad.dikte, '38') : ''}${toggleHTML(`sk-wb-${wi}`, !!w.werkblad)}</div>` : ''}
        ${(w[lijst] ?? []).map((it, ii) => it._weg ? '' : `<div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">
          <span class="row-label" style="min-width:150px">${esc(it.tekst || '—')}<br><span class="row-sub">${esc(schetsVakTekst(it))}</span>
            ${it.onzeker ? `<br><span class="row-sub" style="color:var(--orange, #c60)">${icon('warning')} ${esc(it.onzeker)}</span>` : ''}</span>
          <div class="row-fill" style="gap:6px;flex-wrap:wrap">
            ${selectHTML(`sk-s-${wi}-${lijst}-${ii}`, soorten, it.soort)}
            ${skNum('B', `sk-b-${wi}-${lijst}-${ii}`, it.breedte, 'breedte')}
            ${['leeg', 'paslat'].includes(it.soort) ? '' : `${skNum('H', `sk-h-${wi}-${lijst}-${ii}`, it.hoogte, 'hoogte')}
            ${skNum('D', `sk-d-${wi}-${lijst}-${ii}`, it.diepte, 'diepte')}
            ${selectHTML(`sk-r-${wi}-${lijst}-${ii}`, rondOpts, it.rond ? `${it.rond.vorm}-${it.rond.kant}` : '')}
            ${it.rond && it.rond.vorm !== 'vrij' ? skNum('R', `sk-rr-${wi}-${lijst}-${ii}`, it.rond.radius, 'radius') : ''}`}
            <button class="mini danger" type="button" data-weg="${wi}-${lijst}-${ii}" aria-label="Weglaten">${icon('trash')}</button>
            ${it.rij === 'boven' || it.staatOp ? `<label class="row-sub" style="display:flex;align-items:center;gap:6px;width:100%">${toggleHTML(`sk-op-${wi}-${lijst}-${ii}`, !!it.staatOp)} Staat op de onderkasten</label>` : ''}
            ${it.nieuwType ? `<label class="row-sub" style="display:flex;align-items:center;gap:6px;width:100%">${toggleHTML(`sk-nt-${wi}-${lijst}-${ii}`, it._bewaar !== false)} Bewaren als eigen kasttype "${esc(it.nieuwType)}"</label>` : ''}
          </div></div>`).join('')}
      </div></div>`).join('')).join('')}
      <div class="group"><div class="group-header">Voor alle kasten</div><div class="group-body">
        ${row('Plinthoogte', numHTML('sk-plint', d.plintHoogte ?? '', 'standaard'))}
        <div class="row"><span class="row-label">Hoogtes van onder- en kolomkasten zijn tot de vloer (met plint)</span>${toggleHTML('sk-vloer', !!d.hoogteTotVloer)}</div>
        ${row('Onderkant hangkasten boven de vloer', numHTML('sk-boven', d.bovenOnderkant ?? '', 'gelijk met kolomkast of standaard'))}
      </div><div class="group-footer">Lege hoogte of diepte: zoals een andere kast in dezelfde rij, anders de projectstandaard (of 720/700/2100 hoog, 560/350 diep). Alles wat je hier niet ziet (indeling, lades, toestellen) staat in de kast en pas je daarna aan zoals altijd.</div></div>
      ${(d.opmerkingen ?? []).length ? `<div class="group"><div class="group-header">Opmerkingen bij het lezen</div><div class="group-body">${d.opmerkingen.map(o => `<div class="row"><span class="row-sub">${esc(o)}</span></div>`).join('')}</div></div>` : ''}
      <div class="group"><div class="group-body">
        <button class="row button" type="button" id="sk-make">${totaal} ${totaal === 1 ? 'kast' : 'kasten'} maken</button>
        <button class="row link" type="button" id="sk-terug"><span>Andere foto</span><span class="chev">${icon('right')}</span></button>
      </div></div>`;
    (d.wanden ?? []).forEach((w, wi) => ['kasten', 'achterzijde'].forEach(lijst => (w[lijst] ?? []).forEach((it, ii) => {
      const id = `${wi}-${lijst}-${ii}`;
      $(`#sk-s-${id}`, body)?.addEventListener('change', e => { it.soort = e.target.value; it.rij = e.target.value === 'hang' ? 'boven' : it.rij === 'boven' && e.target.value !== 'leeg' && e.target.value !== 'paslat' ? 'onder' : it.rij; render(); });
      for (const [pre, key] of [['b', 'breedte'], ['h', 'hoogte'], ['d', 'diepte']]) $(`#sk-${pre}-${id}`, body)?.addEventListener('change', e => { it[key] = num0(e.target.value); });
      $(`#sk-r-${id}`, body)?.addEventListener('change', e => {
        if (!e.target.value) it.rond = null;
        else { const [vorm, kant] = e.target.value.split('-'); it.rond = { uitvoering: 'dicht', ...(it.rond ?? {}), vorm, kant }; }
        render();
      });
      $(`#sk-rr-${id}`, body)?.addEventListener('change', e => { it.rond = { ...it.rond, radius: num0(e.target.value) }; });
      $(`#sk-nt-${id}`, body)?.addEventListener('change', e => { it._bewaar = e.target.checked; });
      $(`#sk-op-${id}`, body)?.addEventListener('change', e => { it.staatOp = e.target.checked; });
    })));
    (d.wanden ?? []).forEach((w, wi) => {
      $(`#sk-wb-${wi}`, body)?.addEventListener('change', e => { w.werkblad = e.target.checked ? { dikte: 38, overstek: 20, ...(w.werkblad ?? {}) } : null; render(); });
      $(`#sk-wbd-${wi}`, body)?.addEventListener('change', e => { w.werkblad = { ...(w.werkblad ?? {}), dikte: num0(e.target.value) }; });
    });
    $$('[data-weg]', body).forEach(b => b.addEventListener('click', () => { const [wi, lijst, ii] = b.dataset.weg.split('-'); d.wanden[Number(wi)][lijst][Number(ii)]._weg = true; render(); }));
    $('#sk-plint', body).addEventListener('change', e => { d.plintHoogte = num0(e.target.value); });
    $('#sk-vloer', body).addEventListener('change', e => { d.hoogteTotVloer = e.target.checked; });
    $('#sk-boven', body).addEventListener('change', e => { d.bovenOnderkant = num0(e.target.value); });
    $('#sk-terug', body).addEventListener('click', () => { st.fase = 'foto'; render(); });
    $('#sk-make', body).addEventListener('click', () => {
      const made = schetsMaakKasten(p, d, { plint: num0(d.plintHoogte), totVloer: !!d.hoogteTotVloer, bovenOnderkant: num0(d.bovenOnderkant) });
      touch(p); sheet.close(); onDone(made);
    });
  };
  render();
}
