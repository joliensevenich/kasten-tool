'use strict';
// Kastmotor: uit een kastbeschrijving alle panelen met maten, kantenbanden, bewerkingen en beslag.
// Assen van een kast: x = breedte (links → rechts), y = hoogte (onder → boven), z = diepte (achter → voor).
// Alle maten in mm. y = 0 is de onderkant van het korpus (zonder plint).
//
// Elk paneel heeft een eigen tekening met coördinaten u (horizontaal) en v (verticaal):
// - zijwand: u = diepte (0 = achterkant, max = voorkant), v = hoogte (0 = onderkant), gezien van binnen
// - bodem, top, regel, legplank: u = breedte (0 = links), v = diepte (0 = achterkant), gezien van boven
// - rug, front, plint: u = breedte (0 = links), v = hoogte (0 = onderkant), gezien van voor
// Randen: u0 (links in de tekening), u1 (rechts), v0 (onder), v1 (boven).

const DEFAULT_SETTINGS = {
  plaat: 18,               // korpus
  front: 18,               // deuren en ladefronten
  rug: 8,                  // rug in een groef
  rugDik: 18,              // opgeschroefd rugpaneel
  groefBreedte: 8.7,
  groefDiepte: 10,
  rugInsprong: 19.3,       // afstand van de achterkant van het korpus tot de groef (groef 19,3–28, hart 23,65)
  rugSpeling: 1,           // speling per kant in de groef
  rugSchroefAfstand: 140,  // schroeven door de rug: hoogstens 140 uit elkaar, vanaf 50 van de rand
  bandKorpus: 1,           // zijwanden rondom; voorkant van bodem, top, tussenbodems
  bandLegplank: 1,
  bandFront: 1,            // rondom deuren en ladefronten
  voeg: 3,                 // tussen fronten
  legplankInsprong: 10,
  legplankSpeling: 1,
  deuvelDia: 8,
  deuvelLengte: 35,
  deuvelAfstand: 80,       // ongeveer: gelijk verdeeld tussen de eerste en laatste deuvel
  deuvelMarge: 30,         // eerste en laatste deuvel vanaf voor- en achterkant
  deuvelDiepteVlak: 12,
  deuvelDiepteKant: 21,
  schroeven: true,
  schroefDia: 4,
  ophangDia: 10,
  ophangDiepte: 12.5,
  clamexMarge: 100,        // eerste en laatste Clamex vanaf voor- en achterkant
  clamexMaxAfstand: 150,
  clamexMinHoek: 22.5,       // kleinste verstekhoek per stuk voor de Clamex-macro (SAFE2 in Lamello_4s_45)  // zeker om de 150 mm een Clamex
  clamexDeuvel: 50.5,
  clamexDiepte: 14,              // diepte van de Clamex-sleuf per onderdeel (P-14); samen 2 × deze maat
  clamexLengte: 70,              // lengte van de Clamex-sleuf (P-14, zaag Ø100,4): binnen deze afstand raken ze elkaar      // deuvel aan weerszijden van elke Clamex
  deuvelEersteVoor: 30,    // P110: deuvels op 30 en 62 van voor, P−89 en P−57 van achter, ertussen ≤ 130
  deuvelPaar: 32,
  deuvelLaatsteAchter: 57,
  deuvelMaxTussen: 130,
  schroefVoor: 45,         // schroeven: één minder dan deuvels, van 45 tot P−72
  schroefAchter: 72,
  ophangGaten: true,       // hangkasten: 3 gaten Ø10 voor het ophangbeslag
  ophangVanBoven: 74,
  ophangVanAchter: 15,
  clamexToegangDia: 6,
  clamexToegangAfstand: 9,
  montageplaatDia: 5,
  montageplaatDiepte: 14,
  montageplaatVoor: 37,
  montageplaatTussen: 32,
  potDia: 35,
  potDiepte: 14,
  potRand: 5,              // afstand van de pot tot de rand van de deur (hart op 22,5)
  scharnierDeuvelDiepte: 14,
  plaatjeHoogte: 50,       // hoogte van het montageplaatje: mag geen regel of tussenbodem raken
  scharnierVrij: 5,        // extra vrije ruimte rond regels en tussenbodems
  dempers: true,           // deuren: 2 gaten voor dempers (zoals in de P110-programma's)
  demperDia: 5,
  demperDiepte: 12,
  demperRand: 7,
  scharnierInbouw: 60,      // schuine kast: zo ver steekt het scharnier (plaatje + arm) de kast in
  scharnierRand: 65,       // eerste en laatste scharnier vanaf boven- en onderkant
  potDeuvels: true,        // twee deuvelgaten bij de pot (boorbeeld 45/9,5)
  systeemboringen: true,
  systeemDia: 5,
  systeemDiepte: 13,
  systeemVoor: 50,         // voorste rij op 50 mm, zodat de scharnierplaatjes (37 mm) apart te zien zijn
  systeemVoorSmal: 37,     // ... behalve in smalle kasten
  systeemSmalGrens: 200,   // kast smaller dan dit: voorste rij op systeemVoorSmal
  systeemAchter: 65,       // achterste rij: vanaf de voorkant van de rug
  systeemRaster: 32,
  systeemMarge: 64,
  regelBreedte: 100,
  legplankDikGrens: 700,     // losse en vaste legplanken langer dan dit worden legplankDik dik (tegen doorhangen)
  legplankDik: 25,
  paslatDiepte: 100,         // kastpaslat achter de frontpaslat
  zijpaneelNaastFront: 14,   // zijpaneel gelijk met het front (front erachter): max. dikte, anders gaat de deur niet open (155°-scharnier)
  paslatSchroefAfstand: 300,
  trespaDikte: 10,          // Trespa-strook onder de plint
  wegneembareRugHoogte: 200, // spoelbakkast: wegneembare rugstrook
  wegneembareRugAchter: 50,  // afstand van de strook tot de achterkant: ruimte om de leidingen erachter te krijgen
  latAfstand: 800,         // kolomkast: lat achter de rug als er geen tussenbodem is, ongeveer om de 800 mm
  latBreedte: 100,
  // Markeringen (zoals in de P110-programma's): puntjes voor de stelpoten onder de bodem en een merkteken onderaan achteraan op de zijwand.
  pootMerken: true,
  pootDia: 4,
  pootDiepte: 2,
  pootRandZij: 20,         // buitenste puntjes vanaf de zijkant van de bodem
  pootVoor: 47,            // voorste puntjes vanaf de voorkant
  pootAchter: 28,          // achterste puntjes vanaf de achterkant
  pootVierkant: 64,        // 4 puntjes per poot in een vierkant
  pootMiddenVoor: 700,     // vanaf deze breedte een extra poot vooraan in het midden
  pootMiddenAchter: 900,   // vanaf deze breedte ook achteraan in het midden
  hoekMerk: true,
  hoekMerkDia: 5,
  hoekMerkDiepte: 1,
  hoekMerkRand: 9,
  verluchtingInsprong: 50,
  rugInsprongToestel: 40,  // bij kasten met toestellen: ruimte achter de rug voor verluchting
  greeplijstSamen: true,   // latten van een greeplijst samen zagen (één strook)
  greeplijstZaagExtra: 22, // extra breedte per scheiding (58 + 20 + 22 = 100)
  ledBreedte: 12,
  ledDiepte: 8,
  ledAfstand: 30,
  ledKabelDia: 10,
  ledKabelAfstand: 30,     // kabelgat vanaf het uiteinde van de groef
  verluchtingSpleet: 20,
  plintInsprong: 50,
  greeplijstBinnenHoogte: 40,  // greepruimte; buitenmaat = + plaat (bovenaan, L) of + 2 × plaat (tussen fronten, C)
  greeplijstBinnenDiepte: 20,
  greepGrijp: 10,              // greeploos met greeplijst: front steekt zoveel uit in de greepopening  // buitenmaat = + plaat
  greepHartafstand: 160,
  greepRand: 40,
  greepVanBoven: 100,
  greepHoogteKolom: 1500,  // kolomkast met toestellen: greep zo dicht mogelijk bij deze hoogte vanaf de vloer
  blindPlaatRand: 22,       // blinde hoek: hart van de gaten van het plaatje vanaf de kant van het blindpaneel naast de deur
  blindPlaatTussen: 32,     // afstand tussen de twee gaten, boven elkaar
  blindPlaatDia: 5,
  blindPlaatDiepte: 10,
  rondTriplexLagen: 2,       // ronde kant: lagen buigtriplex
  rondTriplexDikte: 7,
  rondHplDikte: 0.8,
  rondHplMinRadius: 150,     // kleinste buigradius van de HPL (waarschuwing)
  rondOvermaat: 20,          // vel: overmaat aan elke kant (na het verlijmen bijwerken)
  rondRibAfstand: 800,       // tussenribben om de (hoogstens)
  rondRibVanaf: 1200,        // tussenribben pas vanaf deze kasthoogte
  rondStaanderAfstand: 100,  // opstaanders langs de boog om de (hoogstens)
  rondStaanderBreedte: 100,  // opstaander: breedte (18 × deze maat)
  rondSponningBreedte: 14,   // sponning in de rechte stukken, top en bodem: breedte (= dikte buigtriplex)
  rondSponningDiepte: 13,    // en diepte (zo ver gaat het buigtriplex erin)
  werkbladHoekVerstek: 12,   // werkbladen in een hoek: vooraan zoveel in verstek (afgeronde voorkant), de rest recht
  trekkerAantal: 2,          // tabletverbinders (werkbladtrekkers) per hoek
  trekkerVoor: 150,          // eerste vanaf de voorkant
  trekkerAchter: 120,        // laatste vanaf de muur
  trekkerAfstand: 65,        // hart van het gat Ø35 tot de voeg
  trekkerDia: 35,
  trekkerDiepte: 20,
  trekkerSleuf: 15,          // sleuf van het gat tot in de voeg
  trekkerSleufDiepte: 20,
  trekkerClamexVrij: 50,     // Clamex niet dichter bij een trekker
  spoelbakUitsparingB: 760,  // werkblad: uitsparing boven een spoelbakkast (breedte × diepte)
  spoelbakUitsparingD: 440,
  kookplaatUitsparingB: 560, // werkblad: uitsparing boven een kookplaatkast
  kookplaatUitsparingD: 490,
  binnenladeOpvulType: 'kunststof', // 'kunststof' (bestellen) of 'hout' (zelf zagen)
  opvulArtikel: 'KPR.6056.ZW', // Blum opvullijst voor binnenlade (kunststof, zwart)
  opvulLengte: 486,
  opvulHoogte: 50,
  opvulSchroeven: 3,         // schroeven 3,5 × 40 per opvullijst
  binnenladeOpvul: 25,       // binnenladen: dikte van de opvullijst (Blum KPR.6056.ZW: 25 mm)
  binnenladeTerug: 25,       // binnenfront zoveel achter de voorkant van de kast (ruimte voor deur en scharnieren)
  binnenfrontExtra: 30,      // binnenfront = hoogte laderug + dit
  binnenladeTussen: 40,      // ruimte tussen de binnenladen
  plintBakDikte: 18,         // plintenbak in multiplex
  plintBakAfstand: 600,      // tussenlatten in de plintenbak ongeveer om de
  hangGreepUitsteek: 30,     // hangkast greeploos: fronten steken zoveel onderaan uit (vastnemen langs onder)
  pushDia: 10,               // push-open: boring van voor in het korpus voor de drevel
  pushDiepte: 80,
  pushRand: 60,              // vanaf de boven-/onderkant van de front (en bij twee deuren vanaf de opening)
  greepHoogteKolomZonder: 1050, // kolomkast zonder toestel: greep zo dicht mogelijk bij deze hoogte
  greepVanOnder: 50,       // ... bij een deur boven die hoogte: onderste greepgat vanaf de onderkant van de deur
  greepDia: 5,
  tipOnDia: 10,
  tipOnDiepte: 12,
  deurMaxBreedte: 600,
  ladeBodemDikte: 18,       // ladebodem en -rug; aan de randen afgefreesd tot 16 mm voor het beslag
  ladeSponningBreedte: 20,
  ladeSponningDiepte: 2,
  ladeSchroefAfstand: 150,  // schroefgaten in de ladebodem om de laderug vast te schroeven
  frontBevestiging: true,   // snelspan-frontbevestiging (EXPANDO): gaten in het ladefront
  frontBevDia: 10,
  frontBevDiepte: 12,
  frontBevZij: 14,          // vanaf de binnenkant van de zijwand (= 14 + overlap front)
  geleiderDia: 5,           // punten voor de ladegeleider: Ø5 voor euroschroeven
  geleiderDiepte: 13,
  geleiderAchterVrij: 100,  // een gat moet minstens zoveel voor het einde van de geleider (NL) liggen

  // Decors (kleuren zijn een benadering voor de 3D-weergave).
  decors: [
    { code: 'W980', naam: 'Platinawit', kleur: '#ecebe6' },
    { code: 'W1000', naam: 'Premium wit', kleur: '#f5f5f1' },
    { code: 'U999', naam: 'Zwart', kleur: '#2a2a2a' },
    { code: 'U708', naam: 'Lichtgrijs', kleur: '#c8c8c4' },
    { code: 'U702', naam: 'Kasjmiergrijs', kleur: '#b8b0a2' },
    { code: 'H1180', naam: 'Halifax eik natuur', kleur: '#b48659' },
    { code: 'H1145', naam: 'Bardolino eik natuur', kleur: '#a8845a' },
  ],
  frontMateriaal: 'Melamine',
  decorKorpus: 'W980',
  decorFront: 'H1180',
  blum: {
    // Ladetypes: code en hoogte van de laderug (benaderend; controleren met Blum).
    // LEGRABOX-catalogus (zaagmaten voor 16 mm): bodem LW − 35 × NL − 10, rug LW − 38.
    LEGRABOX: { bodemB: 35, bodemD: 10, rugB: 38, rugH: 120, gaten: [37, 261, 357, 453], gatHoogte: 37,
      // frontGaten: EXPANDO-frontbevestiging, hoogtes van de gaten vanaf de onderkant van de lade (Blum LEGRABOX-catalogus).
      types: [{ code: 'N', rugH: 70, frontGaten: [45.5, 61.5] }, { code: 'M', rugH: 90, frontGaten: [51, 83], frontArtikel: 'Häfele 550.75.064' }, { code: 'K', rugH: 128, frontGaten: [51, 83] },
        { code: 'C', rugH: 177, frontGaten: [51, 83, 179, 211] }, { code: 'F', rugH: 241, frontGaten: [51, 83, 179, 211, 243] }] },
    TANDEMBOX: { bodemB: 75, bodemD: 24, rugB: 87, rugH: 84, gaten: [37, 261, 357, 453], gatHoogte: 37,
      types: [{ code: 'N', rugH: 68 }, { code: 'M', rugH: 84 }, { code: 'K', rugH: 116 }, { code: 'D', rugH: 199 }] },
    MOVENTO: { bodemB: 42, bodemD: 10, rugB: 42, rugH: 120, gaten: [37, 261, 357, 453], gatHoogte: 37,
      types: [{ code: '100', rugH: 100 }, { code: '150', rugH: 150 }, { code: '200', rugH: 200 }] },
  },
};

const NL_LIST = [270, 300, 350, 400, 450, 500, 550, 600, 650];
const SERIES = ['LEGRABOX', 'TANDEMBOX', 'MOVENTO'];
const PLAATTYPES = ['Melamine', 'HPL', 'Trespa'];

const SECTION_TYPES = {
  deur: 'Deur(en)',
  lade: 'Lade(s)',
  open: 'Open vak',
  toestel: 'Toestel',
  klep: 'Klepdeur',
};

// MARK: - De 20 kasttypes

const sec = (type, extra = {}) => ({ type, hoogte: null, legplanken: 0, lades: 1, serie: 'LEGRABOX', verluchting: false,
  ladeType: '', opVloer: false, toestel: '', nis: null, nisBreedte: null, nisDiepte: null, ...extra });

const BASE = {
  breedte: null, hoogte: null, diepte: null,
  plint: 'stelpoten', plintHoogte: null,
  plaatDikte: null, rugDikte: null,        // leeg: standaard uit Instellingen
  decorKorpus: null, decorFront: null, decorRug: null, // leeg: standaard uit Instellingen (rug: zoals korpus)
  bandKorpusDecor: 'korpus',               // band op de voorkant van het korpus: 'korpus', 'front' of een decorcode
  partDecor: {}, edgeDecor: {},            // per stuk: decor van het paneel en van elke band
  verluchting: null,                       // bij toestellen: dubbele bodem onderaan en dubbele regel bovenaan
  leds: {},                                // per stuk: led-groeven
  frontMateriaal: null,                    // plaattype van de fronten ('Melamine' of 'HPL'; leeg = standaard)
  partType: {},                            // per stuk: ander plaattype
  uitstekOnder: 0, uitstekBoven: 0,        // fronten laten uitsteken (mm)
  houtDoorlopend: 'nee',                    // houtstructuur over de fronten: 'nee', 'kast' of 'vorige' (ook met de vorige kast)
  plaatsing: 'auto', posX: null, posY: null, posZ: null, rot: 0, // plaats in de opstelling van het project
  greepHart: null,                         // hart-op-hart van de greepgaten (mm); leeg = standaard, 0 = knop (één gat)
  frontGreep: {},                          // per front: een andere hart-op-hart (mm), of 'geen'
  top: 'regels', rug: 'groef', zichtL: false, zichtR: false,
  front: 'opliggend', greep: 'greep', deuren: 'auto', scharnierKant: 'links', blindBreedte: 0, blindKant: 'links',
};

const PRESETS = [
  { id: 'onder-greep', naam: 'Onderkast met greep', groep: 'Onderkasten', kast: { secties: [sec('deur', { legplanken: 1 })] } },
  { id: 'onder-greeploos', naam: 'Onderkast greeploos', groep: 'Onderkasten', kast: { greep: 'greeplijst', secties: [sec('deur', { legplanken: 1 })] } },
  { id: 'onder-lades', naam: 'Onderkast met lades', groep: 'Onderkasten', kast: { secties: [sec('lade', { lades: 3 })] } },
  { id: 'onder-lades-greeploos', naam: 'Onderkast met lades, greeploos', groep: 'Onderkasten', kast: { greep: 'greeplijst', secties: [sec('lade', { lades: 3 })] } },
  { id: 'spoelbak', naam: 'Spoelbakkast', groep: 'Onderkasten', kast: { rug: 'geen', top: 'staand', wegneembareRug: true, secties: [sec('deur')] } },
  { id: 'oven', naam: 'Kast met oven', groep: 'Onderkasten', kast: { verluchting: false, secties: [sec('lade'), sec('toestel', { toestel: 'Oven', nis: 590 })] } },
  { id: 'kookplaat', naam: 'Kookplaatkast met lades', groep: 'Onderkasten', kast: { secties: [sec('lade', { lades: 2 }), sec('lade', { hoogte: 180 })] } },
  { id: 'afval', naam: 'Afvalkast met uittrek', groep: 'Onderkasten', kast: { secties: [sec('lade')] } },
  { id: 'hoek', naam: 'Hoekkast onder (blinde hoek)', groep: 'Onderkasten', kast: { blindBreedte: 300, secties: [sec('deur', { legplanken: 1 })] } },
  { id: 'eiland', naam: 'Eilandkast rug aan rug', groep: 'Onderkasten', kast: { rug: 'opgeschroefd', zichtL: true, zichtR: true, secties: [sec('deur', { legplanken: 1 })] } },
  { id: 'kolom', naam: 'Kolomkast', groep: 'Kolomkasten', kast: { top: 'vol', secties: [sec('deur', { legplanken: 2 }), sec('deur', { legplanken: 2 })] } },
  { id: 'kolom-toestel', naam: 'Kolomkast met toestel met verluchting', groep: 'Kolomkasten', kast: { top: 'vol', verluchting: true, secties: [sec('deur', { legplanken: 1 }), sec('toestel', { toestel: 'Toestel', nis: 590 }), sec('deur', { legplanken: 1 })] } },
  { id: 'kolom-koelkast', naam: 'Kolomkast met inbouwkoelkast', groep: 'Kolomkasten', kast: { top: 'vol', verluchting: true, secties: [sec('toestel', { toestel: 'Koelkast', nis: 1780 }), sec('deur', { legplanken: 1 })] } },
  { id: 'kolom-oven-micro', naam: 'Kolomkast met oven en microgolf', groep: 'Kolomkasten', kast: { top: 'vol', verluchting: true, secties: [sec('lade', { lades: 2 }), sec('toestel', { toestel: 'Oven', nis: 590 }), sec('toestel', { toestel: 'Microgolf', nis: 450 }), sec('deur', { legplanken: 1 })] } },
  { id: 'wasmachine', naam: 'Kast met wasmachine', groep: 'Kolomkasten', kast: { top: 'vol', plint: 'geen', verluchting: false, secties: [sec('toestel', { toestel: 'Wasmachine', nis: 870, opVloer: true }), sec('deur', { legplanken: 1 })] } },
  { id: 'was-droog', naam: 'Kast met wasmachine, droogkast en lade', groep: 'Kolomkasten', kast: { top: 'vol', verluchting: false, secties: [sec('lade', { hoogte: 250 }), sec('toestel', { toestel: 'Wasmachine', nis: 870 }), sec('toestel', { toestel: 'Droogkast', nis: 870 }), sec('deur', { legplanken: 1 })] } },
  { id: 'boven-deuren', naam: 'Bovenkast met deuren', groep: 'Bovenkasten', kast: { plint: 'geen', top: 'vol', secties: [sec('deur', { legplanken: 2 })] } },
  { id: 'boven-klep', naam: 'Bovenkast met klepdeur', groep: 'Bovenkasten', kast: { plint: 'geen', top: 'vol', secties: [sec('klep', { legplanken: 1 })] } },
  { id: 'boven-dampkap', naam: 'Bovenkast boven dampkap', groep: 'Bovenkasten', kast: { plint: 'geen', top: 'vol', secties: [sec('deur')] } },
  // Verborgen (vervangen door de optie "Zonder fronten" bij elke kast); blijft voor bestaande projecten.
  { id: 'open', naam: 'Open kast', groep: 'Bovenkasten', verborgen: true, kast: { plint: 'geen', top: 'vol', secties: [sec('open', { legplanken: 2 })] } },
];

function newCabinet(presetId) {
  const preset = PRESETS.find(p => p.id === presetId) ?? PRESETS[0];
  return JSON.parse(JSON.stringify({ ...BASE, ...preset.kast, type: preset.id, edgeOverrides: {} }));
}

// MARK: - Hulpmiddelen

const r1 = n => Math.round(n * 10) / 10;

/**
 * Deuvels volgens de programma's van de P110, gemeten vanaf de voorkant van het liggende paneel (diepte P):
 * 30 en 62, dan gelijk verdeeld (hoogstens 130 uit elkaar), en P−89 en P−57. Smalle panelen: 2 deuvels.
 */
function dowelsFromFront(P, S) {
  const a1 = S.deuvelEersteVoor, a2 = a1 + S.deuvelPaar;
  const b2 = P - S.deuvelLaatsteAchter, b1 = b2 - S.deuvelPaar;
  if (b1 - a2 < 20) {
    if (P > 2 * a1 + 10) return [a1, P - a1];
    return [P / 4, P * 3 / 4];
  }
  const n = Math.max(1, Math.ceil((b1 - a2) / S.deuvelMaxTussen));
  const mid = Array.from({ length: n - 1 }, (_, i) => a2 + (i + 1) * (b1 - a2) / n);
  return [a1, a2, ...mid, b1, b2];
}

/** Schroeven: één minder dan het aantal deuvels, gelijk verdeeld van 45 tot P−72 (bij 2 deuvels: in het midden). */
function screwsFromFront(P, dowels, S) {
  const n = dowels.length - 1;
  if (n <= 0) return [];
  if (n === 1) return [(dowels[0] + dowels[1]) / 2];
  const a = Math.min(S.schroefVoor, dowels[0] + 15), b = Math.max(P - S.schroefAchter, dowels[dowels.length - 1] - 15);
  return Array.from({ length: n }, (_, i) => a + i * (b - a) / (n - 1));
}

/** Oude verdeling (gelijk verdeeld), voor wie dat in Instellingen kiest. */
function dowelPositions(len, S) {
  const m = S.deuvelMarge;
  if (len <= 2 * m) return [len / 2];
  const span = len - 2 * m;
  const n = Math.max(2, Math.round(span / S.deuvelAfstand) + 1);
  return Array.from({ length: n }, (_, i) => m + i * span / (n - 1));
}

/** Clamex: eerste en laatste op `marge` van de rand, verder hoogstens `maxAfstand` uit elkaar. */
function clamexPositions(len, S) {
  // Smal paneel (bv. een regel van 100 mm): één Clamex in het midden.
  if (len <= 2 * S.clamexMarge) return [len / 2];
  const m = S.clamexMarge;
  const n = Math.max(2, Math.ceil((len - 2 * m) / S.clamexMaxAfstand) + 1);
  return Array.from({ length: n }, (_, i) => m + i * (len - 2 * m) / (n - 1));
}

/** Gelijk verdeeld met een vaste afstand, vanaf `marge` van elk uiteinde. */
function spreadPositions(len, step, marge) {
  if (len <= 2 * marge) return [len / 2];
  const n = Math.max(2, Math.ceil((len - 2 * marge) / step) + 1);
  return Array.from({ length: n }, (_, i) => marge + i * (len - 2 * marge) / (n - 1));
}

/** Aantal scharnieren volgens de Blum-tabel (deurhoogte); een deur breder dan 600 mm (zwaarder) krijgt er één bij. */
// MARK: - Vrije vormen (organische ronde kant)
/** Vormen: uitsteek als factor van de grootste uitsteek, langs de diepte s (0 = voorkant, 1 = achterkant). */
const VRIJE_VORMEN = {
  ellips: { naam: 'Ellips', m: () => 1 },
  golf: { naam: 'Golf', m: s => 0.92 + 0.08 * Math.cos(4 * Math.PI * (s - 0.25)) },
  druppel: { naam: 'Druppel', m: s => 0.62 + 0.45 * Math.pow(1 - s, 1.3) },
  s: { naam: 'S-bocht', m: s => 0.84 + 0.16 * Math.sin(2 * Math.PI * s) },
};
/**
 * Omtrek van een vrije vorm (buitenkant, zonder dikte) van vooraan (cx, zF) naar achteraan (cx, zB): x = cx − A·f(s).
 * f = halve ellips × vormfactor × de drie bolletjes (vooraan, midden, achteraan), zodat de lijn aan beide uiteinden
 * haaks op het vlak van de kast vertrekt (zoals bij de halfronde kant).
 */
