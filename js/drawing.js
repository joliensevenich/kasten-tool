'use strict';
// Technische tekening (PDF, A4 liggend): per kast een overzicht met aanzichten en hoofdmaten,
// daarna per onderdeel een werktekening zoals het stuk op de P110 ligt (X/Y van het MPR-programma),
// met zijde A en zijde B apart en alle bewerkingen met maatlijnen vanaf het nulpunt.

const PAGE = { w: 297, h: 210, m: 10 };
const r1d = x => Math.round(x * 10) / 10;
const fmt = x => String(r1d(x)).replace('.', ',');

/** Bewerkingen van een onderdeel in machinecoördinaten, per zijde (zelfde omrekening als mprForPart). */
function partMachining(p) {
  const fr = mprFrame(p);
  const D = p.dikte;
  const mapB = fr.mapB ?? ((u, v) => { const [x, y] = fr.map(u, v); return [x, fr.B - y]; });
  const sides = { A: [], B: [] };
  const edgePt = op => op.edge === 'u0' ? [0, op.pos] : op.edge === 'u1' ? [p.uLen, op.pos] : op.edge === 'v0' ? [op.pos, 0] : [op.pos, p.vLen];
  const side = (x, y) => Math.abs(x) < 0.01 ? 'XP' : Math.abs(x - fr.L) < 0.01 ? 'XM' : Math.abs(y) < 0.01 ? 'YP' : 'YM';
  for (const op of p.ops) {
    if (op.kind === 'clamex') {
      if (op.edge) { const [x, y] = fr.map(...edgePt(op)); sides.A.push({ t: 'clamexKant', x, y, dir: side(x, y) }); }
      else { const onB = op.face === fr.down; const [x, y] = (onB ? mapB : fr.map)(op.u, op.v); (onB ? sides.B : sides.A).push({ t: 'clamex', x, y }); }
      continue;
    }
    if (op.kind === 'rondgat') { const [x, y] = fr.map(op.u, op.v); sides.A.push({ t: 'gat', x, y, dia: op.dia, diepte: D, door: true, naam: op.naam }); continue; }
    const through = op.doorgaand || (op.kind === 'boring' && op.diepte >= D);
    const onB = op.edge == null && op.face === fr.down && !through;
    const map = onB ? mapB : fr.map;
    const out = onB ? sides.B : sides.A;
    if (op.edge) {
      const [x, y] = fr.map(...edgePt(op));
      out.push({ t: 'kantgat', x, y, dia: op.dia, diepte: op.diepte, dir: side(x, y), naam: op.naam });
    } else if (op.kind === 'boring') {
      const [x, y] = map(op.u, op.v);
      out.push({ t: 'gat', x, y, dia: op.dia, diepte: through ? D : op.diepte, door: through, naam: op.naam });
    } else if (op.kind === 'groef') {
      const [x1, y1] = map(op.u1, op.v1), [x2, y2] = map(op.u2, op.v2);
      out.push({ t: 'groef', x1, y1, x2, y2, breedte: op.breedte, diepte: op.diepte, naam: op.naam });
    } else if (op.kind === 'uitsparing') {
      const a = map(op.u, op.v), b = map(op.u + op.w, op.v + op.h);
      out.push({ t: 'kamer', x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]), diepte: D, naam: op.naam });
    }
  }
  // Kantenband per machinezijde.
  const bands = [];
  const mids = { u0: [0, p.vLen / 2], u1: [p.uLen, p.vLen / 2], v0: [p.uLen / 2, 0], v1: [p.uLen / 2, p.vLen] };
  for (const e of ['u0', 'u1', 'v0', 'v1']) {
    if (!p.edges?.[e]) continue;
    const [x, y] = fr.map(...mids[e]);
    bands.push({ dir: side(x, y), dik: p.edges[e], decor: p.edgeDecor?.[e] ?? '' });
  }
  const shape = p.shape ? p.shape.map(([u, v]) => fr.map(u, v)) : null;
  if (shape) sides.A.push({ t: 'vorm' });
  return { L: fr.L, B: fr.B, D, ops: sides, bands, up: fr.up, down: fr.down, shape };
}

