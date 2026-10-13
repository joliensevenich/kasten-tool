'use strict';
// MPR-export voor woodWOP (HOMAG). Eén programma per paneel en per zijde, in het klassieke tekstformaat
// (MPR 4.0), dat woodWOP 7/8 inleest. Schrijfwijze volgens de woodWOP-bestandsbeschrijving; gereedschap
// voor frezen uit het voorbeeldprogramma van de P110 (GERY.mprx: frees 101 voor kamers, 130 voor contouren).
//
// Ligging op de machine: X langs de nerf (lengte), Y dwars, Z omhoog; nulpunt linksvoor, zijde A naar boven.
// Zijde A is de zijde met de meeste bewerkingen (binnenkant van een zijwand of deur, bovenkant van een bodem).

const MPR_DEFAULTS = {
  freesKlein: '156',        // Ø8: led-groeven en kleine kamers
  freesContour: '130',      // wisselmesfrees Ø18: uitsparingen
  groefMethode: 'zaag',     // 'zaag' (Nuten) of 'frees' (Tasche)
  groefTool: '1300',        // sponningzaag
  boorModusBlind: 'LS',     // langzaam-snel tot diepte
  boorModusDoor: 'LSL',     // langzaam-snel-langzaam doorgaand
  doorExtra: 0,             // extra diepte bij doorgaand boren
};

// Gereedschap van de HOMAG P110 (gereedschapsbeheer, foto's van 13-10-2026).
// soort: frees, boorV (verticaal boorblok), boorH (horizontaal, met richting), boorL (lange doorgaande boor), zaag.
// dia = werkelijke diameter (2 × radius G1), lengte = bruikbare lengte (G3.1).
const P110_TOOLS = [
  { nr: '130', naam: 'Wisselmesfrees Ø18 rechts', soort: 'frees', dia: 17.94, lengte: 50 },
  { nr: '131', naam: 'Frees Ø20 rechts', soort: 'frees', dia: 19, lengte: 75 },
  { nr: '132', naam: 'Frees Ø13 rechts', soort: 'frees', dia: 13, lengte: 44 },
  { nr: '133', naam: 'Frees Ø13 rechts, negatief snijvlak', soort: 'frees', dia: 11.55, lengte: 44 },
  { nr: '139', naam: 'Frees Ø6 rechts', soort: 'frees', dia: 4.34, lengte: 21 },
  { nr: '150', naam: 'Wisselmesfrees Ø18 links', soort: 'frees', dia: 17.94, lengte: 50 },
  { nr: '152', naam: 'Diamantfrees Ø25 rechts', soort: 'frees', dia: 25, lengte: 50 },
  { nr: '154', naam: 'Krukfrees', soort: 'frees', dia: 15.2, lengte: 65 },
  { nr: '155', naam: 'Frees Ø3 rechts', soort: 'frees', dia: 4.03, lengte: 12 },
  { nr: '156', naam: 'Frees Ø8 rechts', soort: 'frees', dia: 7.71, lengte: 31 },
  { nr: '157', naam: 'Slotkastfrees Ø16', soort: 'frees', dia: 17.65, lengte: 95 },
  { nr: '158', naam: 'Doorgaande boor Ø8', soort: 'boorL', dia: 8, lengte: 65 },
  { nr: '159', naam: 'Doorgaande boor Ø12', soort: 'boorL', dia: 12, lengte: 120 },
  { nr: '160', naam: 'Doorgaande boor Ø10', soort: 'boorL', dia: 10, lengte: 85 },
  { nr: '180', naam: 'Hoekfrees 60°', soort: 'frees', dia: 0.2, lengte: 30 },
  { nr: '181', naam: 'Hoekfrees 45°', soort: 'frees', dia: 0.2, lengte: 30 },
  { nr: '200', naam: 'Trespafrees Ø18 rechts', soort: 'frees', dia: 19.7, lengte: 22 },
  { nr: '201', naam: 'Clamex-zaag Ø100,4', soort: 'zaag', dia: 100.4, lengte: 30 },
  { nr: '202', naam: 'Clamex-frees', soort: 'frees', dia: 9, lengte: 20 },
  { nr: '203', naam: 'Lamello-zaag Ø100', soort: 'zaag', dia: 100, lengte: 3.9 },
  { nr: '230', naam: 'Afrondfrees', soort: 'frees', dia: 40.3, lengte: 30 },
  { nr: '300', naam: 'Zaagblad Ø300', soort: 'zaag', dia: 300, lengte: 3.4 },
  { nr: '305', naam: 'Vlakfrees', soort: 'frees', dia: 120, lengte: 20 },
  { nr: '1300', naam: 'Sponningzaag 5 mm', soort: 'zaag', dia: 120, lengte: 25 },
  { nr: '1001', naam: 'Verticale boor Ø8', soort: 'boorV', dia: 8, lengte: 30 },
  { nr: '1002', naam: 'Verticale boor Ø4', soort: 'boorV', dia: 4, lengte: 30 },
  { nr: '1003', naam: 'Verticale boor Ø10', soort: 'boorV', dia: 10, lengte: 30 },
  { nr: '1004', naam: 'Verticale boor Ø8', soort: 'boorV', dia: 8, lengte: 30 },
  { nr: '1005', naam: 'Verticale boor Ø8', soort: 'boorV', dia: 8, lengte: 30 },
  { nr: '1006', naam: 'Verticale boor Ø35', soort: 'boorV', dia: 35, lengte: 15 },
  ...['1007', '1008', '1009', '1010', '1011', '1012'].map(nr => ({ nr, naam: 'Verticale boor Ø5', soort: 'boorV', dia: 5, lengte: 30 })),
  { nr: '1111', naam: 'Horizontale boor Ø8 X+', soort: 'boorH', dia: 8, lengte: 40, richting: 'XP' },
  { nr: '1113', naam: 'Horizontale boor Ø8 X+', soort: 'boorH', dia: 8, lengte: 40, richting: 'XP' },
  { nr: '1112', naam: 'Horizontale boor Ø8 X−', soort: 'boorH', dia: 8, lengte: 40, richting: 'XM' },
  { nr: '1114', naam: 'Horizontale boor Ø8 X−', soort: 'boorH', dia: 8, lengte: 40, richting: 'XM' },
  { nr: '1161', naam: 'Horizontale boor Ø8 Y−', soort: 'boorH', dia: 8, lengte: 40, richting: 'YM' },
  { nr: '1162', naam: 'Horizontale boor Ø8 Y+', soort: 'boorH', dia: 8, lengte: 40, richting: 'YP' },
];