function vrijeVormLijn(rd, zF, zB, cx, A, n = 60) {
  const vorm = VRIJE_VORMEN[rd.vrijVorm] ?? VRIJE_VORMEN.ellips;
  const h = [1, ...(rd.vrijH ?? [1, 1, 1]).map(v => Math.max(0.3, Math.min(1.8, Number(v) || 1))), 1];
  const hAt = s => { const x = s * 4, i = Math.min(3, Math.floor(x)), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2; return h[i] * (1 - w) + h[i + 1] * w; };
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = (1 - Math.cos(Math.PI * i / n)) / 2;            // dichter bij de uiteinden
    const e = Math.sqrt(Math.max(0, 1 - (2 * s - 1) ** 2));
    pts.push([cx - A * e * vorm.m(s) * hAt(s), zF - s * (zF - zB)]);
  }
  return pts;
}
/** Lijn evenwijdig verschuiven (d > 0 = naar binnen, naar de kast): de lijn loopt van voor naar achter met de kast aan de +x-kant. */
function offsetLijn(pts, d) {
  const n = pts.length;
  return pts.map((p, i) => {
    let tx, tz;
    if (i === 0) { tx = -1; tz = 0; } else if (i === n - 1) { tx = 1; tz = 0; }
    else { tx = pts[i + 1][0] - pts[i - 1][0]; tz = pts[i + 1][1] - pts[i - 1][1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; }
    return [p[0] - tz * d, p[1] + tx * d];
  });
}

function hingeCount(h, w = 0) {
  return (h <= 900 ? 2 : h <= 1600 ? 3 : h <= 2000 ? 4 : 5) + (w > 600 ? 1 : 0);
}

// MARK: - Kast opbouwen

/** Instellingen voor deze kast: eigen plaatdikte en rugdikte gaan voor op de standaard. */
function cabinetSettings(k, S) {
  const out = { ...S };
  if ((k.secties ?? []).some(s => s.type === 'toestel')) out.rugInsprong = S.rugInsprongToestel;
  if (Number(k.plaatDikte) > 0) out.plaat = Number(k.plaatDikte);
  if (Number(k.rugDikte) > 0) {
    if (k.rug === 'opgeschroefd') out.rugDik = Number(k.rugDikte);
    else {
      // De groef groeit mee met de rug; de speling blijft dezelfde.
      out.groefBreedte = S.groefBreedte + (Number(k.rugDikte) - S.rug);
      out.rug = Number(k.rugDikte);
    }
  }
  return out;
}

/**
 * Zijpaneel: 'gelijk' = voorkant gelijk met het front (het front zit ernaast/erachter; dan max. zijpaneelNaastFront dik
 * en 155°-scharnieren aan die kant) of 'over' = het front loopt over de voorkant van het paneel.
 */
function zijpaneelMode(k) {
  return k.front === 'inliggend' || k.zonderFronten ? 'gelijk' : (k.zijpaneelFront === 'over' ? 'over' : 'gelijk');
}
function zijpaneelDikte(k, S) {
  if (Number(k.zijpaneelDikte) > 0) return Number(k.zijpaneelDikte);
  return zijpaneelMode(k) === 'gelijk' && k.front !== 'inliggend' && !k.zonderFronten ? Math.min(S.front, S.zijpaneelNaastFront) : S.front;
}

/**
 * Buigtriplex lang (boog langs de 2440 van de plaat) of kort (boog langs de 1220): per stuk de soort waarop het past.
 * boog = afgewikkelde lengte, h = hoogte. voorkeur: 'lang' / 'kort' / leeg = automatisch (kort buigend als het past).
 */
function buigKeuze(boog, h, S, voorkeur) {
  const N = S.nest ?? {}, rand = 2 * (Number(N.randafzaag) || 10);
  const L = (Number(N.buigLengte) || 2440) - rand, B = (Number(N.buigBreedte) || 1220) - rand;
  const past = { lang: boog <= L && h <= B, kort: boog <= B && h <= L };
  // Automatisch: kort buigend als het past (dat is ook nodig voor hoge stukken), zodat er zo weinig mogelijk soorten
  // platen nodig zijn; lang buigend alleen voor een lange, lage boog.
  const auto = past.kort ? 'kort' : 'lang';
  const eerst = voorkeur === 'lang' || voorkeur === 'kort' ? voorkeur : auto, ander = eerst === 'lang' ? 'kort' : 'lang';
  const richting = past[eerst] ? eerst : past[ander] ? ander : eerst;
  return { richting, past: past[richting], omgezet: !!voorkeur && voorkeur !== 'auto' && richting !== voorkeur };
}

function buildCabinet(k, S = DEFAULT_SETTINGS) {
  S = cabinetSettings(k, S);
  const W = Number(k.breedte), H = Number(k.hoogte), D = Number(k.diepte);
  if (!(W > 0 && H > 0 && D > 0)) return { parts: [], warnings: [], hardware: [], zones: [], error: 'Vul breedte, hoogte en diepte in.' };
  // Schuine kast (onder een trap of een schuin dak): H is de hoogte aan de hoge kant, de hoek bepaalt de lage kant.
  const sch = k.schuin ?? {};
  // Spits toelopend (trapkast tot 0 mm): de hoek volgt uit hoogte en breedte; geen zijwand aan de lage kant.
  // Ook automatisch als de ingegeven hoek de lage kant (bijna) op 0 mm brengt.
  const hoekIn = (Number(sch.hoek) || 0) * Math.PI / 180;
  const autoPunt = sch.richting === 'lr' && sch.laag !== 'punt' && hoekIn > 0 && Math.abs(H - W * Math.tan(hoekIn)) <= 5;
  const punt = sch.richting === 'lr' && (sch.laag === 'punt' || autoPunt);
  const sa = punt ? Math.atan(H / W) : hoekIn;
  const lr = sch.richting === 'lr' && sa > 0, vb = sch.richting === 'vb' && sa > 0;
  const schuin = lr || vb;
  const tanA = Math.tan(sa), cosA = Math.cos(sa), sinA = Math.sin(sa);
  const rechtsHoog = sch.hoog === 'rechts';
  const yTopX = x => lr ? H - (rechtsHoog ? W - x : x) * tanA : H;   // bovenkant korpus over de breedte
  const yTopZ = z => vb ? H - (D - z) * tanA : H;                    // bovenkant korpus over de diepte (voor hoog)
  if (schuin) {
    if (sa >= Math.PI / 3) return { parts: [], warnings: [], hardware: [], zones: [], error: 'De hoek is te groot (maximaal 60°).' };
    const laag = lr ? H - W * tanA : H - D * tanA;
    if (laag < 150 && !punt) {
      const maxHoek = Math.atan(H / W) * 180 / Math.PI;
      return { parts: [], warnings: [], hardware: [], zones: [], error: laag < 0
        ? `Met ${r1(sa * 180 / Math.PI)}° raakt de schuine kant de bodem al vóór de lage kant. Bij ${W} breed en ${H} hoog loopt de kast tot een punt bij ${r1(maxHoek)}°: kies Lage kant "Punt" of een kleinere hoek.`
        : `Aan de lage kant is de kast maar ${Math.round(laag)} mm hoog; een zijwand past daar niet. Kies Lage kant "Punt" (dan wordt de hoek ${r1(maxHoek)}°), een kleinere hoek of een hogere kast.` };
    }
    if (k.top !== 'vol') k = { ...k, top: 'vol' };       // een schuine kast heeft altijd een (schuine) volle top
  }
  const preWarnings = [];
  if (autoPunt) preWarnings.push(`Met ${r1(hoekIn * 180 / Math.PI)}° komt de lage kant op 0 mm: de kast is als punt gemaakt (in verstek).`);
  // Trapkast: de deur scharniert altijd aan de hoge kant (één deur).
  if (lr) {
    if (k.deuren === '2' || (k.deuren === 'auto' && W > S.deurMaxBreedte)) preWarnings.push(`Schuine kast: één deur, scharnierend aan de hoge kant${W > S.deurMaxBreedte ? ` (breder dan ${S.deurMaxBreedte} mm: controleer het aantal scharnieren en het gewicht)` : ''}.`);
    k = { ...k, deuren: '1', scharnierKant: rechtsHoog ? 'rechts' : 'links' };
  }
  if (punt) {
    if (k.secties?.length > 1 || k.secties?.some(x => x.type !== 'deur' && x.type !== 'open')) preWarnings.push('Spitse kast: gebruik één vak met een deur (of open); andere vakken worden niet juist gemaakt.');
    if (k.secties?.some(x => Number(x.legplanken) > 0)) preWarnings.push('Spitse kast: geen losse legplanken (aan de punt is er niets om op te steunen).');
    k = { ...k, deuren: '1', scharnierKant: rechtsHoog ? 'rechts' : 'links', blindBreedte: 0, secties: (k.secties ?? []).map(x => ({ ...x, legplanken: 0 })) };
  }

  // Zonder fronten (open kast): deur-, klep- en ladevakken worden open vakken (legplanken, stijlen en vaste legplanken
  // blijven), geen greep, geen blinde hoek; paslatten komen gelijk met de voorkant van het korpus.
  const zonderFronten = !!k.zonderFronten;
  if (zonderFronten) {
    k = { ...k, greep: 'geen', front: 'opliggend', uitstekOnder: 0, uitstekBoven: 0, blindBreedte: 0,
      secties: (k.secties ?? []).map(x => ['deur', 'klep', 'lade'].includes(x.type) ? { ...x, type: 'open', legplanken: x.type === 'lade' ? 0 : x.legplanken } : x),
      rond: k.rond?.nis?.aan ? { ...k.rond, nis: { ...k.rond.nis, inhoud: 'open' } } : k.rond };
  }

  const t = S.plaat;
  const v = S.voeg;
  const fd = S.front;
  const zFP = zonderFronten ? D - fd : D;                  // achterkant van de frontpaslatten (voorvlak − dikte)
  const warnings = [...preWarnings];
  const parts = [];
  const hw = {};
  const count = (name, n = 1) => { hw[name] = (hw[name] ?? 0) + n; };
  // Te bestellen (op maat gemaakte lades, ...): aparte lijst naast het beslag.
  const ord = {};
  const order = (name, n = 1) => { ord[name] = (ord[name] ?? 0) + n; };

  if (k.rug === 'groef' && S.groefDiepte >= S.plaat) warnings.push(`De rugwandgroef (${S.groefDiepte} mm diep) is te diep voor een plaat van ${S.plaat} mm.`);
  if (k.rug === 'groef' && S.rugInsprong + S.groefBreedte >= W / 2) warnings.push('De rugwandgroef past niet in deze kast.');
  const P = k.plint === 'geen' ? 0 : Number(k.plintHoogte) || 0;
  if (k.plint !== 'geen' && !P) warnings.push('Vul de plinthoogte in.');
  const Pv = k.plint === 'vast' ? P : 0;               // zijwanden lopen door tot de vloer
  const groef = k.rug === 'groef';
  const zBack = k.rug === 'opgeschroefd' ? S.rugDik : 0; // achterkant van zijwanden en bodem
  const Dk = D - zBack;                                  // diepte van zijwanden en bodem
  const rugFront = groef ? zBack + S.rugInsprong + S.groefBreedte : zBack;
  const frontInset = k.front === 'inliggend' ? fd : 0;
  const gd = S.groefDiepte, gw = S.groefBreedte, gs = S.rugSpeling;
  // Hangkast greeploos: geen greeplijst, de fronten steken onderaan uit zodat je ze langs onder vastneemt.
  const hangGreeploos = k.greep === 'greeplijst' && PRESETS.find(x => x.id === k.type)?.groep === 'Bovenkasten';
  const greeplijst = k.greep === 'greeplijst' && !hangGreeploos;

  // Vaste code per onderdeel (naam + volgnummer), zodat aangepaste kantenbanden bewaard blijven.
  const seen = {};
  const add = p => {
    if (!p.id) {
      const base = p.naam.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      seen[base] = (seen[base] ?? 0) + 1;
      p.id = `${base}-${seen[base]}`;
    }
    p.ops = p.ops ?? [];
    p.edges = { u0: 0, u1: 0, v0: 0, v1: 0, ...(p.edges ?? {}), ...(k.edgeOverrides?.[p.id] ?? {}) };
    parts.push(p);
    return p;
  };

  // Zijwanden
  const sideH = H + Pv;
  const side = left => {
    // Schuin over de breedte: elke zijwand zo hoog als de bovenkant aan zijn binnenkant.
    // Trapkast: zijwand en top in verstek; de zijwand is aan de buitenkant zo hoog als de schuine bovenkant (lange punt).
    const hS = lr ? yTopX(left ? 0 : W) + Pv : sideH;
    const p = add({
      id: left ? 'zij-l' : 'zij-r', naam: left ? 'Zijwand links' : 'Zijwand rechts', rol: 'zijwand', mat: 'korpus', dikte: t,
      box: { x: left ? 0 : W - t, y: -Pv, z: zBack, w: t, h: hS, d: Dk },
      uLen: Dk, vLen: hS, grain: 'v', edges: { u0: S.bandKorpus, u1: S.bandKorpus, v0: S.bandKorpus, v1: S.bandKorpus }, left, zicht: left ? !!k.zichtL : !!k.zichtR,
    });
    if (lr) {
      const hIn = yTopX(left ? t : W - t) - t / cosA + Pv;  // binnenkant: onderkant van de top
      p.vInner = hIn;
      p.shape3d = { plane: 'xy', pts: left ? [[0, 0], [t, 0], [t, hIn], [0, hS]] : [[0, 0], [t, 0], [t, hS], [0, hIn]] };
    }
    if (vb) {
      // Schuin over de diepte: trapezium (voor hoog, achter laag); de schuine kant wordt op de CNC gefreesd.
      const vB = yTopZ(zBack) + Pv;
      p.shape = [[0, 0], [Dk, 0], [Dk, hS], [0, vB]];
      p.ops.push({ kind: 'contour', pts: [[0, vB], [Dk, hS]], waste: [0, hS], naam: 'Schuine kant' });
    }
    return p;
  };
  const sideL = side(true);
  const sideR = side(false);
  const sides = [sideL, sideR];
  const sideV = y => y + Pv;
  const sideU = z => z - zBack;

  /** Schuin over de breedte: een paneel in het vlak van de fronten (front, rug) bovenaan schuin afwerken. */
  const shapeTopLR = (p, topAt) => {
    if (!lr) return;
    const y1 = p.box.y + p.box.h;
    const yL = Math.min(y1, topAt(p.box.x)), yR = Math.min(y1, topAt(p.box.x + p.box.w));
    if (yL >= y1 - 0.1 && yR >= y1 - 0.1) return;
    const hl = yL - p.box.y, hr = yR - p.box.y, top = Math.max(hl, hr);
    if (Math.min(hl, hr) < 40 && !punt) warnings.push(`${p.naam}: aan de lage kant maar ${Math.round(Math.min(hl, hr))} mm hoog.`);
    p.box.h = top; p.vLen = top;
    p.shape = [[0, 0], [p.uLen, 0], [p.uLen, hr], [0, hl]];
    p.edgeH = { u0: hl, u1: hr };
    p.ops.push({ kind: 'contour', pts: [[0, hl], [p.uLen, hr]], waste: hl > hr ? [p.uLen, top] : [0, top], naam: 'Schuine kant' });
  };

  // Merkteken onderaan achteraan op de binnenkant van elke zijwand, zodat je ziet waar onder-achter is.
  if (S.hoekMerk) {
    for (const s of sides) s.ops.push({ kind: 'boring', face: 'binnen', u: S.hoekMerkRand, v: S.hoekMerkRand, dia: S.hoekMerkDia, diepte: S.hoekMerkDiepte, naam: 'Merk onder achter' });
  }

  /** Verbinding van een liggend paneel met beide zijwanden: Clamex aan een zichtzijde, anders deuvels en schroeven. */
  /** Verbinding; bij een regel altijd twee deuvels (gemeten vanaf de achterkant van de regel) en één schroefgat ertussen. */
  // Een wand is een zijwand of een middenstijl: in welk vlak de boringen komen en hoe z/y omrekenen naar (u, v).
  const sideWall = s => ({ part: s, face: 'binnen', u: sideU, v: sideV, edge: s.left ? 'u0' : 'u1', zicht: s.zicht, screws: true });
  const join = (hp, yCenter, regel = false, walls = sides.map(sideWall)) => {
    for (const w of walls) {
      // Schuine kast: regels en bodems altijd met Clamex aan de zijwanden.
      const s = { ops: w.part.ops, zicht: w.zicht || (schuin && w.face === 'binnen') };
      const sideU = w.u, face = w.face;
      const edge = w.edge;
      const sv = w.v(yCenter);
      const P = hp.vLen;
      const fromFront = d => P - d;          // v = 0 is de achterkant van het liggende paneel
      const dowel = d => {
        const pos = fromFront(d);
        const a = { kind: 'boring', face, u: sideU(hp.box.z + pos), v: sv, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' };
        const b = { kind: 'boring', edge, pos, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' };
        s.ops.push(a); hp.ops.push(b);
        count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
        return [[w.part, a], [hp, b]];
      };
      if (s.zicht) {
        // Zichtzijde: Clamex P-14 (in de zijwand met frees 202, in de kant met zaag 201), met een deuvel aan weerszijden.
        for (const c of clamexPositions(P, S)) {
          const pos = fromFront(c);
          const pair = { face: null, edge: null };
          s.ops.push(pair.face = { kind: 'clamex', face, u: sideU(hp.box.z + pos), v: sv, naam: 'Clamex', pair });
          hp.ops.push(pair.edge = { kind: 'clamex', edge, pos, naam: 'Clamex', pair });
          count('Lamello Clamex P-14');
          pair.dowels = [];
          for (const d of [c - S.clamexDeuvel, c + S.clamexDeuvel]) if (d > 15 && d < P - 15) pair.dowels.push(...dowel(d));
        }
      } else {
        const dowels = regel ? (P > 2 * S.deuvelEersteVoor + 10 ? [S.deuvelEersteVoor, P - S.deuvelEersteVoor] : [P / 4, P * 3 / 4])
          : dowelsFromFront(P, S);
        dowels.forEach(dowel);
        if (S.schroeven && w.screws) {
          for (const d of screwsFromFront(P, dowels, S)) {
            s.ops.push({ kind: 'boring', face, u: sideU(hp.box.z + fromFront(d)), v: sv, dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef' });
            count('Schroef');
          }
        }
      }
    }
  };

  /** Rechtopstaand paneel tussen de zijwanden (lat, staande regel): per zijwand twee deuvels en een schroef ertussen;
   *  aan een zichtzijde enkel deuvels, zodat er geen schroefkop in zicht komt. */
  const uprightJoin = (p, y0, h, zc) => {
    const dowels = h > 2 * S.deuvelEersteVoor + 10 ? [S.deuvelEersteVoor, h - S.deuvelEersteVoor] : [h / 4, h * 3 / 4];
    for (const sd of sides) {
      const u = sideU(zc);
      for (const d of dowels) {
        sd.ops.push({ kind: 'boring', face: 'binnen', u, v: sideV(y0 + d), dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
        p.ops.push({ kind: 'boring', edge: sd.left ? 'u0' : 'u1', pos: d, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
        count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
      }
      if (S.schroeven && !sd.zicht) {
        sd.ops.push({ kind: 'boring', face: 'binnen', u, v: sideV(y0 + h / 2), dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef' });
        count('Schroef');
      }
    }
  };

  /** Liggend paneel tussen de zijwanden. */
  const horizontal = (o) => {
    const dk = o.dikte ?? t;
    const p = add({
      rol: 'liggend', mat: 'korpus', dikte: dk, grain: 'u', edges: { v1: o.band ?? S.bandKorpus },
      box: { x: t, y: o.y, z: o.z, w: W - 2 * t, h: dk, d: o.d },
      uLen: W - 2 * t, vLen: o.d, ...o.extra, naam: o.naam,
    });
    join(p, o.y + dk / 2, !!o.regel);
    return p;
  };

  const rugGroove = (p, face) => {
    if (!groef) return;
    const vg = sideU(zBack + S.rugInsprong + gw / 2) - (p.box.z - zBack);
    p.ops.push({ kind: 'groef', face, u1: 0, v1: vg, u2: p.uLen, v2: vg, breedte: gw, diepte: gd, naam: 'Rugwandgroef' });
  };

  // Indeling in zones (van onder naar boven)
  const secs = k.secties?.length ? k.secties : [sec('open')];
  const hasBodem = !(secs[0].type === 'toestel' && secs[0].opVloer);
  const hasToestel = secs.some(s => s.type === 'toestel');
  // Verluchting alleen helemaal onder (dubbele bodem) en helemaal boven (dubbele regel) in de kast.
  const verl = hasToestel && (k.verluchting ?? secs.some(s => s.verluchting));
  const verlOnder = verl && hasBodem;
  const bottomBand = hasBodem ? (verlOnder ? 2 * t + S.verluchtingSpleet : t) : 0;
  // Bovenaan dubbele regel voor de verluchting, behalve bij een volle top (dan gaat de lucht achter de rug naar boven).
  const verlBoven = verl && k.top !== 'vol';
  const topBand = verlBoven ? 2 * t + S.verluchtingSpleet : k.top === 'staand' ? S.regelBreedte : t;
  // Hoogte van een vak: uit de inbouwhoogte van een toestel, een vaste hoogte, of automatisch.
  const heights = secs.map((s, i) => {
    if (s.type === 'toestel' && Number(s.nis) > 0) {
      return Number(s.nis) + (i === 0 ? bottomBand : t / 2) + (i === secs.length - 1 ? topBand : t / 2);
    }
    return Number(s.hoogte) > 0 ? Number(s.hoogte) : 0;
  });
  const fixed = heights.reduce((a, b) => a + b, 0);
  const autos = heights.filter(h => !h).length;
  const rest = H - fixed;
  if (rest < -0.5 || (autos && rest / autos < 60)) warnings.push('De vakken zijn samen hoger dan de kast. Pas de hoogtes van de vakken of de inbouwmaten aan.');
  if (!autos && Math.abs(rest) > 0.5) {
    // Alle vakken een vaste hoogte die niet op de kasthoogte uitkomt: het bovenste vak past zich aan.
    const li = heights.length - 1;
    if (heights[li] + rest >= 60) { heights[li] += rest; warnings.push(`De vakken waren samen ${r1(fixed)} mm, de kast is ${H} mm: het bovenste vak is aangepast naar ${r1(heights[li])} mm.`); }
    else warnings.push(`De vakken zijn samen ${r1(fixed)} mm, de kast is ${H} mm. Zet een vak op "automatisch".`);
  }
  let y = 0;
  const zones = secs.map((s, i) => {
    const h = heights[i] || (autos ? Math.max(0, rest) / autos : 0);
    const z = { index: i, sec: s, y0: y, y1: i === secs.length - 1 ? H : y + h };
    y += h;
    return z;
  });

  // Rug in een groef: de bodem en de top/regels staan vóór de rug (smaller, zonder groef) en de rug wordt erin geschroefd.
  // Uitzondering: bij een hangkast zit de rug onderaan in een groef in de bodem.
  const hangkast = PRESETS.find(x => x.id === k.type)?.groep === 'Bovenkasten';
  const rugInBodemGroef = groef && hangkast;
  const voorRug = groef ? rugFront : zBack;          // achterkant van bodem/top als ze vóór de rug staan

  // Bodem (bij verluchting dubbel: een tweede bodem erboven, naar achter geschoven)
  if (hasBodem) {
    // Verluchting: de buitenste (onderste) bodem springt terug, de binnenste ligt gelijk met de voorkant van de zijwand.
    const terug = verlOnder ? S.verluchtingInsprong : 0;
    // Spoelbakkast (wegneembare rug, geen vaste rug): de bodem begint even ver van de muur als de wegneembare rug,
    // zodat de leidingen erachter vrij naar boven kunnen.
    const leidingen = k.wegneembareRug && k.rug === 'geen' ? S.wegneembareRugAchter : 0;
    const bodem = rugInBodemGroef
      ? horizontal({ naam: 'Bodem', y: 0, z: zBack, d: Dk - terug, extra: { id: 'bodem' } })
      : horizontal({ naam: verlOnder ? 'Bodem (verluchting, achteruit)' : 'Bodem', y: 0, z: voorRug + leidingen, d: D - voorRug - terug - leidingen, extra: { id: 'bodem' } });
    if (rugInBodemGroef) rugGroove(bodem, 'boven');
    // Puntjes voor de stelpoten aan de onderkant van de bodem: per poot 4 puntjes in een vierkant.
    if (S.pootMerken && k.plint === 'stelpoten' && P > 0 && !hangkast) {
      const q = S.pootVierkant, L = bodem.uLen, Dv = bodem.vLen;
      const xs = [S.pootRandZij, L - S.pootRandZij - q];
      const ysAchter = S.pootAchter;                    // v = 0 is de achterkant
      const ysVoor = Dv - S.pootVoor - q;
      const feet = [...xs.flatMap(x => [[x, ysAchter], [x, ysVoor]])];
      if (L >= S.pootMiddenVoor) feet.push([L / 2 - q / 2, ysVoor]);
      if (L >= S.pootMiddenAchter) feet.push([L / 2 - q / 2, ysAchter]);
      for (const [x, y] of feet) for (const [du, dv] of [[0, 0], [q, 0], [0, q], [q, q]]) {
        bodem.ops.push({ kind: 'boring', face: 'onder', u: x + du, v: y + dv, dia: S.pootDia, diepte: S.pootDiepte, naam: 'Merk stelpoot' });
      }
    }
    if (verlOnder) horizontal({ naam: 'Bodem verluchting (binnen)', y: t + S.verluchtingSpleet, z: rugFront, d: D - rugFront, extra: { id: 'bodem-verluchting' } });
  }

  // Top of regels (bij verluchting met regels: een tweede regel eronder, naar achter geschoven)
  const rb = S.regelBreedte;
  if (schuin) {
    // Schuine top: een vlakke plaat onder de schuine bovenkant. De uiteinden die tegen de voorkant/rug of tegen de
    // zijwanden komen, zijn verticaal (schuin gezaagd), zodat alles sluit. In 3D: een parallellogram (shape3d).
    const deg = r1(sa * 180 / Math.PI);
    const tAt = t / cosA;                                   // verticale dikte van de schuine plaat
    const over = t * tanA;                                  // extra lengte door de schuine uiteinden
    const tilted = (o) => add({ id: 'top', naam: 'Top (schuin)', rol: 'schuin', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: S.bandKorpus }, ...o });
    if (vb) {
      const z0 = voorRug, Ls = (D - z0) / cosA;
      const yB = yTopZ(z0), yF = yTopZ(D);
      const top = tilted({ box: { x: t, y: yB - tAt, z: z0, w: W - 2 * t, h: yF - yB + tAt, d: D - z0 },
        shape3d: { plane: 'zy', pts: [[0, tAt], [D - z0, yF - yB + tAt], [D - z0, yF - yB], [0, 0]] }, uLen: W - 2 * t, vLen: Ls + over });
      // Clamex langs de schuine lijn, op het midden van de plaat (pos: vanaf de lange punt achteraan).
      const at = d => ({ z: D - d * cosA, y: yF - tAt / 2 - d * sinA });
      const posOf = d => over / 2 + Ls - d;
      for (const sd of sides) {
        const edge = sd.left ? 'u0' : 'u1';
        for (const c of clamexPositions(Ls, S)) {
          const q = at(c);
          // De Clamex in de zijwand volgt de schuine lijn (richting achter → voor).
          sd.ops.push({ kind: 'clamex', face: 'binnen', u: sideU(q.z), v: sideV(q.y), dir: [cosA, sinA], naam: 'Clamex (schuin)' });
          top.ops.push({ kind: 'clamex', edge, pos: posOf(c), naam: 'Clamex' });
          count('Lamello Clamex P-14');
          for (const d of [c - S.clamexDeuvel, c + S.clamexDeuvel]) {
            if (d < 15 || d > Ls - 15) continue;
            const r = at(d);
            sd.ops.push({ kind: 'boring', face: 'binnen', u: sideU(r.z), v: sideV(r.y), dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
            top.ops.push({ kind: 'boring', edge, pos: posOf(d), dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
            count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
          }
        }
      }
      warnings.push(`Schuine top: voor- en achterkant schuin zagen (${deg}°), zodat de voorkant verticaal staat en de achterkant tegen de rug sluit. Zaagmaat = lange kant.`);
    } else {
      // Trapkast: de top loopt tot over de buitenkant van de zijwanden en sluit er in verstek op aan,
      // over de volle diepte; de rug zit bovenaan in een groef in de onderkant van de top.
      const dd = D - zBack, Ls = W / cosA;
      const y0 = yTopX(0), yW = yTopX(W), yi0 = yTopX(t) - tAt, yiW = yTopX(W - t) - tAt;
      const yMin = Math.min(yi0, yiW), yMax = Math.max(y0, yW);
      const top = tilted({ box: { x: 0, y: yMin, z: zBack, w: W, h: yMax - yMin, d: dd },
        shape3d: { plane: 'xy', pts: [[t, yi0 - yMin], [W - t, yiW - yMin], [W, yW - yMin], [0, y0 - yMin]] }, uLen: Ls, vLen: dd });
      if (groef) top.ops.push({ kind: 'groef', face: 'onder', u1: 0, v1: S.rugInsprong + gw / 2, u2: Ls, v2: S.rugInsprong + gw / 2, breedte: gw, diepte: gd, naam: 'Rugwandgroef' });
      // Verstekhoek per kant: de hoek tussen zijwand en top, elk stuk de helft.
      const joint = left => ((left !== rechtsHoog) ? 90 - deg : 90 + deg);
      for (const sd of sides) {
        const half = r1(joint(sd.left) / 2);
        if (half < S.clamexMinHoek) {
          sd.ops.push({ kind: 'verstek', edge: 'v1', hoek: half, naam: 'Verstek zagen (A-hoek)' });
          top.ops.push({ kind: 'verstek', edge: sd.left ? 'u0' : 'u1', hoek: half, naam: 'Verstek zagen (A-hoek)' });
          warnings.push(`Verstek ${sd.left ? 'links' : 'rechts'} (${half}°) is te scherp voor Clamex: gezaagd met de gekantelde zaag en verlijmd.`);
          continue;
        }
        for (const c of clamexPositions(dd, S)) {
          sd.ops.push({ kind: 'clamex', edge: 'v1', pos: sideU(D - c), hoek: half, naam: 'Clamex (verstek)' });
          top.ops.push({ kind: 'clamex', edge: sd.left ? 'u0' : 'u1', pos: dd - c, hoek: half, naam: 'Clamex (verstek)' });
          count('Lamello Clamex P-14');
        }
      }
      const hoog = rechtsHoog ? 'rechts' : 'links', laag = rechtsHoog ? 'links' : 'rechts';
      warnings.push(`Trapkast in verstek: zijwand ${hoog} en top aan die kant op ${r1(joint(!rechtsHoog) / 2)}° zagen, zijwand ${laag} en top aan die kant op ${r1(joint(rechtsHoog) / 2)}° (lange punt aan de buitenkant). Clamex in beide verstekvlakken onder dezelfde hoek (Angle in de macro); controleer de richting op het eerste stuk in woodWOP.`);
    }
  } else if (k.top === 'vol') {
    // Greeploos met een greeplijst bovenaan: de top stopt achter de greeplijst.
    const greepBoven = greeplijst && ['deur', 'klep', 'lade'].includes(secs[secs.length - 1].type);
    const dTop = greepBoven ? S.greeplijstBinnenDiepte + t : 0;
    horizontal({ naam: 'Top', y: H - t, z: voorRug, d: D - voorRug - dTop, band: greepBoven ? 0 : undefined, extra: { id: 'top' } });
  } else if (k.top === 'staand' && !verl) {
    // Regels rechtop (bv. spoelbakkast): voorregel en achterregel staan op hun kant, binnen de zijwanden.
    const zFront = D - t - (greeplijst ? S.greeplijstBinnenDiepte + t : 0);
    for (const [naam, id, z] of [['Voorregel (rechtop)', 'regel-v', zFront], ['Achterregel (rechtop)', 'regel-a', rugFront]]) {
      const r = add({ id, naam, rol: 'liggend', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: S.bandKorpus },
        box: { x: t, y: H - rb, z, w: W - 2 * t, h: rb, d: t }, uLen: W - 2 * t, vLen: rb });
      uprightJoin(r, H - rb, rb, z + t / 2);
    }
  } else {
    // Bij een greeplijst schuift de voorregel naar achter, achter de greeplijst.
    const zFront = D - rb - (greeplijst ? S.greeplijstBinnenDiepte + t : 0);
    // Verluchting: de buitenste (bovenste) voorregel springt terug, de binnenste regel ligt gelijk met de voorkant.
    horizontal({ naam: verl ? 'Voorregel (verluchting, achteruit)' : 'Voorregel', y: H - t, z: zFront - (verl ? S.verluchtingInsprong : 0), d: rb, regel: true, extra: { id: 'regel-v' } });
    // De achterregel staat vóór de rug; de rug loopt tot boven en wordt op de regel geschroefd.
    horizontal({ naam: 'Achterregel', y: H - t, z: rugFront, d: rb, regel: true, extra: { id: 'regel-a' } });
    if (verl) horizontal({ naam: 'Regel verluchting (binnen)', y: H - 2 * t - S.verluchtingSpleet, z: zFront, d: rb, regel: true, extra: { id: 'regel-verluchting' } });
  }

  // Wegneembare rug (bv. spoelbakkast): een strook die op de bodem staat, wegneembareRugAchter van de achterkant
  // (ruimte voor de leidingen), tussen legplankdragers geschoven (per zijwand twee dragers achter en twee voor de strook).
  if (k.wegneembareRug) {
    if (k.rug !== 'geen') warnings.push('Een wegneembare rug kan alleen bij een kast zonder vaste rug (Rug: geen rug).');
    else {
      const hR = S.wegneembareRugHoogte, y0 = bottomBand, y1 = Math.min(y0 + hR, H - (k.top === 'staand' ? rb : t));
      const zp = zBack + S.wegneembareRugAchter;
      add({ id: 'rug-weg', naam: 'Wegneembare rug', rol: 'rug', mat: 'korpus', dikte: t, grain: 'u', bandPlaat: true, edges: { u0: S.bandKorpus, u1: S.bandKorpus, v0: S.bandKorpus, v1: S.bandKorpus },
        box: { x: t + 1, y: y0, z: zp, w: W - 2 * t - 2, h: y1 - y0, d: t }, uLen: W - 2 * t - 2, vLen: y1 - y0 });
      for (const sd of sides) for (const u of [zp - zBack - S.systeemDia / 2 - 0.5, zp - zBack + t + S.systeemDia / 2 + 0.5]) {
        for (const yy of [y0 + 40, y1 - 40]) sd.ops.push({ kind: 'boring', face: 'binnen', u, v: sideV(yy), dia: S.systeemDia, diepte: S.systeemDiepte, naam: 'Legplankdrager wegneembare rug' });
      }
      count('Legplankdrager', 8);
    }
  }

  // Panelen tussen de zones; per grens het bezette stuk [laag, hoog].
  const bounds = [{ lo: 0, hi: bottomBand }];
  for (let i = 0; i < zones.length - 1; i++) {
    const lower = zones[i].sec, upper = zones[i + 1].sec;
    const yb = zones[i].y1;
    if (lower.type === 'lade' && upper.type === 'lade') {
      bounds.push({ lo: yb, hi: yb, open: true });
    } else {
      horizontal({ naam: 'Tussenbodem', y: yb - t / 2, z: rugFront, d: D - rugFront });
      bounds.push({ lo: yb - t / 2, hi: yb + t / 2 });
    }
  }
  bounds.push({ lo: H - topBand, hi: H });
  zones.forEach((z, i) => { z.open0 = bounds[i].hi; z.open1 = bounds[i + 1].lo; });

  // Rug: geen rug achter toestellen; de rug bestaat uit stukken tussen de toestellen.
  const segments = [];
  for (let i = 0; i < zones.length; i++) {
    if (zones[i].sec.type === 'toestel') continue;
    let j = i;
    while (j + 1 < zones.length && zones[j + 1].sec.type !== 'toestel') j++;
    segments.push([i, j]);
    i = j;
  }
  const last = zones.length - 1;
  const segName = (n, idx) => n === 1 ? null : idx === 0 ? 'onder' : idx === n - 1 ? 'boven' : `midden ${idx}`;
  if (groef) {
    segments.forEach(([a, b], idx) => {
      // Onderaan en bovenaan in de groef; bij een toestel loopt de rug achter de tussenbodem door.
      // Onderaan: in de groef van de bodem (hangkast) of tot onder (geschroefd in de bodem); bovenaan altijd tot boven.
      // Met verluchting loopt de rug niet tot op de onderste bodem en niet tot tegen de bovenste regel,
      // zodat de lucht achter de rug door de spleet tussen de dubbele bodem/regels kan.
      const yb = a === 0 ? (hasBodem && rugInBodemGroef ? t - (gd - gs) : verlOnder ? t + S.verluchtingSpleet : 0) : bounds[a].lo;
      const zRug = zBack + S.rugInsprong + gw / 2;
      // Schuine kast: de rug loopt door tot tegen de schuine bovenkant (de top stopt vóór de rug), zodat achteraan niets open staat.
      const zRugAchter = zBack + S.rugInsprong + (gw - S.rug) / 2;
      const ytTop = vb ? yTopZ(zRugAchter) : lr ? Math.max(yTopX(t), yTopX(W - t)) - t / cosA + (gd - gs) : H;
      const yt = b === last ? (verlBoven ? H - t - S.verluchtingSpleet : ytTop) : bounds[b + 1].hi;
      const label = segName(segments.length, idx);
      // Groef in de zijwanden alleen waar deze rug zit; onder- en bovenaan loopt hij uit de plaat.
      for (const sd of sides) {
        const v1 = a === 0 ? 0 : sideV(yb), v2 = b === last ? sd.vLen : sideV(yt);
        sd.ops.push({ kind: 'groef', face: 'binnen', u1: S.rugInsprong + gw / 2, v1, u2: S.rugInsprong + gw / 2, v2, breedte: gw, diepte: gd, naam: 'Rugwandgroef' });
      }
      const rugPart = add({
        id: segments.length === 1 ? 'rug' : undefined, naam: label ? `Rugwand ${label}` : 'Rugwand', rol: 'rug', mat: 'rug', dikte: S.rug, grain: 'v',
        box: { x: t - (gd - gs), y: yb, z: zBack + S.rugInsprong + (gw - S.rug) / 2, w: W - 2 * t + 2 * (gd - gs), h: yt - yb, d: S.rug },
        uLen: W - 2 * t + 2 * (gd - gs), vLen: yt - yb,
      });
      if (punt && b === last) {
        // De rug stopt waar zijn schuine bovenkant de bodem raakt.
        const reach = (H - t / cosA + (gd - gs)) / tanA;
        const x0 = rugPart.box.x, x1 = x0 + rugPart.box.w;
        const nx0 = rechtsHoog ? Math.max(x0, W - reach) : x0, nx1 = rechtsHoog ? x1 : Math.min(x1, reach);
        rugPart.box.x = nx0; rugPart.box.w = rugPart.uLen = nx1 - nx0;
      }
      if (b === last) shapeTopLR(rugPart, x => yTopX(x) - t / cosA + (gd - gs));
    });
  } else if (k.rug === 'opgeschroefd') {
    segments.forEach(([a, b], idx) => {
      const yb = a === 0 ? 0 : bounds[a].lo;
      const yt = b === last ? H : bounds[b + 1].hi;
      const label = segName(segments.length, idx);
      const rug = add({
        id: segments.length === 1 ? 'rug' : undefined, naam: label ? `Rugpaneel ${label} (opgeschroefd)` : 'Rugpaneel (opgeschroefd)', rol: 'rug', mat: 'korpus', dikte: S.rugDik, grain: 'v',
        box: { x: 0, y: yb, z: 0, w: W, h: yt - yb, d: S.rugDik }, uLen: W, vLen: yt - yb,
      });
      const screw = (u, vv) => { rug.ops.push({ kind: 'boring', face: 'achter', u, v: vv, dia: S.schroefDia, diepte: S.rugDik, doorgaand: true, naam: 'Schroef' }); count('Schroef'); };
      for (const vv of spreadPositions(yt - yb, S.rugSchroefAfstand, 50)) { screw(t / 2, vv); screw(W - t / 2, vv); }
      for (const p of parts.filter(p => p.rol === 'liggend' && p.box.z <= zBack + 0.1 && p.box.y >= yb - 0.1 && p.box.y + t <= yt + 0.1)) {
        for (const u of spreadPositions(p.uLen, S.rugSchroefAfstand, 50)) screw(t + u, p.box.y - yb + t / 2);
      }
    });
  }

  // Hangkast: 3 gaten Ø10 voor het ophangbeslag bovenaan in elke zijwand, en in de rug twee uitsparingen Ø15
  // per kant om het beslag te kunnen bijstellen (zoals in de programma's van de P110).
  if (hangkast && S.ophangGaten) {
    for (const sd of sides) {
      for (let i = 0; i < 3; i++) {
        sd.ops.push({ kind: 'boring', face: 'binnen', u: S.ophangVanAchter, v: sideV(H) - S.ophangVanBoven - i * 32, dia: S.ophangDia, diepte: S.ophangDiepte, naam: 'Ophangbeslag' });
      }
    }
    count('Ophangbeslag (paar)');
    const rugTop = parts.filter(p => p.rol === 'rug').sort((a, b) => (b.box.y + b.box.h) - (a.box.y + a.box.h))[0];
    if (rugTop && groef) {
      for (const u of [28, rugTop.uLen - 28]) for (const dv of [78, 128]) {
        rugTop.ops.push({ kind: 'rondgat', face: 'voor', u, v: rugTop.vLen - dv, dia: 15, naam: 'Uitsparing ophangbeslag' });
      }
    }
  }

  // Plint (eventueel op een strook Trespa tegen vocht: de plint wordt even veel lager)
  const td = k.plintTrespa && P > S.trespaDikte ? S.trespaDikte : 0;
  const trespa = (x, w) => add({ id: 'plint-trespa', naam: 'Trespa onder plint', rol: 'trespa', mat: 'trespa', dikte: td, grain: 'u', edges: {},
    box: { x, y: -P, z: D - S.plintInsprong - t, w, h: td, d: t }, uLen: w, vLen: t });
  if (k.plint === 'stelpoten' && P) {
    add({ id: 'plint', naam: 'Plint', rol: 'plint', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: 0 },
      box: { x: 0, y: -P + td, z: D - S.plintInsprong - t, w: W, h: P - td, d: t }, uLen: W, vLen: P - td });
    if (td) trespa(0, W);
    count('Stelpoot', 4 + (W - 2 * t >= S.pootMiddenVoor ? 1 : 0) + (W - 2 * t >= S.pootMiddenAchter ? 1 : 0));
  } else if (k.plint === 'bak' && P) {
    // Plintenbak in multiplex: een volledige, geschroefde bak. Voorlat en achterlat over de volle breedte, zijkanten en
    // tussenlatten (om de ~600 mm) ertussen, met schroefgaten in voor- en achterlat bij elke lat.
    // Met afwerkplint komt de plint tegen de voorlat (zonder Clamex).
    const bt = S.plintBakDikte, afw = k.plintAfwerk !== false;
    const zPl = D - S.plintInsprong - t;                     // achterkant van de afwerkplint
    const zFL = (afw ? zPl : D - S.plintInsprong) - bt;      // achterkant van de voorlat
    const lat = (naam, x, z, w, d) => add({ naam, rol: 'plintbak', mat: 'korpus', dikte: bt, grain: 'u', edges: {}, decor: 'Multiplex', plaattype: 'Multiplex',
      box: { x, y: -P, z, w, h: P, d }, uLen: Math.max(w, d), vLen: P });
    const voorlat = lat('Plintenbak voor', 0, zFL, W, bt);
    const achterlat = lat('Plintenbak achter', 0, zBack, W, bt);
    const z0 = zBack + bt, inner = zFL - z0;
    const n = Math.max(2, Math.ceil((W - bt) / S.plintBakAfstand) + 1);
    const rails = [];
    for (let i = 0; i < n; i++) rails.push(lat(i === 0 ? 'Plintenbak zijkant links' : i === n - 1 ? 'Plintenbak zijkant rechts' : 'Plintenbak tussenlat', i * (W - bt) / (n - 1), z0, bt, inner));
    // Schroefgaten door voor- en achterlat in de kopse kant van elke lat.
    for (const r of rails) for (const pl of [voorlat, achterlat]) for (const f of [0.3, 0.7]) {
      pl.ops.push({ kind: 'boring', face: 'boven', u: r.box.x + bt / 2, v: P * f, dia: S.schroefDia, diepte: bt, doorgaand: true, naam: 'Schroef' });
      count('Schroef');
    }
    if (afw) {
      add({ id: 'plint', naam: 'Plint (op de bak)', rol: 'plint', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: 0 },
        box: { x: 0, y: -P + td, z: zPl, w: W, h: P - td, d: t }, uLen: W, vLen: P - td });
    }
    if (td) trespa(0, W);
    count('Plintenbak (multiplex)');
  } else if (k.plint === 'vast' && P) {
    for (const s of sides) s.ops.push({ kind: 'uitsparing', u: Dk - S.plintInsprong, v: 0, w: S.plintInsprong, h: P, naam: 'Plintuitsparing' });
    add({ id: 'plint', naam: 'Plint (vast)', rol: 'plint', mat: 'korpus', dikte: t, grain: 'u',
      box: { x: t, y: -P + td, z: D - S.plintInsprong - t, w: W - 2 * t, h: P - td, d: t }, uLen: W - 2 * t, vLen: P - td });
    if (td) trespa(t, W - 2 * t);
  }

  // Fronten, legplanken, lades en toestellen per zone
  let frontX0 = k.front === 'inliggend' ? t + v / 2 : v / 2;
  let frontX1 = k.front === 'inliggend' ? W - t - v / 2 : W - v / 2;
  // Zijpaneel waar het front over loopt: het front komt tot de buitenkant van het paneel (niet als er een paslat staat).
  const zpOver = kant => !!k.zijpaneel?.[kant] && zijpaneelMode(k) === 'over' && !(Number(k.paslat?.[kant]) > 0);
  if (zpOver('links')) frontX0 = -zijpaneelDikte(k, S);
  if (zpOver('rechts')) frontX1 = W + zijpaneelDikte(k, S);
  // Zijpaneel gelijk met het front (opliggend): de deur scharniert ernaast, dus een 155°-scharnier aan die kant.
  const zpNaast = kant => !!k.zijpaneel?.[kant] && zijpaneelMode(k) === 'gelijk' && k.front !== 'inliggend' && !zonderFronten && !(Number(k.paslat?.[kant]) > 0);
  // Spitse kast: de front stopt waar de schuine bovenkant de onderkant van de front raakt.
  if (punt) { const reach = (H - v) / tanA - 1; if (rechtsHoog) frontX0 = Math.max(frontX0, W - reach); else frontX1 = Math.min(frontX1, reach); }
  const frontZ = k.front === 'inliggend' ? D - fd : D;
  const innerDepth = D - rugFront - frontInset;
  const nl = NL_LIST.filter(n => n <= innerDepth - 10).pop();

  const front = (o) => { const f = add({
    rol: 'front', mat: 'front', dikte: fd, grain: 'v',
    edges: { u0: S.bandFront, u1: S.bandFront, v0: S.bandFront, v1: S.bandFront },
    box: { x: o.x0, y: o.y0, z: frontZ, w: o.x1 - o.x0, h: o.y1 - o.y0, d: fd },
    uLen: o.x1 - o.x0, vLen: o.y1 - o.y0, naam: o.naam,
  });
    shapeTopLR(f, x => yTopX(x) - (k.front === 'inliggend' ? t / cosA : 0) - v / 2);
    return f;
  };

  /**
   * Houten greeplijst met een greepruimte van binnenhoogte × binnendiepte.
   * L (bovenaan): staande lat (binnenhoogte + plaat) en een liggende lat onderaan.
   * C (tussen twee fronten): staande lat (binnenhoogte + 2 × plaat) en liggende latten onder- en bovenaan;
   * de fronten erboven en eronder hechten aan de liggende latten.
   * `yb` is de onderkant van het profiel; de zijwanden krijgen een uitsparing met de buitenmaat
   * en de greeplijst loopt over de volle buitenbreedte van de kast, zodat je in de greep geen zijwand ziet.
   */
  const gh = S.greeplijstBinnenHoogte, gdp = S.greeplijstBinnenDiepte;
  let greepNr = 0;
  const addGreeplijst = (kind, yb, label) => {
    const groep = `greeplijst-${++greepNr}`;
    const hOut = kind === 'L' ? gh + t : gh + 2 * t;
    const dOut = gdp + t;
    for (const s of sides) s.ops.push({ kind: 'uitsparing', u: Dk - dOut, v: sideV(yb), w: dOut, h: hOut, naam: `Uitsparing greeplijst (${kind})` });
    add({ naam: `Greeplijst ${label}, staand`, rol: 'greeplijst', groep, groepNaam: `Greeplijst ${label}`, mat: 'korpus', dikte: t, grain: 'u', edges: { v1: 0 },
      box: { x: 0, y: yb, z: D - dOut, w: W, h: hOut, d: t }, uLen: W, vLen: hOut });
    const lying = (y, pos) => add({ naam: `Greeplijst ${label}, liggend${pos}`, rol: 'greeplijst', groep, groepNaam: `Greeplijst ${label}`, mat: 'korpus', dikte: t, grain: 'u', edges: { v1: S.bandKorpus },
      box: { x: 0, y, z: D - gdp, w: W, h: t, d: gdp }, uLen: W, vLen: gdp });
    lying(yb, kind === 'C' ? ' onder' : '');
    if (kind === 'C') lying(yb + hOut - t, ' boven');
  };
  /** Bovenkant waar de greeplijst bovenaan een vak tegen komt: de kast zelf (onder het werkblad), of het paneel erboven. */
  const greepTop = z => (z.y1 >= H - 0.01 ? H : z.open1);

  /**
   * Push-open: een boring van voor in het korpus (Ø pushDia × pushDiepte) waar de drevel komt, op de best bereikbare
   * hoogte: onderkast bovenaan de front, hangkast onderaan, kolomkast op de greephoogte. Bij één deur (of een lade) in
   * de voorkant van de zijwand aan de openingskant; bij twee deuren in de voorkant van het paneel erboven
   * (hangkast: eronder), pushRand van de opening.
   */
  const pushBore = (f, freeLeft, nDoors, drawer = false) => {
    const preset = PRESETS.find(x => x.id === k.type);
    const hang = preset?.groep === 'Bovenkasten', kolom = hasToestel || preset?.groep === 'Kolomkasten';
    const y0 = f.box.y, y1 = f.box.y + (f.edgeH ? Math.min(f.edgeH.u0, f.edgeH.u1) : f.vLen);
    const clampY = y => Math.max(y0 + 40, Math.min(y1 - 40, y));
    let y = drawer ? (y0 + y1) / 2 : kolom ? clampY((hasToestel ? S.greepHoogteKolom : S.greepHoogteKolomZonder) - P) : hang ? y0 + S.pushRand : y1 - S.pushRand;
    y = clampY(y);
    const atSideL = Math.abs(f.box.x - frontX0) < 1, atSideR = Math.abs(f.box.x + f.box.w - frontX1) < 1;
    const useSide = drawer || nDoors === 1 ? (freeLeft ? (atSideL ? sideL : null) : (atSideR ? sideR : null)) : null;
    if (useSide && parts.includes(useSide)) {
      useSide.ops.push({ kind: 'boring', edge: 'u1', pos: sideV(y), dia: S.pushDia, diepte: S.pushDiepte, naam: 'Push-open' });
    } else {
      // In de voorkant van een liggend paneel boven (of bij een hangkast onder) de deur.
      const xe = freeLeft ? f.box.x + S.pushRand : f.box.x + f.box.w - S.pushRand;
      const cands = parts.filter(q => q.rol === 'liggend' && q.box.z + q.box.d >= D - frontInset - 1 && q.box.x <= xe && q.box.x + q.box.w >= xe);
      const hp = hang ? cands.filter(q => q.box.y + q.box.h <= f.box.y + 40).sort((a, b) => b.box.y - a.box.y)[0]
        : cands.filter(q => q.box.y >= f.box.y + f.vLen - 60).sort((a, b) => a.box.y - b.box.y)[0];
      if (!hp) { warnings.push(`${f.naam}: geen plaats gevonden voor de push-open boring.`); return; }
      if (hp.box.h < S.pushDia + 4 && hp.box.d < S.pushDia + 4) return;
      hp.ops.push({ kind: 'boring', edge: 'v1', pos: xe - hp.box.x, dia: S.pushDia, diepte: Math.min(S.pushDiepte, hp.vLen - 10), naam: 'Push-open' });
    }
    count('Push-open drevel');
  };

  const damperReq = [];      // dempers: pas geplaatst als het hele korpus er is (zie verderop)
  const extern = [];         // bewerkingen in een andere kast (kop over 2 kasten: Clamex in de zijwand van de buurkast)

  const handleHoles = (p, vertical, freeLeft) => {
    if (k.greep !== 'greep') return;
    const eigen = k.frontGreep?.[p.id];
    if (eigen === 'geen') return;
    const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
    const h = num(eigen) ?? num(k.greepHart) ?? S.greepHartafstand;
    const dia = S.greepDia;
    const label = h > 0 ? `Greep ${h} mm` : 'Knop';
    // Past de greep niet op de front (te laag of te smal): geen gaten, enkel een melding.
    if (h > (vertical ? p.vLen : p.uLen) - 20) {
      warnings.push(`De greep (${h} mm) past niet op ${p.naam} (${r1(vertical ? p.vLen : p.uLen)} mm): er worden geen greepgaten geboord.`);
      return;
    }
    // Knop (hart-op-hart 0): één gat; anders twee gaten.
    const offsets = h > 0 ? [-h / 2, h / 2] : [0];
    if (vertical) {
      let u = freeLeft ? S.greepRand : p.uLen - S.greepRand;
      let topV = p.edgeH ? (freeLeft ? p.edgeH.u0 : p.edgeH.u1) : p.vLen;
      // Schuine deur: is de vrije kant te laag voor de greep, schuif de greep naar binnen tot hij past.
      if (p.edgeH) {
        const need = S.greepVanBoven + h + 40, hAt = uu => p.edgeH.u0 + (p.edgeH.u1 - p.edgeH.u0) * uu / p.uLen;
        if (hAt(u) < need && p.edgeH.u0 !== p.edgeH.u1) {
          u = Math.max(S.greepRand, Math.min(p.uLen - S.greepRand, (need - p.edgeH.u0) / (p.edgeH.u1 - p.edgeH.u0) * p.uLen));
          topV = hAt(u);
        }
      }
      let vMid = topV - S.greepVanBoven - h / 2;
      if (hasToestel || PRESETS.find(x => x.id === k.type)?.groep === 'Kolomkasten') {
        // Kolomkast: greep zo dicht mogelijk bij een vaste hoogte vanaf de vloer (met toestellen greepHoogteKolom,
        // anders greepHoogteKolomZonder); een deur daarboven krijgt de greep onderaan (greepVanOnder), een deur daaronder bovenaan.
        const vOnder = S.greepVanOnder + h / 2;
        const doel = (hasToestel ? S.greepHoogteKolom : S.greepHoogteKolomZonder) - (p.box.y + P);
        vMid = vMid < vOnder ? p.vLen / 2 : Math.min(vMid, Math.max(vOnder, doel));
      }
      for (const o of offsets) p.ops.push({ kind: 'boring', face: 'voor', u, v: vMid + o, dia, diepte: fd, doorgaand: true, naam: 'Greep' });
    } else {
      const vv = Math.max(S.greepRand, p.vLen - S.greepRand);
      for (const o of offsets) p.ops.push({ kind: 'boring', face: 'voor', u: p.uLen / 2 + o, v: vv, dia, diepte: fd, doorgaand: true, naam: 'Greep' });
    }
    count(label);
  };

  /** Systeemboringen in een wand over [lo, hi] (twee rijen: voor en achter). */
  const systemRows = (w, lo, hi, uF, uB, shift = 0) => {
    for (let yy = lo + S.systeemMarge + shift; yy <= hi - S.systeemMarge + 0.1; yy += S.systeemRaster) {
      for (const u of [uB, uF]) w.part.ops.push({ kind: 'boring', face: w.face, u, v: w.v(yy), dia: S.systeemDia, diepte: S.systeemDiepte, naam: 'Systeemboring' });
    }
  };

  /**
   * Indeling van een vak: middenstijlen (hart vanaf de linkerbuitenkant), vaste legplanken (vrije hoogte eronder,
   * over alle delen of in één deel) en losse legplanken met systeemboringen per deel.
   * De middenstijlen lopen altijd door over het hele vak; een vaste legplank "over alle delen" komt in elk deel apart.
   */
  const divide = (z, s, n) => {
    const h0 = z.open0, h1 = z.open1;
    // Gelijk met de voorkant van de kast, of een gekozen maat terug (per vak).
    const stijlTerug = Math.max(0, Number(s.stijlTerug) || 0), vastTerug = Math.max(0, Number(s.vastTerug) || 0);
    const dStijl = D - rugFront - frontInset - (greeplijst ? gdp + t : 0) - stijlTerug;
    const fixed = (s.vasteLegplanken ?? []).filter(f => Number(f.hoogte) > 0)
      .map(f => ({ y: h0 + Number(f.hoogte), deel: Number(f.deel) || 0 }))
      .filter(f => {
        const ok = f.y > h0 + 20 && f.y + t < h1 - 20;
        if (!ok) warnings.push(`Een vaste legplank op ${r1(f.y - h0)} mm past niet in het vak (vrije hoogte ${r1(h1 - h0)} mm).`);
        return ok;
      });
    const xs = (s.stijlen ?? []).map(Number).filter(x => x > 0).sort((a, b) => a - b).filter((x, i, arr) => {
      const ok = x - t / 2 > t + 20 && x + t / 2 < W - t - 20 && (i === 0 || x - arr[i - 1] > t + 20);
      if (!ok) warnings.push(`Een middenstijl op ${r1(x)} mm past niet in de kast.`);
      return ok;
    });
    // Vaste legplanken over alle delen: doorlopend tussen de zijwanden. Met middenstijlen loopt de stijl altijd door
    // en wordt zo'n legplank in elk deel apart gezet (met Clamex tegen de stijl).
    const full = xs.length ? [] : fixed.map(f => f.y).sort((a, b) => a - b);
    // Legplanken langer dan legplankDikGrens: legplankDik dik (tegen doorhangen).
    const shelfT = len => (len > S.legplankDikGrens ? S.legplankDik : t);
    full.forEach(y => horizontal({ naam: 'Vaste legplank', y, z: rugFront, d: D - rugFront - frontInset - vastTerug, dikte: shelfT(W - 2 * t) }));
    const bands = [];
    let lo = h0;
    for (const y of full) { bands.push([lo, y]); lo = y + shelfT(W - 2 * t); }
    bands.push([lo, h1]);
    // Wanden: zijwand links, stijlen, zijwand rechts.
    for (const [b0, b1] of bands) {
      const walls = [{ x1: t, L: sideWall(sideL) }];
      for (const xc of xs) {
        const st = add({ naam: 'Middenstijl', rol: 'stijl', mat: 'korpus', dikte: t, grain: 'v', edges: { u1: S.bandKorpus },
          box: { x: xc - t / 2, y: b0, z: rugFront, w: t, h: b1 - b0, d: dStijl }, uLen: dStijl, vLen: b1 - b0 });
        const su = zz => zz - st.box.z, sv = yy => yy - st.box.y;
        // Links van de stijl ligt het deel waarvan de stijl de rechterwand is (vlak 'links'), en omgekeerd.
        walls.push({ x0: xc - t / 2, x1: xc + t / 2, st,
          // Aan een stijl kan niet geschroefd worden: altijd Clamex (geen klemmen nodig).
          R: { part: st, face: 'links', u: su, v: sv, edge: 'u1', zicht: true, screws: false },
          L: { part: st, face: 'rechts', u: su, v: sv, edge: 'u0', zicht: true, screws: false } });
        // Vast aan het paneel eronder en erboven: deuvels in de kopse kanten, schroeven door bodem en top.
        for (const [yEdge, edge, faceP] of [[b0, 'v0', 'boven'], [b1, 'v1', 'onder']]) {
          // Alle panelen erboven/eronder (bv. voor- én achterregel).
          const hps = parts.filter(p => p.rol === 'liggend' && Math.abs((faceP === 'boven' ? p.box.y + p.box.h : p.box.y) - yEdge) < 0.5
            && p.box.x <= xc && p.box.x + p.box.w >= xc);
          if (!hps.length) { warnings.push(`Middenstijl op ${r1(xc)} mm: geen paneel ${faceP === 'boven' ? 'eronder' : 'erboven'} om aan vast te maken.`); continue; }
          for (const hp of hps) {
          const za = Math.max(st.box.z, hp.box.z), zb = Math.min(st.box.z + st.box.d, hp.box.z + hp.box.d), len = zb - za;
          if (len < 20) continue;
          // Op een regel, tussenbodem of vaste legplank kan de stijl niet geschroefd worden (en klemmen gaat niet):
          // Clamex in de kopse kant van de stijl en in het vlak van het paneel, met een deuvel aan weerszijden.
          // Op de bodem en een volle top: deuvels en schroeven van buitenaf.
          if (!['bodem', 'top'].includes(hp.id)) {
            for (const c of clamexPositions(len, S)) {
              const zz = zb - c;
              st.ops.push({ kind: 'clamex', edge, pos: su(zz), naam: 'Clamex' });
              hp.ops.push({ kind: 'clamex', face: faceP, u: xc - hp.box.x, v: zz - hp.box.z, dir: [0, 1], naam: 'Clamex' });
              count('Lamello Clamex P-14');
              for (const d of [c - S.clamexDeuvel, c + S.clamexDeuvel]) {
                if (d < 15 || d > len - 15) continue;
                st.ops.push({ kind: 'boring', edge, pos: su(zb - d), dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
                hp.ops.push({ kind: 'boring', face: faceP, u: xc - hp.box.x, v: zb - d - hp.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
                count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
              }
            }
            continue;
          }
          const dws = len > 2 * S.deuvelEersteVoor + 10 + 100 ? dowelsFromFront(len, S) : len > 2 * S.deuvelEersteVoor + 10 ? [S.deuvelEersteVoor, len - S.deuvelEersteVoor] : [len / 2];
          for (const d of dws) {
            const zz = zb - d;
            st.ops.push({ kind: 'boring', edge, pos: su(zz), dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
            hp.ops.push({ kind: 'boring', face: faceP, u: xc - hp.box.x, v: zz - hp.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
            count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
          }
          if (S.schroeven) {
            for (const d of screwsFromFront(len, dws, S)) {
              hp.ops.push({ kind: 'boring', face: faceP, u: xc - hp.box.x, v: zb - d - hp.box.z, dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef' });
              count('Schroef');
            }
          }
          }
        }
      }
      walls.push({ x0: W - t, R: sideWall(sideR) });
      // Delen tussen de wanden.
      for (let c = 0; c + 1 < walls.length; c++) {
        const left = walls[c].L, right = walls[c + 1].R;
        const cx0 = walls[c].x1, cx1 = walls[c + 1].x0;
        const own = xs.length ? fixed.filter(f => (!f.deel || f.deel === c + 1) && f.y > b0 + 20 && f.y + t < b1 - 20).map(f => f.y).sort((a, b) => a - b) : [];
        for (const y of own) {
          const dkV = shelfT(cx1 - cx0);
          const hp = add({ naam: `Vaste legplank (deel ${c + 1})`, rol: 'liggend', mat: 'korpus', dikte: dkV, grain: 'u', edges: { v1: S.bandKorpus },
            box: { x: cx0, y, z: rugFront, w: cx1 - cx0, h: dkV, d: D - rugFront - frontInset - vastTerug }, uLen: cx1 - cx0, vLen: D - rugFront - frontInset - vastTerug });
          join(hp, y + dkV / 2, false, [left, right]);
          // Vaste legplanken aan beide kanten van een stijl op dezelfde hoogte: de deuvelgaten zouden elkaar raken.
          const nb = fixed.filter(f => (f.deel === c || f.deel === c + 2) && Math.abs(f.y - y) < t + 10);
          if (nb.length && !walls[c].st && !walls[c + 1].st) warnings.push(`Vaste legplanken in deel ${c + 1} en een buurdeel liggen even hoog (${r1(y - h0)} mm): verspring ze of kies "alle delen".`);
        }
        // Losse legplanken: n per deel, verdeeld over de openingen volgens hun hoogte.
        const openings = [];
        let o0 = b0;
        for (const y of own) { openings.push([o0, y]); o0 = y + shelfT(cx1 - cx0); }
        openings.push([o0, b1]);
        const share = openings.map(([a, b]) => (b - a) / openings.reduce((tt, [x, y2]) => tt + y2 - x, 0) * n);
        const kk = share.map(Math.floor);
        share.map((x, i) => [x - kk[i], i]).sort((a, b) => b[0] - a[0]).slice(0, n - kk.reduce((a, b) => a + b, 0)).forEach(([, i]) => kk[i]++);
        openings.forEach(([a, b], i) => {
          const m = kk[i];
          for (let j = 0; j < m; j++) {
            const yy = a + (j + 1) * (b - a) / (m + 1) - t / 2;
            const d = innerDepth - S.legplankInsprong;
            const lpT = shelfT(cx1 - cx0 - 2 * S.legplankSpeling);
            add({ naam: 'Legplank', rol: 'legplank', mat: 'korpus', dikte: lpT, grain: 'u', bandPlaat: true, edges: { u0: S.bandLegplank, u1: S.bandLegplank, v0: S.bandLegplank, v1: S.bandLegplank },
              box: { x: cx0 + S.legplankSpeling, y: yy, z: rugFront, w: cx1 - cx0 - 2 * S.legplankSpeling, h: lpT, d },
              uLen: cx1 - cx0 - 2 * S.legplankSpeling, vLen: d });
            count('Legplankdrager', 4);
          }
          if (m > 0 && S.systeemboringen) {
            for (const w of [left, right]) {
              const isSide = w.face === 'binnen';
              const uF = isSide ? Dk - (W < S.systeemSmalGrens ? S.systeemVoorSmal : S.systeemVoor) - frontInset : w.part.uLen - S.systeemVoor;
              const uB = isSide ? rugFront - zBack + S.systeemAchter : S.systeemAchter;
              // In een stijl verspringen de rijen aan de linkerkant een halve raster, zodat ze de rechterkant niet raken.
              systemRows(w, a, b, uF, uB, w.face === 'links' ? S.systeemRaster / 2 : 0);
            }
          }
        });
      }
    }
  };
  const shelves = (z, n, s = {}) => divide(z, s, n);

  for (const z of zones) {
    const s = z.sec;
    const zoneTop = z.y1, zoneBottom = z.y0;
    // Verticale ruimte van de fronten in deze zone.
    let fy0 = k.front === 'inliggend' ? z.open0 + v / 2 : zoneBottom + v / 2;
    let fy1 = k.front === 'inliggend' ? z.open1 - v / 2 : zoneTop - v / 2;
    // Fronten laten uitsteken: de onderste naar onder (bv. over de plint), de bovenste naar boven.
    if (k.front !== 'inliggend') {
      if (z.index === 0) fy0 -= Number(k.uitstekOnder) || (hangGreeploos ? S.hangGreepUitsteek : 0);
      if (z.index === zones.length - 1) fy1 += Number(k.uitstekBoven) || 0;
    }

    // Binnenladen achter de deur: op verdikkingsblokken (zodat ze langs de scharnieren kunnen), met een binnenfront.
    let binnenTop = null;
    if (s.type === 'deur' && Number(s.binnenladen) > 0) {
      const nB = Number(s.binnenladen);
      const b = S.blum[s.binnenSerie ?? s.serie ?? 'LEGRABOX'] ?? S.blum.LEGRABOX;
      const serieB = s.binnenSerie ?? 'LEGRABOX';
      const lt = (b.types ?? []).find(x => x.code === s.binnenType) ?? (b.types ?? []).find(x => x.code === 'M') ?? (b.types ?? [])[0];
      const ltName = `${serieB}${lt ? ` ${lt.code}` : ''}`, rugH = lt?.rugH ?? b.rugH;
      const op = S.binnenladeOpvul, terug = S.binnenladeTerug;
      const zFront = D - frontInset - terug;                  // voorkant van het binnenfront
      const nlB = NL_LIST.filter(n => n <= zFront - rugFront - 10).pop();
      // Opvulblok alleen aan de scharnierkant (bij twee deuren aan beide kanten).
      const fx0 = k.front === 'inliggend' ? t + v / 2 : v / 2, fx1 = k.front === 'inliggend' ? W - t - v / 2 : W - v / 2;
      const nDeur = k.deuren === 'auto' ? ((fx1 - fx0 - (Number(k.blindBreedte) || 0)) > S.deurMaxBreedte ? 2 : 1) : Number(k.deuren);
      const hingeL = (Number(k.blindBreedte) || 0) > 0 ? k.blindKant !== 'rechts' : k.scharnierKant !== 'rechts';
      const blokL = nDeur === 2 || hingeL, blokR = nDeur === 2 || !hingeL;
      const xL = t + (blokL ? op : 0), xR = W - t - (blokR ? op : 0);
      const lw = xR - xL;                                     // binnenbreedte tussen de blokken / zijwand
      const fh = rugH + S.binnenfrontExtra, pitch = fh + S.binnenladeTussen;
      if (!nlB) warnings.push('Binnenladen: de kast is niet diep genoeg voor een ladegeleider.');
      else for (let i = 0; i < nB; i++) {
        const y0 = z.open0 + S.binnenladeTussen / 2 + i * pitch;
        if (y0 + fh > z.open1 - 10) { warnings.push(`Binnenlade ${i + 1} past niet meer in het vak.`); break; }
        const yRun = y0 + b.gatHoogte;
        // Opvulblokken links en rechts (de geleider komt erop). Kunststof: besteld, niet gezaagd; hout: zelf gemaakt.
        // Blum-opvullijst (KPR.6056.ZW): 486 mm lang, 50 mm hoog; vooraan gelijk, achteraan inkorten tot de lengte van de geleider.
        const lijstL = Math.min(nlB, S.binnenladeOpvulType === 'hout' ? nlB : S.opvulLengte);
        // In de zijwand komen de punten op de plaats van de schroeven van de geleider, zodat je ziet waar de blokken komen.
        const kunststof = S.binnenladeOpvulType !== 'hout';
        for (const left of [true, false].filter(l => (l ? blokL : blokR))) {
          const blk = add({ naam: `${kunststof ? 'Kunststof opvulblok' : 'Verdikkingsblok'} binnenlade ${i + 1} ${left ? 'links' : 'rechts'}`, rol: 'opvul', mat: 'korpus', dikte: op, grain: 'u', edges: {},
            nietZagen: kunststof, kleur: kunststof ? '#4a4a4a' : undefined,
            box: { x: left ? t : W - t - op, y: yRun - 20, z: zFront - lijstL, w: op, h: S.opvulHoogte, d: lijstL }, uLen: lijstL, vLen: S.opvulHoogte });
          const sd = left ? sideL : sideR;
          for (const g of b.gaten) if (g <= nlB - S.geleiderAchterVrij) {
            sd.ops.push({ kind: 'boring', face: 'binnen', u: sideU(zFront - g), v: sideV(yRun), dia: S.geleiderDia, diepte: S.geleiderDiepte, naam: `Opvulblok binnenlade ${serieB}` });
            if (!kunststof) blk.ops.push({ kind: 'boring', face: 'binnen', u: lijstL - g, v: 20, dia: S.geleiderDia, diepte: Math.min(S.geleiderDiepte, op - 3), naam: `Ladegeleider ${serieB}` });
          }
          if (!kunststof) for (const u of [40, lijstL - 40]) blk.ops.push({ kind: 'boring', face: 'binnen', u, v: 45, dia: S.schroefDia, diepte: op, doorgaand: true, naam: 'Schroef blok' });
        }
        const nBlok = (blokL ? 1 : 0) + (blokR ? 1 : 0);
        // Aan een kant zonder blok komen de punten voor de geleider rechtstreeks in de zijwand.
        for (const left of [true, false].filter(l => !(l ? blokL : blokR))) {
          const sd = left ? sideL : sideR;
          for (const g of b.gaten) if (g <= nlB - S.geleiderAchterVrij) sd.ops.push({ kind: 'boring', face: 'binnen', u: sideU(zFront - g), v: sideV(yRun), dia: S.geleiderDia, diepte: S.geleiderDiepte, naam: `Ladegeleider ${serieB}` });
        }
        if (kunststof) {
          order(`Blum opvullijst ${S.opvulArtikel} zwart, ${S.opvulLengte} mm${nlB < S.opvulLengte ? ` (achteraan inkorten tot ${nlB} mm)` : ''} – binnenlade ${serieB} NL ${nlB}`, nBlok);
          order('Spaanplaatschroef 3,5 × 40 zwart (opvullijst)', nBlok * S.opvulSchroeven);
        } else count('Verdikkingsblok (hout)', nBlok);
        // Lade: zelf maken of op maat bestellen.
        const bodemD = nlB - b.bodemD;
        if (s.binnenUitvoering === 'opmaat') order(`Binnenlade op maat ${ltName} NL ${nlB} (${k.code}): binnenbreedte (met opvulblok) ${r1(lw)} mm, bodem ${r1(lw - b.bodemB)} × ${r1(bodemD)}, rug ${r1(lw - b.rugB)} × ${r1(rugH)}`);
        else {
          add({ naam: `Binnenlade bodem (${ltName})`, rol: 'lade', mat: 'lade', dikte: S.ladeBodemDikte, grain: 'u', edges: {},
            box: { x: xL + b.bodemB / 2, y: yRun, z: zFront - bodemD - 5, w: lw - b.bodemB, h: S.ladeBodemDikte, d: bodemD }, uLen: lw - b.bodemB, vLen: bodemD });
          add({ naam: `Binnenlade rug (${ltName})`, rol: 'lade', mat: 'lade', dikte: S.ladeBodemDikte, grain: 'u', edges: {},
            box: { x: xL + b.rugB / 2, y: yRun + S.ladeBodemDikte, z: zFront - bodemD - 5, w: lw - b.rugB, h: rugH, d: S.ladeBodemDikte }, uLen: lw - b.rugB, vLen: rugH });
        }
        // Binnenfront (in het decor van het korpus), met de frontbevestiging.
        const bf = add({ naam: `Binnenfront ${i + 1}`, rol: 'binnenfront', mat: 'korpus', dikte: t, grain: 'u', edges: { u0: S.bandKorpus, u1: S.bandKorpus, v0: S.bandKorpus, v1: S.bandKorpus }, bandPlaat: true,
          box: { x: xL + 1, y: y0, z: zFront - t, w: lw - 2, h: fh, d: t }, uLen: lw - 2, vLen: fh });
        const fg = lt?.frontGaten ?? DEFAULT_SETTINGS.blum[serieB]?.types?.find(x => x.code === lt?.code)?.frontGaten;
        if (S.frontBevestiging && fg?.length) for (const xc of [xL + S.frontBevZij, xR - S.frontBevZij]) for (const h of fg) {
          const fv = yRun + h - bf.box.y;
          if (fv > 5 && fv < bf.vLen - 5) bf.ops.push({ kind: 'boring', face: 'binnen', u: xc - bf.box.x, v: fv, dia: S.frontBevDia, diepte: S.frontBevDiepte, naam: 'Frontbevestiging' });
        }
        count(`Binnenlade ${ltName} NL ${nlB}`);
        binnenTop = y0 + fh;
      }
    }

    const plateReq = [];
    if (s.type === 'deur' || s.type === 'klep') {
      if (greeplijst) {
        const top = greepTop(z);
        addGreeplijst('L', top - gh - t, 'boven');
        fy1 = top - gh + S.greepGrijp;     // front steekt greepGrijp uit in de greepopening (om vast te nemen)
      }
      let x0 = frontX0, x1 = frontX1;
      const blind = Number(k.blindBreedte) || 0;
      let blindPart = null;
      if (blind > 0 && s.type === 'deur') {
        if (k.blindKant === 'rechts') {
          blindPart = front({ naam: 'Blindpaneel', x0: x1 - blind, y0: fy0, x1, y1: fy1 });
          x1 = x1 - blind - v;
        } else {
          blindPart = front({ naam: 'Blindpaneel', x0, y0: fy0, x1: x0 + blind, y1: fy1 });
          x0 = x0 + blind + v;
        }
      }
      if (s.type === 'klep') {
        const f = front({ naam: 'Klepdeur', x0, y0: fy0, x1, y1: fy1 });
        handleHoles(f, false);
        warnings.push('Klepdeur: de boringen voor het klepbeslag (bijvoorbeeld Blum AVENTOS) zijn nog niet voorzien.');
      } else {
        // Deuren per deel (bv. brievenbussen): elk deel tussen de middenstijlen een eigen deur, voegen gecentreerd op de stijl.
        const xsDeel = s.deurPerDeel ? (s.stijlen ?? []).map(Number).filter(x => x > t + 30 && x < W - t - 30).sort((a, b) => a - b) : [];
        let ranges;
        if (xsDeel.length) {
          const hl = (s.scharnierPerDeel ?? k.scharnierKant) !== 'rechts', inl = k.front === 'inliggend';
          ranges = [x0, ...xsDeel].map((b, i) => ({
            x0: i === 0 ? b : b + (inl ? t / 2 : 0) + v / 2,
            x1: i === xsDeel.length ? x1 : xsDeel[i] - (inl ? t / 2 : 0) - v / 2,
            hingeLeft: hl, naam: `Deur deel ${i + 1}` }));
        } else {
          const nD = k.deuren === 'auto' ? ((x1 - x0) > S.deurMaxBreedte ? 2 : 1) : Number(k.deuren);
          const dwD = (x1 - x0 - (nD - 1) * v) / nD;
          ranges = Array.from({ length: nD }, (_, i) => ({ x0: x0 + i * (dwD + v), x1: x0 + i * (dwD + v) + dwD,
            // Naast een blindpaneel scharniert de deur aan het blindpaneel.
            hingeLeft: nD === 1 ? (blindPart ? k.blindKant !== 'rechts' : k.scharnierKant !== 'rechts') : i === 0,
            naam: nD === 1 ? 'Deur' : (i === 0 ? 'Deur links' : 'Deur rechts') }));
        }
        const n = ranges.length;
        for (let i = 0; i < n; i++) {
          const dx0 = ranges[i].x0, dw = ranges[i].x1 - ranges[i].x0;
          const hingeLeft = ranges[i].hingeLeft;
          const door = front({ naam: ranges[i].naam, x0: dx0, y0: fy0, x1: dx0 + dw, y1: fy1 });
          const teLaag = door.vLen < 2 * S.scharnierRand + 60;
          if (teLaag) warnings.push(`${door.naam} is maar ${r1(door.vLen)} mm hoog: te laag voor scharnieren, er worden geen scharniergaten geboord. Pas de hoogtes van de vakken aan.`);
          const hc = hingeCount(door.vLen, door.uLen);
          // Scharnieren gelijk verdeeld, maar altijd binnen het korpus (ook als de deur uitsteekt).
          const pMin = Math.max(S.scharnierRand, -Pv + S.scharnierRand - door.box.y);
          const hingeEdgeH = door.edgeH ? (hingeLeft ? door.edgeH.u0 : door.edgeH.u1) : door.vLen;
          // Schuine kast: de scharnieren zitten aan de hoge kant. Het scharnier (plaatje + arm) steekt tot
          // scharnierInbouw de kast in; daar moet het nog onder de schuine top passen, met scharnierVrij ruimte.
          const slopeLimit = lr ? yTopX(hingeLeft ? t + S.scharnierInbouw : W - t - S.scharnierInbouw) - t / cosA - S.scharnierVrij : Infinity;
          const pMax = Math.min(hingeEdgeH - S.scharnierRand, (lr ? slopeLimit - S.plaatjeHoogte / 2 : H - S.scharnierRand) - door.box.y);
          let positions = teLaag ? [] : Array.from({ length: hc }, (_, j) => pMin + j * (pMax - pMin) / (hc - 1));
          // Met een rijboring in dit vak: het scharnier zo verschuiven dat de gaten van het plaatje op het raster
          // van 32 mm vallen (dezelfde gaten als de rijboring, geen overlappende gaten).
          if ((Number(s.legplanken) || 0) > 0 && S.systeemboringen) {
            const g0 = z.open0 + S.systeemMarge + S.montageplaatTussen / 2;
            positions = positions.map(pv => {
              const c = door.box.y + pv;
              const snapped = g0 + Math.round((c - g0) / S.systeemRaster) * S.systeemRaster;
              const np = snapped - door.box.y;
              return np >= S.potRand + S.potDia / 2 && np <= hingeEdgeH - S.potRand - S.potDia / 2 ? np : pv;
            });
          }
          // Niet op een regel, tussenbodem of greeplijst: het plaatje (± helft) mag die panelen niet raken.
          // Zo nodig per 32 mm verschuiven (blijft op het raster), naar het midden van de deur toe.
          const obstacles = parts.filter(x => (x.rol === 'liggend' || x.rol === 'greeplijst' || x.rol === 'opvul') && x.box.z + x.box.d > D - 60)
            .map(x => [x.box.y - S.scharnierVrij, x.box.y + x.box.h + S.scharnierVrij]);
          const half = S.plaatjeHoogte / 2;
          const blocked = c => obstacles.some(([a, b]) => c + half > a && c - half < b) || c - half < -Pv || c + half > Math.min(H, slopeLimit);
          positions = positions.map((pv, j) => {
            const dir = j < positions.length / 2 ? 1 : -1;
            for (let step = 0; step <= 12; step++) {
              for (const sgn of step ? [dir, -dir] : [1]) {
                const np = pv + sgn * step * S.systeemRaster;
                if (np < S.potRand + S.potDia / 2 || np > hingeEdgeH - S.potRand - S.potDia / 2) continue;
                if (!blocked(door.box.y + np)) return np;
              }
            }
            warnings.push(`${door.naam}: geen vrije plaats voor een scharnier gevonden; controleer de scharnieren.`);
            return pv;
          });
          const hingeSide = hingeLeft ? sideL : sideR;
          for (const pv of positions) {
            // Front over een zijpaneel: de deur steekt het paneel voorbij, dus de pot schuift even ver naar binnen (paneeldikte).
            const potShift = hingeLeft ? (zpOver('links') && Math.abs(dx0 - frontX0) < 1 ? -frontX0 : 0) : (zpOver('rechts') && Math.abs(dx0 + dw - frontX1) < 1 ? frontX1 - W : 0);
            const cu = hingeLeft ? S.potRand + S.potDia / 2 + potShift : door.uLen - S.potRand - S.potDia / 2 - potShift;
            door.ops.push({ kind: 'boring', face: 'binnen', u: cu, v: pv, dia: S.potDia, diepte: S.potDiepte, naam: 'Scharnierpot' });
            if (S.potDeuvels) {
              const du = cu + (hingeLeft ? 9.5 : -9.5);
              for (const dv of [pv - 22.5, pv + 22.5]) door.ops.push({ kind: 'boring', face: 'binnen', u: du, v: dv, dia: 8, diepte: S.scharnierDeuvelDiepte, naam: 'Scharnier deuvel' });
            }
            // Montageplaat op de zijwand, op dezelfde hoogte als de pot (alleen als de deur tegen een zijwand scharniert).
            const atSide = hingeLeft ? Math.abs(dx0 - frontX0) < 1 : Math.abs(dx0 + dw - frontX1) < 1;
            if (atSide) {
              const u0 = Dk - S.montageplaatVoor;
              // Twee gaten boven elkaar (evenwijdig met de rijboring van de legplankdragers), 32 mm uit elkaar, gecentreerd op het scharnier.
              for (const dv of [-S.montageplaatTussen / 2, S.montageplaatTussen / 2]) hingeSide.ops.push({ kind: 'boring', face: 'binnen', u: u0, v: sideV(door.box.y + pv) + dv, dia: S.montageplaatDia, diepte: S.montageplaatDiepte, naam: 'Montageplaat' });
            } else if (blindPart && (hingeLeft ? k.blindKant !== 'rechts' : k.blindKant === 'rechts')) {
              // Montageplaat voor een blinde hoek: op de binnenkant van het blindpaneel, met een eigen boorbeeld.
              const bu = hingeLeft ? blindPart.uLen - S.blindPlaatRand : S.blindPlaatRand;
              const bv = door.box.y + pv - blindPart.box.y;
              for (const dv of [-S.blindPlaatTussen / 2, S.blindPlaatTussen / 2]) blindPart.ops.push({ kind: 'boring', face: 'binnen', u: bu, v: bv + dv, dia: S.blindPlaatDia, diepte: S.blindPlaatDiepte, naam: 'Montageplaat blinde hoek' });
            } else if (xsDeel.length) {
              // Scharnierkant tegen een middenstijl: montageplaat op de stijl (geplaatst zodra de stijlen er zijn).
              plateReq.push({ x: hingeLeft ? dx0 : dx0 + dw, left: hingeLeft, y: door.box.y + pv });
            } else if (pv === positions[0]) {
              warnings.push('Een deur scharniert niet tegen een zijwand of blindpaneel: voorzie de montageplaten apart.');
            }
            count(zpNaast(hingeLeft ? 'links' : 'rechts') && atSide ? 'Scharnier Blum 155° (snelspan, naast zijpaneel)' : 'Scharnier Blum (snelspan)');
            count('Montageplaat');
          }
          handleHoles(door, true, hingeLeft ? false : true);
          // Dempers: twee gaten aan de openingskant, bij de boven- en onderhoek (niet bij push-open: dan drukt de deur niet in).
          if (S.dempers && k.greep !== 'push') {
            const du = hingeLeft ? door.uLen - S.demperRand : S.demperRand;
            const top = door.shape ? door.shape[3][1] + (door.shape[2][1] - door.shape[3][1]) * du / door.uLen - 6 : door.vLen;
            damperReq.push({ f: door, du, lo: S.demperRand, hi: top - S.demperRand, mode: 'hoeken' });
          }
          if (k.greep === 'push') pushBore(door, !hingeLeft, n);
          if (k.greep === 'tipon') {
            const freeSide = hingeLeft ? sideR : sideL;
            if (n === 1) {
              freeSide.ops.push({ kind: 'boring', face: 'binnen', u: Dk - S.montageplaatVoor, v: sideV(door.box.y + door.vLen - 50), dia: S.tipOnDia, diepte: S.tipOnDiepte, naam: 'TIP-ON' });
            }
            count('Blum TIP-ON');
          }
        }
        if (k.greep === 'tipon' && n === 2) warnings.push('TIP-ON bij twee deuren: de plaats van de TIP-ON-boringen nog bepalen.');
      }
      shelves(binnenTop != null ? { ...z, open0: binnenTop + S.binnenladeTussen } : z, Number(s.legplanken) || 0, s);
      // Montageplaten op de middenstijlen (deuren per deel).
      for (const q of plateReq) {
        const st = parts.find(p => p.rol === 'stijl' && Math.abs(p.box.x + p.box.w / 2 - q.x) < t + v && p.box.y <= q.y && p.box.y + p.box.h >= q.y);
        if (!st) { warnings.push('Deur per deel: geen middenstijl gevonden voor een scharnier.'); continue; }
        for (const dv of [-S.montageplaatTussen / 2, S.montageplaatTussen / 2]) st.ops.push({ kind: 'boring', face: q.left ? 'rechts' : 'links', u: st.uLen - S.montageplaatVoor, v: q.y - st.box.y + dv, dia: S.montageplaatDia, diepte: S.montageplaatDiepte, naam: 'Montageplaat' });
      }
    } else if (s.type === 'lade') {
      if (s.stijlen?.length || s.vasteLegplanken?.length) warnings.push('Middenstijlen en vaste legplanken in een ladevak worden niet gemaakt: de lades lopen over de volle breedte.');
      const n = Math.max(1, Number(s.lades) || 1);
      const b = S.blum[s.serie] ?? S.blum.LEGRABOX;
      const ltSec = (b.types ?? []).find(x => x.code === s.ladeType) ?? (b.types ?? []).find(x => x.code === 'M') ?? (b.types ?? [])[0];
      const lw = W - 2 * t;
      if (!nl) warnings.push('De kast is niet diep genoeg voor een ladegeleider.');
      // Met een greeplijst: boven elke lade een greepruimte; tussen twee lades een C-profiel, bovenaan een L-profiel.
      const gTop = greepTop(z);
      // Hoogte per ladefront (van onder naar boven): ingevuld, of de rest gelijk verdeeld.
      const avail = greeplijst ? gTop - fy0 - n * gh : fy1 - fy0 - (n - 1) * v;
      const given = Array.from({ length: n }, (_, i) => Number(s.ladeHoogtes?.[i]) > 0 ? Number(s.ladeHoogtes[i]) : null);
      const rest = avail - given.reduce((a, x) => a + (x ?? 0), 0), autos = given.filter(x => x == null).length;
      const fhs = given.map(x => x ?? (autos ? rest / autos : 0));
      if (autos === 0 && Math.abs(rest) > 0.5) warnings.push(`De ladefronten zijn samen ${r1(avail - rest)} mm, er is ${r1(avail)} mm plaats. Laat een lade op "auto" staan.`);
      if (fhs.some(x => x < 60)) warnings.push('De ladefronten worden te laag. Kies minder lades, lagere vaste hoogtes of een hoger vak.');
      let yy = fy0;
      for (let i = 0; i < n; i++) {
        const fh = fhs[i];
        const lt = (b.types ?? []).find(x => x.code === s.ladeTypes?.[i]) ?? ltSec;
        const ltName = `${s.serie}${lt ? ` ${lt.code}` : ''}`;
        const rugH = lt?.rugH ?? b.rugH;
        const top = yy + fh;
        // Met een greeplijst steekt het front greepGrijp uit in de greepopening erboven (om vast te nemen).
        const f = front({ naam: n === 1 ? 'Ladefront' : `Ladefront ${i + 1}`, x0: frontX0, y0: yy, x1: frontX1, y1: greeplijst ? top + S.greepGrijp : top });
        handleHoles(f, false);
        // Dempers: links en rechts op halve hoogte, ter hoogte van de zijwanden.
        if (S.dempers && k.greep !== 'push') {
          for (const du of [S.demperRand, f.uLen - S.demperRand]) damperReq.push({ f, du, lo: S.demperRand, hi: f.vLen - S.demperRand, mode: 'midden' });
        }
        if (k.greep === 'push') pushBore(f, true, 1, true);
        if (greeplijst) addGreeplijst(i === n - 1 ? 'L' : 'C', top - t, i === n - 1 ? 'boven' : `lade ${i + 1}`);
        // Ladekast
        const openBottom = i === 0 ? z.open0 : greeplijst ? yy + t : yy - v / 2;
        if (nl) {
          const bodemD = nl - b.bodemD;
          // Op maat bestellen: geen bodem en rug in de zaaglijst, maar een regel op de bestellijst met alle maten.
          const opMaat = s.uitvoering === 'opmaat';
          if (opMaat) order(`Lade op maat ${ltName} NL ${nl} (${k.code}): binnenbreedte kast ${r1(lw)} mm, bodem ${r1(lw - b.bodemB)} × ${r1(bodemD)}, rug ${r1(lw - b.rugB)} × ${r1(rugH)}, front ${r1(f.uLen)} × ${r1(f.vLen)}`);
          // Snelspan-frontbevestiging (EXPANDO): per kant gaten Ø10 boven elkaar, 14 mm van de binnenkant van de zijwand,
          // op de hoogtes van het ladetype vanaf de onderkant van de lade.
          const fg = lt?.frontGaten ?? DEFAULT_SETTINGS.blum[s.serie]?.types?.find(x => x.code === lt?.code)?.frontGaten;
          if (S.frontBevestiging && fg?.length) {
            if (fd < S.frontBevDiepte + 2) warnings.push(`Het ladefront (${fd} mm) is te dun voor de frontbevestiging (${S.frontBevDiepte} mm diep).`);
            for (const xc of [t + S.frontBevZij, W - t - S.frontBevZij]) for (const h of fg) {
              const fv = openBottom + b.gatHoogte + h - f.box.y;
              if (fv > 5 && fv < f.vLen - 5) f.ops.push({ kind: 'boring', face: 'binnen', u: xc - f.box.x, v: fv, dia: S.frontBevDia, diepte: S.frontBevDiepte, naam: 'Frontbevestiging' });
              else warnings.push(`${f.naam}: een gat voor de frontbevestiging valt buiten de front; controleer de ladehoogte.`);
            }
            const art = lt?.frontArtikel ?? DEFAULT_SETTINGS.blum[s.serie]?.types?.find(x => x.code === lt?.code)?.frontArtikel;
            count(`Frontbevestiging ${s.serie} ${lt.code}${art ? ` (${art})` : ''} (paar)`);
          }
          if (!opMaat) {
          const lb = S.ladeBodemDikte, sb = S.ladeSponningBreedte, sd = S.ladeSponningDiepte;
          const bodem = add({ naam: `Ladebodem (${ltName})`, rol: 'lade', mat: 'lade', dikte: lb, grain: 'u',
            box: { x: t + (lw - (lw - b.bodemB)) / 2, y: openBottom + b.gatHoogte, z: D - frontInset - bodemD - 5, w: lw - b.bodemB, h: lb, d: bodemD },
            uLen: lw - b.bodemB, vLen: bodemD });
          // Sponning onderaan langs links en rechts, zodat de bodem op het beslag 16 mm dik is.
          if (sd > 0 && sb > 0) for (const u of [sb / 2, bodem.uLen - sb / 2]) {
            bodem.ops.push({ kind: 'groef', face: 'onder', frees: true, u1: u, v1: 0, u2: u, v2: bodem.vLen, breedte: sb, diepte: sd, naam: 'Sponning beslag' });
          }
          // Schroefgaten door de bodem in de onderkant van de laderug (v = 0 is de achterkant).
          for (const u of spreadPositions(bodem.uLen - (b.rugB - b.bodemB), S.ladeSchroefAfstand, 40)) {
            bodem.ops.push({ kind: 'boring', face: 'onder', u: u + (b.rugB - b.bodemB) / 2, v: lb / 2, dia: S.schroefDia, diepte: lb, doorgaand: true, naam: 'Schroef laderug' });
            count('Schroef');
          }
          const room = top - openBottom - b.gatHoogte - S.ladeBodemDikte;
          if (rugH > room) warnings.push(`Lade ${ltName} (${n === 1 ? 'ladefront' : `ladefront ${i + 1}`}) is te hoog voor de front: kies een lager ladetype of een hogere front.`);
          const rug = add({ naam: `Laderug (${ltName})`, rol: 'lade', mat: 'lade', dikte: lb, grain: 'u',
            box: { x: t + b.rugB / 2, y: openBottom + b.gatHoogte + lb, z: D - frontInset - bodemD - 5, w: lw - b.rugB, h: rugH, d: lb },
            uLen: lw - b.rugB, vLen: rugH });
          // Sponning aan beide uiteinden (achterkant), zodat de rug in het beslag 16 mm dik is.
          if (sd > 0 && sb > 0) for (const u of [sb / 2, rug.uLen - sb / 2]) {
            rug.ops.push({ kind: 'groef', face: 'achter', frees: true, u1: u, v1: 0, u2: u, v2: rug.vLen, breedte: sb, diepte: sd, naam: 'Sponning beslag' });
          }
          }
          for (const sd of sides) for (const g of b.gaten) {
            if (g <= nl - S.geleiderAchterVrij && g < Dk) sd.ops.push({ kind: 'boring', face: 'binnen', u: Dk - g, v: sideV(openBottom + b.gatHoogte), dia: S.geleiderDia, diepte: S.geleiderDiepte, naam: `Ladegeleider ${s.serie}` });
          }
          count(`Lade ${ltName} NL ${nl}`);
        }
        yy = greeplijst ? top + gh : top + v;
      }
    } else if (s.type === 'open') {
      shelves(z, Number(s.legplanken) || 0, s);
    } else if (s.type === 'toestel') {
      z.nis = r1(z.open1 - z.open0);
      z.nisBreedte = r1(W - 2 * t);
      z.nisDiepte = r1(D - frontInset);
      const naam = s.toestel || 'Toestel';
      if (Number(s.nis) > 0 && z.nis < Number(s.nis) - 0.5) warnings.push(`${naam}: de nis is ${z.nis} mm hoog, het toestel vraagt ${s.nis} mm.`);
      if (Number(s.nisBreedte) > 0 && z.nisBreedte < Number(s.nisBreedte)) warnings.push(`${naam}: de nis is ${z.nisBreedte} mm breed, het toestel vraagt ${s.nisBreedte} mm.`);
      if (Number(s.nisDiepte) > 0 && z.nisDiepte < Number(s.nisDiepte)) warnings.push(`${naam}: de kast is ${z.nisDiepte} mm diep, het toestel vraagt ${s.nisDiepte} mm.`);
    }
  }

  // Kolomkast (zonder toestel: daar zitten altijd tussenbodems): waar er over een grote hoogte geen tussenbodem of regel is, komen er latten achter de rug,
  // ongeveer om de latAfstand, zodat de zijwanden in het midden niet uit elkaar kunnen.
  const kolomkast = PRESETS.find(x => x.id === k.type)?.groep === 'Kolomkasten';
  const latDik = Math.min(t, (k.rug === 'geen' ? t : S.rugInsprong) - 1);
  if (kolomkast && !hasToestel && k.rug !== 'opgeschroefd' && S.latAfstand > 0 && latDik > 0) {
    const lb = S.latBreedte;
    const levels = [...new Set(parts.filter(x => x.rol === 'liggend' && x.box.w >= W - 2 * t - 1).flatMap(x => [x.box.y, x.box.y + x.box.h]))].sort((a, b) => a - b);
    const lats = [];
    for (let i = 0; i + 1 < levels.length; i++) {
      const lo = levels[i], hi = levels[i + 1];
      if (hi - lo <= S.latAfstand + lb) continue;
      const n = Math.ceil((hi - lo) / S.latAfstand) - 1;
      for (let j = 1; j <= n; j++) lats.push(lo + j * (hi - lo) / (n + 1));
    }
    lats.forEach((yc, i) => {
      const y0 = yc - lb / 2;
      const lat = add({ naam: lats.length > 1 ? `Lat achter de rug ${i + 1}` : 'Lat achter de rug', rol: 'lat', mat: 'korpus', dikte: latDik, grain: 'u', edges: {},
        box: { x: t, y: y0, z: zBack, w: W - 2 * t, h: lb, d: latDik }, uLen: W - 2 * t, vLen: lb });
      uprightJoin(lat, y0, lb, zBack + latDik / 2);
      // De lat houdt enkel de kast op maat: geen schroefgaten in de rug.
    });
  }

  // Paslatten links/rechts: een frontpaslat in het vlak van de fronten (decor fronten) en een kastpaslat erachter,
  // haaks tegen de zijwand (zoals kastpaslat/frontpaslat in de P110-programma's): Clamex in de voorkant van de kastpaslat
  // en in het vlak van de frontpaslat; de kastpaslat wordt door de zijwand vastgeschroefd.
  const fronts = parts.filter(x => x.rol === 'front');
  const fY0 = fronts.length ? Math.min(...fronts.map(x => x.box.y)) : -Pv, fY1 = fronts.length ? Math.max(...fronts.map(x => x.box.y + x.box.h)) : H;
  for (const kant of ['links', 'rechts']) {
    const pw = Number(k.paslat?.[kant]) || 0;
    if (pw <= 0) continue;
    if (pw < t) { warnings.push(`Paslat ${kant}: minstens ${t} mm breed.`); continue; }
    if (punt && (kant === 'links') === rechtsHoog) { warnings.push(`Paslat ${kant}: niet mogelijk aan de punt van een spitse kast.`); continue; }
    const left = kant === 'links';
    const sd = left ? sideL : sideR;
    const xf = left ? -v / 2 - pw : W + v / 2;
    const kd = Math.min(S.paslatDiepte, Dk, zFP);
    const kp = add({ id: `paslat-kast-${kant}`, naam: `Kastpaslat ${kant}`, rol: 'paslat', mat: 'korpus', dikte: t, grain: 'v', edges: {},
      box: { x: left ? -t : W, y: -Pv, z: zFP - kd, w: t, h: sideH, d: kd }, uLen: kd, vLen: sideH });
    // Greeploos: de greeplijsten lopen door over de paslat; de frontpaslat wordt daar onderbroken (een stuk per front)
    // en de kastpaslat krijgt dezelfde uitsparing als de zijwand.
    const grips = parts.filter(x => x.rol === 'greeplijst' && /staand/.test(x.naam)).map(x => [x.box.y, x.box.y + x.box.h, D - x.box.z]).sort((a2, b2) => a2[0] - b2[0]);
    // Stukken frontpaslat: even hoog als de fronten ernaast; fronten met enkel een voeg ertussen vormen één stuk,
    // bij greeploos is er per front (tussen de greeplijsten) een stuk.
    const adj = parts.filter(x => x.rol === 'front' && (left ? Math.abs(x.box.x - frontX0) < 1 : Math.abs(x.box.x + x.box.w - frontX1) < 1))
      .map(x => [x.box.y, x.box.y + x.box.h]).sort((a2, b2) => a2[0] - b2[0]);
    const segs = [];
    for (const [a0, a1] of adj) {
      const last = segs[segs.length - 1];
      if (last && a0 - last[1] <= v + 0.5) last[1] = Math.max(last[1], a1); else segs.push([a0, a1]);
    }
    if (!segs.length) segs.push([fY0, fY1]);
    const fps = segs.map(([s0, s1], i) => add({ id: `paslat-front-${kant}${segs.length > 1 ? `-${i + 1}` : ''}`, naam: `Frontpaslat ${kant}${segs.length > 1 ? ` ${i + 1}` : ''}`, rol: 'paslat', mat: 'front', dikte: fd, grain: 'v',
      edges: { u0: left ? 0 : S.bandFront, u1: left ? S.bandFront : 0, v0: S.bandFront, v1: S.bandFront },
      box: { x: xf, y: s0, z: zFP, w: pw, h: s1 - s0, d: fd }, uLen: pw, vLen: s1 - s0 }));
    for (const [g0, g1, dOut] of grips) kp.ops.push({ kind: 'uitsparing', u: kd - dOut, v: g0 + Pv, w: dOut, h: g1 - g0, naam: 'Uitsparing greeplijst' });
    // Trapkast: de paslatten lopen mee met de schuinte (de frontpaslat bovenaan schuin gezaagd zoals de deuren;
    // de kastpaslat nergens hoger dan de schuine lijn).
    if (lr) {
      // Bovenste stuk tot tegen de schuine lijn (aan de hoge kant dus hoger dan de deuren), daarna schuin afzagen.
      const topFp = fps.slice().sort((a, b) => (b.box.y + b.box.h) - (a.box.y + a.box.h))[0];
      if (topFp) {
        const want = Math.max(yTopX(topFp.box.x), yTopX(topFp.box.x + topFp.box.w)) - v / 2;
        if (want > topFp.box.y + topFp.box.h) { topFp.box.h = topFp.vLen = want - topFp.box.y; }
      }
      for (const fp of fps) shapeTopLR(fp, x => yTopX(x) - v / 2);
      const hk = Math.min(yTopX(left ? -t : W + t), yTopX(left ? 0 : W)) + Pv;
      if (hk < kp.box.h) { kp.box.h = kp.vLen = hk; kp.ops = kp.ops.filter(o => o.v == null || o.v < hk - 20); }
    }
    // Plint en greeplijsten even breed maken als kast + paslat.
    const ext = pw + v / 2;
    for (const x of parts.filter(x => ['plint', 'trespa', 'greeplijst'].includes(x.rol) && Math.abs(x.box.x) < 0.5 && Math.abs(x.box.w - W) < 0.5)) {
      if (left) x.box.x -= ext;
      x.box.w += ext; x.uLen += ext;
    }
    // Clamex: in de voorkant van de kastpaslat (u1) en in het vlak van de frontpaslat, ter hoogte van de kastpaslat.
    const fu = (left ? -t / 2 : W + t / 2) - xf;
    for (const c of clamexPositions(kp.vLen, S)) {
      const yc = kp.box.y + c;
      const fp = fps.find(f => yc > f.box.y + 40 && yc < f.box.y + (f.edgeH ? Math.min(f.edgeH.u0, f.edgeH.u1) : f.box.h) - 40);
      if (!fp || grips.some(([g0, g1]) => yc > g0 - 30 && yc < g1 + 30)) continue;
      kp.ops.push({ kind: 'clamex', edge: 'u1', pos: c, naam: 'Clamex' });
      fp.ops.push({ kind: 'clamex', face: 'binnen', u: fu, v: yc - fp.box.y, naam: 'Clamex' });
      count('Lamello Clamex P-14');
    }
    // Elk stuk frontpaslat minstens één Clamex (kort stuk: in het midden).
    for (const fp of fps) if (!fp.ops.some(o => o.kind === 'clamex') && fp.vLen > 60) {
      const yc = fp.box.y + (fp.edgeH ? Math.min(fp.edgeH.u0, fp.edgeH.u1) : fp.vLen) / 2;
      kp.ops.push({ kind: 'clamex', edge: 'u1', pos: yc - kp.box.y, naam: 'Clamex' });
      fp.ops.push({ kind: 'clamex', face: 'binnen', u: fu, v: yc - fp.box.y, naam: 'Clamex' });
      count('Lamello Clamex P-14');
    }
    // De kastpaslat wordt van buitenaf vastgeschroefd: geen schroefgaten in de zijwand.
  }

  // Zijpaneel (afwerking) direct op maat: voorkant gelijk met de fronten, achter tegen de muur; boven tot de bovenkant
  // (onderkast: tegen het werkblad; met paslat boven: tot het plafond), onder tot de vloer (met Trespa als de plint Trespa
  // heeft) of bij een hangkast tot de onderkant van de fronten. Van binnenuit door de zijwand vastgeschroefd.
  for (const kant of ['links', 'rechts']) {
    if (!k.zijpaneel?.[kant]) continue;
    const left = kant === 'links';
    if (Number(k.paslat?.[kant]) > 0) warnings.push(`Zijpaneel ${kant}: er staat ook een paslat aan die kant; het paneel komt tegen de zijwand.`);
    const pd = zijpaneelDikte(k, S);
    const over = zpOver(kant);
    if (zpNaast(kant) && pd > S.zijpaneelNaastFront) warnings.push(`Zijpaneel ${kant}: ${pd} mm dik terwijl het front ernaast zit; maximaal ${S.zijpaneelNaastFront} mm, anders gaat de deur niet open (155°-scharnier). Of laat het front over het paneel lopen.`);
    const isHang = PRESETS.find(x => x.id === k.type)?.groep === 'Bovenkasten';
    const frontsY0 = parts.filter(x => x.rol === 'front').reduce((m, x) => Math.min(m, x.box.y), 0);
    const td2 = !isHang && k.plintTrespa && P > S.trespaDikte ? S.trespaDikte : 0;
    const y0 = isHang ? Math.min(0, frontsY0) : -P + td2;
    const y1 = H + (Number(k.paslat?.boven) || 0);
    const zF = k.front === 'inliggend' || zonderFronten || over ? D : D + fd;   // over: het front loopt voor het paneel
    const pn = add({ id: `zijpaneel-${kant}`, naam: `Zijpaneel ${kant}`, rol: 'afwerk', mat: 'front', dikte: pd, grain: 'v',
      edges: { u0: 0, u1: S.bandFront, v0: isHang ? S.bandFront : 0, v1: S.bandFront },
      box: { x: left ? -pd : W, y: y0, z: 0, w: pd, h: y1 - y0, d: zF }, uLen: zF, vLen: y1 - y0 });   // tot achter de (opgeschroefde) rug
    if (td2) add({ id: `zijpaneel-${kant}-trespa`, naam: `Trespa onder zijpaneel ${kant}`, rol: 'trespa', mat: 'trespa', dikte: td2, grain: 'u', edges: {},
      box: { x: left ? -pd : W, y: -P, z: 0, w: pd, h: td2, d: zF }, uLen: zF, vLen: pd });
    // Schroefgaten in de zijwand (van binnenuit), in een raster.
    const sd = left ? sideL : sideR;
    for (const vv of spreadPositions(sd.vLen, 400, 80)) for (const uu of [60, Dk - 60]) {
      sd.ops.push({ kind: 'boring', face: 'binnen', u: uu, v: vv, dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef zijpaneel' });
      count('Schroef');
    }
    void pn;
  }

  // Ronde kant (links of rechts, buiten de zijwand):
  //  - kwart: kwartrond op de voorhoek (radius R), daarachter een rechte zijkant tot de muur;
  //  - half: halfrond over de hele diepte;
  //  - kop2: kop van een eiland over 2 kasten rug aan rug: een boog (radius R) aan beide fronten en daartussen een recht stuk
  //    (R = halve breedte van de kop = één halfrond). In het rechte stuk kan een nis met een rechte kast (open, deur of lades).
  // Dicht: een volle plaat vlak tegen de kast (buitenkleur, zichtbaar als de deur opengaat; geen kantenband), volle top en
  // bodem, rechte stukken als volle plaat; sponningen (rondSponningBreedte × rondSponningDiepte) waar het buigtriplex
  // (rondTriplexLagen × rondTriplexDikte) in komt; tussenribben en opstaanders; HPL over alles. Clamex met deuvels.
  // Open: ronde bodem, top en legplanken met Clamex en deuvels. Plint (met Trespa) en werkblad rond mee.
  // Ronde kant links, rechts of aan beide kanten (dan dezelfde instellingen aan elke kant).
  // Buigtriplex per stuk: lang of kort buigend, en in die richting op de plaat (grain = richting langs de 2440).
  const buigMelding = new Set();
  const buigZetten = v => {
    const kz = buigKeuze(v.uLen, v.vLen, S, k.rond?.buigRichting);
    v.buigRichting = kz.richting;
    v.grain = kz.richting === 'lang' ? 'u' : 'v';
    const naam = v.naam.replace(/ \(laag \d+\)$/, '');
    if (buigMelding.has(naam)) return;
    buigMelding.add(naam);
    const N = S.nest ?? {}, pl = `${Number(N.buigLengte) || 2440} × ${Number(N.buigBreedte) || 1220}`;
    if (!kz.past) warnings.push(`${naam}: ${Math.round(v.uLen)} × ${Math.round(v.vLen)} past niet op een plaat buigtriplex van ${pl} (lang of kort buigend); in stukken verdelen.`);
    else if (kz.omgezet) warnings.push(`${naam}: past niet op ${k.rond.buigRichting} buigend buigtriplex; ${kz.richting} buigend gebruikt.`);
  };
  const rondKanten = k.rond?.kant === 'beide' ? ['links', 'rechts'] : [k.rond?.kant];
  for (const rd of rondKanten.filter(x => x === 'links' || x === 'rechts').map(kant => ({ ...k.rond, kant }))) {
    const left = rd.kant === 'links';
    const sd = left ? sideL : sideR;
    const X = xl => (left ? xl : W - xl);                  // xl ≤ 0: naar buiten vanaf het buitenvlak van de zijwand
    const zf = k.front === 'inliggend' || zonderFronten ? D : D + fd;   // voorvlak (fronten; zonder fronten: het korpus)
    const kop2 = rd.vorm === 'kop2';
    const vrij = rd.vorm === 'vrij';                          // vrije (organische) vorm, van voor tot achter terug naar de kast
    const half = rd.vorm === 'half' || kop2 || vrij;          // aan twee kanten rond (voor en achter)
    const open = rd.uitvoering === 'open';
    const diep = zf - zBack;
    const R = kop2 ? Math.max(50, Math.min(Number(rd.radius) || diep, diep)) : half ? diep / 2
      : Math.max(50, Math.min(Number(rd.radius) || Math.min(300, diep), diep));
    // Breedte van het ronde deel (vanaf de kast tot de buitenkant): standaard R (+ de plaat tegen de kast); breder =
    // vooraan eerst een recht stuk, dan de boog.
    const xPan = open ? 0 : -t;                               // buitenvlak van de plaat tegen de kast
    const Bw = vrij ? R - xPan : Math.max(R - xPan, Number(rd.breedte) || 0);
    const cx = -(Bw - R);
    // Middelpunten van de boog vooraan en achteraan (kop2: achteraan aan de front van de kast erachter, zelfde diepte).
    const czF = zf - R, czB = kop2 ? zBack - diep + R : czF;
    const mid = half && czF - czB > 1;                        // recht stuk tussen de twee bogen
    const cz = czF;
    const hp = open ? 0 : S.rondHplDikte, ply = open ? 0 : S.rondTriplexLagen * S.rondTriplexDikte, sp = S.rondSponningDiepte;
    const Ro = R - hp, Ri = Ro - ply;                        // buiten- en binnenkant van het buigtriplex
    if (k.zijpaneel?.[rd.kant]) warnings.push(`Ronde kant ${rd.kant}: er staat ook een zijpaneel aan die kant.`);
    if (!open && R < S.rondHplMinRadius) warnings.push(`Ronde kant: radius ${r1(R)} mm is kleiner dan de kleinste buigradius van de HPL (${S.rondHplMinRadius} mm).`);
    if (!open && Math.abs(ply - S.rondSponningBreedte) > 0.5) warnings.push(`Ronde kant: de sponning (${S.rondSponningBreedte} mm) is niet even breed als het buigtriplex (${ply} mm).`);
    const nSeg = 18;
    const arcAt = (rr, ccz, a0, a1) => Array.from({ length: nSeg + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / nSeg; return [cx + rr * Math.cos(a), ccz + rr * Math.sin(a)]; });
    const arcF = rr => arcAt(rr, czF, Math.PI / 2, Math.PI);
    const arcB = rr => arcAt(rr, czB, Math.PI, 1.5 * Math.PI);
    // Omtrek op afstand rr van de middelpunten: boog vooraan (en recht stuk + boog achteraan).
    const dd = pts => pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.01);
    // Vrije vorm: de buitenkant (niveau R) volgt de gekozen vorm; elk ander niveau is een evenwijdige lijn.
    const vrijA = vrij ? Math.max(40, (Number(rd.uitsteek) || 300) - (open ? 0 : t)) : 0;
    const vrijBase = vrij ? vrijeVormLijn(rd, zf, zBack, cx, vrijA) : null;
    const arc = rr => vrij ? dd(offsetLijn(vrijBase, R - rr)) : dd(half ? [...arcF(rr), ...arcB(rr)] : arcF(rr));
    if (vrij && !open) {
      // Kleinste bocht van de vrije vorm (aan de buitenkant): te krap voor HPL of buigtriplex?
      const c = vrijBase; let rmin = Infinity;
      for (let i = 1; i + 1 < c.length; i++) {
        const [a, b, d2] = [c[i - 1], c[i], c[i + 1]], ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(d2[0] - b[0], d2[1] - b[1]), ca2 = Math.hypot(d2[0] - a[0], d2[1] - a[1]);
        const area = Math.abs((b[0] - a[0]) * (d2[1] - a[1]) - (d2[0] - a[0]) * (b[1] - a[1])) / 2;
        if (area > 1e-6) rmin = Math.min(rmin, ab * bc * ca2 / (4 * area));
      }
      if (rmin < S.rondHplMinRadius) warnings.push(`Vrije vorm: de krapste bocht is R ${r1(rmin)} mm, kleiner dan de kleinste buigradius van de HPL (${S.rondHplMinRadius} mm). Maak de vorm vloeiender of minder diep.`);
    }
    const polyLen = pts => pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
    const tail = !half && cz > zBack + sp + 5;              // kwartrond: recht stuk van de boog tot tegen de muur
    // Een vlak deel met een vorm in het bovenaanzicht (xl, z).
    const shaped = (o, poly) => {
      const xs = poly.map(q => X(q[0])), zs = poly.map(q => q[1]);
      const bx = Math.min(...xs), bz = Math.min(...zs);
      const pts = poly.map(q => [X(q[0]) - bx, q[1] - bz]).filter((q, i, a) => { const n = a[(i + 1) % a.length]; return Math.hypot(q[0] - n[0], q[1] - n[1]) > 0.01; });
      return add({ ...o, box: { x: bx, y: o.y, z: bz, w: Math.max(...xs) - bx, h: o.h, d: Math.max(...zs) - bz },
        shape3d: { plane: 'xz', pts } });
    };
    // Een staand recht stuk (rechthoek in het bovenaanzicht).
    const panel = (o, x0, x1, z0, z1, y0, y1) => add({ ...o, dikte: t, grain: 'v', box: { x: Math.min(X(x0), X(x1)), y: y0, z: z0, w: Math.abs(X(x1) - X(x0)), h: y1 - y0, d: z1 - z0 } });
    // Clamex met een deuvel aan weerszijden (zichtverbinding). Kant: edge/pos (positie langs de kant, binnen lo..hi);
    // vlak: face/u/v, met dir = richting van de verbinding in (u, v).
    const join2 = (ep, edge, pos, lo, hi, fp, face, u, v, dir, dowels = true) => {
      ep.ops.push({ kind: 'clamex', edge, pos, naam: 'Clamex' });
      fp.ops.push({ kind: 'clamex', face, u, v, dir, naam: 'Clamex' });
      count('Lamello Clamex P-14');
      if (dowels) for (const s of [-1, 1]) {
        const d = s * S.clamexDeuvel;
        if (pos + d < lo + 15 || pos + d > hi - 15) continue;
        ep.ops.push({ kind: 'boring', edge, pos: pos + d, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
        fp.ops.push({ kind: 'boring', face, u: u + dir[0] * d, v: v + dir[1] * d, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
        count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
      }
    };
    // Liggend deel (plaat of rib) tegen het buitenvlak van de zijwand: Clamex en deuvels langs de rechte kant (xl = 0).
    const toSide = (hp2, y, zA, zE, dowels = true) => {
      const za = Math.max(zA, zBack), zb = Math.min(zE, zBack + sd.uLen);
      if (zb - za < 40) return [];
      const zs = clamexPositions(zb - za, S).map(c => za + c);
      for (const z of zs) join2(hp2, left ? 'u1' : 'u0', z - hp2.box.z, za - hp2.box.z, zb - hp2.box.z, sd, 'buiten', sideU(z), sideV(y + t / 2), [1, 0], dowels);
      return zs;
    };
    let sideZs = [];
    const plateIn = (pl, xl, z) => [X(xl) - pl.box.x, z - pl.box.z];
    const contourOp = (pl, pts, waste, extra = {}) => pl.ops.push({ kind: 'contour', pts: dd(pts).map(q => plateIn(pl, ...q)), waste: plateIn(pl, ...waste), naam: 'Ronde kant', ...extra });
    // Stukken langs de bogen (opstaanders): posities en richting naar het middelpunt.
    const alongArcs = (rr, step) => {
      const out = [];
      if (vrij) {
        // Langs de vrije lijn: per punt een denkbeeldig middelpunt (punt − rr × normaal naar buiten), zodat studQuad werkt.
        const c = arc(rr), cum = [0];
        for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
        const L = cum[cum.length - 1], n = Math.max(1, Math.ceil(L / step) - 1);
        for (let j = 1; j <= n; j++) {
          const sL = L * j / (n + 1); let i = cum.findIndex(v => v >= sL); i = Math.max(1, i);
          const f = (sL - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
          const P = [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * f, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * f];
          let tx = c[i][0] - c[i - 1][0], tz = c[i][1] - c[i - 1][1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
          const ux = tz, uz = -tx;                            // normaal naar buiten
          out.push({ a: Math.atan2(uz, ux), ccz: P[1] - rr * uz, off: P[0] - rr * ux - cx });
        }
        return out;
      }
      for (const [ccz, a0] of half ? [[czF, Math.PI / 2], [czB, Math.PI]] : [[czF, Math.PI / 2]]) {
        const n = Math.max(1, Math.ceil(rr * Math.PI / 2 / step) - 1);
        for (let j = 1; j <= n; j++) out.push({ a: a0 + (Math.PI / 2) * j / (n + 1), ccz });
      }
      return out;
    };
    const studQuad = (a, ccz, r0, r2, hw, off = 0) => {
      const ca = Math.cos(a), sa = Math.sin(a), tx = -sa, tz = ca, ox = cx + off;
      return { ca, sa, ox, quad: [[ox + r0 * ca - hw * tx, ccz + r0 * sa - hw * tz], [ox + r2 * ca - hw * tx, ccz + r2 * sa - hw * tz],
        [ox + r2 * ca + hw * tx, ccz + r2 * sa + hw * tz], [ox + r0 * ca + hw * tx, ccz + r0 * sa + hw * tz]] };
    };
    // Nis (kop2, in het rechte stuk): maten.
    const nisOn = !open && kop2 && mid && rd.nis?.aan;
    const zc = (czF + czB) / 2;
    const xFP = cx - Ro + t;                                 // binnenvlak van de rechte voorkant (kop2)
    const nis = nisOn ? (() => {
      // Vrije maten van de nis (binnenmaat); rondom komen de nisplaten (t) in de buitenkleur.
      const lenS = czF - czB;
      const nb = Math.max(150, Math.min(Number(rd.nis.breedte) || lenS - 4 * t, lenS - 2 * sp - 20 - 2 * t));
      const nh = Math.max(150, Math.min(Number(rd.nis.hoogte) || 500, H - 4 * t - 10));
      const ny = Math.max(2 * t + 5, Math.min(Number(rd.nis.vanOnder ?? 100) || 2 * t + 5, H - 2 * t - 5 - nh));
      const avail = xPan - (cx - R) - t;                     // van de voorkant tot de plaat tegen de kasten, min de nisrug
      const ndp = Math.max(100, Math.min(Number(rd.nis.diepte) || avail, avail));
      return { nb, nh, ny, ndp };
    })() : null;
    const ribs = [];
    if (open) {
      // Open: ronde bodem, top en legplanken ertussen (radius R tot aan de zijwand), kanten afplakken.
      const nMid = Math.max(0, Number(rd.legplanken ?? 2));
      const ys = Array.from({ length: nMid + 2 }, (_, i) => i * (H - t) / (nMid + 1));
      const poly = half ? [[0, czB - R], [0, czF + R], ...arc(R)] : [[0, zBack], [0, czF + R], ...arc(R), ...(tail ? [[cx - R, zBack]] : [])];
      ys.forEach((y, i) => {
        const rib = shaped({ naam: i === 0 ? 'Ronde bodem' : i === ys.length - 1 ? 'Ronde top' : 'Ronde legplank', rol: 'rondrib', mat: 'korpus', dikte: t, grain: 'u', edges: {}, y, h: t, bandRond: S.bandLegplank }, poly);
        rib.uLen = rib.box.w; rib.vLen = rib.box.d;
        contourOp(rib, arc(R), [cx - R, czF + R]);
        toSide(rib, y, half ? czB - R : zBack, czF + R);
        ribs.push(rib);
      });
    } else {
      // Dicht. Top en bodem: volle platen tot de buitenkant van het buigtriplex; sponning langs de boog aan de binnenkant.
      const zFS = czF + Ro, zBS = czB - Ro;                  // buitenkant van het buigtriplex vooraan / achteraan
      const platePoly = half ? [[0, zBS], [0, zFS], [cx, zFS], ...arc(Ro).slice(1)]
        : [[0, zBack], [0, zFS], [cx, zFS], ...arc(Ro).slice(1), ...(tail ? [[cx - Ro, zBack]] : [])];
      // Sponning: binnenrand op Ri, aan de uiteinden recht door tot sp in de rechte stukken (einde: halve freesdiameter terug).
      const tr = 9;
      const rabbets = mid
        ? [[[xPan + sp - tr, czF + Ri], ...arcF(Ri), [cx - Ri, czF - sp + tr]], [[cx - Ri, czB + sp - tr], ...arcB(Ri), [xPan + sp - tr, czB - Ri]]]
        : [[[xPan + sp - tr, czF + Ri], ...arc(Ri), ...(half ? [[xPan + sp - tr, czB - Ri]] : tail ? [[cx - Ri, czF - sp + tr]] : [])]];
      for (const [y, face, nm] of [[0, 'boven', 'Ronde bodem'], [H - t, 'onder', 'Ronde top']]) {
        const pl = shaped({ naam: nm, rol: 'rondrib', mat: 'rond', dikte: t, grain: 'u', edges: {}, y, h: t }, platePoly);
        pl.uLen = pl.box.w; pl.vLen = pl.box.d;
        for (const rb of rabbets) contourOp(pl, rb, [cx - Ro - 20, zFS + 20], { face, diepte: sp, lead: 0, naam: 'Sponning buigtriplex' });
        contourOp(pl, arc(Ro), [cx - Ro, zFS]);
        // Zonder deuvels: die zouden de Clamex van de plaat tegen de kast raken (de verbinding zit achter die plaat).
        sideZs = toSide(pl, y, half ? zBS : zBack, zFS, false);
        if (kop2) {
          // Ook vast aan de zijwand van de kast erachter: Clamex in de kant van de plaat hier, in die zijwand via 'extern'.
          const za = Math.max(zBS, zBack - sd.uLen), zb = zBack;
          if (zb - za > 40) for (const c of clamexPositions(zb - za, S)) {
            const z = za + c;
            pl.ops.push({ kind: 'clamex', edge: left ? 'u1' : 'u0', pos: z - pl.box.z, naam: 'Clamex' });
            extern.push({ kind: 'clamex', kant: rd.kant, achter: zBack - z, y: y + t / 2 });
            sideZs.push(z);
          }
          sideZs.sort((a, b) => a - b);
        }
        ribs.push(pl);
      }
      const [bot, top] = ribs;
      // Plaat vlak tegen de kast (volle plaat, buitenkleur) tussen bodem en top; vooraan (en achteraan bij halfrond) een
      // sponning in het buitenvlak: rondSponningBreedte breed (vanaf de kant) en rondSponningDiepte diep, voor het buigtriplex.
      const zP0 = half ? zBS : zBack, zP1 = zFS;
      const inner = panel({ naam: 'Plaat ronde kant (tegen de kast)', rol: 'rondstrook', mat: 'rond', edges: {} }, xPan, 0, zP0, zP1, t, H - t);
      inner.uLen = zP1 - zP0; inner.vLen = H - 2 * t;
      const sb = S.rondSponningBreedte;
      const rabbetAt = (uEdge, dirIn) => inner.ops.push({ kind: 'groef', face: 'voor', frees: true, u1: uEdge + dirIn * (sb - 10) / 2, v1: -10, u2: uEdge + dirIn * (sb - 10) / 2, v2: inner.vLen + 10, breedte: sb + 10, diepte: sp, naam: 'Sponning buigtriplex' });
      rabbetAt(inner.uLen, -1);
      if (half) rabbetAt(0, 1);
      const straight = [{ p: inner, along: 'z', xc: xPan / 2, z0: zP0 }];
      // Rechte stukken waar het buigtriplex in het vlak in komt (sponning sb diep, sp breed): de rechte zijkant tot de muur
      // (kwartrond) of de rechte voorkant tussen de twee bogen (kop2).
      const inPlane = (naam, z0, z1, ends) => {
        const ts = panel({ naam, rol: 'rondstrook', mat: 'rond', edges: {} }, cx - Ro, cx - Ro + t, z0, z1, t, H - t);
        ts.uLen = z1 - z0; ts.vLen = H - 2 * t;
        for (const e of ends) {
          const uc = e === 'u1' ? ts.uLen - (sp - 10) / 2 : (sp - 10) / 2;
          ts.ops.push({ kind: 'groef', face: 'voor', frees: true, u1: uc, v1: -10, u2: uc, v2: ts.vLen + 10, breedte: sp + 10, diepte: sb, naam: 'Sponning buigtriplex' });
        }
        straight.push({ p: ts, along: 'z', xc: cx - Ro + t / 2, z0 });
        return ts;
      };
      if (tail) inPlane('Rechte zijkant ronde kant', zBack, cz, ['u1']);
      let front = null;
      if (mid) {
        front = inPlane('Rechte voorkant ronde kop', czB, czF, ['u0', 'u1']);
        if (nis) {
          // Opening: de rand van de voorplaat zit in de sponning van de nisplaten (sp diep), dus nis + 2 × (t − sp).
          const lipN = t - sp, ow = nis.nb + 2 * lipN, oh = nis.nh + 2 * lipN;
          const u0 = zc - ow / 2 - front.box.z, v0 = nis.ny - lipN - front.box.y;
          front.ops.push({ kind: 'uitsparing', u: u0, v: v0, w: ow, h: oh, naam: 'Opening nis' });
          // 3D: de plaat met de opening.
          front.shape3d = { plane: 'zy', pts: [[0, 0], [front.box.d, 0], [front.box.d, front.box.h], [0, front.box.h]],
            holes: [[[u0, v0], [u0, v0 + oh], [u0 + ow, v0 + oh], [u0 + ow, v0]]] };
        }
      }
      // Plaat tegen de muur (kwartrond): achteraan tussen de plaat tegen de kast en de rechte zijkant (of de boog).
      const xW0 = tail ? cx - Ro + t : cx - Ri;
      let backP = null;
      if (!half && xPan - xW0 > 40) {
        backP = panel({ naam: 'Plaat tegen de muur ronde kant', rol: 'rondstrook', mat: 'korpus', edges: {} }, xW0, xPan, zBack, zBack + t, t, H - t);
        backP.uLen = xPan - xW0; backP.vLen = H - 2 * t;
        straight.push({ p: backP, along: 'x', x0: xW0, zc: zBack + t / 2 });
      }
      // Clamex en deuvels in de onder- en bovenkant van de rechte stukken, in de bodem en de top.
      for (const st of straight) {
        const p2 = st.p;
        // De plaat tegen de kast: Clamex telkens tussen die van bodem/top naar de kastzijwand (anders raken ze elkaar
        // in de plaat), zonder deuvels ernaast.
        const own = st.p === inner && sideZs.length > 1;
        const cs = own ? sideZs.slice(1).map((z, i) => (z + sideZs[i]) / 2 - st.z0) : clamexPositions(p2.uLen, S);
        for (const c of cs) {
          for (const [edge, pl, face] of [['v0', bot, 'boven'], ['v1', top, 'onder']]) {
            if (st.along === 'x') {
              const xx = X(st.x0 + c);
              join2(p2, edge, xx - p2.box.x, 0, p2.uLen, pl, face, xx - pl.box.x, st.zc - pl.box.z, [1, 0]);
            } else join2(p2, edge, c, 0, p2.uLen, pl, face, X(st.xc) - pl.box.x, st.z0 + c - pl.box.z, [0, 1], !own);
          }
        }
      }
      // Tussenribben (pas vanaf rondRibVanaf hoog, om de rondRibAfstand), met Clamex en deuvels tegen de plaat tegen de kast.
      // Niet op de hoogte van de nis.
      const nMid = H >= S.rondRibVanaf ? Math.max(0, Math.ceil((H - t) / S.rondRibAfstand) - 1) : 0;
      const xT = cx - Ro + t;                                // binnenvlak van de rechte zijkant / voorkant
      const zR0 = backP ? zBack + t : zBack;                // achter de plaat tegen de muur
      const ribPoly = mid ? [[xPan, czB - Ri], [xPan, czF + Ri], ...arcF(Ri), [xT, czF], [xT, czB], ...arcB(Ri)]
        : half ? [[xPan, czB - Ri], [xPan, czF + Ri], ...arc(Ri)]
        : [[xPan, zR0], [xPan, czF + Ri], ...arc(Ri), ...(tail ? [[xT, czF], [xT, zR0]] : [])];
      const ribCut = mid ? [...arcF(Ri), [xT, czF], [xT, czB], ...arcB(Ri)] : half ? arc(Ri) : [...arc(Ri), ...(tail ? [[xT, czF], [xT, zR0]] : [])];
      const ribYs = [];
      for (let i = 1; i <= nMid; i++) {
        const y = i * (H - t) / (nMid + 1);
        if (nis && y + t > nis.ny - t - 5 && y < nis.ny + nis.nh + t + 5) continue;
        ribYs.push(y);
        const rib = shaped({ naam: 'Rib ronde kant', rol: 'rondrib', mat: 'korpus', dikte: t, grain: 'u', edges: {}, y, h: t }, ribPoly);
        rib.uLen = rib.box.w; rib.vLen = rib.box.d;
        contourOp(rib, ribCut, [cx - Ro, zFS]);
        const za = half ? czB - Ri : zR0, zb = czF + Ri;
        for (const c of clamexPositions(zb - za - 30, S)) {
          const z = za + 15 + c;
          join2(rib, left ? 'u1' : 'u0', z - rib.box.z, za - rib.box.z, zb - rib.box.z, inner, 'voor', z - inner.box.z, y + t / 2 - inner.box.y, [1, 0]);
        }
      }
      const levels = [0, ...ribYs, H - t];
      const ribParts = parts.filter(x => x.naam === 'Rib ronde kant' && ribYs.includes(x.box.y));
      const levelPart = y => (y === 0 ? bot : y === H - t ? top : ribParts.find(x => Math.abs(x.box.y - y) < 0.5));
      // Opstaanders langs de bogen (en het rechte stuk vooraan bij een bredere ronde kant), net binnen het buigtriplex,
      // om het op te lijmen en te nieten; tussen bodem, ribben en top, met twee deuvels aan elk uiteinde (+ lijm).
      {
        const sdp = S.rondStaanderBreedte, hw = t / 2;
        const Ls = xPan - cx, ms = Ls > S.rondStaanderAfstand * 0.6 ? Math.ceil(Ls / S.rondStaanderAfstand) - 1 || 1 : 0;
        const spots = alongArcs(Ri, S.rondStaanderAfstand).map(s => ({ off: 0, ...s }));
        for (let j = 1; j <= ms; j++) {
          spots.push({ a: Math.PI / 2, ccz: czF, off: Ls * j / (ms + 1) });
          if (half) spots.push({ a: 1.5 * Math.PI, ccz: czB, off: Ls * j / (ms + 1) });
        }
        for (const { a, ccz, off } of spots) {
          if (kop2 && !mid && !nis && Math.abs(a - Math.PI) < 0.15) continue;   // daar staat de middenplaat
          const { ca, sa, ox, quad } = studQuad(a, ccz, Ri - sdp, Ri, hw, off);
          const dws = [sdp * 0.25, sdp * 0.75].map(d => ({ d, pt: [ox + (Ri - sdp + d) * ca, ccz + (Ri - sdp + d) * sa] }));
          for (let i = 0; i + 1 < levels.length; i++) {
            const y0 = levels[i] + t, hh = levels[i + 1] - levels[i] - t;
            const stp = shaped({ naam: 'Opstaander ronde kant', rol: 'rondrib', mat: 'korpus', dikte: t, grain: 'v', edges: {}, y: y0, h: hh }, quad);
            stp.uLen = sdp; stp.vLen = hh;
            for (const [edge, lv, face] of [['v0', levelPart(levels[i]), 'boven'], ['v1', levelPart(levels[i + 1]), 'onder']]) {
              if (!lv) continue;
              for (const { d, pt } of dws) {
                stp.ops.push({ kind: 'boring', edge, pos: d, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
                lv.ops.push({ kind: 'boring', face, u: X(pt[0]) - lv.box.x, v: pt[1] - lv.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
                count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
              }
            }
          }
        }
      }
      if (kop2 && !nis) {
        // Middenplaat in het midden van de kop (van de plaat tegen de kasten tot het buigtriplex of de rechte voorkant),
        // in stukken tussen bodem, ribben en top, met twee deuvels per uiteinde.
        const xm0 = mid ? xT : cx - Ri, xm1 = xPan, lm = xm1 - xm0;
        for (let i = 0; i + 1 < levels.length; i++) {
          const y0 = levels[i] + t, hh = levels[i + 1] - levels[i] - t;
          const mpP = panel({ naam: 'Middenplaat ronde kop', rol: 'rondstrook', mat: 'korpus', edges: {} }, xm0, xm1, zc - t / 2, zc + t / 2, y0, y0 + hh);
          mpP.uLen = lm; mpP.vLen = hh;
          for (const [edge, lv, face] of [['v0', levelPart(levels[i]), 'boven'], ['v1', levelPart(levels[i + 1]), 'onder']]) {
            if (!lv) continue;
            for (const f of [0.25, 0.75]) {
              const xx = X(xm0 + lm * f);
              mpP.ops.push({ kind: 'boring', edge, pos: xx - mpP.box.x, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
              lv.ops.push({ kind: 'boring', face, u: xx - lv.box.x, v: zc - lv.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
              count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
            }
          }
        }
      }
      // Nis: opgebouwd uit de ronde kop zelf: nisbodem, nistop, twee nis-zijkanten en een nisrug, in de buitenkleur; de
      // nisplaten lopen door de opening tot gelijk met de voorkant (voorkanten met kantenband), met Clamex en deuvels.
      // Inhoud: open met legplanken, een inliggende deur of inliggende lades (gelijk met de voorkant, voeg rondom).
      if (nis) {
        const { nb, nh, ny, ndp } = nis;
        const xF = cx - R, xB = xF + ndp;                    // voorkant (gelijk met de HPL), voorvlak van de nisrug
        const z0 = zc - nb / 2 - t, z1 = zc + nb / 2 + t, bandN = S.bandFront;
        const nisPart = (naam, extra, xa, xb2, za, zb, ya, yb) => add({ naam, rol: 'nis', mat: 'rond', dikte: t, edges: {}, ...extra,
          box: { x: Math.min(X(xa), X(xb2)), y: ya, z: za, w: Math.abs(X(xb2) - X(xa)), h: yb - ya, d: zb - za } });
        const bodem = nisPart('Nis: bodem', { grain: 'u', edges: { v1: bandN } }, xF, xB, z0, z1, ny - t, ny);
        const nisTop = nisPart('Nis: top', { grain: 'u', edges: { v1: bandN } }, xF, xB, z0, z1, ny + nh, ny + nh + t);
        for (const q of [bodem, nisTop]) { q.uLen = nb + 2 * t; q.vLen = ndp; }
        const zijL = nisPart('Nis: zijkant', { grain: 'v', edges: { u1: bandN } }, xF, xB, z0, z0 + t, ny, ny + nh);
        const zijR = nisPart('Nis: zijkant', { grain: 'v', edges: { u1: bandN } }, xF, xB, z1 - t, z1, ny, ny + nh);
        for (const q of [zijL, zijR]) { q.uLen = ndp; q.vLen = nh; }
        const rugN = nisPart('Nis: rug', { grain: 'v' }, xB, xB + t, z0, z1, ny - t, ny + nh + t);
        rugN.uLen = nb + 2 * t; rugN.vLen = nh + 2 * t;
        // Sponning vooraan aan de buitenkant van bodem, top en zijkanten (zoals de plaat tegen de kast): sp diep, zo breed
        // als de voorplaat + HPL; de rand van de opening in de voorplaat zit erin, vooraan blijft t − sp van de nisplaat.
        const rw = t + hp;
        for (const [q, face] of [[bodem, 'onder'], [nisTop, 'boven']]) {
          const vc = ndp - rw / 2 + 5;
          q.ops.push({ kind: 'groef', face, frees: true, u1: -10, v1: vc, u2: q.uLen + 10, v2: vc, breedte: rw + 10, diepte: sp, naam: 'Sponning voorplaat' });
        }
        for (const q of [zijL, zijR]) {
          const uc = ndp - rw / 2 + 5;
          q.ops.push({ kind: 'groef', face: 'voor', frees: true, u1: uc, v1: -10, u2: uc, v2: q.vLen + 10, breedte: rw + 10, diepte: sp, naam: 'Sponning voorplaat' });
        }
        // Zijkanten op bodem en top; bodem, top en zijkanten tegen de nisrug.
        for (const zs of [zijL, zijR]) {
          const zcS = zs.box.z + t / 2;
          for (const c of clamexPositions(ndp - 20, S)) {
            join2(zs, 'v0', c + 10, 0, ndp, bodem, 'boven', zcS - bodem.box.z, c + 10, [0, 1]);
            join2(zs, 'v1', c + 10, 0, ndp, nisTop, 'onder', zcS - nisTop.box.z, c + 10, [0, 1]);
          }
          for (const c of clamexPositions(nh, S)) join2(zs, 'u0', c, 0, nh, rugN, 'voor', zcS - rugN.box.z, ny + c - rugN.box.y, [0, 1]);
        }
        for (const [q, yc] of [[bodem, ny - t / 2], [nisTop, ny + nh + t / 2]])
          for (const c of clamexPositions(nb + 2 * t - 40, S)) join2(q, 'v0', c + 20, 0, nb + 2 * t, rugN, 'voor', c + 20, yc - rugN.box.y, [1, 0]);
        const inhoud = rd.nis.inhoud ?? 'open';
        const v = S.voeg;
        if (inhoud === 'open') {
          // Legplanken op dragers in de nis-zijkanten.
          const n = Math.max(0, Number(rd.nis.legplanken ?? 1));
          for (let j = 1; j <= n; j++) {
            const yy = ny + j * nh / (n + 1) - t / 2;
            const lp = add({ naam: 'Nis: legplank', rol: 'legplank', mat: 'rond', dikte: t, grain: 'u', bandPlaat: true, edges: { v1: bandN },
              box: { x: Math.min(X(xF + 10), X(xB)), y: yy, z: z0 + t + S.legplankSpeling, w: Math.abs(X(xB) - X(xF + 10)), h: t, d: nb - 2 * S.legplankSpeling }, uLen: nb - 2 * S.legplankSpeling, vLen: ndp - 10 });
            void lp;
            for (const zs of [zijL, zijR]) for (const uu of [40, ndp - 40]) zs.ops.push({ kind: 'boring', face: 'binnen', u: uu, v: yy - ny, dia: 5, diepte: 12, naam: 'Legplankdrager' });
            count('Legplankdrager', 4);
          }
        } else if (inhoud === 'deur') {
          // Inliggende deur, gelijk met de voorkant; scharnieren aan de gekozen kant, montageplaten op de nis-zijkant.
          const links = (rd.nis.scharnier ?? 'links') === 'links';
          const dw = nb - 2 * v, dh = nh - 2 * v;
          const deur = add({ naam: 'Nis: deur', rol: 'front', mat: 'front', dikte: fd, grain: 'v', edges: { u0: S.bandFront, u1: S.bandFront, v0: S.bandFront, v1: S.bandFront },
            box: { x: Math.min(X(xF), X(xF + fd)), y: ny + v, z: zc - dw / 2, w: fd, h: dh, d: dw }, uLen: dw, vLen: dh });
          const hc = hingeCount(dh, dw);
          const pos = Array.from({ length: hc }, (_, j) => S.scharnierRand + j * (dh - 2 * S.scharnierRand) / Math.max(1, hc - 1));
          const zs = links ? zijL : zijR;
          for (const pv of pos) {
            const cu = links ? S.potRand + S.potDia / 2 : dw - S.potRand - S.potDia / 2;
            deur.ops.push({ kind: 'boring', face: 'binnen', u: cu, v: pv, dia: S.potDia, diepte: S.potDiepte, naam: 'Scharnierpot' });
            for (const dv of [-S.montageplaatTussen / 2, S.montageplaatTussen / 2]) zs.ops.push({ kind: 'boring', face: 'binnen', u: ndp - fd - S.montageplaatVoor, v: v + pv + dv, dia: S.montageplaatDia, diepte: S.montageplaatDiepte, naam: 'Montageplaat' });
            count('Scharnier Blum inliggend (snelspan)'); count('Montageplaat');
          }
          if (k.greep === 'push') count('Push-open drevel');
        } else {
          // Inliggende lades: fronten in de opening, de lades op maat bestellen (NL volgens de nisdiepte).
          const n = Math.max(1, Number(rd.nis.lades) || 2);
          const fh = (nh - (n + 1) * v) / n, fw = nb - 2 * v;
          const nlN = NL_LIST.filter(x => x <= ndp - fd - 10).pop();
          for (let j = 0; j < n; j++) {
            add({ naam: `Nis: ladefront ${j + 1}`, rol: 'front', mat: 'front', dikte: fd, grain: 'v', edges: { u0: S.bandFront, u1: S.bandFront, v0: S.bandFront, v1: S.bandFront },
              box: { x: Math.min(X(xF), X(xF + fd)), y: ny + v + j * (fh + v), z: zc - fw / 2, w: fd, h: fh, d: fw }, uLen: fw, vLen: fh });
          }
          order(`Lade op maat voor de nis (${k.code}): ${n}× inliggend, binnenbreedte nis ${r1(nb)}, NL ${nlN ?? '?'}`, n);
          warnings.push('Nis met lades: de geleiders worden in de nis-zijkanten gemonteerd volgens de lade (geen boringen voorzien).');
        }
        warnings.push(`Nis in de ronde kop: ${r1(nb)} × ${r1(nh)} binnenmaat (vanaf ${r1(ny)} boven de onderkant), ${r1(ndp)} diep, ${inhoud === 'lades' ? 'met inliggende lades' : inhoud === 'deur' ? 'met inliggende deur' : 'open'}. Nisplaten in de buitenkleur tot gelijk met de voorkant, met een sponning (${sp} diep) waar de rand van de voorplaat in zit; HPL tot tegen de rand van de nisplaten.`);
      }
      // Buigtriplex: in de sponningen van bodem en top (sp diep) en van de rechte stukken; op maat (afgewikkeld).
      // Met een recht stuk tussen de bogen: twee stukken (één per boog), anders één.
      const pieces = mid
        ? [rr => [[xPan + sp, czF + rr], ...arcF(rr), [cx - rr, czF - sp]], rr => [[cx - rr, czB + sp], ...arcB(rr), [xPan + sp, czB - rr]]]
        : [rr => [[xPan + sp, czF + rr], ...arc(rr), ...(half ? [[xPan + sp, czB - rr]] : tail ? [[cx - rr, czF - sp]] : [])]];
      pieces.forEach((ends, pi) => {
        for (let i = 0; i < S.rondTriplexLagen; i++) {
          const r0 = Ri + i * S.rondTriplexDikte, r2 = r0 + S.rondTriplexDikte;
          const v = shaped({ naam: `Buigtriplex ronde kant${pieces.length > 1 ? (pi ? ' achter' : ' voor') : ''} (laag ${i + 1})`, rol: 'rondhuid', mat: 'buig', dikte: S.rondTriplexDikte, grain: 'u', edges: {},
            vasteRichting: true, y: t - sp, h: H - 2 * (t - sp), kleurVast: '#d8b98a' }, [...dd(ends(r2)), ...dd(ends(r0)).reverse()]);
          v.uLen = polyLen(dd(ends((r0 + r2) / 2))); v.vLen = H - 2 * (t - sp);
          buigZetten(v);
        }
      });
      // HPL: over alles: de rest van de plaat tegen de kast voor de sponning, de bogen en de rechte stukken.
      const endsH = rr => dd([[0, czF + rr], ...arc(rr), ...(half ? [[0, czB - rr]] : tail ? [[cx - rr, zBack]] : [])]);
      const hpl = shaped({ naam: 'HPL ronde kant', rol: 'rondhuid', mat: 'hpl', dikte: hp, grain: 'u', edges: {}, nietZagen: true, y: 0, h: H }, [...endsH(R), ...endsH(Ro).reverse()]);
      hpl.uLen = polyLen(endsH(R - hp / 2)) + 2 * S.rondOvermaat; hpl.vLen = H + S.rondOvermaat;
      order(`HPL ${rd.decor || k.decorFront || S.decorFront} ${hp} mm voor ronde kant: ${Math.round(hpl.uLen)} × ${Math.round(hpl.vLen)}${nis ? ' (opening voor de nis uitsnijden)' : ''}`, 1);
    }
    // Plint rond mee: buigtriplex + HPL op de afstand van het plintvlak, op twee plintribben (zelfde middelpunten).
    if (P > 0 && k.plint !== 'geen') {
      const zPf = D - S.plintInsprong;                      // voorvlak van de plint
      const Rp = R - (zf - zPf);
      if (Rp > 30) {
        const hpp = S.rondTriplexLagen * S.rondTriplexDikte + S.rondHplDikte, Rpr = Rp - hpp;
        const pPoly = half ? [[0, czB - Rpr], [0, czF + Rpr], [cx, czF + Rpr], ...arc(Rpr).slice(1)]
          : [[0, zBack], [0, czF + Rpr], [cx, czF + Rpr], ...arc(Rpr).slice(1), ...(tail ? [[cx - Rpr, zBack]] : [])];
        // Met Trespa onder de plint: de plint (en de onderste plintrib) td hoger, de Trespa volgt de boog eronder.
        const yP0 = -P + td, Ph = P - td;
        const pribs = [];
        for (const y of [yP0, -S.plintBakDikte]) {
          const pr = shaped({ naam: 'Plintrib ronde kant', rol: 'plintbak', mat: 'korpus', dikte: S.plintBakDikte, grain: 'u', edges: {}, decor: 'Multiplex', plaattype: 'Multiplex', y, h: S.plintBakDikte }, pPoly);
          pr.uLen = pr.box.w; pr.vLen = pr.box.d;
          contourOp(pr, arc(Rpr), [cx - Rpr, czF + Rpr]);
          pribs.push(pr);
        }
        // Plintenbak van het ronde deel steviger: staande platen tegen de kast (en bij kwartrond tegen de muur) en
        // opstaanders langs de boog tussen de twee plintribben (multiplex, geschroefd; opstaanders met twee deuvels per uiteinde).
        {
          const bt = S.plintBakDikte, yb0 = yP0 + bt, hb = -bt - yb0;
          if (hb > 20) {
            const mp = { rol: 'plintbak', mat: 'korpus', dikte: bt, grain: 'u', edges: {}, decor: 'Multiplex', plaattype: 'Multiplex' };
            const zIn0 = half ? czB - Rpr : zBack, zIn1 = czF + Rpr;
            add({ ...mp, naam: 'Plintenbak ronde kant (tegen de kast)', box: { x: Math.min(X(-bt), X(0)), y: yb0, z: zIn0, w: bt, h: hb, d: zIn1 - zIn0 }, uLen: zIn1 - zIn0, vLen: hb });
            if (!half) {
              const xw0 = tail ? cx - Rpr : cx - Rpr * 0.98, xw1 = -bt;
              if (xw1 - xw0 > 40) add({ ...mp, naam: 'Plintenbak ronde kant (tegen de muur)', box: { x: Math.min(X(xw0), X(xw1)), y: yb0, z: zBack, w: xw1 - xw0, h: hb, d: bt }, uLen: xw1 - xw0, vLen: hb });
            }
            const sdp = Math.min(S.rondStaanderBreedte, Rpr * 0.4), hw = bt / 2;
            for (const { a, ccz, off = 0 } of alongArcs(Rpr, S.rondStaanderAfstand)) {
              const { ca, sa, ox, quad } = studQuad(a, ccz, Rpr - sdp, Rpr, hw, off);
              const stp = shaped({ ...mp, naam: 'Opstaander ronde plint', grain: 'v', y: yb0, h: hb }, quad);
              stp.uLen = sdp; stp.vLen = hb;
              for (const [edge, lv, face] of [['v0', pribs[0], 'boven'], ['v1', pribs[1], 'onder']]) {
                for (const d of [sdp * 0.25, sdp * 0.75]) {
                  const pt = [ox + (Rpr - sdp + d) * ca, ccz + (Rpr - sdp + d) * sa];
                  stp.ops.push({ kind: 'boring', edge, pos: d, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
                  lv.ops.push({ kind: 'boring', face, u: X(pt[0]) - lv.box.x, v: pt[1] - lv.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
                  count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
                }
              }
            }
          }
        }
        const endP = rr => dd([[0, czF + rr], ...arc(rr), ...(tail ? [[cx - rr, zBack]] : half ? [[0, czB - rr]] : [])]);
        const bandP = (r0, r2) => [...endP(r2), ...endP(r0).reverse()];
        for (let i = 0; i < S.rondTriplexLagen; i++) {
          const r0 = Rpr + i * S.rondTriplexDikte, r2 = r0 + S.rondTriplexDikte;
          const v = shaped({ naam: `Buigtriplex ronde plint (laag ${i + 1})`, rol: 'rondhuid', mat: 'buig', dikte: S.rondTriplexDikte, grain: 'u', edges: {},
            vasteRichting: true, y: yP0, h: Ph, kleurVast: '#d8b98a' }, bandP(r0, r2));
          v.uLen = polyLen(endP((r0 + r2) / 2)) + 2 * S.rondOvermaat; v.vLen = Ph + S.rondOvermaat;
          buigZetten(v);
        }
        const hpP = shaped({ naam: 'HPL ronde plint', rol: 'rondhuid', mat: 'hpl', dikte: S.rondHplDikte, grain: 'u', edges: {}, nietZagen: true, y: yP0, h: Ph }, bandP(Rp - S.rondHplDikte, Rp));
        hpP.uLen = polyLen(endP(Rp)) + 2 * S.rondOvermaat; hpP.vLen = Ph + S.rondOvermaat;
        if (td) {
          // Trespa onder de ronde plint: zelfde diepte als onder de rechte plint (t), buitenkant gelijk met de plint;
          // recht gezaagd uit een Trespa-plaat en daarna binnen- en buitenkant gefreesd met de Trespafrees.
          const tr0 = Rp - t;
          const tp = shaped({ naam: 'Trespa onder ronde plint', rol: 'trespa', mat: 'trespa', dikte: td, grain: 'u', edges: {}, y: -P, h: td }, bandP(tr0, Rp));
          tp.uLen = tp.box.w; tp.vLen = tp.box.d;
          const innerT = [[0, czF + tr0], [cx, czF + tr0], ...arc(tr0), ...(half ? [[0, czB - tr0]] : tail ? [[cx - tr0, zBack]] : [])];
          contourOp(tp, arc(Rp), [cx - Rp, czF + Rp], { tool: 'trespa' });
          contourOp(tp, innerT, [cx - tr0 + 30, half ? zc : (zBack + czF) / 2], { tool: 'trespa', naam: 'Ronde kant (binnen)' });
        }
        order(`HPL ${rd.decor || k.decorFront || S.decorFront} ${S.rondHplDikte} mm voor ronde plint: ${Math.round(hpP.uLen)} × ${Math.round(hpP.vLen)}`, 1);
      }
    }
    if (kop2) warnings.push(`Kop over 2 kasten: ${mid ? `bogen R ${r1(R)} met ${r1(czF - czB)} mm recht ertussen` : 'één halfrond'} tot de front van de kast erachter (rug aan rug, zelfde diepte, 180° gedraaid). De Clamex in de zijwand van die kast komen er in de zaaglijst en de MPR-bestanden van het project bij.`);
    warnings.push(`Ronde kant ${rd.kant}: ${vrij ? `vrije vorm ${(VRIJE_VORMEN[rd.vrijVorm] ?? VRIJE_VORMEN.ellips).naam.toLowerCase()}, ${r1(Number(rd.uitsteek) || 300)} uitsteek` : kop2 ? 'kop over 2 kasten' : half ? 'halfrond' : `kwartrond R ${r1(R)}`}, ${open ? 'open met ronde legplanken' : `dicht: plaat tegen de kast, ${half ? '' : 'plaat tegen de muur, '}top, bodem${tail ? ' en rechte zijkant' : ''}${mid ? ' en rechte voorkant' : ''} vol met sponning ${S.rondSponningBreedte} × ${sp}, ${S.rondTriplexLagen} × buigtriplex ${S.rondTriplexDikte} mm + HPL`}. Buigtriplex lang buigend = de boog loopt langs de 2440 van de plaat, kort buigend = langs de 1220; de app kiest per stuk.`);
  }

  // Paslat boven (bv. tot het plafond): frontpaslat boven de fronten over de volle breedte (ook over de paslatten
  // aan de zijkant) en een liggende kastpaslat op de kast, met Clamex ertussen (geen opstaande latjes); van buitenaf
  // vastzetten (geen gaten in de kast).
  const ph = Number(k.paslat?.boven) || 0;
  if (ph > 0) {
    if (lr || vb) warnings.push('Paslat boven: niet bij een schuine kast.');
    else if (ph < 20) warnings.push('Paslat boven: minstens 20 mm hoog.');
    else {
      const pwL = Number(k.paslat?.links) || 0, pwR = Number(k.paslat?.rechts) || 0;
      const x0 = pwL >= t ? -v / 2 - pwL : zonderFronten ? 0 : frontX0, x1 = pwR >= t ? W + v / 2 + pwR : zonderFronten ? W : frontX1;
      const yF = zonderFronten ? H : Math.max(fY1, H - v / 2) + v;   // boven de fronten, met een voeg (zonder fronten: op de kast)
      const top = H + ph;
      const fpB = add({ id: 'paslat-front-boven', naam: 'Frontpaslat boven', rol: 'paslat', mat: 'front', dikte: fd, grain: 'u',
        edges: { u0: S.bandFront, u1: S.bandFront, v0: S.bandFront, v1: 0 },
        box: { x: x0, y: yF, z: zFP, w: x1 - x0, h: top - yF, d: fd }, uLen: x1 - x0, vLen: top - yF });
      // Alleen een liggende kastpaslat (plat op de kast, haaks op de frontpaslat) en de frontpaslat, met Clamex tussen
      // die twee lange stukken: in de voorkant van de kastpaslat en in het vlak van de frontpaslat, onderaan.
      const kd = Math.min(S.paslatDiepte, zFP);
      if (top - yF < 40) warnings.push('Paslat boven: de frontpaslat is erg smal.');
      const kpB = add({ id: 'paslat-kast-boven', naam: 'Kastpaslat boven (liggend)', rol: 'paslat', mat: 'korpus', dikte: t, grain: 'u', edges: {},
        box: { x: 0, y: H, z: zFP - kd, w: W, h: t, d: kd }, uLen: W, vLen: kd });
      const vC = H + t / 2 - yF;                              // hart van de Clamex in de frontpaslat, vanaf de onderkant
      if (vC < 6) warnings.push('Paslat boven: de frontpaslat begint te hoog boven de kastpaslat voor Clamex (fronten steken boven uit?); de frontpaslat lijmen of schroeven.');
      else for (const c of clamexPositions(W, S)) {
        kpB.ops.push({ kind: 'clamex', edge: 'v1', pos: c, naam: 'Clamex' });
        fpB.ops.push({ kind: 'clamex', face: 'binnen', u: c - x0, v: vC, dir: [1, 0], naam: 'Clamex' });
        count('Lamello Clamex P-14');
      }
    }
  }

  // Dempers: alleen waar ze tegen het korpus drukken (voorkant van zijwand, bodem, top, regels, tussenbodems,
  // latten van de greeplijst, kastpaslat), niet in de greepopening of in de lucht.
  if (damperReq.length) {
    const r = S.demperDia / 2 + 2;
    const surf = parts.filter(q => !['front', 'lade', 'legplank', 'rug', 'trespa', 'plint', 'afwerk'].includes(q.rol) && !(q.rol === 'paslat' && q.mat === 'front')
      && q.box.z + q.box.d >= D - frontInset - 0.5 && !q.tilt);
    const rangesAt = x => {
      const out = [];
      for (const q of surf) {
        if (x < q.box.x - 0.5 || x > q.box.x + q.box.w + 0.5) continue;
        let ivs = [[q.box.y, q.box.y + q.box.h]];
        // Uitsparingen vooraan in een zijwand of kastpaslat (greeplijst, plint) tellen niet mee.
        for (const o of q.ops.filter(o => o.kind === 'uitsparing' && o.u + o.w >= q.uLen - 1)) {
          const n0 = q.box.y + o.v, n1 = n0 + o.h;
          ivs = ivs.flatMap(([a, b]) => b <= n0 || a >= n1 ? [[a, b]] : [[a, n0], [n1, b]].filter(([c, d]) => d - c > 1));
        }
        if (q.vInner && q.rol === 'zijwand') ivs = ivs.map(([a, b]) => [a, Math.min(b, q.box.y + q.vInner)]);
        out.push(...ivs.map(([a, b]) => [a + r, b - r]).filter(([a, b]) => b >= a));
      }
      return out;
    };
    const nearest = (ivs, y, lo, hi) => {
      let best = null;
      for (const [a, b] of ivs) {
        const c = Math.max(a, lo), d = Math.min(b, hi);
        if (d < c) continue;
        const yy = Math.min(Math.max(y, c), d);
        if (best === null || Math.abs(yy - y) < Math.abs(best - y)) best = yy;
      }
      return best;
    };
    for (const q of damperReq) {
      const f = q.f, xAbs = f.box.x + q.du, ivs = rangesAt(xAbs);
      const lo = f.box.y + q.lo, hi = f.box.y + q.hi;
      const ys = q.mode === 'hoeken' ? [nearest(ivs, hi, lo, hi), nearest(ivs, lo, lo, hi)] : [nearest(ivs, (lo + hi) / 2, lo, hi)];
      const placed = [];
      for (const y of ys) {
        if (y === null || placed.some(pv => Math.abs(pv - y) < 40)) continue;
        placed.push(y);
        f.ops.push({ kind: 'boring', face: 'binnen', u: q.du, v: y - f.box.y, dia: S.demperDia, diepte: S.demperDiepte, naam: 'Demper' });
        count('Demper');
      }
      if (!placed.length) warnings.push(`${f.naam}: geen plaats voor een demper waar hij tegen het korpus drukt.`);
    }
  }

  // Uitsparing achteraan in een hoek over de volle hoogte (rond een koker of kolom): de kast wordt in bovenaanzicht
  // L-vormig. De zijwand aan die kant wordt korter, liggende panelen krijgen de uitsparing (gefreesd), de rug wordt
  // smaller en twee binnenwanden sluiten de uitsparing af (A: evenwijdig met de voorkant, B: evenwijdig met de zijkant).
  const us = k.uitsparing;
  if (us && (us.hoek === 'links' || us.hoek === 'rechts') && Number(us.breedte) > 0 && Number(us.diepte) > 0) {
    const L = us.hoek === 'links';
    const nb = Number(us.breedte), nd = Number(us.diepte);
    if (nb < t + 30 || nb > W - 2 * t - 100 || nd > D - 150) warnings.push('De uitsparing is te groot of te klein voor deze kast.');
    else {
      // Zijwand: korter (begint op nd), bewerkingen in het weggevallen stuk vervallen.
      const sd = L ? sideL : sideR;
      const cut = nd - zBack;
      sd.ops = sd.ops.filter(o => o.u == null ? !(o.kind === 'groef') : o.u >= cut + 10).map(o => o.u != null ? { ...o, u: o.u - cut } : o);
      sd.box.z = nd; sd.box.d = D - nd; sd.uLen = D - nd;
      if (sd.shape) sd.shape = null;
      // Binnenwanden tussen bodem en top.
      const y0 = bounds[0].hi, y1 = bounds[bounds.length - 1].lo;
      const xB = L ? nb : W - nb - t;                        // wand B (evenwijdig met de zijkant)
      const wA = add({ naam: 'Binnenwand uitsparing (voor)', rol: 'binnenwand', mat: 'korpus', dikte: t, grain: 'v', edges: {},
        box: { x: L ? t : W - nb - t, y: y0, z: nd, w: nb, h: y1 - y0, d: t }, uLen: nb, vLen: y1 - y0 });
      const wB = add({ naam: 'Binnenwand uitsparing (zij)', rol: 'stijl', mat: 'korpus', dikte: t, grain: 'v', edges: {},
        box: { x: xB, y: y0, z: zBack, w: t, h: y1 - y0, d: nd - zBack }, uLen: nd - zBack, vLen: y1 - y0 });
      // Liggende panelen: uitsparing. Bodem en top (waar de wanden op/onder staan): de uitsparing zelf; de panelen
      // ertussen ook rond de wanden; losse legplanken nog 2 mm speling.
      const xn0 = L ? 0 : W - nb, xn1 = L ? nb : W;          // uitsparing in x (kast)
      for (const hp of parts.filter(x => ['liggend', 'legplank', 'schuin'].includes(x.rol) && !x.tilt)) {
        const cap = hp.box.y + hp.box.h <= y0 + 0.5 || hp.box.y >= y1 - 0.5;
        const extra = cap ? 0 : t + (hp.rol === 'legplank' ? 2 : 0);
        const ax0 = L ? xn0 : xn0 - extra, ax1 = L ? xn1 + extra : xn1, az1 = nd + extra;
        const u0 = Math.max(0, ax0 - hp.box.x), u1 = Math.min(hp.uLen, ax1 - hp.box.x), vv = az1 - hp.box.z;
        if (u1 <= u0 || vv <= 0 || hp.box.z >= az1) continue;
        if (vv >= hp.vLen - 20) {
          // Het paneel ligt helemaal binnen de diepte van de uitsparing (bv. de achterregel): korter maken tot aan wand B.
          const nx0 = L ? Math.max(hp.box.x, ax1) : hp.box.x, nx1 = L ? hp.box.x + hp.box.w : Math.min(hp.box.x + hp.box.w, ax0);
          if (nx1 - nx0 < 30) { warnings.push(`${hp.naam} valt helemaal in de uitsparing.`); continue; }
          const delta = nx0 - hp.box.x, edgeSide = L ? 'u0' : 'u1';
          hp.ops = hp.ops.filter(o => o.edge !== edgeSide).map(o => {
            if (o.edge === 'v0' || o.edge === 'v1') return { ...o, pos: o.pos - delta };
            return o.u != null ? { ...o, u: o.u - delta } : o;
          }).filter(o => (o.u == null || (o.u >= 0 && o.u <= nx1 - nx0)) && (o.pos == null || o.edge === 'u0' || o.edge === 'u1' || (o.pos >= 0 && o.pos <= nx1 - nx0)));
          hp.box.x = nx0; hp.box.w = hp.uLen = nx1 - nx0;
          continue;
        }
        // Verbindingen in het weggevallen stuk vervallen (kant aan de kant van de uitsparing, achteraan).
        const edgeSide = L ? 'u0' : 'u1';
        hp.ops = hp.ops.filter(o => !(o.edge === edgeSide && o.pos < vv + 10));
        hp.ops = hp.ops.filter(o => o.u == null || o.edge || !(o.u > u0 - 5 && o.u < u1 + 5 && o.v < vv + 5));
        hp.ops.push({ kind: 'uitsparing', u: u0, v: 0, w: u1 - u0, h: vv, naam: 'Uitsparing (koker)' });
        const W2 = hp.uLen, D2 = hp.vLen;
        hp.shape3d = { plane: 'xz', pts: L ? [[u1, 0], [W2, 0], [W2, D2], [0, D2], [0, vv], [u1, vv]] : [[0, 0], [u0, 0], [u0, vv], [W2, vv], [W2, D2], [0, D2]] };
      }
      // Wanden vast aan bodem en top met deuvels in de kopse kanten.
      const fix = (wall, alongX) => {
        for (const [yEdge, edge, faceP] of [[y0, 'v0', 'boven'], [y1, 'v1', 'onder']]) {
          const cx = wall.box.x + wall.box.w / 2, cz = wall.box.z + wall.box.d / 2;
          const hp = parts.find(q => (q.rol === 'liggend' || q.rol === 'schuin') && Math.abs((faceP === 'boven' ? q.box.y + q.box.h : q.box.y) - yEdge) < 0.5
            && q.box.x <= cx && q.box.x + q.box.w >= cx && q.box.z <= cz && q.box.z + q.box.d >= cz);
          if (!hp) continue;
          const len = alongX ? wall.box.w : wall.box.d;
          const dws = len > 2 * S.deuvelEersteVoor + 10 ? [S.deuvelEersteVoor, len - S.deuvelEersteVoor] : [len / 2];
          for (const d of dws) {
            const wx = alongX ? wall.box.x + d : cx, wz = alongX ? cz : wall.box.z + d;
            wall.ops.push({ kind: 'boring', edge, pos: d, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
            hp.ops.push({ kind: 'boring', face: faceP, u: wx - hp.box.x, v: wz - hp.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
            count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
          }
          // Schroef tussen de deuvels, door de bodem/top in de wand.
          if (S.schroeven && dws.length > 1) for (const d of screwsFromFront(len, dws, S)) {
            const wx = alongX ? wall.box.x + d : cx, wz = alongX ? cz : wall.box.z + d;
            hp.ops.push({ kind: 'boring', face: faceP, u: wx - hp.box.x, v: wz - hp.box.z, dia: S.schroefDia, diepte: hp.dikte, doorgaand: true, naam: 'Schroef' });
            count('Schroef');
          }
        }
      };
      fix(wA, true); fix(wB, false);
      // Rug: alleen nog tussen wand B en de andere zijwand; aan de kant van wand B in een groef in wand B (zoals in een zijwand).
      if (groef) wB.ops.push({ kind: 'groef', face: L ? 'rechts' : 'links', u1: S.rugInsprong + gw / 2, v1: 0, u2: S.rugInsprong + gw / 2, v2: wB.vLen, breedte: gw, diepte: gd, naam: 'Rugwandgroef' });
      for (const rug of parts.filter(x => x.rol === 'rug' && x.mat === 'rug')) {
        const oldX = rug.box.x, inGroef = groef ? gd - gs : 0;
        if (L) { const x1 = rug.box.x + rug.box.w; rug.box.x = xB + t - inGroef; rug.box.w = rug.uLen = x1 - rug.box.x; }
        else { rug.box.w = rug.uLen = xB + inGroef - rug.box.x; }
        const shift = rug.box.x - oldX;
        rug.ops = rug.ops.map(o => (o.u != null ? { ...o, u: o.u - shift } : o)).filter(o => o.u == null || (o.u >= 5 && o.u <= rug.uLen - 5));
        if (rug.shape) rug.shape = null;
      }
      warnings.push(`Uitsparing ${us.hoek} achteraan (${nb} × ${nd} mm, volle hoogte): binnenwanden sluiten de kast af; de hoek van de uitsparing in bodem en top wordt gefreesd (straal van de frees).`);
    }
  }

  // Rug in een groef: schroefgaten in de rug voor elk liggend paneel dat tegen de rug komt (bodem, regels, tussenbodems, vaste legplanken).
  if (groef) {
    for (const rug of parts.filter(x => x.rol === 'rug')) {
      for (const hp of parts.filter(x => x.rol === 'liggend' && Math.abs(x.box.z - (rug.box.z + rug.box.d)) < 1.5
        && x.box.y >= rug.box.y - 0.1 && x.box.y + x.box.h <= rug.box.y + rug.box.h + 0.1)) {
        for (const u of spreadPositions(hp.box.w, S.rugSchroefAfstand, Math.min(50, hp.box.w / 4))) {
          if (hp.box.x + u - rug.box.x < 15 || hp.box.x + u - rug.box.x > rug.uLen - 15) continue;
          rug.ops.push({ kind: 'boring', face: 'achter', u: hp.box.x + u - rug.box.x, v: hp.box.y + hp.box.h / 2 - rug.box.y, dia: S.schroefDia, diepte: S.rug, doorgaand: true, naam: 'Schroef' });
          count('Schroef');
        }
      }
    }
  }

  // Spitse kast: geen zijwand aan de lage kant; bodem en top lopen door tot in de punt en sluiten in verstek met Clamex.
  if (punt) {
    const tipRight = !rechtsHoog, tipEdge = tipRight ? 'u1' : 'u0';
    const tipSide = tipRight ? sideR : sideL;
    parts.splice(parts.indexOf(tipSide), 1);
    const tAt = t / cosA, deg = r1(sa * 180 / Math.PI);
    const reachIn = (H - tAt - t) / tanA;                          // binnenhoek: onderkant top raakt bovenkant bodem
    const xi = tipRight ? reachIn : W - reachIn;
    const bodem = parts.find(p => p.id === 'bodem'), top = parts.find(p => p.id === 'top');
    if (bodem) {
      bodem.ops = bodem.ops.filter(o => o.edge !== tipEdge);
      bodem.box.x = tipRight ? t : 0; bodem.box.w = bodem.uLen = W - t;
      bodem.shape3d = { plane: 'xy', pts: tipRight ? [[0, 0], [W - t, 0], [xi - t, t], [0, t]] : [[0, 0], [W - t, 0], [W - t, t], [xi, t]] };
    }
    if (top) {
      top.ops = top.ops.filter(o => !(o.kind === 'clamex' && o.edge === tipEdge));
      const yHigh = H, yi = yTopX(tipRight ? t : W - t) - tAt;
      top.box.y = 0; top.box.h = yHigh;
      top.shape3d = { plane: 'xy', pts: tipRight ? [[t, yi], [xi, t], [W, 0], [0, yHigh]] : [[xi, t], [W - t, yi], [W, yHigh], [0, 0]] };
    }
    if (bodem && top && deg / 2 < S.clamexMinHoek) {
      // Te scherp voor de Clamex-macro: het verstek zagen met de gekantelde zaag en verlijmen.
      for (const q of [bodem, top]) q.ops.push({ kind: 'verstek', edge: tipEdge, hoek: r1(deg / 2), naam: 'Verstek zagen (A-hoek)' });
      warnings.push(`De punt (${r1(deg / 2)}° per stuk) is te scherp voor Clamex (minimaal ${S.clamexMinHoek}°): bodem en top worden daar in verstek gezaagd met de gekantelde zaag en verlijmd.`);
    } else if (bodem && top) for (const c of clamexPositions(bodem.vLen, S)) {
      bodem.ops.push({ kind: 'clamex', edge: tipEdge, pos: bodem.vLen - c, hoek: r1(deg / 2), naam: 'Clamex (verstek punt)' });
      top.ops.push({ kind: 'clamex', edge: tipEdge, pos: top.vLen - c, hoek: r1(deg / 2), naam: 'Clamex (verstek punt)' });
      count('Lamello Clamex P-14');
    }
    for (let i = warnings.length - 1; i >= 0; i--) if (/^Trapkast in verstek/.test(warnings[i])) warnings.splice(i, 1);
    warnings.push(`Spitse trapkast (${deg}°): zijwand ${tipRight ? 'links' : 'rechts'} en top aan die kant in verstek op ${r1((90 - deg) / 2)}°; in de punt bodem en top in verstek op ${r1(deg / 2)}° (lange punt aan de buitenkant). Clamex in alle verstekvlakken onder die hoek (Angle in de macro); controleer de richting op het eerste stuk in woodWOP.`);
  }

  // Schuine kast: schroefgaten in de rug in de schuine top (langs de lijn waar de top tegen de rug komt).
  const schuinTop = parts.find(x => x.id === 'top' && x.rol === 'schuin');
  if (vb && groef && schuinTop) {
    const rug = parts.filter(x => x.rol === 'rug').sort((a, b) => (b.box.y + b.box.h) - (a.box.y + a.box.h))[0];
    const tAt = t / cosA;
    if (rug) for (const u of spreadPositions(W - 2 * t, S.rugSchroefAfstand, 50)) {
      const x = t + u;
      const y = (vb ? yTopZ(voorRug) : yTopX(x)) - tAt / 2;
      if (y < rug.box.y || y > rug.box.y + rug.box.h) continue;
      rug.ops.push({ kind: 'boring', face: 'achter', u: x - rug.box.x, v: y - rug.box.y, dia: S.schroefDia, diepte: S.rug, doorgaand: true, naam: 'Schroef' });
      count('Schroef');
    }
  }

  // Schuine kast: geen boringen boven de schuine kant, en niets dat boven de schuine kant uitkomt.
  if (schuin) {
    let dropped = 0;
    for (const p of parts) {
      const topAt = p.shape ? (u => p.shape[3][1] + (p.shape[2][1] - p.shape[3][1]) * u / p.uLen) : p.rol === 'zijwand' ? (() => p.vInner ?? p.vLen) : null;
      if (!topAt) continue;
      p.ops = p.ops.filter(o => {
        if (o.kind === 'contour' || o.edge || o.u == null) return true;
        const ok = o.v + (o.dia ?? 0) / 2 + 3 <= topAt(o.u);
        if (!ok) dropped++;
        return ok;
      });
    }
    if (dropped) warnings.push(`${dropped} boring(en) boven de schuine kant zijn weggelaten.`);
    const lowTop = lr ? Math.min(yTopX(t), yTopX(W - t)) - t / cosA : yTopZ(rugFront) - t / cosA;
    if (!punt) for (const p of parts.filter(p => ['legplank', 'liggend', 'lade', 'stijl'].includes(p.rol) && p.box.y + p.box.h > lowTop + 0.5)) {
      warnings.push(`${p.naam} komt boven de schuine kant uit (bovenkant ${r1(p.box.y + p.box.h)} mm, lage kant ${r1(lowTop)} mm): pas de vakken aan.`);
    }
  }

  // Led-verlichting: groeven per stuk, met een kabelgat aan het begin of einde.
  for (const p of parts) {
    for (const led of k.leds?.[p.id] ?? []) {
      const br = Number(led.breedte) || S.ledBreedte, di = Number(led.diepte) || S.ledDiepte;
      const af = Number(led.afstand) || 0, b0 = Number(led.begin) || 0, b1 = Number(led.einde) || 0;
      let u1, v1, u2, v2;
      if (led.richting === 'v') {
        u1 = u2 = led.vanaf === 'u1' ? p.uLen - af : af;
        v1 = b0; v2 = p.vLen - b1;
      } else {
        v1 = v2 = led.vanaf === 'v0' ? af : p.vLen - af;
        u1 = b0; u2 = p.uLen - b1;
      }
      if (u2 - u1 < -0.1 || v2 - v1 < -0.1 || af - br / 2 < 0 || af + br / 2 > (led.richting === 'v' ? p.uLen : p.vLen)) {
        warnings.push(`Led-groef op ${p.naam} valt (deels) buiten het paneel.`);
        continue;
      }
      if (di >= p.dikte) warnings.push(`Led-groef op ${p.naam} is even diep als de plaat.`);
      p.ops.push({ kind: 'groef', frees: true, face: led.zijde, u1, v1, u2, v2, breedte: br, diepte: di, naam: 'Led-groef' });
      if (led.kabel === 'begin' || led.kabel === 'einde') {
        // Kabelgat in de groef, een eindje van het uiteinde (niet op de rand van de plaat).
        const len = Math.hypot(u2 - u1, v2 - v1);
        const inset = Math.min(S.ledKabelAfstand, len / 2);
        const t0 = led.kabel === 'einde' ? len - inset : inset;
        const du = len ? (u2 - u1) / len : 0, dv = len ? (v2 - v1) / len : 0;
        p.ops.push({ kind: 'boring', face: led.zijde, u: u1 + du * t0, v: v1 + dv * t0, dia: S.ledKabelDia, diepte: p.dikte, doorgaand: true, naam: 'Kabelgat' });
      }
      count('Led-profiel (m)', Math.hypot(u2 - u1, v2 - v1) / 1000);
    }
  }

  // Decors: per soort onderdeel een standaard, per stuk aan te passen; de band volgt het paneel,
  // behalve de band op het korpus, die zoals het korpus, zoals de fronten of een eigen decor kan zijn.
  for (const p of parts) {
    p.decor = k.partDecor?.[p.id] || partBaseDecor(k, S, p);
    p.plaattype = k.partType?.[p.id] || partBaseType(k, S, p);
    p.edgeDecor = {};
    for (const e of ['u0', 'u1', 'v0', 'v1']) p.edgeDecor[e] = k.edgeDecor?.[p.id]?.[e] || edgeBaseDecor(k, S, p, e);
    const d = (S.decors ?? []).find(x => x.code === p.decor);
    p.kleur = d?.kleur ?? p.kleurVast ?? null;
  }

  // Afronden
  for (const p of parts) {
    p.uLen = r1(p.uLen);
    p.vLen = r1(p.vLen);
    for (const op of p.ops) for (const key of ['u', 'v', 'u1', 'u2', 'v1', 'v2', 'pos', 'w', 'h']) if (op[key] != null) op[key] = Math.round(op[key] * 100) / 100;
    // Dezelfde boring twee keer (bv. montageplaatje op een gat van de rijboring): één keer boren.
    const seen = new Map();
    p.ops = p.ops.filter(op => {
      if (op.kind !== 'boring' || op.edge) return true;
      const key = `${op.face}|${op.u}|${op.v}|${op.dia}`;
      const prev = seen.get(key);
      if (prev) { if (prev.naam !== op.naam && !prev.naam.includes(op.naam)) prev.naam = `${prev.naam} + ${op.naam}`; prev.diepte = Math.max(prev.diepte, op.diepte); return false; }
      seen.set(key, op);
      return true;
    });
  }
  if (Object.keys(hw).some(n => n.startsWith('Ladegeleider')) || parts.some(p => p.naam.startsWith('Lade'))) {
    warnings.push('Lades: de maten van bodem en rug en de boringen van de geleiders komen uit een instelbare tabel (Instellingen › Blum). Controleer ze met de montagehandleiding van Blum.');
  }
  // Clamex in het vlak van een stijl: hoogstens de halve dikte van de stijl diep; de rest van de diepte
  // (samen 2 × clamexDiepte) wordt opgevangen in de kant van de regel/legplank. Zo raken twee Clamex tegenover
  // elkaar in de stijl elkaar niet.
  for (const p of parts.filter(x => x.rol === 'stijl')) {
    const dS = Math.min(S.clamexDiepte, p.dikte / 2), dR = 2 * S.clamexDiepte - dS;
    for (const o of p.ops.filter(x => x.kind === 'clamex' && x.face && x.pair)) {
      if (dS >= S.clamexDiepte) continue;
      o.diepte = dS; o.naam = `Clamex (${r1(dS)} diep)`;
      o.pair.edge.diepte = dR; o.pair.edge.naam = `Clamex (${r1(dR)} diep)`;
    }
    const cl = f => p.ops.filter(o => o.kind === 'clamex' && o.face === f && o.pair);
    const A = cl('links'), B = cl('rechts');
    for (const a of A) for (const b of B) {
      if (Math.abs(a.v - b.v) > 20 || Math.abs(a.u - b.u) > S.clamexLengte) continue;  // zelfde hoogte, sleuven overlappen
      // De deuvels naast de Clamex staan ook tegenover elkaar: aan de rechterkant van de stijl weglaten.
      if (!b.pair.dropped) {
        b.pair.dropped = true;
        for (const [part, op] of b.pair.dowels ?? []) { part.ops = part.ops.filter(x => x !== op); }
        const nDw = (b.pair.dowels ?? []).length / 2;
        if (nDw) count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`, -nDw);
      }
    }
  }
  for (const p of parts) for (const o of p.ops) if (o.pair) delete o.pair;
  const hardware = Object.entries(hw).map(([naam, aantal]) => ({ naam, aantal: Math.round(aantal * 100) / 100 }));
  const bestel = Object.entries(ord).map(([naam, aantal]) => ({ naam, aantal }));
  return { parts, warnings: [...new Set(warnings)], hardware, bestel, zones, nl, extern };
}

/**
 * Opstelling van een project: per kast de plaats in de ruimte (mm). X langs de wand, Y = hoogte van de onderkant
 * van het korpus boven de vloer, Z = afstand van de wand, rot = draaiing in graden (rond de linkerachterhoek).
 * Automatisch: onderkasten en kolomkasten naast elkaar op de vloer, bovenkasten in een eigen rij op `bovenHoogte`.
 */
function projectLayout(project) {
  const rows = { onder: 0, boven: 0 };
  return project.kasten.map(k => {
    const preset = PRESETS.find(p => p.id === k.type);
    const boven = preset?.groep === 'Bovenkasten';
    const plint = k.plint === 'geen' ? 0 : Number(k.plintHoogte) || 0;
    const row = boven ? 'boven' : 'onder';
    const auto = { x: rows[row], y: boven ? (Number(project.bovenHoogte) || 1400) : plint, z: 0, rot: 0 };
    rows[row] += Number(k.breedte) || 0;
    if (k.plaatsing !== 'vrij') return { ...auto, auto };
    const num = (v, d) => (v === null || v === undefined || v === '' ? d : Number(v));
    return { x: num(k.posX, auto.x), y: num(k.posY, auto.y), z: num(k.posZ, 0), rot: Number(k.rot) || 0, auto };
  });
}

/**
 * Onderdelen van alle kasten in een project, met plinten en greeplijsten doorlopend over kasten die tegen elkaar
 * staan (zelfde draaiing, zijkant tegen zijkant, voorkant op één lijn, zelfde hoogte). Het doorlopende stuk hoort bij
 * de eerste kast van de rij; bij de andere kasten valt het weg. Te lange stukken worden op een kastnaad verdeeld.
 * Geeft [{ k, res, parts }] (parts = onderdelen na samenvoegen; res.parts blijft ongewijzigd).
 */
/**
 * Kop over 2 kasten: de kast die rug aan rug achter k staat (180° gedraaid, ruggen tegen elkaar) en met zijn zijkant
 * aan dezelfde kop als k's ronde kant. Geeft die kast of null.
 */
function kopPartner(project, layout, k) {
  const i = project.kasten.indexOf(k), L = layout[i];
  if (!L || k.rond?.vorm !== 'kop2') return null;
  const r = -(Number(L.rot) || 0) * Math.PI / 180, W = Number(k.breedte);
  const loc = (P) => { const dx = P[0] - L.x, dz = P[1] - L.z; return [dx * Math.cos(r) - dz * Math.sin(r), dx * Math.sin(r) + dz * Math.cos(r)]; };
  return project.kasten.find((b, j) => {
    if (b === k) return false;
    const Lb = layout[j];
    if ((((Number(Lb.rot) - Number(L.rot)) % 360) + 360) % 360 !== 180) return false;
    const rb = -(Number(Lb.rot) || 0) * Math.PI / 180, Wb = Number(b.breedte), Db = Number(b.diepte);
    const cs = [[0, 0], [Wb, 0], [Wb, Db], [0, Db]].map(([x, z]) => loc([Lb.x + x * Math.cos(rb) + z * Math.sin(rb), Lb.z - x * Math.sin(rb) + z * Math.cos(rb)]));
    const xs = cs.map(c => c[0]), zs = cs.map(c => c[1]);
    if (Math.abs(Math.max(...zs)) > 3) return false;                       // rug tegen rug (z = 0)
    const l = Math.abs(Math.min(...xs)) < 3, r = Math.abs(Math.max(...xs) - W) < 3;
    return k.rond.kant === 'beide' ? l || r : k.rond.kant === 'links' ? l : r;
  }) ?? null;
}

function projectParts(project, S, maxLen = 2780) {
  const layout = projectLayout(project);
  const items = project.kasten.map((k, i) => {
    const res = buildCabinet(k, S);
    return { k, res, L: layout[i], parts: res.error ? [] : res.parts.slice() };
  });
  // Kop over 2 kasten: de Clamex voor het ronde deel in de zijwand van de kast erachter.
  for (const it of items) {
    if (!it.res.extern?.length) continue;
    const pk = kopPartner(project, layout, it.k);
    const pit = pk && items.find(x => x.k === pk);
    if (!pit || pit.res.error) { it.res.warnings.push('Kop over 2 kasten: geen kast rug aan rug gevonden aan die kop (180° gedraaid, ruggen tegen elkaar).'); continue; }
    for (const e of it.res.extern) {
      // Aan de kop is de linkerkant van deze kast de rechterkant van de kast erachter (en omgekeerd).
      const sideB = pit.parts.find(x => x.rol === 'zijwand' && x.left === (e.kant !== 'links'));
      if (!sideB) continue;
      const idx = pit.parts.indexOf(sideB);
      const copy = idx >= 0 && !sideB._kopKopie ? { ...sideB, ops: sideB.ops.slice(), _kopKopie: true } : sideB;
      if (copy !== sideB) pit.parts[idx] = copy;
      copy.ops.push({ kind: 'clamex', face: 'buiten', u: e.achter, v: e.y - copy.box.y, dir: [1, 0], naam: 'Clamex (ronde kop)' });
    }
  }
  if (project.koppelen === false) return items;
  const ok = items.filter(it => !it.res.error);
  // Rechterbuur: in het assenstelsel van de kast ligt de buur op x = breedte, met de voorkant op dezelfde lijn.
  const rightOf = a => ok.find(b => {
    if (b === a || ((Number(b.L.rot) - Number(a.L.rot)) % 360 + 360) % 360 !== 0 || Math.abs(b.L.y - a.L.y) > 1) return false;
    const r = -(Number(a.L.rot) || 0) * Math.PI / 180, dx = b.L.x - a.L.x, dz = b.L.z - a.L.z;
    const lx = dx * Math.cos(r) - dz * Math.sin(r), lz = dx * Math.sin(r) + dz * Math.cos(r);
    return Math.abs(lx - Number(a.k.breedte)) < 2 && Math.abs(lz + Number(b.k.diepte) - Number(a.k.diepte)) < 2;
  });
  const keyOf = p => `${p.rol}|${p.naam.replace(/^Greeplijst [^,]+,/, 'G,')}|${Math.round(p.box.y)}|${Math.round(p.box.h)}|${Math.round(p.box.z)}|${Math.round(p.box.d)}|${p.decor}|${p.dikte}`;
  const kind = p => p.rol === 'plint' || p.rol === 'greeplijst' || p.rol === 'trespa' || p.id === 'paslat-front-boven' || p.id === 'paslat-kast-boven'
    || (p.rol === 'plintbak' && (p.naam === 'Plintenbak voor' || p.naam === 'Plintenbak achter'));   // plintenbak: voor- en achterlat doorlopend
  const W = it => Number(it.k.breedte);
  const hasLeft = new Set(ok.map(rightOf).filter(Boolean));
  for (const start of ok.filter(it => !hasLeft.has(it))) {
    // Rij van kasten vanaf de meest linkse.
    const row = [start];
    for (let n = rightOf(start); n && !row.includes(n); n = rightOf(n)) row.push(n);
    if (row.length < 2) continue;
    const keys = new Set(row.flatMap(it => it.parts.filter(kind).map(keyOf)));
    for (const key of keys) {
      // Ketting: het stuk loopt tot de rechterkant van de kast en het volgende begint aan de linkerkant.
      let chain = [];
      const flush = () => {
        if (chain.length >= 2) {
          let group = [];
          const emit = () => {
            if (group.length > 1) {
              // Lengte van het begin van het eerste stuk tot het einde van het laatste (voegen tussen de kasten tellen mee);
              // bewerkingen van elk stuk schuiven mee naar hun plaats in het doorlopende stuk.
              const first = group[0];
              let off = 0;
              const ops = [];
              group.forEach((c, gi) => {
                const o = off + c.p.box.x - first.p.box.x;
                for (const op of c.p.ops ?? []) {
                  if (op.edge === 'u0' && gi > 0) continue;
                  if (op.edge === 'u1' && gi < group.length - 1) continue;
                  if (op.edge === 'v0' || op.edge === 'v1') ops.push({ ...op, pos: op.pos + o });
                  else if (op.u != null) ops.push({ ...op, u: op.u + o });
                  else ops.push(op);
                }
                off += gi < group.length - 1 ? W(c.it) : 0;
              });
              const lastP = group[group.length - 1].p;
              const len = off + lastP.box.x + lastP.box.w - first.p.box.x;
              const merged = { ...first.p, id: `${first.p.id}-doorlopend`, naam: `${first.p.naam} (doorlopend)`, uLen: len, box: { ...first.p.box, w: len }, ops,
                kastLabel: `${group[0].it.k.code}–${group[group.length - 1].it.k.code}`, doorlopend: group.map(c => c.it.k.code) };
              first.it.parts[first.it.parts.indexOf(first.p)] = merged;
              for (const c of group.slice(1)) c.it.parts.splice(c.it.parts.indexOf(c.p), 1);
            }
            group = [];
          };
          // Op een kastnaad verdelen als het stuk te lang wordt voor een plaat.
          for (const c of chain) {
            if (group.length && group.reduce((t, g) => t + W(g.it), 0) + c.p.uLen > maxLen) emit();
            group.push(c);
          }
          emit();
        }
        chain = [];
      };
      for (const it of row) {
        const q = it.parts.find(p => kind(p) && keyOf(p) === key);
        const last = chain[chain.length - 1];
        // Het stuk loopt tot (bijna) de rechterkant van de vorige kast en begint (bijna) aan de linkerkant van deze kast
        // (een halve voeg mag: frontpaslat boven).
        const links = q && last && q.box.x >= -0.5 && q.box.x < 2.5 && Math.abs(last.p.box.x + last.p.box.w - W(last.it)) < 2.5;
        if (links) chain.push({ it, p: q });
        else { flush(); if (q) chain = [{ it, p: q }]; }
      }
      flush();
    }
  }
  return items;
}

/**
 * Afwerkpaneel in het project (wereldcoördinaten): as = richting van de dikte ('x', 'y' of 'z'), vlak = coördinaat
 * van het vlak waartegen het paneel ligt, zin = +1/-1 (naar welke kant de dikte gaat), en de rechthoek in de andere
 * twee assen (a0..a1, b0..b1). Geeft een onderdeel zoals bij een kast.
 */
function panelPart(pn, S) {
  const d = Number(pn.dikte) || S.front;
  const ax = pn.as, other = ax === 'x' ? ['y', 'z'] : ax === 'y' ? ['x', 'z'] : ['x', 'y'];
  const lo = pn.zin > 0 ? pn.vlak : pn.vlak - d;
  const box = { x: 0, y: 0, z: 0, w: 0, h: 0, d: 0 };
  const size = { x: 'w', y: 'h', z: 'd' };
  box[ax] = lo; box[size[ax]] = d;
  box[other[0]] = Math.min(pn.a0, pn.a1); box[size[other[0]]] = Math.abs(pn.a1 - pn.a0);
  box[other[1]] = Math.min(pn.b0, pn.b1); box[size[other[1]]] = Math.abs(pn.b1 - pn.b0);
  const e1 = Math.abs(pn.a1 - pn.a0), e2 = Math.abs(pn.b1 - pn.b0);
  // Nerf: bij een staand paneel in de hoogte, bij een liggend paneel in de langste richting.
  const vertical = ax !== 'y';
  const len = vertical ? box.h : Math.max(e1, e2), wid = vertical ? (ax === 'x' ? box.d : box.w) : Math.min(e1, e2);
  const band = pn.band ?? S.bandFront;
  return {
    id: pn.id, naam: pn.naam || 'Afwerkpaneel', rol: 'afwerk', mat: pn.mat === 'korpus' ? 'korpus' : 'front', dikte: d, grain: 'v', box,
    uLen: wid, vLen: len, edges: { u0: band, u1: band, v0: band, v1: band }, ops: [],
    decor: pn.decor || (pn.mat === 'korpus' ? S.decorKorpus : S.decorFront),
    plaattype: pn.plaattype || (pn.mat === 'korpus' ? 'Melamine' : (S.frontMateriaal || 'Melamine')),
    kastLabel: 'Afwerking',
  };
}
function panelPartFull(pn, S) {
  const p = panelPart(pn, S);
  p.edgeDecor = { u0: p.decor, u1: p.decor, v0: p.decor, v1: p.decor };
  const d = (S.decors ?? []).find(x => x.code === p.decor);
  if (d?.kleur) p.kleur = d.kleur;
  return p;
}

/**
 * Ruimte van het project (optioneel): wanden als lijn vanaf (0, 0) langs X (de achterwand), elke volgende wand
 * gedraaid met 180° − hoek naar de ruimte toe; plus obstakels (koker, kolom) als blokken. Geeft onderdelen voor 3D
 * en de wandlijnen (voor vastklikken).
 */
function roomGeometry(project) {
  const parts = [], lines = [];
  const r = project.ruimte;
  const H = Number(r?.hoogte) || 2600;
  if (r?.wanden?.length) {
    let x = 0, z = 0, dx = 1, dz = 0;
    r.wanden.forEach((wd, i) => {
      const len = Number(wd.lengte) || 0;
      if (len <= 0) return;
      const ex = x + dx * len, ez = z + dz * len;
      lines.push({ x0: x, z0: z, x1: ex, z1: ez });
      // Muur buiten de ruimte (100 mm dik), als vorm in het vlak X/Z.
      const nx = dz, nz = -dx, th = 100;
      const pts = [[x, z], [ex, ez], [ex + nx * th, ez + nz * th], [x + nx * th, z + nz * th]];
      const bx0 = Math.min(...pts.map(q => q[0])), bz0 = Math.min(...pts.map(q => q[1]));
      const bx1 = Math.max(...pts.map(q => q[0])), bz1 = Math.max(...pts.map(q => q[1]));
      parts.push({ id: `muur-${i}`, naam: `Wand ${i + 1}`, rol: 'muur', mat: 'muur', kleur: '#d9d6cf', ops: [], edges: {}, uLen: len, vLen: H, dikte: th,
        box: { x: bx0, y: 0, z: bz0, w: bx1 - bx0, h: H, d: bz1 - bz0 }, shape3d: { plane: 'xz', pts: pts.map(([px, pz]) => [px - bx0, pz - bz0]) } });
      x = ex; z = ez;
      const a = (180 - (Number(wd.hoek) || 90)) * Math.PI / 180;
      [dx, dz] = [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)];
    });
  }
  for (const o of project.obstakels ?? []) {
    const b = Number(o.breedte) || 0, d = Number(o.diepte) || 0, h = Number(o.hoogte) || H;
    if (b <= 0 || d <= 0) continue;
    parts.push({ id: o.id, naam: o.naam || 'Obstakel', rol: 'obstakel', mat: 'muur', kleur: '#b9b4aa', ops: [], edges: {}, uLen: b, vLen: h, dikte: d,
      box: { x: Number(o.x) || 0, y: Number(o.y) || 0, z: Number(o.z) || 0, w: b, h, d } });
  }
  return { parts, lines };
}

/**
 * Uitsparingen uit obstakels: een kast waarvan de achterhoek in een obstakel staat, krijgt automatisch een uitsparing
 * over de volle hoogte met de maat van de overlapping. Een zelf ingegeven uitsparing blijft staan. Geeft true als er iets
 * veranderde.
 */
function applyObstacles(project) {
  let changed = false;
  const layout = projectLayout(project);
  project.kasten.forEach((k, i) => {
    const L = layout[i], W = Number(k.breedte), D = Number(k.diepte);
    if (!(W > 0 && D > 0) || (k.uitsparing && !k.uitsparing.auto)) return;
    let best = null;
    for (const o of project.obstakels ?? []) {
      // Hoeken van het obstakel in het assenstelsel van de kast.
      const a = (Number(L.rot) || 0) * Math.PI / 180;
      const loc = [[o.x, o.z], [o.x + o.breedte, o.z], [o.x, o.z + o.diepte], [o.x + o.breedte, o.z + o.diepte]].map(([x, z]) => {
        const dx = x - L.x, dz = z - L.z;
        return [dx * Math.cos(a) + dz * Math.sin(a), -dx * Math.sin(a) + dz * Math.cos(a)];   // wereld → kast
      });
      const x0 = Math.max(0, Math.min(...loc.map(q => q[0]))), x1 = Math.min(W, Math.max(...loc.map(q => q[0])));
      const z0 = Math.max(0, Math.min(...loc.map(q => q[1]))), z1 = Math.min(D, Math.max(...loc.map(q => q[1])));
      if (x1 - x0 < 1 || z1 - z0 < 1 || z0 > 1) continue;    // geen overlapping, of niet tegen de achterkant
      if (x0 < 1) best = { hoek: 'links', breedte: Math.round(x1), diepte: Math.round(z1), auto: true };
      else if (x1 > W - 1) best = { hoek: 'rechts', breedte: Math.round(W - x0), diepte: Math.round(z1), auto: true };
    }
    const prev = JSON.stringify(k.uitsparing ?? null), next = JSON.stringify(best);
    if (prev !== next) { k.uitsparing = best; changed = true; }
  });
  return changed;
}

// MARK: - Werkbladen
/**
 * Werkbladen van een project: op een rij onderkasten (assenstelsel van de eerste kast). Geeft per werkblad
 * { wb, L, parts, rect } met parts in de coördinaten van de eerste kast (werkblad, spatwand, uitsparingen in 3D).
 */
/** Werkbladen: per rij kasten een blad; twee bladen die haaks op elkaar staan worden een hoekverbinding. */
function werkbladGeometry(project, S) {
  const layout = projectLayout(project);
  // 1. Basismaten van elk blad, in het assenstelsel van zijn eerste kast.
  const base = [];
  for (const wb of project.werkbladen ?? []) {
    const ks = (wb.kasten ?? []).map(id => project.kasten.find(k => k.id === id)).filter(Boolean);
    if (!ks.length) continue;
    const L0 = layout[project.kasten.indexOf(ks[0])];
    const r = -(Number(L0.rot) || 0) * Math.PI / 180;
    // Elke kast in het assenstelsel van de eerste.
    const loc = ks.map(k => {
      const L = layout[project.kasten.indexOf(k)], dx = L.x - L0.x, dz = L.z - L0.z;
      return { k, L, x: dx * Math.cos(r) - dz * Math.sin(r), z: dx * Math.sin(r) + dz * Math.cos(r) };
    });
    const x0 = Math.min(...loc.map(c => c.x)), x1 = Math.max(...loc.map(c => c.x + Number(c.k.breedte)));
    const D = Math.max(...loc.map(c => c.z + Number(c.k.diepte)));
    const fd = S.front;
    const dik = Number(wb.dikte) || (wb.materiaal === 'composiet' ? 20 : 38);
    const yTop = Math.max(...loc.map(c => c.L.y - L0.y + Number(c.k.hoogte)));    // bovenkant kasten (t.o.v. de eerste)
    // Een zijpaneel (afwerking) aan het uiteinde van de rij: het werkblad loopt erover.
    const first = loc.reduce((a, c) => (c.x < a.x ? c : a)), last = loc.reduce((a, c) => (c.x + Number(c.k.breedte) > a.x + Number(a.k.breedte) ? c : a));
    const padL = first.k.zijpaneel?.links ? zijpaneelDikte(first.k, S) : 0, padR = last.k.zijpaneel?.rechts ? zijpaneelDikte(last.k, S) : 0;
    const ax0 = x0 - padL - (Number(wb.links) || 0), ax1 = x1 + padR + (Number(wb.rechts) || 0);
    const az0 = Number(wb.achter) || 0, az1 = D + (loc.every(c => c.k.zonderFronten) ? 0 : fd) + (wb.voor == null ? 20 : Number(wb.voor));
    const depth = az1 - az0;
    // Uiteinden: recht of in verstek (45°, binnenhoek: vooraan korter). Profiel van achter naar voor.
    const vL = wb.eindeLinks === 'verstek', vR = wb.eindeRechts === 'verstek';
    const bb = { wb, ks, loc, L0, r, ax0, ax1, az0, az1, depth, dik, yTop,
      left: { pts: [[ax0, az0], [vL ? ax0 + depth : ax0, az1]] }, right: { pts: [[ax1, az0], [vR ? ax1 - depth : ax1, az1]] } };
    // Ronde kant aan het uiteinde van de rij: het werkblad volgt de ronding (kwartrond: zelfde middelpunt, overstek
    // zoals vooraan; halfrond: halve cirkel over de diepte van het werkblad). De boog wordt gefreesd.
    for (const [c, kant] of [[first, 'links'], [last, 'rechts']]) {
      let rd = c.k.rond && (c.k.rond.kant === kant || c.k.rond.kant === 'beide') ? { ...c.k.rond, kant } : null;
      // De kast achter een kop over 2 kasten: haar werkblad krijgt de andere helft van de ronding.
      if (!rd) {
        const owner = project.kasten.find(o => o.rond?.vorm === 'kop2' && (o.rond.kant === 'beide' || o.rond.kant !== kant) && kopPartner(project, layout, o) === c.k);
        if (!owner) continue;
        rd = { ...owner.rond, kant, vorm: 'kop2' };
      }
      const sg = kant === 'links' ? -1 : 1;
      // Middelpunt van de boog: buiten de zijwand, voorbij de rechte strook (dicht).
      const zf0 = c.z + Number(c.k.diepte) + (c.k.front === 'inliggend' ? 0 : fd), diep0 = zf0 - c.z;
      const xc0 = kant === 'links' ? c.x : c.x + Number(c.k.breedte);
      const R0 = rd.vorm === 'kop2' ? Math.max(50, Math.min(Number(rd.radius) || diep0, diep0)) : rd.vorm === 'half' ? diep0 / 2 : Math.max(50, Math.min(Number(rd.radius) || Math.min(300, diep0), diep0));
      const Bw0 = Math.max(R0 + (rd.uitvoering === 'open' ? 0 : S.plaat), Number(rd.breedte) || 0);
      const xc = (kant === 'links' ? c.x : c.x + Number(c.k.breedte)) + sg * (Bw0 - R0);
      const zf = c.z + Number(c.k.diepte) + (c.k.front === 'inliggend' ? 0 : fd), diep = zf - c.z;
      const n = 24;
      let pts, arc;
      if (rd.vorm === 'vrij') {
        // Vrije vorm: de buitenkant van de kast + overstek, binnen de diepte van het werkblad.
        const open = rd.uitvoering === 'open', tp = open ? 0 : S.plaat;
        const cxL = -tp, A = Math.max(40, (Number(rd.uitsteek) || 300) - tp);
        const base = vrijeVormLijn(rd, zf0, c.z, cxL, A);
        const ws = offsetLijn(base, -(az1 - zf0)).map(([dx, z]) => [xc0 - sg * dx, Math.max(az0, Math.min(az1, z))]);
        arc = ws.slice().reverse(); pts = arc;
      } else if (rd.vorm === 'half') {
        const zc = (az0 + az1) / 2, rr = (az1 - az0) / 2;
        pts = arc = Array.from({ length: n + 1 }, (_, i) => { const a = 1.5 * Math.PI - Math.PI * i / n; return [xc - sg * rr * Math.cos(a), zc + rr * Math.sin(a)]; });
      } else {
        // Kwartrond (ook elke helft van een kop over 2 kasten): boog vooraan, dan recht tot de rug / muur.
        const R = Math.max(50, Math.min(Number(rd.radius) || (rd.vorm === 'kop2' ? diep : Math.min(300, diep)), diep)), cz = zf - R, Rw = az1 - cz;
        const arcP = Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI - (Math.PI / 2) * i / n; return [xc - sg * Rw * Math.cos(a), cz + Rw * Math.sin(a)]; });
        arc = arcP;
        pts = cz > az0 + 0.5 ? [[arcP[0][0], az0], ...arcP] : arcP;
      }
      bb[kant === 'links' ? 'left' : 'right'] = { pts, rond: true, arc };
    }
    base.push(bb);
  }
  // Omrekenen tussen het assenstelsel van een blad en de wereld (bovenaanzicht x, z).
  const toWorld = (b, [x, z]) => [b.L0.x + x * Math.cos(b.r) + z * Math.sin(b.r), b.L0.z - x * Math.sin(b.r) + z * Math.cos(b.r)];
  const toLocal = (b, [X, Z]) => { const dx = X - b.L0.x, dz = Z - b.L0.z; return [dx * Math.cos(b.r) - dz * Math.sin(b.r), dx * Math.sin(b.r) + dz * Math.cos(b.r)]; };

  // 2. Hoeken: twee bladen haaks op elkaar, het ene raakt met een uiteinde de strook van het andere.
  // Het doorlopende blad (het langste, of gekozen) loopt tot tegen de muur van het andere; het andere stoot ertegen.
  // Voeg: vooraan hoekVerstek (12 mm) in verstek van 45° (de afgeronde voorkant), de rest recht.
  const m = S.werkbladHoekVerstek;
  const corners = [];
  for (let i = 0; i < base.length; i++) for (let j = 0; j < base.length; j++) {
    if (i === j) continue;
    const A = base[i], B = base[j];
    if (Math.abs(Math.cos(A.r - B.r)) > 0.01) continue;                // niet haaks
    // B in het assenstelsel van A.
    const bc = [[B.ax0, B.az0], [B.ax1, B.az0], [B.ax1, B.az1], [B.ax0, B.az1]].map(q => toLocal(A, toWorld(B, q)));
    const bx0 = Math.min(...bc.map(q => q[0])), bx1 = Math.max(...bc.map(q => q[0]));
    const bz0 = Math.min(...bc.map(q => q[1])), bz1 = Math.max(...bc.map(q => q[1]));
    // B moet naar voor lopen (voor A) en met zijn uiteinde in de strook van A beginnen.
    if (!(bz0 <= A.az1 + 5 && bz0 >= A.az0 - 5 && bz1 > A.az1 + 50)) continue;
    let side = null;
    if (bx1 >= A.ax1 - 5 && bx0 <= A.ax1 + 5) side = 'right';
    else if (bx0 <= A.ax0 + 5 && bx1 >= A.ax0 - 5) side = 'left';
    if (!side) continue;
    // Muurkant van B (zijn achterkant) in het assenstelsel van A.
    const back = toLocal(A, toWorld(B, [(B.ax0 + B.ax1) / 2, B.az0]))[0], front = toLocal(A, toWorld(B, [(B.ax0 + B.ax1) / 2, B.az1]))[0];
    if (side === 'right' ? back < front : back > front) continue;      // muur van B moet aan de buitenkant liggen
    // B: welk uiteinde ligt bij A?
    const nearA = toLocal(B, toWorld(A, [side === 'right' ? A.ax1 : A.ax0, (A.az0 + A.az1) / 2]))[0];
    const endB = Math.abs(nearA - B.ax0) < Math.abs(nearA - B.ax1) ? 'left' : 'right';
    corners.push({ A: i, B: j, side, back, front, endB });
  }
  // Elke hoek maar één keer (A/B kan in beide richtingen gevonden zijn): kies wie doorloopt.
  const done = new Set();
  const joints = [];
  for (const c of corners) {
    const key = [c.A, c.B].sort().join('-');
    if (done.has(key)) continue;
    done.add(key);
    const alt = corners.find(o => o.A === c.B && o.B === c.A);
    const len = b => b.ax1 - b.ax0;
    const pick = o => base[o.A];
    // Keuze: wb.hoekDoor 'ja' (dit blad loopt door) of 'nee'; anders het langste.
    let use = c;
    if (alt) {
      const a = base[c.A].wb.hoekDoor, b = base[c.B].wb.hoekDoor;
      if (a === 'nee' || b === 'ja') use = alt;
      else if (a !== 'ja' && b !== 'nee' && len(base[c.B]) > len(base[c.A])) use = alt;
    }
    joints.push(use);
  }
  for (const c of joints) {
    const A = base[c.A], B = base[c.B];
    const sgn = c.side === 'right' ? 1 : -1;
    const xout = c.back, xin = c.front;
    // Voeg in het assenstelsel van A, van de muur naar voor: recht op az1 − m, dan verstek naar de binnenhoek.
    const J = [[xout, A.az1 - m], [xin + sgn * m, A.az1 - m], [xin, A.az1]];
    const end = { pts: [[xout, A.az0], ...J], voeg: J, door: true, partner: B.wb, xin, xout };
    if (c.side === 'right') A.right = end; else A.left = end;
    const Jb = J.map(q => toLocal(B, toWorld(A, q)));
    // Spatwand van B loopt door tot tegen die van A.
    const spatA = Number(A.wb.spatHoogte) > 0 ? (Number(A.wb.spatDikte) || 12) : 0;
    const spatEnd = toLocal(B, toWorld(A, [xout, A.az0 + spatA]))[0];
    B[c.endB] = { pts: Jb, voeg: Jb, door: false, partner: A.wb, spatEnd };
  }

  // 3. Onderdelen per blad.
  const out = [];
  for (const b of base) {
    const { wb, ks, loc, L0, az0, az1, depth, dik, yTop } = b;
    const poly = [b.left.pts[0], ...b.right.pts, ...b.left.pts.slice(1).reverse()];
    const nx0 = Math.min(...poly.map(q => q[0])), nx1 = Math.max(...poly.map(q => q[0]));
    const rect = poly.length === 4 && poly.every(q => Math.abs(q[0] - nx0) < 0.01 || Math.abs(q[0] - nx1) < 0.01);
    const pts = poly.map(([x, z]) => [x - nx0, z - az0]);
    const parts = [];
    const hw = {};
    const cnt = (n, k = 1) => { hw[n] = (hw[n] ?? 0) + k; };
    const decor = wb.decor || ((wb.materiaal ?? 'plaat') === 'plaat' ? S.decorKorpus : '');
    const naam = wb.naam || 'Werkblad';
    const top = { id: `${wb.id}-blad`, naam, rol: 'werkblad', mat: 'korpus', dikte: dik, grain: 'u', ops: [], edges: {}, decor,
      plaattype: wb.materiaal === 'plaat' ? 'Melamine' : (wb.materiaal === 'hout' ? 'Massief hout' : 'Composiet'),
      kleur: (S.decors ?? []).find(d => d.code === decor)?.kleur ?? (wb.materiaal === 'composiet' ? '#8d8a85' : wb.materiaal === 'hout' ? '#a87b4f' : undefined),
      box: { x: nx0, y: yTop, z: az0, w: nx1 - nx0, h: dik, d: depth }, uLen: nx1 - nx0, vLen: depth,
      shape3d: rect ? undefined : { plane: 'xz', pts }, materiaal: wb.materiaal || 'plaat' };
    parts.push(top);
    const U = x => x - nx0, V = z => z - az0;
    // Hoekverbinding: voeg frezen, tabletverbinders onderaan en Clamex in de voeg.
    for (const e of [b.left, b.right].filter(x => x.voeg)) {
      const J = e.voeg;
      // Weg te frezen stuk: voor de voeg (door) of voorbij het uiteinde (stotend).
      const mid = [(J[1][0] + J[2][0]) / 2, (J[1][1] + J[2][1]) / 2];
      const dirJ = [J[2][0] - J[1][0], J[2][1] - J[1][1]];
      // Afval: aan de kant van de voeg waar het blad niet ligt.
      const cxm = (nx0 + nx1) / 2, czm = (az0 + az1) / 2;
      const nrm = [-dirJ[1], dirJ[0]];
      const dotC = nrm[0] * (cxm - mid[0]) + nrm[1] * (czm - mid[1]);
      const ln = Math.hypot(...nrm) || 1;
      const waste = [mid[0] - Math.sign(dotC) * nrm[0] / ln * 5, mid[1] - Math.sign(dotC) * nrm[1] / ln * 5];
      top.ops.push({ kind: 'contour', pts: (e.door ? J : J.slice(1)).map(([x, z]) => [U(x), V(z)]), waste: [U(waste[0]), V(waste[1])], naam: 'Werkbladvoeg' });
      // Langs de rechte voeg (van de binnenhoek naar de muur): posities voor trekkers en Clamex.
      const [p0, p1] = [J[1], J[0]];                       // vanaf het einde van het verstek naar de muur
      const jl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d = [(p1[0] - p0[0]) / jl, (p1[1] - p0[1]) / jl];
      // Richting het blad in (loodrecht op de voeg).
      let inw = [-d[1], d[0]];
      if (inw[0] * (cxm - p0[0]) + inw[1] * (czm - p0[1]) < 0) inw = [-inw[0], -inw[1]];
      const at = t => [p0[0] + d[0] * t, p0[1] + d[1] * t];
      const voorM = S.trekkerVoor - m, achterM = S.trekkerAchter;
      const trek = S.trekkerAantal <= 1 ? [jl / 2] : Array.from({ length: S.trekkerAantal }, (_, i) => voorM + i * (jl - achterM - voorM) / (S.trekkerAantal - 1));
      for (const t of trek) {
        const [qx, qz] = at(t);
        const hx = qx + inw[0] * S.trekkerAfstand, hz = qz + inw[1] * S.trekkerAfstand;
        top.ops.push({ kind: 'rondgat', face: 'onder', u: U(hx), v: V(hz), dia: S.trekkerDia, diepte: S.trekkerDiepte, naam: 'Tabletverbinder' });
        // Sleuf van het gat tot in de voeg.
        top.ops.push({ kind: 'groef', face: 'onder', frees: true, u1: U(qx), v1: V(qz), u2: U(hx), v2: V(hz), breedte: S.trekkerSleuf, diepte: S.trekkerSleufDiepte, naam: 'Tabletverbinder sleuf' });
        if (e.door) cnt('Tabletverbinder (werkblad)');
      }
      // Clamex tussen de trekkers (in de kant van de voeg), niet te dicht bij een trekker.
      const cl = clamexPositions(jl - 2 * S.clamexMarge, { ...S, clamexMarge: 0 }).map(t => t + S.clamexMarge)
        .filter(t => trek.every(tt => Math.abs(tt - t) >= S.trekkerClamexVrij));
      // De voeg ligt op een rand van het blad (stotend) of S.werkbladHoekVerstek binnen de voorrand (doorlopend).
      const edgeOf = () => {
        if (Math.abs(d[0]) < 0.01) return { edge: Math.abs(p0[0] - nx0) < Math.abs(p0[0] - nx1) ? 'u0' : 'u1', inset: Math.min(Math.abs(p0[0] - nx0), Math.abs(p0[0] - nx1)), pos: t => V(at(t)[1]) };
        return { edge: Math.abs(p0[1] - az0) < Math.abs(p0[1] - az1) ? 'v0' : 'v1', inset: Math.min(Math.abs(p0[1] - az0), Math.abs(p0[1] - az1)), pos: t => U(at(t)[0]) };
      };
      const eg = edgeOf();
      for (const t of cl) {
        top.ops.push({ kind: 'clamex', edge: eg.edge, inset: eg.inset > 0.5 ? eg.inset : 0, pos: eg.pos(t), boorGat: !e.door, naam: 'Clamex' });
        cnt('Lamello Clamex P-14', 0.5);
      }
    }
    // Ronde uiteinden: de boog frezen (het rechte stuk ligt op de rand van het blad).
    for (const e of [b.left, b.right].filter(x => x.rond)) {
      const arcPts = e.arc;
      const xo = e === b.left ? nx0 : nx1;
      top.ops.push({ kind: 'contour', pts: arcPts.map(([x, z]) => [U(x), V(z)]), waste: [U(xo), V(az1)], naam: 'Ronde kant' });
    }
    // Uitsparingen: automatisch boven een spoelbak- of kookplaatkast (gecentreerd), plus zelf toegevoegde.
    // Maten vanaf het linkeruiteinde van de rij (zonder hoekverlenging).
    const ax0 = b.ax0;
    const cut = [];
    for (const c of loc) {
      const type = c.k.type === 'spoelbak' ? 'spoelbak' : c.k.type === 'kookplaat' ? 'kookplaat' : null;
      if (!type) continue;
      const own = (wb.uitsparingen ?? []).find(u => u.kast === c.k.id);
      if (own?.weg) continue;
      const bb = Number(own?.breedte) || (type === 'spoelbak' ? S.spoelbakUitsparingB : S.kookplaatUitsparingB);
      const d = Number(own?.diepte) || (type === 'spoelbak' ? S.spoelbakUitsparingD : S.kookplaatUitsparingD);
      const cx = own?.x != null && own.x !== '' ? Number(own.x) : c.x + Number(c.k.breedte) / 2 - ax0;
      const voor = own?.voor != null && own.voor !== '' ? Number(own.voor) : (depth - d) / 2;
      cut.push({ naam: type === 'spoelbak' ? `Spoelbak (${c.k.code})` : `Kookplaat (${c.k.code})`, b: bb, d, cx, voor, kast: c.k.id, auto: true });
    }
    for (const u of (wb.uitsparingen ?? []).filter(u => !u.kast)) cut.push({ naam: u.naam || 'Uitsparing', b: Number(u.breedte) || 0, d: Number(u.diepte) || 0, cx: Number(u.x) || 0, voor: Number(u.voor) || 0, id: u.id });
    for (const c of cut) {
      if (!(c.b > 0 && c.d > 0)) continue;
      parts.push({ id: `${wb.id}-uit-${c.kast ?? c.id}`, naam: c.naam, rol: 'werkblad-uitsparing', mat: 'muur', kleur: '#3a3a3a', ops: [], edges: {}, dikte: 1,
        box: { x: ax0 + c.cx - c.b / 2, y: yTop + dik, z: az1 - c.voor - c.d, w: c.b, h: 0.8, d: c.d }, uLen: c.b, vLen: c.d });
    }
    // Spatwand tegen de muur, op het werkblad (bij een stotende hoek tot tegen de spatwand van het andere blad).
    const sh = Number(wb.spatHoogte) || 0;
    if (sh > 0) {
      const sd = Number(wb.spatDikte) || 12;
      let sx0 = nx0, sx1 = nx1;
      if (b.left.spatEnd != null) sx0 = b.left.spatEnd;
      if (b.right.spatEnd != null) sx1 = b.right.spatEnd;
      parts.push({ id: `${wb.id}-spat`, naam: `Spatwand (${naam})`, rol: 'spatwand', mat: 'korpus', dikte: sd, grain: 'u', ops: [], edges: {}, decor, kleur: top.kleur, plaattype: top.plaattype,
        box: { x: sx0, y: yTop + dik, z: az0, w: sx1 - sx0, h: sh, d: sd }, uLen: sx1 - sx0, vLen: sh, materiaal: wb.materiaal || 'plaat' });
    }
    const hoeken = [b.left, b.right].filter(x => x.voeg).map(x => ({ partner: x.partner, door: x.door }));
    const hardware = Object.entries(hw).map(([n, a]) => ({ naam: n, aantal: a }));
    out.push({ wb, L: L0, parts, cut, hoeken, hardware, rect: { lengte: nx1 - nx0, diepte: depth, dikte: dik, x0: nx0, z0: az0, yTop }, ks });
  }
  return out;
}

// MARK: - Projectstandaarden
/** Velden die een projectstandaard kunnen volgen (tenzij ze bij de kast zelf gekozen zijn: k.eigen). */
const STD_KEYS = ['hoogte', 'diepte', 'plintHoogte', 'decorKorpus', 'decorFront', 'frontMateriaal', 'bandKorpusDecor',
  'greep', 'greepHart', 'serie', 'plaatDikte', 'rug', 'plint', 'plintTrespa'];

/** Soort kast voor de standaardmaten: onder, boven (hangkast) of kolom. */
function cabGroup(k) {
  const g = PRESETS.find(x => x.id === k.type)?.groep;
  return g === 'Bovenkasten' ? 'boven' : g === 'Kolomkasten' ? 'kolom' : 'onder';
}

/** Waarde van de projectstandaard voor een veld van deze kast (undefined = geen standaard). */
function stdValueFor(project, k, key) {
  const st = project.standaard ?? {};
  const g = cabGroup(k);
  let v;
  if (key === 'hoogte') v = st[`${g}Hoogte`];
  else if (key === 'diepte') v = st[`${g}Diepte`];
  else if (key === 'plintHoogte') v = g === 'boven' ? undefined : st.plintHoogte;
  else if (key === 'plint' && g === 'boven') v = undefined;
  else v = st[key];
  return v === null || v === '' ? undefined : v;
}

/** Projectstandaard toepassen op één of alle kasten (velden in k.eigen blijven). Geeft true als er iets veranderde. */
function applyStandard(project, only = null) {
  let changed = false;
  for (const k of only ? [only] : project.kasten) {
    const eigen = new Set(k.eigen ?? []);
    for (const key of STD_KEYS) {
      if (eigen.has(key)) continue;
      const v = stdValueFor(project, k, key);
      if (v === undefined) continue;
      if (key === 'serie') {
        for (const s of k.secties ?? []) if (s.type === 'lade' && s.serie !== v) { s.serie = v; s.ladeType = ''; changed = true; }
      } else if (k[key] !== v) { k[key] = v; changed = true; }
    }
  }
  return changed;
}

/** Standaard plaattype: fronten (en plint) zoals gekozen bij de kast, de rest melamine. */
function partBaseType(k, S, p) {
  if (p.mat === 'trespa') return 'Trespa';
  if (p.mat === 'buig') return p.buigRichting === 'lang' ? 'Buigtriplex lang' : 'Buigtriplex kort';
  if (p.mat === 'hpl') return 'HPL';
  if (p.mat === 'rond') return k.frontMateriaal || S.frontMateriaal || 'Melamine';
  if (p.rol === 'plintbak') return 'Multiplex';
  return p.mat === 'front' || p.rol === 'plint' ? (k.frontMateriaal || S.frontMateriaal || 'Melamine') : 'Melamine';
}

/** Standaarddecor van een onderdeel (zonder aanpassing per stuk). */
function partBaseDecor(k, S, p) {
  const dKorpus = k.decorKorpus || S.decorKorpus;
  if (p.mat === 'trespa') return 'Trespa';
  if (p.mat === 'buig') return 'Buigtriplex';
  if (p.mat === 'hpl' || p.mat === 'rond') return k.rond?.decor || k.decorFront || S.decorFront;
  if (p.rol === 'plintbak') return 'Multiplex';
  if (p.mat === 'front' || p.rol === 'plint') return k.decorFront || S.decorFront;
  if (p.mat === 'rug') return k.decorRug || dKorpus;
  return dKorpus;
}

/** Standaarddecor van de band: zoals het paneel, behalve de band op het korpus (keuze bij de kast). */
function edgeBaseDecor(k, S, p, e) {
  const decor = p.decor ?? partBaseDecor(k, S, p);
  // Zijwand: rondom in de kleur van de plaat, alleen de voorkant (u1) naar keuze.
  if (p.rol === 'zijwand' && e && e !== 'u1') return decor;
  // Losse legplanken en de wegneembare rug: rondom in de kleur van de plaat.
  if (p.bandPlaat) return decor;
  if (p.mat !== 'korpus' || p.rol === 'plint') return decor;
  if (k.bandKorpusDecor === 'front') return k.decorFront || S.decorFront;
  if (k.bandKorpusDecor && k.bandKorpusDecor !== 'korpus') return k.bandKorpusDecor;
  return decor;
}

/**
 * Onderdelen zoals ze gezaagd worden: de latten van één greeplijst blijven aan elkaar (één strook,
 * met greeplijstZaagExtra per scheiding), zodat afplakken en frezen makkelijker gaan.
 * Liggende latten komen aan de buitenkant, met hun voorkant (band) naar buiten.
 */
function sawParts(parts, S) {
  const out = [];
  const done = new Set();
  for (const p of parts) {
    if (!p.groep) { out.push(p); continue; }
    if (done.has(p.groep)) continue;
    done.add(p.groep);
    const grp = parts.filter(x => x.groep === p.groep);
    if (S.greeplijstSamen === false || grp.length < 2) { out.push(...grp); continue; }
    const staand = grp.find(x => /staand/.test(x.naam)) ?? grp[0];
    const lying = grp.filter(x => x !== staand);
    const B = grp.reduce((tt, x) => tt + x.vLen, 0) + (grp.length - 1) * (Number(S.greeplijstZaagExtra) || 0);
    const edgeOf = x => ({ band: x?.edges?.v1 || 0, decor: x?.edgeDecor?.v1 });
    // Beide lange kanten afplakken: de strook wordt na het afplakken in latten gezaagd.
    const e1 = edgeOf(lying[0]), e0 = lying.length > 1 ? edgeOf(lying[1]) : e1;
    out.push({ ...staand, id: p.groep, naam: `${p.groepNaam} (${grp.length} latten samen)`, grain: 'u', uLen: staand.uLen, vLen: B,
      edges: { u0: 0, u1: 0, v0: e0.band, v1: e1.band }, edgeDecor: { v0: e0.decor, v1: e1.decor }, ops: [] });
  }
  return out;
}

/** Zaaglijst-maten: lengte langs de nerf, breedte dwars; kanten L1/L2 langs de lengte, B1/B2 langs de breedte. */
function cutInfo(p) {
  const alongV = p.grain === 'v';
  return {
    L: alongV ? p.vLen : p.uLen,
    B: alongV ? p.uLen : p.vLen,
    L1: alongV ? p.edges.u0 : p.edges.v0,
    L2: alongV ? p.edges.u1 : p.edges.v1,
    B1: alongV ? p.edges.v0 : p.edges.u0,
    B2: alongV ? p.edges.v1 : p.edges.u1,
    L1d: p.edgeDecor?.[alongV ? 'u0' : 'v0'], L2d: p.edgeDecor?.[alongV ? 'u1' : 'v1'],
    B1d: p.edgeDecor?.[alongV ? 'v0' : 'u0'], B2d: p.edgeDecor?.[alongV ? 'v1' : 'u1'],
    decor: p.decor,
    plaattype: p.plaattype,
  };
}
