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
  rugInsprong: 16,         // afstand van de achterkant van het korpus tot de groef
  rugSpeling: 1,           // speling per kant in de groef
  rugSchroefAfstand: 200,
  bandKorpus: 1,           // voorkant van zijwanden, bodem, top, tussenbodems
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
  deuvelDiepteKant: 24,
  schroeven: true,
  schroefDia: 4,
  clamexMarge: 64,
  clamexMaxAfstand: 256,
  clamexToegangDia: 6,
  clamexToegangAfstand: 9,
  montageplaatDia: 5,
  montageplaatDiepte: 13,
  montageplaatVoor: 37,
  montageplaatTussen: 32,
  potDia: 35,
  potDiepte: 13,
  potRand: 4,              // afstand van de pot tot de rand van de deur
  scharnierRand: 100,      // eerste en laatste scharnier vanaf boven- en onderkant
  potDeuvels: true,        // twee deuvelgaten bij de pot (boorbeeld 45/9,5)
  systeemboringen: true,
  systeemDia: 5,
  systeemDiepte: 13,
  systeemVoor: 37,
  systeemAchter: 37,
  systeemRaster: 32,
  systeemMarge: 64,
  regelBreedte: 100,
  verluchtingInsprong: 50,
  rugInsprongToestel: 40,  // bij kasten met toestellen: ruimte achter de rug voor verluchting
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
  greepDia: 5,
  tipOnDia: 10,
  tipOnDiepte: 12,
  deurMaxBreedte: 600,
  ladeBodemDikte: 16,
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
    LEGRABOX: { bodemB: 35, bodemD: 10, rugB: 35, rugH: 120, gaten: [37, 261], gatHoogte: 37,
      types: [{ code: 'N', rugH: 70 }, { code: 'M', rugH: 90 }, { code: 'K', rugH: 128 }, { code: 'C', rugH: 177 }, { code: 'F', rugH: 241 }] },
    TANDEMBOX: { bodemB: 75, bodemD: 24, rugB: 87, rugH: 84, gaten: [37, 261], gatHoogte: 37,
      types: [{ code: 'N', rugH: 68 }, { code: 'M', rugH: 84 }, { code: 'K', rugH: 116 }, { code: 'D', rugH: 199 }] },
    MOVENTO: { bodemB: 42, bodemD: 10, rugB: 42, rugH: 120, gaten: [37, 261], gatHoogte: 37,
      types: [{ code: '100', rugH: 100 }, { code: '150', rugH: 150 }, { code: '200', rugH: 200 }] },
  },
};

const NL_LIST = [270, 300, 350, 400, 450, 500, 550, 600, 650];
const SERIES = ['LEGRABOX', 'TANDEMBOX', 'MOVENTO'];
const PLAATTYPES = ['Melamine', 'HPL'];

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
  { id: 'spoelbak', naam: 'Spoelbakkast', groep: 'Onderkasten', kast: { rug: 'geen', secties: [sec('deur')] } },
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

/** Deuvels: de eerste en laatste op `marge` van voor- en achterkant, ertussen gelijk verdeeld op ongeveer `afstand`. */
function dowelPositions(len, S) {
  const m = S.deuvelMarge;
  if (len <= 2 * m) return [len / 2];
  const span = len - 2 * m;
  const n = Math.max(2, Math.round(span / S.deuvelAfstand) + 1);
  return Array.from({ length: n }, (_, i) => m + i * span / (n - 1));
}