/** Controleert of een boring met het gereedschap van de machine kan; geeft een omschrijving van het probleem, of null. */
function checkDrill(tools, { dia, diepte, horizontaal, richting, door }) {
  const near = t => Math.abs(t.dia - dia) < 0.3;
  if (horizontaal) {
    const fit = tools.filter(t => t.soort === 'boorH' && near(t));
    if (!fit.length) return `horizontale boring Ø${dia}: geen horizontale boor met die diameter`;
    if (richting && !fit.some(t => t.richting === richting)) return `horizontale boring Ø${dia} in richting ${richting}: geen boor in die richting`;
    if (Math.max(...fit.map(t => t.lengte)) < diepte) return `horizontale boring Ø${dia} × ${diepte}: boor te kort (${Math.max(...fit.map(t => t.lengte))} mm)`;
    return null;
  }
  const fit = tools.filter(t => (t.soort === 'boorV' || t.soort === 'boorL') && near(t));
  if (!fit.length) {
    // Grotere gaten kunnen met een frees (rondfrezen).
    if (tools.some(t => t.soort === 'frees' && t.dia < dia - 0.5)) return null;
    return `boring Ø${dia}: geen boor met die diameter`;
  }
  if (Math.max(...fit.map(t => t.lengte)) < diepte - 0.01) return `boring Ø${dia} × ${diepte}: boor te kort (${Math.max(...fit.map(t => t.lengte))} mm)`;
  return null;
}

const f3 = n => String(Math.round(Number(n) * 1000) / 1000);

/** Hoe een paneel op de machine ligt: welke zijde boven, en (u,v) → (X,Y). */
function mprFrame(p) {
  const faceOps = side => p.ops.filter(o => o.face === side && !o.doorgaand && o.edge == null).length;
  if (p.rol === 'zijwand') {
    const L = p.vLen, B = p.uLen;
    return p.left
      ? { up: 'binnen', down: 'buiten', L, B, map: (u, v) => [v, u] }
      : { up: 'binnen', down: 'buiten', L, B, map: (u, v) => [v, B - u] };
  }
  if (p.grain === 'u') {
    const L = p.uLen, B = p.vLen;
    if (p.rol === 'plint') return { up: 'binnen', down: 'voor', L, B, map: (u, v) => [u, B - v] };
    return faceOps('onder') > faceOps('boven')
      ? { up: 'onder', down: 'boven', L, B, map: (u, v) => [u, v] }
      : { up: 'boven', down: 'onder', L, B, map: (u, v) => [u, B - v] };
  }
  // Fronten en rug: binnen- of achterkant naar boven.
  const L = p.vLen, B = p.uLen;
  return { up: p.rol === 'rug' ? 'achter' : 'binnen', down: p.rol === 'rug' ? 'voor' : 'voor', L, B, map: (u, v) => [v, u] };
}