/** Ordinaatmaten langs één rand: waarden met tikjes en gedraaide tekst, op twee rijen als ze te dicht staan. */
function ordinates(doc, values, toPage, along, base, outward) {
  const vals = [...new Set(values.map(v => r1d(v)))].sort((a, b) => a - b);
  doc.setFontSize(6);
  // Tot vier rijen: een waarde gaat naar de eerste rij waar de vorige tekst ver genoeg weg staat.
  const lastPos = [-1e9, -1e9, -1e9, -1e9];
  for (const v of vals) {
    const pos = toPage(v);
    let row = lastPos.findIndex(lp => Math.abs(pos - lp) >= 2.6);
    if (row < 0) row = lastPos.indexOf(Math.min(...lastPos));
    lastPos[row] = pos;
    const off = outward * (4 + row * 9);
    if (along === 'x') {
      doc.line(pos, base, pos, base + off * 0.35);
      doc.text(fmt(v), pos + 1, base + off + (outward > 0 ? 6 : 0), { angle: 90 });
    } else {
      doc.line(base, pos, base + off * 0.35, pos);
      doc.text(fmt(v), base + off - (outward < 0 ? 6 : 0), pos + 1);
    }
  }
}

/** Maatlijn met pijlen en tekst in het midden. */
function dimLine(doc, x1, y1, x2, y2, label) {
  doc.setLineWidth(0.15);
  doc.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 1.6;
  for (const [px, py, d] of [[x1, y1, 1], [x2, y2, -1]]) {
    doc.line(px, py, px + d * s * Math.cos(a + 0.35), py + d * s * Math.sin(a + 0.35));
    doc.line(px, py, px + d * s * Math.cos(a - 0.35), py + d * s * Math.sin(a - 0.35));
  }
  doc.setFontSize(8);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) doc.text(label, mx, my - 1, { align: 'center' });
  else doc.text(label, mx - 1, my, { angle: 90, align: 'center' });
}

function titleBlock(doc, lines, right) {
  const { w, h, m } = PAGE;
  doc.setLineWidth(0.3);
  doc.rect(m, m, w - 2 * m, h - 2 * m);
  doc.line(m, h - m - 14, w - m, h - m - 14);
  doc.setFontSize(11);
  doc.text(lines[0], m + 3, h - m - 8);
  doc.setFontSize(8);
  doc.text(lines[1] ?? '', m + 3, h - m - 3);
  doc.text(right ?? '', w - m - 3, h - m - 3, { align: 'right' });
}

