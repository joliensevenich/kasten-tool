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
  clamexDeuvel: 50.5,      // deuvel aan weerszijden van elke Clamex
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
  paslatDiepte: 100,         // kastpaslat achter de frontpaslat
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
  greeplijstBinnenDiepte: 20,  // buitenmaat = + plaat
  greepHartafstand: 160,
  greepRand: 40,
  greepVanBoven: 100,
  greepHoogteKolom: 1500,  // kolomkast met toestellen: greep zo dicht mogelijk bij deze hoogte vanaf de vloer
  blindPlaatRand: 22,       // blinde hoek: hart van de gaten van het plaatje vanaf de kant van het blindpaneel naast de deur
  blindPlaatTussen: 32,     // afstand tussen de twee gaten, boven elkaar
  blindPlaatDia: 5,
  blindPlaatDiepte: 10,
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
    LEGRABOX: { bodemB: 35, bodemD: 10, rugB: 35, rugH: 120, gaten: [37, 261, 357, 453], gatHoogte: 37,
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
  { id: 'open', naam: 'Open kast', groep: 'Bovenkasten', kast: { plint: 'geen', top: 'vol', secties: [sec('open', { legplanken: 2 })] } },
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

function hingeCount(h) {
  return h <= 900 ? 2 : h <= 1600 ? 3 : h <= 2000 ? 4 : 5;
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

  const t = S.plaat;
  const v = S.voeg;
  const fd = S.front;
  const warnings = [...preWarnings];
  const parts = [];
  const hw = {};
  const count = (name, n = 1) => { hw[name] = (hw[name] ?? 0) + n; };

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
        s.ops.push({ kind: 'boring', face, u: sideU(hp.box.z + pos), v: sv, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
        hp.ops.push({ kind: 'boring', edge, pos, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
        count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
      };
      if (s.zicht) {
        // Zichtzijde: Clamex P-14 (in de zijwand met frees 202, in de kant met zaag 201), met een deuvel aan weerszijden.
        for (const c of clamexPositions(P, S)) {
          const pos = fromFront(c);
          s.ops.push({ kind: 'clamex', face, u: sideU(hp.box.z + pos), v: sv, naam: 'Clamex' });
          hp.ops.push({ kind: 'clamex', edge, pos, naam: 'Clamex' });
          count('Lamello Clamex P-14');
          for (const d of [c - S.clamexDeuvel, c + S.clamexDeuvel]) if (d > 15 && d < P - 15) dowel(d);
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
    const p = add({
      rol: 'liggend', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: o.band ?? S.bandKorpus },
      box: { x: t, y: o.y, z: o.z, w: W - 2 * t, h: t, d: o.d },
      uLen: W - 2 * t, vLen: o.d, ...o.extra, naam: o.naam,
    });
    join(p, o.y + t / 2, !!o.regel);
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
  if (!autos && Math.abs(rest) > 0.5) warnings.push(`De vakken zijn samen ${r1(fixed)} mm, de kast is ${H} mm. Zet een vak op "automatisch".`);
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
  } else if (k.plint === 'vast' && P) {
    for (const s of sides) s.ops.push({ kind: 'uitsparing', u: Dk - S.plintInsprong, v: 0, w: S.plintInsprong, h: P, naam: 'Plintuitsparing' });
    add({ id: 'plint', naam: 'Plint (vast)', rol: 'plint', mat: 'korpus', dikte: t, grain: 'u',
      box: { x: t, y: -P + td, z: D - S.plintInsprong - t, w: W - 2 * t, h: P - td, d: t }, uLen: W - 2 * t, vLen: P - td });
    if (td) trespa(t, W - 2 * t);
  }

  // Fronten, legplanken, lades en toestellen per zone
  let frontX0 = k.front === 'inliggend' ? t + v / 2 : v / 2;
  let frontX1 = k.front === 'inliggend' ? W - t - v / 2 : W - v / 2;
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

  const handleHoles = (p, vertical, freeLeft) => {
    if (k.greep !== 'greep') return;
    const eigen = k.frontGreep?.[p.id];
    if (eigen === 'geen') return;
    const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
    const h = num(eigen) ?? num(k.greepHart) ?? S.greepHartafstand;
    const dia = S.greepDia;
    const label = h > 0 ? `Greep ${h} mm` : 'Knop';
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
    if (h > p.uLen - 20 && !vertical) warnings.push(`De greep op ${p.naam} is breder dan de front.`);
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
   * Een vaste legplank over alle delen loopt door; de stijlen worden erop onderbroken.
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
    // Vaste legplanken over alle delen: doorlopend tussen de zijwanden.
    const full = fixed.filter(f => !f.deel || !xs.length).map(f => f.y).sort((a, b) => a - b);
    full.forEach(y => horizontal({ naam: 'Vaste legplank', y, z: rugFront, d: D - rugFront - frontInset - vastTerug }));
    const bands = [];
    let lo = h0;
    for (const y of full) { bands.push([lo, y]); lo = y + t; }
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
          R: { part: st, face: 'links', u: su, v: sv, edge: 'u1', zicht: false, screws: false },
          L: { part: st, face: 'rechts', u: su, v: sv, edge: 'u0', zicht: false, screws: false } });
        // Vast aan het paneel eronder en erboven: deuvels in de kopse kanten, schroeven door bodem en top.
        for (const [yEdge, edge, faceP] of [[b0, 'v0', 'boven'], [b1, 'v1', 'onder']]) {
          const hp = parts.find(p => p.rol === 'liggend' && Math.abs((faceP === 'boven' ? p.box.y + p.box.h : p.box.y) - yEdge) < 0.5
            && p.box.x <= xc && p.box.x + p.box.w >= xc);
          if (!hp) { warnings.push(`Middenstijl op ${r1(xc)} mm: geen paneel ${faceP === 'boven' ? 'eronder' : 'erboven'} om aan vast te maken.`); continue; }
          const za = Math.max(st.box.z, hp.box.z), zb = Math.min(st.box.z + st.box.d, hp.box.z + hp.box.d), len = zb - za;
          if (len < 20) continue;
          const dws = len > 2 * S.deuvelEersteVoor + 10 + 100 ? dowelsFromFront(len, S) : len > 2 * S.deuvelEersteVoor + 10 ? [S.deuvelEersteVoor, len - S.deuvelEersteVoor] : [len / 2];
          for (const d of dws) {
            const zz = zb - d;
            st.ops.push({ kind: 'boring', edge, pos: su(zz), dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
            hp.ops.push({ kind: 'boring', face: faceP, u: xc - hp.box.x, v: zz - hp.box.z, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
            count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
          }
          if (S.schroeven && ['bodem', 'top', 'regel-v', 'regel-a'].includes(hp.id)) {
            for (const d of screwsFromFront(len, dws, S)) {
              hp.ops.push({ kind: 'boring', face: faceP, u: xc - hp.box.x, v: zb - d - hp.box.z, dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef' });
              count('Schroef');
            }
          }
        }
      }
      walls.push({ x0: W - t, R: sideWall(sideR) });
      // Delen tussen de wanden.
      for (let c = 0; c + 1 < walls.length; c++) {
        const left = walls[c].L, right = walls[c + 1].R;
        const cx0 = walls[c].x1, cx1 = walls[c + 1].x0;
        const own = xs.length ? fixed.filter(f => f.deel === c + 1 && f.y > b0 + 20 && f.y + t < b1 - 20).map(f => f.y).sort((a, b) => a - b) : [];
        for (const y of own) {
          const hp = add({ naam: `Vaste legplank (deel ${c + 1})`, rol: 'liggend', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: S.bandKorpus },
            box: { x: cx0, y, z: rugFront, w: cx1 - cx0, h: t, d: D - rugFront - frontInset - vastTerug }, uLen: cx1 - cx0, vLen: D - rugFront - frontInset - vastTerug });
          join(hp, y + t / 2, false, [left, right]);
          // Vaste legplanken aan beide kanten van een stijl op dezelfde hoogte: de deuvelgaten zouden elkaar raken.
          const nb = fixed.filter(f => (f.deel === c || f.deel === c + 2) && Math.abs(f.y - y) < t + 10);
          if (nb.length) warnings.push(`Vaste legplanken in deel ${c + 1} en een buurdeel liggen even hoog (${r1(y - h0)} mm): verspring ze of kies "alle delen".`);
        }
        // Losse legplanken: n per deel, verdeeld over de openingen volgens hun hoogte.
        const openings = [];
        let o0 = b0;
        for (const y of own) { openings.push([o0, y]); o0 = y + t; }
        openings.push([o0, b1]);
        const share = openings.map(([a, b]) => (b - a) / openings.reduce((tt, [x, y2]) => tt + y2 - x, 0) * n);
        const kk = share.map(Math.floor);
        share.map((x, i) => [x - kk[i], i]).sort((a, b) => b[0] - a[0]).slice(0, n - kk.reduce((a, b) => a + b, 0)).forEach(([, i]) => kk[i]++);
        openings.forEach(([a, b], i) => {
          const m = kk[i];
          for (let j = 0; j < m; j++) {
            const yy = a + (j + 1) * (b - a) / (m + 1) - t / 2;
            const d = innerDepth - S.legplankInsprong;
            add({ naam: 'Legplank', rol: 'legplank', mat: 'korpus', dikte: t, grain: 'u', bandPlaat: true, edges: { u0: S.bandLegplank, u1: S.bandLegplank, v0: S.bandLegplank, v1: S.bandLegplank },
              box: { x: cx0 + S.legplankSpeling, y: yy, z: rugFront, w: cx1 - cx0 - 2 * S.legplankSpeling, h: t, d },
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

    if (s.type === 'deur' || s.type === 'klep') {
      if (greeplijst) {
        const top = greepTop(z);
        addGreeplijst('L', top - gh - t, 'boven');
        fy1 = top - gh;
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
        const n = k.deuren === 'auto' ? ((x1 - x0) > S.deurMaxBreedte ? 2 : 1) : Number(k.deuren);
        const dw = (x1 - x0 - (n - 1) * v) / n;
        for (let i = 0; i < n; i++) {
          const dx0 = x0 + i * (dw + v);
          // Naast een blindpaneel scharniert de deur aan het blindpaneel.
          const hingeLeft = n === 1 ? (blindPart ? k.blindKant !== 'rechts' : k.scharnierKant !== 'rechts') : i === 0;
          const door = front({ naam: n === 1 ? 'Deur' : (i === 0 ? 'Deur links' : 'Deur rechts'), x0: dx0, y0: fy0, x1: dx0 + dw, y1: fy1 });
          if (door.vLen < 2 * S.scharnierRand + 60) warnings.push(`${door.naam} is maar ${r1(door.vLen)} mm hoog: te laag voor scharnieren. Pas de hoogtes van de vakken aan.`);
          const hc = hingeCount(door.vLen);
          // Scharnieren gelijk verdeeld, maar altijd binnen het korpus (ook als de deur uitsteekt).
          const pMin = Math.max(S.scharnierRand, -Pv + S.scharnierRand - door.box.y);
          const hingeEdgeH = door.edgeH ? (hingeLeft ? door.edgeH.u0 : door.edgeH.u1) : door.vLen;
          // Schuine kast: de scharnieren zitten aan de hoge kant. Het scharnier (plaatje + arm) steekt tot
          // scharnierInbouw de kast in; daar moet het nog onder de schuine top passen, met scharnierVrij ruimte.
          const slopeLimit = lr ? yTopX(hingeLeft ? t + S.scharnierInbouw : W - t - S.scharnierInbouw) - t / cosA - S.scharnierVrij : Infinity;
          const pMax = Math.min(hingeEdgeH - S.scharnierRand, (lr ? slopeLimit - S.plaatjeHoogte / 2 : H - S.scharnierRand) - door.box.y);
          let positions = Array.from({ length: hc }, (_, j) => pMin + j * (pMax - pMin) / (hc - 1));
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
          const obstacles = parts.filter(x => (x.rol === 'liggend' || x.rol === 'greeplijst') && x.box.z + x.box.d > D - 60)
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
            const cu = hingeLeft ? S.potRand + S.potDia / 2 : door.uLen - S.potRand - S.potDia / 2;
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
            } else if (pv === positions[0]) {
              warnings.push('Een deur scharniert niet tegen een zijwand of blindpaneel: voorzie de montageplaten apart.');
            }
            count('Scharnier Blum (snelspan)');
            count('Montageplaat');
          }
          handleHoles(door, true, hingeLeft ? false : true);
          // Dempers: twee gaten aan de openingskant, bij de boven- en onderhoek (niet bij push-open: dan drukt de deur niet in).
          if (S.dempers && k.greep !== 'push') {
            const du = hingeLeft ? door.uLen - S.demperRand : S.demperRand;
            // Binnen de hoogte van de zijwand blijven (ook als de deur uitsteekt).
            const lo = Math.max(S.demperRand, -Pv - door.box.y + S.demperRand), hi = Math.min((door.shape ? door.shape[3][1] + (door.shape[2][1] - door.shape[3][1]) * du / door.uLen - 6 : door.vLen) - S.demperRand, H - door.box.y - S.demperRand);
            for (const dv of [lo, hi]) door.ops.push({ kind: 'boring', face: 'binnen', u: du, v: dv, dia: S.demperDia, diepte: S.demperDiepte, naam: 'Demper' });
            count('Demper', 2);
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
      shelves(z, Number(s.legplanken) || 0, s);
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
        const f = front({ naam: n === 1 ? 'Ladefront' : `Ladefront ${i + 1}`, x0: frontX0, y0: yy, x1: frontX1, y1: top });
        handleHoles(f, false);
        // Dempers: links en rechts op halve hoogte, ter hoogte van de zijwanden.
        if (S.dempers && k.greep !== 'push') {
          for (const du of [S.demperRand, f.uLen - S.demperRand]) f.ops.push({ kind: 'boring', face: 'binnen', u: du, v: f.vLen / 2, dia: S.demperDia, diepte: S.demperDiepte, naam: 'Demper' });
          count('Demper', 2);
        }
        if (k.greep === 'push') pushBore(f, true, 1, true);
        if (greeplijst) addGreeplijst(i === n - 1 ? 'L' : 'C', top - t, i === n - 1 ? 'boven' : `lade ${i + 1}`);
        // Ladekast
        const openBottom = i === 0 ? z.open0 : greeplijst ? yy + t : yy - v / 2;
        if (nl) {
          const bodemD = nl - b.bodemD;
          const lb = S.ladeBodemDikte, sb = S.ladeSponningBreedte, sd = S.ladeSponningDiepte;
          const bodem = add({ naam: `Ladebodem (${ltName})`, rol: 'lade', mat: 'lade', dikte: lb, grain: 'u',
            box: { x: t + (lw - (lw - b.bodemB)) / 2, y: openBottom + b.gatHoogte, z: D - frontInset - bodemD - 5, w: lw - b.bodemB, h: lb, d: bodemD },
            uLen: lw - b.bodemB, vLen: bodemD });
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
      // De rug wordt in de lat geschroefd.
      const rug = parts.find(x => x.rol === 'rug' && x.box.y <= yc && x.box.y + x.box.h >= yc);
      if (rug && groef) {
        for (const u of spreadPositions(W - 2 * t, S.rugSchroefAfstand, 50)) {
          rug.ops.push({ kind: 'boring', face: 'achter', u: t + u - rug.box.x, v: yc - rug.box.y, dia: S.schroefDia, diepte: S.rug, doorgaand: true, naam: 'Schroef' });
          count('Schroef');
        }
      }
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
    const kd = Math.min(S.paslatDiepte, Dk);
    const kp = add({ id: `paslat-kast-${kant}`, naam: `Kastpaslat ${kant}`, rol: 'paslat', mat: 'korpus', dikte: t, grain: 'v', edges: {},
      box: { x: left ? -t : W, y: -Pv, z: D - kd, w: t, h: sideH, d: kd }, uLen: kd, vLen: sideH });
    // Greeploos: de greeplijsten lopen door over de paslat; de frontpaslat wordt daar onderbroken (een stuk per front)
    // en de kastpaslat krijgt dezelfde uitsparing als de zijwand.
    const grips = parts.filter(x => x.rol === 'greeplijst' && /staand/.test(x.naam)).map(x => [x.box.y, x.box.y + x.box.h, D - x.box.z]).sort((a2, b2) => a2[0] - b2[0]);
    const segs = [];
    let y0 = fY0;
    for (const [g0, g1] of grips) { if (g0 > y0 + 20 && g0 < fY1) segs.push([y0, Math.min(g0, fY1)]); if (g1 > y0) y0 = g1; }
    if (fY1 > y0 + 20) segs.push([y0, fY1]);
    const fps = segs.map(([s0, s1], i) => add({ id: `paslat-front-${kant}${segs.length > 1 ? `-${i + 1}` : ''}`, naam: `Frontpaslat ${kant}${segs.length > 1 ? ` ${i + 1}` : ''}`, rol: 'paslat', mat: 'front', dikte: fd, grain: 'v',
      edges: { u0: left ? 0 : S.bandFront, u1: left ? S.bandFront : 0, v0: S.bandFront, v1: S.bandFront },
      box: { x: xf, y: s0, z: D, w: pw, h: s1 - s0, d: fd }, uLen: pw, vLen: s1 - s0 }));
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
    p.kleur = d?.kleur ?? null;
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
  const hardware = Object.entries(hw).map(([naam, aantal]) => ({ naam, aantal: Math.round(aantal * 100) / 100 }));
  return { parts, warnings: [...new Set(warnings)], hardware, zones, nl };
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
function projectParts(project, S, maxLen = 2780) {
  const layout = projectLayout(project);
  const items = project.kasten.map((k, i) => {
    const res = buildCabinet(k, S);
    return { k, res, L: layout[i], parts: res.error ? [] : res.parts.slice() };
  });
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
  const kind = p => p.rol === 'plint' || p.rol === 'greeplijst' || p.rol === 'trespa';
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
              const len = group.reduce((t, c) => t + c.p.uLen, 0);
              const first = group[0];
              const merged = { ...first.p, id: `${first.p.id}-doorlopend`, naam: `${first.p.naam} (doorlopend)`, uLen: len, box: { ...first.p.box, w: len },
                kastLabel: `${group[0].it.k.code}–${group[group.length - 1].it.k.code}`, doorlopend: group.map(c => c.it.k.code) };
              first.it.parts[first.it.parts.indexOf(first.p)] = merged;
              for (const c of group.slice(1)) c.it.parts.splice(c.it.parts.indexOf(c.p), 1);
            }
            group = [];
          };
          // Op een kastnaad verdelen als het stuk te lang wordt voor een plaat.
          for (const c of chain) {
            if (group.length && group.reduce((t, g) => t + g.p.uLen, 0) + c.p.uLen > maxLen) emit();
            group.push(c);
          }
          emit();
        }
        chain = [];
      };
      for (const it of row) {
        const q = it.parts.find(p => kind(p) && keyOf(p) === key);
        const last = chain[chain.length - 1];
        const links = q && last && Math.abs(q.box.x) < 0.5 && Math.abs(last.p.box.x + last.p.box.w - W(last.it)) < 0.5;
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
  return p.mat === 'front' || p.rol === 'plint' ? (k.frontMateriaal || S.frontMateriaal || 'Melamine') : 'Melamine';
}

/** Standaarddecor van een onderdeel (zonder aanpassing per stuk). */
function partBaseDecor(k, S, p) {
  const dKorpus = k.decorKorpus || S.decorKorpus;
  if (p.mat === 'trespa') return 'Trespa';
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
