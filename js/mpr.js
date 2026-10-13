'use strict';
// MPR-export voor woodWOP (HOMAG). Eén programma per paneel en per zijde, in het klassieke tekstformaat
// (MPR 4.0), dat woodWOP 7/8 inleest. Schrijfwijze volgens de woodWOP-bestandsbeschrijving; gereedschap
// voor frezen uit het voorbeeldprogramma van de P110 (GERY.mprx: frees 101 voor kamers, 130 voor contouren).
//
// Ligging op de machine: X langs de nerf (lengte), Y dwars, Z omhoog; nulpunt linksvoor, zijde A naar boven.
// Zijde A is de zijde met de meeste bewerkingen (binnenkant van een zijwand of deur, bovenkant van een bodem).

const MPR_DEFAULTS = {
  freesKlein: '101',        // kamers en uitsparingen
  freesContour: '130',
  groefMethode: 'zaag',     // 'zaag' (Nuten) of 'frees' (Tasche)
  groefTool: '',            // leeg: woodWOP kiest zelf
  boorModusBlind: 'LS',     // langzaam-snel tot diepte
  boorModusDoor: 'LSL',     // langzaam-snel-langzaam doorgaand
  doorExtra: 0,             // extra diepte bij doorgaand boren
};

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
      out.push(block('<103 \\BohrHoriz\\', { XA: f3(x), YA: f3(y), ZA: f3(D / 2), BM: dir, TI: f3(op.diepte), DU: f3(op.dia), AN: '1', MI: '0', AB: '32', KO: '00' }));
      continue;
    }
    if (op.kind === 'boring') {
      const [x, y] = map(op.u, op.v);
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
        notes.push(`${k.code} ${p.naam}: ${Object.entries(n).map(([s, c]) => `${c}× ${s}`).join(', ')} niet in het MPR-bestand (manueel toevoegen).`);
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