function mprHeader(L, B, D) {
  return [
    '[H', 'VERSION="4.0 Alpha"', 'HP="1"', 'IN="0"', 'GX="0"', 'BFS="1"', 'GY="1"', 'GXY="0"', 'UP="0"', 'FM="1"', 'FW="800"',
    'HS="0"', 'MAT="HOMAG"', 'DN="STANDARD"', 'INCH="0"', 'VIEW="NOMIRROR"', 'ANZ="1"', 'BES="0"', 'ENT="0"',
    `_BSX=${f3(L)}`, `_BSY=${f3(B)}`, `_BSZ=${f3(D)}`, '_FNX=0', '_FNY=0', '_RNX=0', '_RNY=0', '_RNZ=0', `_RX=${f3(L)}`, `_RY=${f3(B)}`,
    '',
    '[001', `L="${f3(L)}"`, 'KM="Laenge in X"', `B="${f3(B)}"`, 'KM="Breite in Y"', `D="${f3(D)}"`, 'KM="Dicke in Z"',
    '',
    '<100 \\WerkStck\\', 'LA="L"', 'BR="B"', 'DI="D"', 'FNX="0"', 'FNY="0"', 'AX="0"', 'AY="0"',
    '',
  ].join('\r\n');
}

const block = (head, fields) => [head, ...Object.entries(fields).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}="${v}"`), ''].join('\r\n');

/**
 * MPR-programma's voor één paneel: zijde A, en zijde B als er bewerkingen op de andere zijde staan.
 * Geeft { files: [{ name, text }], skipped: [omschrijving] }.
 */
function mprForPart(p, M = MPR_DEFAULTS, baseName = p.id) {
  const fr = mprFrame(p);
  const D = p.dikte;
  const skipped = [];
  const sides = { A: [], B: [] };

  // Zijde B: gespiegeld in Y (paneel om de X-as gekeerd).
  const mapB = (u, v) => { const [x, y] = fr.map(u, v); return [x, fr.B - y]; };

  for (const op of p.ops) {
    if (op.kind === 'clamex') { skipped.push(`Clamex (${op.edge ? 'in de kant' : 'in het vlak'})`); continue; }
    // Doorgaande boringen (ook als ze zo diep zijn als de plaat) kunnen altijd van zijde A.
    const through = op.doorgaand || (op.kind === 'boring' && op.diepte >= D);
    const onB = op.edge == null && op.face === fr.down && !through;
    const map = onB ? mapB : fr.map;
    const out = onB ? sides.B : sides.A;

    if (op.edge) {
      // Horizontale boring in een kant.
      const pt = op.edge === 'u0' ? [0, op.pos] : op.edge === 'u1' ? [p.uLen, op.pos] : op.edge === 'v0' ? [op.pos, 0] : [op.pos, p.vLen];
      const [x, y] = fr.map(pt[0], pt[1]);
      const dir = Math.abs(x) < 0.01 ? 'XP' : Math.abs(x - fr.L) < 0.01 ? 'XM' : Math.abs(y) < 0.01 ? 'YP' : 'YM';
      const prob = checkDrill(M.tools ?? P110_TOOLS, { dia: op.dia, diepte: op.diepte, horizontaal: true, richting: dir });
      if (prob) skipped.push(`Let op: ${prob}`);
      out.push(block('<103 \\BohrHoriz\\', { XA: f3(x), YA: f3(y), ZA: f3(D / 2), BM: dir, TI: f3(op.diepte), DU: f3(op.dia), AN: '1', MI: '0', AB: '32', KO: '00' }));
      continue;
    }
    if (op.kind === 'boring') {
      const [x, y] = map(op.u, op.v);
      const prob = checkDrill(M.tools ?? P110_TOOLS, { dia: op.dia, diepte: through ? D + Number(M.doorExtra || 0) : op.diepte, door: through });
      if (prob) skipped.push(`Let op: ${prob}`);
      out.push(block('<102 \\BohrVert\\', {
        XA: f3(x), YA: f3(y), BM: through ? M.boorModusDoor : M.boorModusBlind,
        TI: f3(through ? D + Number(M.doorExtra || 0) : op.diepte), DU: f3(op.dia), AN: '1', MI: '0', AB: '32', WI: '0', S_: '2', KO: '00',
      }));
    } else if (op.kind === 'groef') {
      const [xa, ya] = map(op.u1, op.v1);
      const [xe, ye] = map(op.u2, op.v2);
      // Led-groeven (en andere gestopte groeven) altijd frezen.
      if (M.groefMethode === 'frees' || op.frees) {
        const horiz = Math.abs(ye - ya) < Math.abs(xe - xa);
        out.push(block('<112 \\Tasche\\', {
          XA: f3((xa + xe) / 2), YA: f3((ya + ye) / 2), LA: f3(horiz ? Math.abs(xe - xa) : op.breedte), BR: f3(horiz ? op.breedte : Math.abs(ye - ya)),
          RD: '0', WI: '0', TI: f3(op.diepte), ZT: '0', XY: '80', T_: M.freesKlein, F_: 'STANDARD', DS: '0', KO: '00',
        }));
      } else {
        out.push(block('<109 \\Nuten\\', {
          XA: f3(xa), YA: f3(ya), XE: f3(xe), YE: f3(ye), AN: '0', NB: f3(op.breedte), RK: '0', EM: 'MOD0', TI: f3(op.diepte), MN: 'GL',
          OP: '1', XY: '100', T_: M.groefTool, F_: 'STANDARD', KO: '00',
        }));
      }
    } else if (op.kind === 'uitsparing') {
      // Doorgaande uitsparing aan de rand: kamer die 10 mm buiten het paneel uitloopt, zodat de hoek schoon vrijkomt.
      const corners = [map(op.u, op.v), map(op.u + op.w, op.v + op.h)];
      let x0 = Math.min(corners[0][0], corners[1][0]), x1 = Math.max(corners[0][0], corners[1][0]);
      let y0 = Math.min(corners[0][1], corners[1][1]), y1 = Math.max(corners[0][1], corners[1][1]);
      const ext = 10;
      if (x0 < 0.01) x0 -= ext; if (x1 > fr.L - 0.01) x1 += ext;
      if (y0 < 0.01) y0 -= ext; if (y1 > fr.B - 0.01) y1 += ext;
      out.push(block('<112 \\Tasche\\', {
        XA: f3((x0 + x1) / 2), YA: f3((y0 + y1) / 2), LA: f3(x1 - x0), BR: f3(y1 - y0), RD: '0', WI: '0', TI: f3(D + 1),
        ZT: '0', XY: '80', T_: M.freesContour, F_: 'STANDARD', DS: '0', KO: '00',
      }));
    }
  }

  const files = [];
  const make = (ops, suffix) => files.push({ name: `${baseName}${suffix}.mpr`, text: mprHeader(fr.L, fr.B, D) + '\r\n' + ops.join('\r\n') + '!\r\n' });
  make(sides.A, sides.B.length ? '_A' : '');
  if (sides.B.length) make(sides.B, '_B');
  return { files, skipped, frame: fr };
}

/** Alle MPR-bestanden van een project als zip, met een overzicht van wat nog manueel moet. */
function projectMprZip(project, S, M) {
  const zip = new ZipWriter();
  const notes = [];
  let count = 0;
  for (const k of project.kasten) {
    const res = buildCabinet(k, S);
    if (res.error) { notes.push(`${k.code}: ${res.error}`); continue; }
    for (const p of res.parts) {
      if (!p.ops.length && p.rol !== 'zijwand') continue;   // panelen zonder bewerking hoeven niet op de CNC
      const base = safeName(`${k.code}_${p.id}`);
      const { files, skipped } = mprForPart(p, M, base);
      for (const f of files) { zip.add(`${safeName(k.code)}/${f.name}`, f.text); count++; }
      if (skipped.length) {
        const n = {};
        for (const s of skipped) n[s] = (n[s] ?? 0) + 1;
        const missing = Object.entries(n).filter(([s]) => !s.startsWith('Let op'));
        const checks = Object.entries(n).filter(([s]) => s.startsWith('Let op'));
        if (missing.length) notes.push(`${k.code} ${p.naam}: ${missing.map(([s, c]) => `${c}× ${s}`).join(', ')} niet in het MPR-bestand (manueel toevoegen).`);
        if (checks.length) notes.push(`${k.code} ${p.naam}: ${checks.map(([s, c]) => `${c}× ${s.replace('Let op: ', '')}`).join(', ')}.`);
      }
    }
  }
  const readme = [
    `MPR-bestanden voor ${project.naam}`,
    `Gemaakt met de Kasten tool op ${new Date().toLocaleString('nl-BE')}.`,
    '',
    'Eén bestand per paneel. Zijn er bewerkingen aan twee zijden, dan zijn er twee bestanden: _A (eerst) en _B (paneel gekeerd om de lange kant).',
    'Ligging: X langs de lengte (nerf), Y dwars, nulpunt linksvoor, zijde A naar boven.',
    '',
    'Controleer elk programma eerst in de simulatie van woodWOP.',
    '',
    ...(notes.length ? ['Nog manueel:', ...notes] : ['Alle bewerkingen staan in de bestanden.']),
  ].join('\r\n');
  zip.add('LEESMIJ.txt', readme);
  return { blob: zip.finalize('application/zip'), count, notes };
}