/** Werktekening van één zijde van een onderdeel. */
function drawPartSide(doc, info, sideKey, meta) {
  const { w, h, m } = PAGE;
  const ops = info.ops[sideKey];
  const L = info.L, B = info.B;
  // Tekenvak: ruimte voor maten links/onder en een legende rechts.
  const area = { x0: m + 26, y0: m + 22, x1: w - m - 72, y1: h - m - 14 - 30 };
  const s = Math.min((area.x1 - area.x0) / L, (area.y1 - area.y0) / B);
  const ox = area.x0, oy = area.y0 + B * s;        // nulpunt (X=0, Y=0) linksonder, Y naar boven zoals in woodWOP
  const X = x => ox + x * s, Y = y => oy - y * s;

  // Paneel en kantenband.
  doc.setLineWidth(0.4);
  if (info.shape) {
    // Schuine kast: zaagmaat gestreept, de werkelijke vorm vol (de schuine kant wordt gefreesd).
    doc.setLineDashPattern([2, 1.5], 0); doc.setLineWidth(0.15); doc.rect(X(0), Y(B), L * s, B * s); doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.4);
    const pts = info.shape.map(([x, y]) => [X(x), Y(y)]);
    for (let i = 0; i < pts.length; i++) doc.line(...pts[i], ...pts[(i + 1) % pts.length]);
  } else doc.rect(X(0), Y(B), L * s, B * s);
  doc.setLineWidth(1.2);
  doc.setDrawColor(224, 138, 30);
  for (const bd of info.bands) {
    const o = 0.9;
    if (bd.dir === 'XP') doc.line(X(0) - o, Y(0), X(0) - o, Y(B));
    if (bd.dir === 'XM') doc.line(X(L) + o, Y(0), X(L) + o, Y(B));
    if (bd.dir === 'YP') doc.line(X(0), Y(0) + o, X(L), Y(0) + o);
    if (bd.dir === 'YM') doc.line(X(0), Y(B) - o, X(L), Y(B) - o);
  }
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  const xs = [0, L], ys = [0, B];
  const legend = new Map();
  const note = (key, text) => legend.set(key, { text, n: (legend.get(key)?.n ?? 0) + 1 });
  for (const op of ops) {
    if (op.t === 'gat') {
      const r = Math.max(op.dia / 2 * s, 0.5);
      if (op.door) { doc.setFillColor(60); doc.circle(X(op.x), Y(op.y), r, 'FD'); } else doc.circle(X(op.x), Y(op.y), r);
      doc.line(X(op.x) - r - 0.6, Y(op.y), X(op.x) + r + 0.6, Y(op.y));
      doc.line(X(op.x), Y(op.y) - r - 0.6, X(op.x), Y(op.y) + r + 0.6);
      xs.push(op.x); ys.push(op.y);
      note(`gat${op.dia}x${op.diepte}${op.door}`, `${op.door ? 'Doorgaand' : 'Boring'} Ø${fmt(op.dia)}${op.door ? '' : ` × ${fmt(op.diepte)}`} (${op.naam ?? ''})`);
    } else if (op.t === 'kantgat') {
      const len = op.diepte * s, r = op.dia / 2 * s;
      const [dx, dy] = op.dir === 'XP' ? [1, 0] : op.dir === 'XM' ? [-1, 0] : op.dir === 'YP' ? [0, -1] : [0, 1];
      const px = X(op.x), py = Y(op.y);
      if (dx) doc.rect(Math.min(px, px + dx * len), py - r, len, 2 * r);
      else doc.rect(px - r, Math.min(py, py + dy * len), 2 * r, len);
      if (op.dir === 'XP' || op.dir === 'XM') ys.push(op.y); else xs.push(op.x);
      note(`kant${op.dia}x${op.diepte}`, `Horizontaal in de kant Ø${fmt(op.dia)} × ${fmt(op.diepte)} (${op.naam ?? ''})`);
    } else if (op.t === 'groef') {
      const horiz = Math.abs(op.x2 - op.x1) >= Math.abs(op.y2 - op.y1);
      doc.setFillColor(205);
      if (horiz) {
        doc.rect(X(Math.min(op.x1, op.x2)), Y(op.y1 + op.breedte / 2), Math.abs(op.x2 - op.x1) * s, op.breedte * s, 'FD');
        ys.push(op.y1 - op.breedte / 2, op.y1 + op.breedte / 2); xs.push(op.x1, op.x2);
      } else {
        doc.rect(X(op.x1 - op.breedte / 2), Y(Math.max(op.y1, op.y2)), op.breedte * s, Math.abs(op.y2 - op.y1) * s, 'FD');
        xs.push(op.x1 - op.breedte / 2, op.x1 + op.breedte / 2); ys.push(op.y1, op.y2);
      }
      note(`groef${op.breedte}x${op.diepte}`, `Groef ${fmt(op.breedte)} breed × ${fmt(op.diepte)} diep (${op.naam ?? ''})`);
    } else if (op.t === 'kamer') {
      doc.setFillColor(150);
      doc.rect(X(op.x0), Y(op.y1), (op.x1 - op.x0) * s, (op.y1 - op.y0) * s, 'FD');
      xs.push(op.x0, op.x1); ys.push(op.y0, op.y1);
      note('kamer', `Uitsparing doorgaand (${op.naam ?? ''})`);
    } else if (op.t === 'vorm') {
      for (const [x, y] of info.shape) { xs.push(x); ys.push(y); }
      note('vorm', 'Schuine kant: zagen op contour (zaag 300) door de volle dikte; gestreept = zaagmaat');
    } else if (op.t === 'clamex') {
      doc.setFillColor(80, 140, 220);
      doc.roundedRect(X(op.x) - 25 * s, Y(op.y) - 4 * s, 50 * s, 8 * s, 1, 1, 'FD');
      xs.push(op.x); ys.push(op.y);
      note('clamex', 'Clamex P-14 in het vlak (frees 202)');
    } else if (op.t === 'clamexKant') {
      doc.setFillColor(80, 140, 220);
      const px = X(op.x), py = Y(op.y), q = 2.2;
      if (op.dir === 'XP') doc.triangle(px, py - q, px, py + q, px + q * 1.4, py, 'FD');
      if (op.dir === 'XM') doc.triangle(px, py - q, px, py + q, px - q * 1.4, py, 'FD');
      if (op.dir === 'YP') doc.triangle(px - q, py, px + q, py, px, py - q * 1.4, 'FD');
      if (op.dir === 'YM') doc.triangle(px - q, py, px + q, py, px, py + q * 1.4, 'FD');
      if (op.dir === 'XP' || op.dir === 'XM') ys.push(op.y); else xs.push(op.x);
      note('clamexKant', 'Clamex P-14 in de kant (zaag 201)');
    }
  }
  doc.setFillColor(255);

  // Maatlijnen: ordinaten onder (X) en links (Y), totaalmaten boven en rechts.
  doc.setLineWidth(0.12);
  ordinates(doc, xs, X, 'x', Y(0) + 1, 1);
  ordinates(doc, ys, Y, 'y', X(0) - 1, -1);
  dimLine(doc, X(0), Y(B) - 6, X(L), Y(B) - 6, `${fmt(L)}`);
  dimLine(doc, X(L) + 6, Y(0), X(L) + 6, Y(B), `${fmt(B)}`);
  doc.setFontSize(7);
  doc.text('X', X(L) + 2, Y(0) + 3.5);
  doc.text('Y', X(0) - 3.5, Y(B) - 2);
  doc.text('0', X(0) - 2.5, Y(0) + 3);

  // Legende rechts.
  let ly = m + 26;
  const lx = w - m - 56;
  doc.setFontSize(9);
  doc.text(`Zijde ${sideKey} (${sideKey === 'A' ? info.up : info.down} boven)`, lx, ly);
  ly += 5;
  doc.setFontSize(7);
  for (const { text, n } of legend.values()) {
    const lines = doc.splitTextToSize(`${n}× ${text}`, 55);
    doc.text(lines, lx, ly);
    ly += lines.length * 3.2 + 1;
  }
  if (sideKey === 'A' && info.bands.length) {
    ly += 2;
    doc.setFontSize(8);
    doc.text('Kantenband', lx, ly); ly += 4;
    doc.setFontSize(7);
    const names = { XP: 'X = 0', XM: `X = ${fmt(L)}`, YP: 'Y = 0', YM: `Y = ${fmt(B)}` };
    for (const bd of info.bands) { doc.text(`${names[bd.dir]}: ${bd.dik} mm ${bd.decor}`, lx, ly); ly += 3.5; }
  }
  titleBlock(doc, [`${meta.kast} · ${meta.naam} · zijde ${sideKey}`, `${meta.project} · ${fmt(L)} × ${fmt(B)} × ${fmt(info.D)} mm · ${meta.materiaal}`],
    `${meta.mpr}${sideKey === 'B' ? ' (zijde B)' : ''} · ${meta.datum}`);
}

