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
  clamexMaxAfstand: 150,  // zeker om de 150 mm een Clamex
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
  wegneembareRugAchter: 13,  // afstand van de strook tot de achterkant (de achterste drager zit erachter)
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
  const sa = (Number(sch.hoek) || 0) * Math.PI / 180;
  const lr = sch.richting === 'lr' && sa > 0, vb = sch.richting === 'vb' && sa > 0;
  const schuin = lr || vb;
  const tanA = Math.tan(sa), cosA = Math.cos(sa), sinA = Math.sin(sa);
  const rechtsHoog = sch.hoog === 'rechts';
  const yTopX = x => lr ? H - (rechtsHoog ? W - x : x) * tanA : H;   // bovenkant korpus over de breedte
  const yTopZ = z => vb ? H - (D - z) * tanA : H;                    // bovenkant korpus over de diepte (voor hoog)
  if (schuin) {
    if (sa >= Math.PI / 3) return { parts: [], warnings: [], hardware: [], zones: [], error: 'De hoek is te groot (maximaal 60°).' };
    const laag = lr ? H - W * tanA : H - D * tanA;
    if (laag < 150) return { parts: [], warnings: [], hardware: [], zones: [], error: `Aan de lage kant is de kast maar ${Math.round(laag)} mm hoog. Kies een kleinere hoek of een hogere kast.` };
    if (k.top !== 'vol') k = { ...k, top: 'vol' };       // een schuine kast heeft altijd een (schuine) volle top
  }

  const t = S.plaat;
  const v = S.voeg;
  const fd = S.front;
  const warnings = [];
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
  const greeplijst = k.greep === 'greeplijst';

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
    if (Math.min(hl, hr) < 40) warnings.push(`${p.naam}: aan de lage kant maar ${Math.round(Math.min(hl, hr))} mm hoog.`);
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
    const bodem = rugInBodemGroef
      ? horizontal({ naam: 'Bodem', y: 0, z: zBack, d: Dk - terug, extra: { id: 'bodem' } })
      : horizontal({ naam: verlOnder ? 'Bodem (verluchting, achteruit)' : 'Bodem', y: 0, z: voorRug, d: D - voorRug - terug, extra: { id: 'bodem' } });
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
          sd.ops.push({ kind: 'clamex', face: 'binnen', u: sideU(q.z), v: sideV(q.y), naam: 'Clamex' });
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

  // Wegneembare rug (bv. spoelbakkast): een strook onder de bovenkant, tussen legplankdragers geschoven
  // (per zijwand twee dragers achter en twee voor de strook).
  if (k.wegneembareRug) {
    if (k.rug !== 'geen') warnings.push('Een wegneembare rug kan alleen bij een kast zonder vaste rug (Rug: geen rug).');
    else {
      const hR = S.wegneembareRugHoogte, y1 = H - (k.top === 'staand' ? rb : t), y0 = y1 - hR;
      const zp = zBack + S.wegneembareRugAchter;
      add({ id: 'rug-weg', naam: 'Wegneembare rug', rol: 'rug', mat: 'korpus', dikte: t, grain: 'u', bandPlaat: true, edges: { u0: S.bandKorpus, u1: S.bandKorpus, v0: S.bandKorpus, v1: S.bandKorpus },
        box: { x: t + 1, y: y0, z: zp, w: W - 2 * t - 2, h: hR, d: t }, uLen: W - 2 * t - 2, vLen: hR });
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
  const frontX0 = k.front === 'inliggend' ? t + v / 2 : v / 2;
  const frontX1 = k.front === 'inliggend' ? W - t - v / 2 : W - v / 2;
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
      const u = freeLeft ? S.greepRand : p.uLen - S.greepRand;
      const topV = p.edgeH ? (freeLeft ? p.edgeH.u0 : p.edgeH.u1) : p.vLen;
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
    const dStijl = D - rugFront - frontInset - (greeplijst ? gdp + t : 0);
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
    full.forEach(y => horizontal({ naam: 'Vaste legplank', y, z: rugFront, d: D - rugFront - frontInset }));
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
            box: { x: cx0, y, z: rugFront, w: cx1 - cx0, h: t, d: D - rugFront - frontInset }, uLen: cx1 - cx0, vLen: D - rugFront - frontInset });
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
      if (z.index === 0) fy0 -= Number(k.uitstekOnder) || 0;
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
          const pMax = Math.min(hingeEdgeH - S.scharnierRand, (lr ? Math.min(yTopX(t), yTopX(W - t)) : H) - S.scharnierRand - door.box.y);
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
          const blocked = c => obstacles.some(([a, b]) => c + half > a && c - half < b) || c - half < -Pv || c + half > H;
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
          // Dempers: twee gaten aan de openingskant, bij de boven- en onderhoek.
          if (S.dempers) {
            const du = hingeLeft ? door.uLen - S.demperRand : S.demperRand;
            // Binnen de hoogte van de zijwand blijven (ook als de deur uitsteekt).
            const lo = Math.max(S.demperRand, -Pv - door.box.y + S.demperRand), hi = Math.min((door.shape ? door.shape[3][1] + (door.shape[2][1] - door.shape[3][1]) * du / door.uLen - 6 : door.vLen) - S.demperRand, H - door.box.y - S.demperRand);
            for (const dv of [lo, hi]) door.ops.push({ kind: 'boring', face: 'binnen', u: du, v: dv, dia: S.demperDia, diepte: S.demperDiepte, naam: 'Demper' });
            count('Demper', 2);
          }
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
        if (S.dempers) {
          for (const du of [S.demperRand, f.uLen - S.demperRand]) f.ops.push({ kind: 'boring', face: 'binnen', u: du, v: f.vLen / 2, dia: S.demperDia, diepte: S.demperDiepte, naam: 'Demper' });
          count('Demper', 2);
        }
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
    const left = kant === 'links';
    const sd = left ? sideL : sideR;
    const xf = left ? -v / 2 - pw : W + v / 2;
    const fp = add({ id: `paslat-front-${kant}`, naam: `Frontpaslat ${kant}`, rol: 'paslat', mat: 'front', dikte: fd, grain: 'v',
      edges: { u0: left ? 0 : S.bandFront, u1: left ? S.bandFront : 0, v0: S.bandFront, v1: S.bandFront },
      box: { x: xf, y: fY0, z: D, w: pw, h: fY1 - fY0, d: fd }, uLen: pw, vLen: fY1 - fY0 });
    const kd = Math.min(S.paslatDiepte, Dk);
    const kp = add({ id: `paslat-kast-${kant}`, naam: `Kastpaslat ${kant}`, rol: 'paslat', mat: 'korpus', dikte: t, grain: 'v', edges: {},
      box: { x: left ? -t : W, y: -Pv, z: D - kd, w: t, h: sideH, d: kd }, uLen: kd, vLen: sideH });
    // Clamex: in de voorkant van de kastpaslat (u1) en in het vlak van de frontpaslat, ter hoogte van de kastpaslat.
    const fu = (left ? -t / 2 : W + t / 2) - xf;
    for (const c of clamexPositions(sideH, S)) {
      const fv = kp.box.y + c - fp.box.y;
      if (fv < 40 || fv > fp.vLen - 40) continue;
      kp.ops.push({ kind: 'clamex', edge: 'u1', pos: c, naam: 'Clamex' });
      fp.ops.push({ kind: 'clamex', face: 'binnen', u: fu, v: fv, naam: 'Clamex' });
      count('Lamello Clamex P-14');
    }
    // Schroeven door de zijwand in de kastpaslat.
    for (const vv of spreadPositions(sideH, S.paslatSchroefAfstand, 80)) {
      sd.ops.push({ kind: 'boring', face: 'binnen', u: Dk - kd / 2, v: vv, dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef paslat' });
      count('Schroef');
    }
  }

  // Rug in een groef: schroefgaten in de rug voor elk liggend paneel dat tegen de rug komt (bodem, regels, tussenbodems, vaste legplanken).
  if (groef) {
    for (const rug of parts.filter(x => x.rol === 'rug')) {
      for (const hp of parts.filter(x => x.rol === 'liggend' && Math.abs(x.box.z - (rug.box.z + rug.box.d)) < 1.5
        && x.box.y >= rug.box.y - 0.1 && x.box.y + x.box.h <= rug.box.y + rug.box.h + 0.1)) {
        for (const u of spreadPositions(hp.box.w, S.rugSchroefAfstand, Math.min(50, hp.box.w / 4))) {
          rug.ops.push({ kind: 'boring', face: 'achter', u: hp.box.x + u - rug.box.x, v: hp.box.y + hp.box.h / 2 - rug.box.y, dia: S.schroefDia, diepte: S.rug, doorgaand: true, naam: 'Schroef' });
          count('Schroef');
        }
      }
    }
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
    for (const p of parts.filter(p => ['legplank', 'liggend', 'lade', 'stijl'].includes(p.rol) && p.box.y + p.box.h > lowTop + 0.5)) {
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