/** Clamex: eerste en laatste op `marge` van de rand, verder hoogstens `maxAfstand` uit elkaar. */
function clamexPositions(len, S) {
  const m = Math.min(S.clamexMarge, len / 4);
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
  const side = left => add({
    id: left ? 'zij-l' : 'zij-r', naam: left ? 'Zijwand links' : 'Zijwand rechts', rol: 'zijwand', mat: 'korpus', dikte: t,
    box: { x: left ? 0 : W - t, y: -Pv, z: zBack, w: t, h: sideH, d: Dk },
    uLen: Dk, vLen: sideH, grain: 'v', edges: { u1: S.bandKorpus }, left, zicht: left ? !!k.zichtL : !!k.zichtR,
  });
  const sideL = side(true);
  const sideR = side(false);
  const sides = [sideL, sideR];
  const sideV = y => y + Pv;
  const sideU = z => z - zBack;

  if (groef) {
    for (const s of sides) {
      s.ops.push({ kind: 'groef', face: 'binnen', u1: S.rugInsprong + gw / 2, v1: 0, u2: S.rugInsprong + gw / 2, v2: s.vLen, breedte: gw, diepte: gd, naam: 'Rugwandgroef' });
    }
  }

  /** Verbinding van een liggend paneel met beide zijwanden: Clamex aan een zichtzijde, anders deuvels en schroeven. */
  /** Verbinding; bij een regel altijd twee deuvels (gemeten vanaf de achterkant van de regel) en één schroefgat ertussen. */
  const join = (hp, yCenter, regel = false) => {
    for (const s of sides) {
      const edge = s.left ? 'u0' : 'u1';
      const sv = sideV(yCenter);
      if (s.zicht) {
        for (const pos of clamexPositions(hp.vLen, S)) {
          const su = sideU(hp.box.z + pos);
          s.ops.push({ kind: 'clamex', face: 'binnen', u: su, v: sv, naam: 'Clamex' });
          hp.ops.push({ kind: 'clamex', edge, pos, naam: 'Clamex' });
          hp.ops.push({ kind: 'boring', face: 'boven', u: s.left ? S.clamexToegangAfstand : hp.uLen - S.clamexToegangAfstand, v: pos, dia: S.clamexToegangDia, diepte: t, naam: 'Clamex toegang' });
          count('Lamello Clamex P-14');
        }
      } else {
        const dowels = regel
          ? (hp.vLen > 2 * S.deuvelMarge + 10 ? [S.deuvelMarge, hp.vLen - S.deuvelMarge] : [hp.vLen / 4, hp.vLen * 3 / 4])
          : dowelPositions(hp.vLen, S);
        for (const pos of dowels) {
          const su = sideU(hp.box.z + pos);
          s.ops.push({ kind: 'boring', face: 'binnen', u: su, v: sv, dia: S.deuvelDia, diepte: S.deuvelDiepteVlak, naam: 'Deuvel' });
          hp.ops.push({ kind: 'boring', edge, pos, dia: S.deuvelDia, diepte: S.deuvelDiepteKant, naam: 'Deuvel' });
          count(`Deuvel ${S.deuvelDia} × ${S.deuvelLengte}`);
        }
        if (S.schroeven) {
          for (let i = 0; i < dowels.length - 1; i++) {
            const su = sideU(hp.box.z + (dowels[i] + dowels[i + 1]) / 2);
            s.ops.push({ kind: 'boring', face: 'binnen', u: su, v: sv, dia: S.schroefDia, diepte: t, doorgaand: true, naam: 'Schroef' });
            count('Schroef');
          }
        }
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
  const topBand = verl ? 2 * t + S.verluchtingSpleet : t;
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
    const bodem = rugInBodemGroef
      ? horizontal({ naam: 'Bodem', y: 0, z: zBack, d: Dk, extra: { id: 'bodem' } })
      : horizontal({ naam: 'Bodem', y: 0, z: voorRug, d: D - voorRug, extra: { id: 'bodem' } });
    if (rugInBodemGroef) rugGroove(bodem, 'boven');
    if (verlOnder) horizontal({ naam: 'Bodem verluchting, achteruit', y: t + S.verluchtingSpleet, z: rugFront, d: D - rugFront - S.verluchtingInsprong, extra: { id: 'bodem-verluchting' } });
  }

  // Top of regels (bij verluchting altijd regels, met een tweede regel eronder, naar achter geschoven)
  const rb = S.regelBreedte;
  if (k.top === 'vol' && !verl) {
    horizontal({ naam: 'Top', y: H - t, z: voorRug, d: D - voorRug, extra: { id: 'top' } });
  } else {
    // Bij een greeplijst schuift de voorregel naar achter, achter de greeplijst.
    const zFront = D - rb - (greeplijst ? S.greeplijstBinnenDiepte + t : 0);
    horizontal({ naam: 'Voorregel', y: H - t, z: zFront, d: rb, regel: true, extra: { id: 'regel-v' } });
    // De achterregel staat vóór de rug; de rug loopt tot boven en wordt op de regel geschroefd.
    horizontal({ naam: 'Achterregel', y: H - t, z: rugFront, d: rb, band: 0, regel: true, extra: { id: 'regel-a' } });
    if (verl) horizontal({ naam: 'Regel verluchting, achteruit', y: H - 2 * t - S.verluchtingSpleet, z: zFront - S.verluchtingInsprong, d: rb, band: 0, regel: true, extra: { id: 'regel-verluchting' } });
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
      const yb = a === 0 ? (hasBodem && rugInBodemGroef ? t - (gd - gs) : 0) : bounds[a].lo;
      const yt = b === last ? H : bounds[b + 1].hi;
      const label = segName(segments.length, idx);
      const rugPart = add({
        id: segments.length === 1 ? 'rug' : undefined, naam: label ? `Rugwand ${label}` : 'Rugwand', rol: 'rug', mat: 'rug', dikte: S.rug, grain: 'v',
        box: { x: t - (gd - gs), y: yb, z: zBack + S.rugInsprong + (gw - S.rug) / 2, w: W - 2 * t + 2 * (gd - gs), h: yt - yb, d: S.rug },
        uLen: W - 2 * t + 2 * (gd - gs), vLen: yt - yb,
      });
      // Schroeven door de rug: bovenaan in de top of achterregel, onderaan in de bodem (niet bij een hangkast).
      const screwRow = vv => {
        for (const u of spreadPositions(W - 2 * t, S.rugSchroefAfstand, 50)) {
          rugPart.ops.push({ kind: 'boring', face: 'achter', u: t + u - rugPart.box.x, v: vv, dia: S.schroefDia, diepte: S.rug, doorgaand: true, naam: 'Schroef' });
          count('Schroef');
        }
      };
      if (b === last) screwRow(H - t / 2 - yb);
      if (a === 0 && hasBodem && !rugInBodemGroef) screwRow(t / 2 - yb);
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

  // Plint
  if (k.plint === 'stelpoten' && P) {
    add({ id: 'plint', naam: 'Plint', rol: 'plint', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: 0 },
      box: { x: 0, y: -P, z: D - S.plintInsprong - t, w: W, h: P, d: t }, uLen: W, vLen: P });
    count('Stelpoot', W > 900 ? 6 : 4);
  } else if (k.plint === 'vast' && P) {
    for (const s of sides) s.ops.push({ kind: 'uitsparing', u: Dk - S.plintInsprong, v: 0, w: S.plintInsprong, h: P, naam: 'Plintuitsparing' });
    add({ id: 'plint', naam: 'Plint (vast)', rol: 'plint', mat: 'korpus', dikte: t, grain: 'u',
      box: { x: t, y: -P, z: D - S.plintInsprong - t, w: W - 2 * t, h: P, d: t }, uLen: W - 2 * t, vLen: P });
  }

  // Fronten, legplanken, lades en toestellen per zone
  const frontX0 = k.front === 'inliggend' ? t + v / 2 : v / 2;
  const frontX1 = k.front === 'inliggend' ? W - t - v / 2 : W - v / 2;
  const frontZ = k.front === 'inliggend' ? D - fd : D;
  const innerDepth = D - rugFront - frontInset;
  const nl = NL_LIST.filter(n => n <= innerDepth - 10).pop();

  const front = (o) => add({
    rol: 'front', mat: 'front', dikte: fd, grain: 'v',
    edges: { u0: S.bandFront, u1: S.bandFront, v0: S.bandFront, v1: S.bandFront },
    box: { x: o.x0, y: o.y0, z: frontZ, w: o.x1 - o.x0, h: o.y1 - o.y0, d: fd },
    uLen: o.x1 - o.x0, vLen: o.y1 - o.y0, naam: o.naam,
  });

  /**
   * Houten greeplijst met een greepruimte van binnenhoogte × binnendiepte.
   * L (bovenaan): staande lat (binnenhoogte + plaat) en een liggende lat onderaan.
   * C (tussen twee fronten): staande lat (binnenhoogte + 2 × plaat) en liggende latten onder- en bovenaan;
   * de fronten erboven en eronder hechten aan de liggende latten.
   * `yb` is de onderkant van het profiel; de zijwanden krijgen een uitsparing met de buitenmaat.
   */
  const gh = S.greeplijstBinnenHoogte, gdp = S.greeplijstBinnenDiepte;
  const addGreeplijst = (kind, yb, label) => {
    const hOut = kind === 'L' ? gh + t : gh + 2 * t;
    const dOut = gdp + t;
    for (const s of sides) s.ops.push({ kind: 'uitsparing', u: Dk - dOut, v: sideV(yb), w: dOut, h: hOut, naam: `Uitsparing greeplijst (${kind})` });
    add({ naam: `Greeplijst ${label}, staand`, rol: 'greeplijst', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: 0 },
      box: { x: t, y: yb, z: D - dOut, w: W - 2 * t, h: hOut, d: t }, uLen: W - 2 * t, vLen: hOut });
    const lying = (y, pos) => add({ naam: `Greeplijst ${label}, liggend${pos}`, rol: 'greeplijst', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: S.bandKorpus },
      box: { x: t, y, z: D - gdp, w: W - 2 * t, h: t, d: gdp }, uLen: W - 2 * t, vLen: gdp });
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
      const vMid = p.vLen - S.greepVanBoven - h / 2;
      for (const o of offsets) p.ops.push({ kind: 'boring', face: 'voor', u, v: vMid + o, dia, diepte: fd, doorgaand: true, naam: 'Greep' });
    } else {
      const vv = Math.max(S.greepRand, p.vLen - S.greepRand);
      for (const o of offsets) p.ops.push({ kind: 'boring', face: 'voor', u: p.uLen / 2 + o, v: vv, dia, diepte: fd, doorgaand: true, naam: 'Greep' });
    }
    if (h > p.uLen - 20 && !vertical) warnings.push(`De greep op ${p.naam} is breder dan de front.`);
    count(label);
  };

  const shelves = (z, n) => {
    const h0 = z.open0, h1 = z.open1;
    for (let i = 0; i < n; i++) {
      const yy = h0 + (i + 1) * (h1 - h0) / (n + 1) - t / 2;
      const d = innerDepth - S.legplankInsprong;
      add({ naam: 'Legplank', rol: 'legplank', mat: 'korpus', dikte: t, grain: 'u', edges: { v1: S.bandLegplank },
        box: { x: t + S.legplankSpeling, y: yy, z: rugFront, w: W - 2 * t - 2 * S.legplankSpeling, h: t, d },
        uLen: W - 2 * t - 2 * S.legplankSpeling, vLen: d });
      count('Legplankdrager', 4);
    }
    if (n > 0 && S.systeemboringen) {
      const uF = Dk - S.systeemVoor - frontInset;
      const uB = rugFront - zBack + S.systeemAchter;
      for (let yy = h0 + S.systeemMarge; yy <= h1 - S.systeemMarge + 0.1; yy += S.systeemRaster) {
        for (const s of sides) for (const u of [uB, uF]) s.ops.push({ kind: 'boring', face: 'binnen', u, v: sideV(yy), dia: S.systeemDia, diepte: S.systeemDiepte, naam: 'Systeemboring' });
      }
    }
  };

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
        if (k.top === 'vol' && zoneTop === H) warnings.push('Greeplijst bovenaan met een volle top: kies regels, zodat de greeplijst eronder past.');
      }
      let x0 = frontX0, x1 = frontX1;
      const blind = Number(k.blindBreedte) || 0;
      if (blind > 0 && s.type === 'deur') {
        if (k.blindKant === 'rechts') {
          front({ naam: 'Blindpaneel', x0: x1 - blind, y0: fy0, x1, y1: fy1 });
          x1 = x1 - blind - v;
        } else {
          front({ naam: 'Blindpaneel', x0, y0: fy0, x1: x0 + blind, y1: fy1 });
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
          const hingeLeft = n === 1 ? (blind > 0 ? k.blindKant === 'rechts' : k.scharnierKant !== 'rechts') : i === 0;
          const door = front({ naam: n === 1 ? 'Deur' : (i === 0 ? 'Deur links' : 'Deur rechts'), x0: dx0, y0: fy0, x1: dx0 + dw, y1: fy1 });
          if (door.vLen < 2 * S.scharnierRand + 60) warnings.push(`${door.naam} is maar ${r1(door.vLen)} mm hoog: te laag voor scharnieren. Pas de hoogtes van de vakken aan.`);
          const hc = hingeCount(door.vLen);
          // Scharnieren gelijk verdeeld, maar altijd binnen het korpus (ook als de deur uitsteekt).
          const pMin = Math.max(S.scharnierRand, -Pv + S.scharnierRand - door.box.y);
          const pMax = Math.min(door.vLen - S.scharnierRand, H - S.scharnierRand - door.box.y);
          let positions = Array.from({ length: hc }, (_, j) => pMin + j * (pMax - pMin) / (hc - 1));
          // Met een rijboring in dit vak: het scharnier zo verschuiven dat de gaten van het plaatje op het raster
          // van 32 mm vallen (dezelfde gaten als de rijboring, geen overlappende gaten).
          if ((Number(s.legplanken) || 0) > 0 && S.systeemboringen) {
            const g0 = z.open0 + S.systeemMarge + S.montageplaatTussen / 2;
            positions = positions.map(pv => {
              const c = door.box.y + pv;
              const snapped = g0 + Math.round((c - g0) / S.systeemRaster) * S.systeemRaster;
              const np = snapped - door.box.y;
              return np >= S.potRand + S.potDia / 2 && np <= door.vLen - S.potRand - S.potDia / 2 ? np : pv;
            });
          }
          const hingeSide = hingeLeft ? sideL : sideR;
          for (const pv of positions) {
            const cu = hingeLeft ? S.potRand + S.potDia / 2 : door.uLen - S.potRand - S.potDia / 2;
            door.ops.push({ kind: 'boring', face: 'binnen', u: cu, v: pv, dia: S.potDia, diepte: S.potDiepte, naam: 'Scharnierpot' });
            if (S.potDeuvels) {
              const du = cu + (hingeLeft ? 9.5 : -9.5);
              for (const dv of [pv - 22.5, pv + 22.5]) door.ops.push({ kind: 'boring', face: 'binnen', u: du, v: dv, dia: 8, diepte: 11, naam: 'Scharnier deuvel' });
            }
            // Montageplaat op de zijwand, op dezelfde hoogte als de pot (alleen als de deur tegen een zijwand scharniert).
            const atSide = hingeLeft ? Math.abs(dx0 - frontX0) < 1 : Math.abs(dx0 + dw - frontX1) < 1;
            if (atSide) {
              const u0 = Dk - S.montageplaatVoor;
              // Twee gaten boven elkaar (evenwijdig met de rijboring van de legplankdragers), 32 mm uit elkaar, gecentreerd op het scharnier.
              for (const dv of [-S.montageplaatTussen / 2, S.montageplaatTussen / 2]) hingeSide.ops.push({ kind: 'boring', face: 'binnen', u: u0, v: sideV(door.box.y + pv) + dv, dia: S.montageplaatDia, diepte: S.montageplaatDiepte, naam: 'Montageplaat' });
            } else if (pv === positions[0]) {
              warnings.push('Een deur scharniert niet tegen een zijwand (bijvoorbeeld naast een blindpaneel): voorzie de montageplaten apart.');
            }
            count('Scharnier Blum (snelspan)');
            count('Montageplaat');
          }
          handleHoles(door, true, hingeLeft ? false : true);
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
      shelves(z, Number(s.legplanken) || 0);
    } else if (s.type === 'lade') {
      const n = Math.max(1, Number(s.lades) || 1);
      const b = S.blum[s.serie] ?? S.blum.LEGRABOX;
      const lt = (b.types ?? []).find(x => x.code === s.ladeType) ?? (b.types ?? []).find(x => x.code === 'M') ?? (b.types ?? [])[0];
      const ltName = `${s.serie}${lt ? ` ${lt.code}` : ''}`;
      const rugH = lt?.rugH ?? b.rugH;
      const lw = W - 2 * t;
      if (!nl) warnings.push('De kast is niet diep genoeg voor een ladegeleider.');
      // Met een greeplijst: boven elke lade een greepruimte; tussen twee lades een C-profiel, bovenaan een L-profiel.
      const gTop = greepTop(z);
      const fh = greeplijst ? (gTop - fy0) / n - gh : (fy1 - fy0 - (n - 1) * v) / n;
      if (fh < 60) warnings.push('De ladefronten worden te laag. Kies minder lades of een hoger vak.');
      let yy = fy0;
      for (let i = 0; i < n; i++) {
        const top = yy + fh;
        const f = front({ naam: n === 1 ? 'Ladefront' : `Ladefront ${i + 1}`, x0: frontX0, y0: yy, x1: frontX1, y1: top });
        handleHoles(f, false);
        if (greeplijst) addGreeplijst(i === n - 1 ? 'L' : 'C', top - t, i === n - 1 ? 'boven' : `lade ${i + 1}`);
        // Ladekast
        const openBottom = i === 0 ? z.open0 : greeplijst ? yy + t : yy - v / 2;
        if (nl) {
          const bodemD = nl - b.bodemD;
          add({ naam: `Ladebodem (${ltName})`, rol: 'lade', mat: 'lade', dikte: S.ladeBodemDikte, grain: 'u',
            box: { x: t + (lw - (lw - b.bodemB)) / 2, y: openBottom + b.gatHoogte, z: D - frontInset - bodemD - 5, w: lw - b.bodemB, h: S.ladeBodemDikte, d: bodemD },
            uLen: lw - b.bodemB, vLen: bodemD });
          const room = top - openBottom - b.gatHoogte - S.ladeBodemDikte;
          if (rugH > room) warnings.push(`Lade ${ltName} (${n === 1 ? 'ladefront' : `ladefront ${i + 1}`}) is te hoog voor de front: kies een lager ladetype of een hogere front.`);
          add({ naam: `Laderug (${ltName})`, rol: 'lade', mat: 'lade', dikte: S.ladeBodemDikte, grain: 'u',
            box: { x: t + b.rugB / 2, y: openBottom + b.gatHoogte + S.ladeBodemDikte, z: D - frontInset - bodemD - 5, w: lw - b.rugB, h: rugH, d: S.ladeBodemDikte },
            uLen: lw - b.rugB, vLen: rugH });
          for (const sd of sides) for (const g of b.gaten) {
            if (g < Dk) sd.ops.push({ kind: 'boring', face: 'binnen', u: Dk - g, v: sideV(openBottom + b.gatHoogte), dia: 5, diepte: 13, naam: `Ladegeleider ${s.serie}` });
          }
          count(`Lade ${ltName} NL ${nl}`);
        }
        yy = greeplijst ? top + gh : top + v;
      }
    } else if (s.type === 'open') {
      shelves(z, Number(s.legplanken) || 0);
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
    for (const e of ['u0', 'u1', 'v0', 'v1']) p.edgeDecor[e] = k.edgeDecor?.[p.id]?.[e] || edgeBaseDecor(k, S, p);
    const d = (S.decors ?? []).find(x => x.code === p.decor);
    p.kleur = d?.kleur ?? null;
  }

  // Afronden
  for (const p of parts) {
    p.uLen = r1(p.uLen);
    p.vLen = r1(p.vLen);
    for (const op of p.ops) for (const key of ['u', 'v', 'u1', 'u2', 'v1', 'v2', 'pos', 'w', 'h']) if (op[key] != null) op[key] = r1(op[key]);
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
  return p.mat === 'front' || p.rol === 'plint' ? (k.frontMateriaal || S.frontMateriaal || 'Melamine') : 'Melamine';
}

/** Standaarddecor van een onderdeel (zonder aanpassing per stuk). */
function partBaseDecor(k, S, p) {
  const dKorpus = k.decorKorpus || S.decorKorpus;
  if (p.mat === 'front' || p.rol === 'plint') return k.decorFront || S.decorFront;
  if (p.mat === 'rug') return k.decorRug || dKorpus;
  return dKorpus;
}

/** Standaarddecor van de band: zoals het paneel, behalve de band op het korpus (keuze bij de kast). */
function edgeBaseDecor(k, S, p) {
  const decor = p.decor ?? partBaseDecor(k, S, p);
  if (p.mat !== 'korpus' || p.rol === 'plint') return decor;
  if (k.bandKorpusDecor === 'front') return k.decorFront || S.decorFront;
  if (k.bandKorpusDecor && k.bandKorpusDecor !== 'korpus') return k.bandKorpusDecor;
  return decor;
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