/** Overzicht van een kast: vooraanzicht, zijaanzicht (doorsnede) en bovenaanzicht met hoofdmaten. */
function drawCabinetOverview(doc, k, res, meta) {
  const { w, h, m } = PAGE;
  const W = Number(k.breedte), H = Number(k.hoogte), D = Number(k.diepte);
  const all = res.parts;
  const flat = all.filter(p => !p.tilt);          // gekantelde top niet meetellen voor de buitenmaten
  const minY = Math.min(0, ...flat.map(p => p.box.y)), maxY = Math.max(H, ...flat.map(p => p.box.y + p.box.h));
  const minX = Math.min(0, ...flat.map(p => p.box.x)), maxX = Math.max(W, ...flat.map(p => p.box.x + p.box.w));
  const maxZ = Math.max(D, ...flat.map(p => p.box.z + p.box.d));
  const totW = maxX - minX, totH = maxY - minY;
  // Vooraanzicht, zijaanzicht en bovenaanzicht naast elkaar; rechts blijft plaats voor de lijst.
  const s = Math.min((w - 2 * m - 80 - 75) / (2 * totW + maxZ), (h - 2 * m - 14 - 40) / Math.max(totH, maxZ));
  // Vooraanzicht
  const fx = m + 22 - minX * s, fy = m + 18 + maxY * s;
  const FX = x => fx + x * s, FY = y => fy - y * s;
  doc.setLineWidth(0.2);
  const draw = (p, rx, ry, rw, rh, fill) => { if (fill) { doc.setFillColor(...fill); doc.rect(rx, ry, rw, rh, 'FD'); } else doc.rect(rx, ry, rw, rh); };
  // Werkelijke omtrek van een stuk in een aanzicht: vorm (schuine kast) of gekantelde top; anders null (rechthoek).
  const poly = (p, view) => {
    const b = p.box, side = p.rol === 'zijwand' || p.rol === 'stijl';
    if (p.shape && view === 'voor' && !side) return p.shape.map(([u, v]) => [b.x + u, b.y + v]);
    if (p.shape && view === 'zij' && side) return p.shape.map(([u, v]) => [b.z + u, b.y + v]);
    const tz = p.tilt?.z, tx = p.tilt?.x;
    if ((tz && view === 'voor') || (tx && view === 'zij')) {
      const a = tz ?? -tx, c = view === 'voor' ? [b.x + b.w / 2, b.y + b.h / 2] : [b.z + b.d / 2, b.y + b.h / 2];
      const hl = (view === 'voor' ? b.w : b.d) / 2, hh = b.h / 2;
      return [[-hl, -hh], [hl, -hh], [hl, hh], [-hl, hh]].map(([x, y]) => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]);
    }
    return null;
  };
  const drawPoly = (pts, toX, toY, fill) => {
    if (fill) doc.setFillColor(...fill);
    const q = pts.map(([x, y]) => [toX(x), toY(y)]);
    doc.lines(q.slice(1).map((pt, i) => [pt[0] - q[i][0], pt[1] - q[i][1]]), q[0][0], q[0][1], [1, 1], fill ? 'FD' : 'S', true);
  };
  const drawIn = (p, view, toX, toY, fill) => {
    const pts = poly(p, view);
    if (pts) { drawPoly(pts, toX, toY, fill); return; }
    const b = p.box;
    if (view === 'voor') draw(p, toX(b.x), toY(b.y + b.h), b.w * s, b.h * s, fill);
    else draw(p, toX(b.z), toY(b.y + b.h), b.d * s, b.h * s, fill);
  };
  for (const p of all.filter(p => p.rol !== 'front' && p.rol !== 'paslat')) drawIn(p, 'voor', FX, FY, p.rol === 'zijwand' ? [235, 228, 214] : null);
  doc.setLineWidth(0.35);
  for (const p of all.filter(p => p.rol === 'front' || (p.rol === 'paslat' && p.mat === 'front'))) drawIn(p, 'voor', FX, FY, [250, 246, 238]);
  doc.setLineWidth(0.15);
  doc.setFontSize(9);
  doc.text('Vooraanzicht', FX(minX), FY(maxY) - 9);
  dimLine(doc, FX(0), FY(maxY) - 4, FX(W), FY(maxY) - 4, fmt(W));
  dimLine(doc, FX(minX) - 6, FY(0), FX(minX) - 6, FY(H), fmt(H));
  const P = k.plint === 'geen' ? 0 : Number(k.plintHoogte) || 0;
  if (P) dimLine(doc, FX(minX) - 6, FY(-P), FX(minX) - 6, FY(0), fmt(P));
  // Fronthoogtes rechts (ordinaten vanaf de vloer).
  const fronts = all.filter(p => p.rol === 'front');
  if (fronts.length) {
    // Hoogte vanaf de vloer van elke onder- en bovenkant van een front.
    ordinates(doc, fronts.flatMap(p => [p.box.y + P, p.box.y + p.box.h + P]), y => FY(y - P), 'y', FX(maxX) + 1, 1);
  }
  // Zijaanzicht (doorsnede door de linkerzijwand): liggende panelen, rug en fronten in Z/Y.
  const sx = FX(maxX) + 26, SX = z => sx + z * s, SY = FY;
  doc.setLineWidth(0.2);
  for (const p of all.filter(p => p.rol !== 'zijwand')) {
    const cut = p.box.x <= W / 2 && p.box.x + p.box.w >= W / 2;     // doorsnede in het midden van de kast
    if (!cut && p.rol !== 'front') continue;
    drawIn(p, 'zij', SX, SY, p.rol === 'front' ? [250, 246, 238] : p.rol === 'rug' ? [215, 200, 175] : [235, 228, 214]);
  }
  const side = all.find(p => p.id === 'zij-l');
  if (side) { doc.setLineWidth(0.35); drawIn(side, 'zij', SX, SY, null); }
  doc.setFontSize(9);
  doc.text('Zijaanzicht (doorsnede in het midden)', SX(0), FY(maxY) - 9);
  dimLine(doc, SX(0), FY(maxY) - 4, SX(D), FY(maxY) - 4, fmt(D));
  if (maxZ > D + 0.5) dimLine(doc, SX(0), FY(minY) + 8, SX(maxZ), FY(minY) + 8, `${fmt(maxZ)} met front`);
  // Bovenaanzicht
  const tx = SX(maxZ) + 20, ty = FY(maxY), TX = x => tx + (x - minX) * s, TZ = z => ty + (maxZ - z) * s;
  for (const p of all.filter(p => ['zijwand', 'rug', 'front', 'paslat', 'stijl', 'lat'].includes(p.rol) || p.id === 'top')) {
    draw(p, TX(p.box.x), TZ(p.box.z + p.box.d), p.box.w * s, p.box.d * s, p.rol === 'front' ? [250, 246, 238] : null);
  }
  doc.setFontSize(9);
  doc.text('Bovenaanzicht', tx, ty - 3);
  // Onderdelen zonder bewerking (geen werktekening).
  const plain = all.filter(p => !p.ops.length && p.rol !== 'zijwand');
  let ly = m + 20;
  const lx = w - m - 75;
  doc.setFontSize(9);
  doc.text('Onderdelen zonder bewerking', lx, ly); ly += 5;
  doc.setFontSize(7);
  for (const p of plain.slice(0, 40)) {
    const c = cutInfo(p);
    doc.text(`${p.naam}: ${fmt(c.L)} × ${fmt(c.B)} × ${fmt(p.dikte)}`, lx, ly); ly += 3.4;
  }
  if (plain.length > 40) doc.text(`… en nog ${plain.length - 40}`, lx, ly);
  if (res.warnings.length) {
    ly += 6; doc.setFontSize(8); doc.text('Waarschuwingen', lx, ly); ly += 4; doc.setFontSize(6.5);
    for (const wn of res.warnings) { const t = doc.splitTextToSize(wn, 72); if (ly + t.length * 3 > h - m - 16) break; doc.text(t, lx, ly); ly += t.length * 3 + 1; }
  }
  titleBlock(doc, [`${k.code} · ${PRESETS.find(x => x.id === k.type)?.naam ?? ''}`, `${meta.project} · ${fmt(W)} × ${fmt(H)} × ${fmt(D)} mm${P ? ` · plint ${fmt(P)}` : ''}`], meta.datum);
}

/** PDF met overzicht en werktekeningen voor de kasten van een project. */
function technicalDrawingPdf(project, S, kasten = project.kasten) {
  const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const datum = new Date().toLocaleDateString('nl-BE');
  let first = true;
  const newPage = () => { if (!first) doc.addPage(); first = false; };
  for (const k of kasten) {
    const res = buildCabinet(k, S);
    if (res.error) continue;
    newPage();
    drawCabinetOverview(doc, k, res, { project: project.naam, datum });
    for (const p of res.parts) {
      if (!p.ops.length && p.rol !== 'zijwand') continue;
      const info = partMachining(p);
      const meta = { project: project.naam, kast: k.code, naam: p.naam, datum, mpr: `${safeName(k.code)}/${safeName(`${k.code}_${p.id}`)}${info.ops.B.length ? '_A' : ''}.mpr`,
        materiaal: `${p.plaattype ?? ''} ${p.decor ?? ''}`.trim() };
      newPage();
      drawPartSide(doc, info, 'A', meta);
      if (info.ops.B.length) {
        newPage();
        drawPartSide(doc, info, 'B', { ...meta, mpr: meta.mpr.replace(/_A\.mpr$/, '_B.mpr') });
      }
    }
  }
  if (first) { doc.text('Geen kasten om te tekenen.', 20, 20); }
  return { blob: doc.output('blob'), name: `${safeName(project.naam)} - technische tekening.pdf` };
}
