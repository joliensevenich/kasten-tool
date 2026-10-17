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
      else {
        // Richting van de Clamex (zoals in het MPR-programma): langs op.dir, standaard langs u.
        const onB = op.face === fr.down, mp = onB ? mapB : fr.map;
        const [x, y] = mp(op.u, op.v), [du, dv] = op.dir ?? [1, 0], [x2, y2] = mp(op.u + du * 10, op.v + dv * 10);
        (onB ? sides.B : sides.A).push({ t: 'clamex', x, y, ang: Math.atan2(y2 - y, x2 - x) });
      }
      continue;
    }
    if (op.kind === 'contour') {
      // Contour frezen (boog, voeg) of een sponning (niet doorgaand, op.diepte) in het gekozen vlak.
      const blind = Number(op.diepte) > 0 && op.diepte < D, onB = blind && op.face === fr.down, mp = onB ? mapB : fr.map;
      (onB ? sides.B : sides.A).push({ t: 'contour', pts: op.pts.map(q => mp(...q)), diepte: blind ? op.diepte : null, naam: op.naam });
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
      // Gedraaid volgens de richting van de Clamex (in paginacoördinaten is Y omgekeerd).
      const c = Math.cos(op.ang ?? 0), sn = -Math.sin(op.ang ?? 0), hl = 25 * s, hw = 4 * s, px = X(op.x), py = Y(op.y);
      const cs = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([a, b]) => [px + a * c - b * sn, py + a * sn + b * c]);
      doc.lines(cs.slice(1).map((q, i) => [q[0] - cs[i][0], q[1] - cs[i][1]]), cs[0][0], cs[0][1], [1, 1], 'FD', true);
      xs.push(op.x); ys.push(op.y);
      note('clamex', 'Clamex P-14 in het vlak (frees 202)');
    } else if (op.t === 'contour') {
      doc.setDrawColor(200, 40, 40); doc.setLineWidth(op.diepte ? 0.5 : 0.35);
      if (op.diepte) doc.setLineDashPattern([1.2, 0.8], 0);
      for (let i = 1; i < op.pts.length; i++) doc.line(X(op.pts[i - 1][0]), Y(op.pts[i - 1][1]), X(op.pts[i][0]), Y(op.pts[i][1]));
      doc.setLineDashPattern([], 0); doc.setDrawColor(0); doc.setLineWidth(0.2);
      xs.push(op.pts[0][0], op.pts[op.pts.length - 1][0]); ys.push(op.pts[0][1], op.pts[op.pts.length - 1][1]);
      note(`contour${op.diepte ?? 'door'}`, op.diepte ? `Sponning ${fmt(op.diepte)} diep gefreesd langs de lijn (${op.naam ?? ''})` : `Contour frezen door de volle dikte (${op.naam ?? ''})`);
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

/** Plintinsprong (voor de tekst bij de montage). */
const S0plint = () => (typeof S === 'function' ? S().plintInsprong : 0);

/** Kolom met titels en regels; afgebroken met … als het niet meer past. */
function infoColumn(doc, sections, x, y, width, maxY) {
  for (const [title, lines] of sections) {
    if (y > maxY - 6) break;
    doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.text(title, x, y); doc.setFont(undefined, 'normal'); y += 3.8;
    doc.setFontSize(6.3);
    for (const ln of lines) {
      const t = doc.splitTextToSize(`• ${ln}`, width);
      if (y + t.length * 2.7 > maxY) { doc.text('…', x, y); y = maxY; break; }
      doc.text(t, x, y); y += t.length * 2.7 + 0.4;
    }
    y += 2.5;
  }
}

/** Montagepagina van het project: plaatsingslijst, afwerkpanelen, obstakels en beslag van het hele project. */
function drawProjectAssembly(doc, project, S, meta) {
  const { w, h, m } = PAGE;
  const items = projectParts(project, S).filter(it => !it.res.error);
  let y = m + 12;
  doc.setFontSize(11); doc.text('Montage: plaatsingslijst', m + 4, y); y += 6;
  const cols = [['Kast', 14], ['Type', 52], ['B × H × D', 34], ['X', 16], ['Z', 16], ['Onderkant', 20], ['Hoek', 12], ['Bijzonder', 104]];
  const head = () => {
    doc.setFontSize(7); doc.setFont(undefined, 'bold');
    let x = m + 4; for (const [t, cw] of cols) { doc.text(t, x, y); x += cw; }
    doc.setFont(undefined, 'normal'); doc.setLineWidth(0.15); doc.line(m + 4, y + 1.2, w - m - 4, y + 1.2); y += 4.5;
  };
  head();
  for (const { k, res, L } of items) {
    const bijz = [];
    for (const kant of ['links', 'rechts']) if (Number(k.paslat?.[kant]) > 0) bijz.push(`paslat ${kant} ${fmt(k.paslat[kant])}`);
    if (k.uitsparing?.hoek) bijz.push(`uitsparing ${k.uitsparing.hoek} ${fmt(k.uitsparing.breedte)}×${fmt(k.uitsparing.diepte)}`);
    if (k.schuin?.richting && k.schuin.richting !== 'geen') bijz.push(k.schuin.richting === 'lr' ? `trap ${k.schuin.laag === 'punt' ? 'punt' : `${k.schuin.hoek}°`} hoog ${k.schuin.hoog ?? 'links'}` : `dak ${k.schuin.hoek}°`);
    if (k.greep === 'push') bijz.push('push-open'); else if (k.greep === 'greeplijst') bijz.push('greeploos'); else if (k.greep === 'tipon') bijz.push('TIP-ON');
    if (k.zichtL) bijz.push('zicht links'); if (k.zichtR) bijz.push('zicht rechts');
    if (res.warnings.length) bijz.push(`${res.warnings.length} opmerking(en)`);
    const vals = [k.code, PRESETS.find(x => x.id === k.type)?.naam ?? k.type, `${fmt(k.breedte)} × ${fmt(k.hoogte)} × ${fmt(k.diepte)}`, fmt(L.x), fmt(L.z), fmt(L.y), `${fmt(Number(L.rot) || 0)}°`, bijz.join(', ')];
    const lines = doc.splitTextToSize(vals[7], cols[7][1] - 2);
    if (y + lines.length * 3.2 > h - m - 18) { doc.addPage(); titleBlock(doc, [`${meta.project} · montage (vervolg)`, ''], meta.datum); y = m + 12; head(); }
    let x = m + 4;
    vals.forEach((v, i) => { doc.text(i === 7 ? lines : doc.splitTextToSize(String(v), cols[i][1] - 2)[0], x, y); x += cols[i][1]; });
    y += Math.max(1, lines.length) * 3.2 + 1;
  }
  doc.setFontSize(6.5); doc.text('X: vanaf links (achterwand), Z: vanaf de achterwand naar voor, onderkant: onderkant korpus boven de vloer (mm). Hoek: draaiing van de kast in bovenaanzicht.', m + 4, y + 1); y += 6;
  // Afwerkpanelen, obstakels, opstelling.
  const sections = [];
  if (project.panelen?.length) sections.push(['Afwerkpanelen', project.panelen.map(pn => { const q = panelPart(pn, S); const c = cutInfo(q);
    return `${q.naam}: ${fmt(c.L)} × ${fmt(c.B)} × ${fmt(q.dikte)} (${q.decor}); van X ${fmt(q.box.x)} / Y ${fmt(q.box.y)} / Z ${fmt(q.box.z)} tot X ${fmt(q.box.x + q.box.w)} / Y ${fmt(q.box.y + q.box.h)} / Z ${fmt(q.box.z + q.box.d)}`; })]);
  const wbs = werkbladGeometry(project, S);
  if (wbs.length) sections.push(['Werkbladen', wbs.flatMap(g => {
    const mat = { plaat: 'zelf maken (plaat)', composiet: 'composiet/steen (bestellen)', hout: 'massief hout (bestellen)' }[g.wb.materiaal ?? 'plaat'];
    const lines = [`${g.wb.naam || 'Werkblad'}: ${fmt(g.rect.lengte)} × ${fmt(g.rect.diepte)} × ${fmt(g.rect.dikte)} mm, ${mat}${g.wb.decor ? `, ${g.wb.decor}` : ''}; op ${g.ks.map(x => x.code).join(', ')}; bovenkant op ${fmt(g.L.y + g.rect.yTop + g.rect.dikte)} mm boven de vloer.`,
      `   overstek voor ${fmt(g.wb.voor ?? 20)} mm voorbij de fronten, links ${fmt(g.wb.links || 0)}, rechts ${fmt(g.wb.rechts || 0)}; uiteinden: links ${g.wb.eindeLinks === 'verstek' ? 'verstek 45°' : 'recht'}, rechts ${g.wb.eindeRechts === 'verstek' ? 'verstek 45°' : 'recht'}.`];
    for (const c of g.cut) lines.push(`   uitsparing ${c.naam}: ${fmt(c.b)} × ${fmt(c.d)} mm, midden op ${fmt(c.cx)} mm vanaf links, ${fmt(c.voor)} mm vanaf de voorkant.`);
    if (Number(g.wb.spatHoogte) > 0) lines.push(`   spatwand ${fmt(g.rect.lengte)} × ${fmt(g.wb.spatHoogte)} × ${fmt(g.wb.spatDikte || 12)} mm tegen de muur.`);
    return lines;
  })]);
  if (project.obstakels?.length) sections.push(['Obstakels', project.obstakels.map(o => `${o.naam}: X ${fmt(o.x)}, Z ${fmt(o.z)}, ${fmt(o.breedte)} × ${fmt(o.diepte)} mm${o.hoogte ? `, ${fmt(o.hoogte)} hoog` : ''}`)]);
  const opst = [`Onderkant hangkasten: ${fmt(Number(project.bovenHoogte) || 1400)} mm boven de vloer.`];
  if (project.koppelen !== false) opst.push('Plinten en greeplijsten van kasten tegen elkaar lopen door (één stuk); eerst de kasten onderling uitlijnen en verbinden.');
  if (project.ruimte?.wanden?.length) opst.push(`Ruimte: ${project.ruimte.wanden.map((wd, i) => `wand ${i + 1} ${fmt(wd.lengte)} mm`).join(', ')}; hoogte ${fmt(project.ruimte.hoogte || 2600)} mm.`);
  opst.push('Kasten waterpas zetten met de stelpoten vóór de plint; kasten onderling verbinden met verbindingsschroeven door de zijwanden.');
  sections.push(['Opstelling', opst]);
  const hw = {};
  for (const { res } of items) for (const x of res.hardware) hw[x.naam] = (hw[x.naam] ?? 0) + x.aantal;
  sections.push(['Beslag van het hele project', Object.entries(hw).sort((a, b) => a[0].localeCompare(b[0])).map(([n, c]) => `${c}× ${n}`)]);
  const ord = {};
  for (const { res } of items) for (const x of res.bestel ?? []) ord[x.naam] = (ord[x.naam] ?? 0) + x.aantal;
  if (Object.keys(ord).length) sections.push(['Te bestellen (lades op maat)', Object.entries(ord).map(([n, c]) => `${c}× ${n}`)]);
  const half = Math.ceil(sections.length / 2);
  infoColumn(doc, sections.slice(0, half), m + 4, y + 4, 130, h - m - 16);
  infoColumn(doc, sections.slice(half), m + 145, y + 4, 130, h - m - 16);
  titleBlock(doc, [`${meta.project} · montage`, `${items.length} kasten${project.panelen?.length ? ` · ${project.panelen.length} afwerkpanelen` : ''}`], meta.datum);
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
  const s = Math.min((w - 2 * m - 80 - 75) / (2 * totW + maxZ), (h - 2 * m - 14 - 58) / (totH + maxZ));
  // Vooraanzicht
  const fx = m + 22 - minX * s, fy = m + 18 + maxY * s;
  const FX = x => fx + x * s, FY = y => fy - y * s;
  doc.setLineWidth(0.2);
  const draw = (p, rx, ry, rw, rh, fill) => { if (fill) { doc.setFillColor(...fill); doc.rect(rx, ry, rw, rh, 'FD'); } else doc.rect(rx, ry, rw, rh); };
  // Werkelijke omtrek van een stuk in een aanzicht: vorm (schuine kast) of gekantelde top; anders null (rechthoek).
  const poly = (p, view) => {
    const b = p.box, side = p.rol === 'zijwand' || p.rol === 'stijl';
    if (p.shape && !p.shape3d && view === 'voor' && !side) return p.shape.map(([u, v]) => [b.x + u, b.y + v]);
    if (p.shape && view === 'zij' && side) return p.shape.map(([u, v]) => [b.z + u, b.y + v]);
    if (p.shape3d?.plane === 'xy' && view === 'voor') return p.shape3d.pts.map(([u, v]) => [b.x + u, b.y + v]);
    if (p.shape3d?.plane === 'zy' && view === 'zij') return p.shape3d.pts.map(([u, v]) => [b.z + u, b.y + v]);
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
  // Horizontale doorsnede B-B op halve hoogte, onder het vooraanzicht (X gelijk, voorkant naar onder).
  const hy = H / 2, hzTop = FY(minY) + 16, HZ = z => hzTop + (z - Math.min(0, ...flat.map(p => p.box.z))) * s;
  doc.setLineDashPattern([3, 1.5, 0.6, 1.5], 0); doc.setDrawColor(200, 40, 40);
  doc.line(FX(minX) - 3, FY(hy), FX(maxX) + 3, FY(hy)); doc.setLineDashPattern([], 0);
  doc.setFontSize(8); doc.setTextColor(200, 40, 40); doc.text('B', FX(minX) - 6, FY(hy) + 1); doc.text('B', FX(maxX) + 4, FY(hy) + 1); doc.setTextColor(0); doc.setDrawColor(0);
  doc.setFontSize(9); doc.text(`Horizontale doorsnede B-B (op ${fmt(hy)} mm)`, FX(minX), hzTop - 3);
  doc.setLineWidth(0.15);
  for (const p of all.filter(p => !p.tilt && p.box.y <= hy && p.box.y + p.box.h >= hy)) {
    const fill = p.rol === 'front' ? [250, 246, 238] : p.rol === 'rug' ? [215, 200, 175] : [235, 228, 214];
    if (p.shape3d?.plane === 'xz') drawPoly(p.shape3d.pts.map(([u, v]) => [p.box.x + u, p.box.z + v]), FX, HZ, fill);
    else { doc.setFillColor(...fill); doc.rect(FX(p.box.x), HZ(p.box.z), p.box.w * s, p.box.d * s, 'FD'); }
  }
  const zMax = Math.max(...flat.map(p => p.box.z + p.box.d)), zMin = Math.min(0, ...flat.map(p => p.box.z));
  dimLine(doc, FX(maxX) + 5, HZ(zMin), FX(maxX) + 5, HZ(zMax), fmt(zMax - zMin));
  dimLine(doc, FX(minX), HZ(zMax) + 5, FX(maxX), HZ(zMax) + 5, fmt(maxX - minX));
  // Montagekader (voor de monteur): plaatsing, montage, fronten, beslag, onderdelen zonder bewerking, waarschuwingen.
  const preset = PRESETS.find(x => x.id === k.type);
  const L = meta.L;
  const sections = [];
  if (L) sections.push(['Plaatsing', [
    `X ${fmt(L.x)} mm vanaf links, Z ${fmt(L.z)} mm vanaf achter${Number(L.rot) ? `, gedraaid ${fmt(L.rot)}°` : ''}.`,
    `Onderkant korpus op ${fmt(L.y)} mm boven de vloer${P && preset?.groep !== 'Bovenkasten' ? ` (plint ${fmt(P)} mm)` : ''}; bovenkant op ${fmt(L.y + H)} mm.`]]);
  const mont = [];
  const zichtTxt = zl => zl ? 'Clamex P-14 (zichtzijde)' : 'deuvels + schroeven';
  if (k.schuin?.richting && k.schuin.richting !== 'geen') mont.push(`Schuine kast (${k.schuin.richting === 'lr' ? 'trap' : 'dak'}${k.schuin.hoek ? `, ${k.schuin.hoek}°` : ''}): panelen met Clamex; schuine kanten gezaagd.`);
  else mont.push(`Zijwand links: ${zichtTxt(k.zichtL)}; zijwand rechts: ${zichtTxt(k.zichtR)}.`);
  mont.push(k.rug === 'groef' ? 'Rug in de groef schuiven en in bodem, regels en tussenbodems schroeven.' : k.rug === 'opgeschroefd' ? 'Rugpaneel achteraan opschroeven.' : k.wegneembareRug ? 'Geen vaste rug; wegneembare rugstrook tussen de legplankdragers schuiven.' : 'Geen rug.');
  if (preset?.groep === 'Bovenkasten') mont.push('Ophangbeslag: 3 gaten Ø10 bovenaan in elke zijwand; ophangrail eerst waterpas monteren.');
  if (k.plint === 'stelpoten' && P) mont.push(`Stelpoten (puntjes onder de bodem), plint ${fmt(P)} mm hoog${k.plintTrespa ? ' op Trespa' : ''}, ${fmt(S0plint(k))} mm achter de front.`);
  if (k.plint === 'vast' && P) mont.push(`Vaste plint ${fmt(P)} mm (zijwanden tot op de vloer).`);
  const gTxt = { greep: `greep${k.greepHart ? ` ${k.greepHart} mm hart-op-hart` : ''} (gaten geboord)`, tipon: 'TIP-ON', push: 'push-open: drevels in de boringen Ø10 × 80 van voor in het korpus; geen dempers', greeplijst: 'greeploos (houten greeplijst)' };
  mont.push(`Fronten: ${gTxt[k.greep] ?? k.greep}.`);
  for (const kant of ['links', 'rechts']) if (Number(k.paslat?.[kant]) > 0) mont.push(`Paslat ${kant} ${fmt(k.paslat[kant])} mm: kastpaslat van buitenaf vastschroeven, frontpaslat met Clamex erop.`);
  if (k.uitsparing?.hoek) mont.push(`Uitsparing ${k.uitsparing.hoek} achteraan ${fmt(k.uitsparing.breedte)} × ${fmt(k.uitsparing.diepte)} mm (koker/kolom), binnenwanden met deuvels en schroeven.`);
  sections.push(['Montage', mont]);
  const fr = all.filter(p => p.rol === 'front' || (p.rol === 'paslat' && p.mat === 'front'));
  if (fr.length) sections.push(['Fronten', fr.map(p => {
    const pots = p.ops.filter(o => o.naam === 'Scharnierpot');
    const kant = pots.length ? (pots[0].u < p.uLen / 2 ? 'links' : 'rechts') : '';
    return `${p.naam}: ${fmt(p.uLen)} × ${fmt(p.vLen)} (${p.decor ?? ''})${pots.length ? `; ${pots.length} scharnieren ${kant} op ${pots.map(o => fmt(o.v)).join(' / ')} van onder` : ''}`;
  })]);
  if (res.hardware.length) sections.push(['Beslag', res.hardware.map(hw => `${hw.aantal}× ${hw.naam}`)]);
  if (res.bestel?.length) sections.push(['Te bestellen', res.bestel.map(b => `${b.aantal}× ${b.naam}`)]);
  const plain = all.filter(p => !p.ops.length && p.rol !== 'zijwand' && !p.nietZagen);
  if (plain.length) sections.push(['Onderdelen zonder bewerking', plain.map(p => { const c = cutInfo(p); return `${p.naam}: ${fmt(c.L)} × ${fmt(c.B)} × ${fmt(p.dikte)}`; })]);
  if (res.warnings.length) sections.push(['Let op', res.warnings]);
  infoColumn(doc, sections, w - m - 75, m + 20, 72, h - m - 16);
  titleBlock(doc, [`${k.code} · ${PRESETS.find(x => x.id === k.type)?.naam ?? ''}`, `${meta.project} · ${fmt(W)} × ${fmt(H)} × ${fmt(D)} mm${P ? ` · plint ${fmt(P)}` : ''}`], meta.datum);
}

/** Wereld-box (as-gericht) van een onderdeel van een kast op positie L (draaiing per 90°). */
function worldBox(b, L) {
  const a = -(Number(L.rot) || 0) * Math.PI / 180, c = Math.round(Math.cos(a) * 1e6) / 1e6, sn = Math.round(Math.sin(a) * 1e6) / 1e6;
  const xs = [], zs = [];
  for (const x of [b.x, b.x + b.w]) for (const z of [b.z, b.z + b.d]) { xs.push(L.x + x * c + z * sn); zs.push(L.z - x * sn + z * c); }
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: L.y + b.y, y1: L.y + b.y + b.h, z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** Overzicht van het hele project: vooraanzicht, bovenaanzicht en doorsnede met totale maten. */
function drawProjectOverview(doc, project, S, meta) {
  const { w, h, m } = PAGE;
  const items = projectParts(project, S).filter(it => !it.res.error);
  const all = [];       // { wb, p, k }
  for (const it of items) for (const p of it.parts) if (!p.tilt) all.push({ wb: worldBox(p.box, it.L), p, k: it.k });
  for (const pn of project.panelen ?? []) { const p = panelPartFull(pn, S); const b = p.box; all.push({ wb: { x0: b.x, x1: b.x + b.w, y0: b.y, y1: b.y + b.h, z0: b.z, z1: b.z + b.d }, p, k: null }); }
  for (const g of werkbladGeometry(project, S)) for (const p of g.parts.filter(q => q.rol !== 'werkblad-uitsparing')) all.push({ wb: worldBox(p.box, g.L), p, k: null });
  if (!all.length) return;
  const cabs = items.map(it => {
    const ws = all.filter(a => a.k === it.k).map(a => a.wb);
    return { k: it.k, L: it.L, x0: Math.min(...ws.map(q => q.x0)), x1: Math.max(...ws.map(q => q.x1)), y0: Math.min(...ws.map(q => q.y0)), y1: Math.max(...ws.map(q => q.y1)),
      z0: Math.min(...ws.map(q => q.z0)), z1: Math.max(...ws.map(q => q.z1)), body: worldBox({ x: 0, y: 0, z: 0, w: Number(it.k.breedte), h: Number(it.k.hoogte), d: Number(it.k.diepte) }, it.L) };
  });
  const X0 = Math.min(...all.map(a => a.wb.x0)), X1 = Math.max(...all.map(a => a.wb.x1));
  const Y0 = Math.min(0, ...all.map(a => a.wb.y0)), Y1 = Math.max(...all.map(a => a.wb.y1));
  const Z0 = Math.min(...all.map(a => a.wb.z0)), Z1 = Math.max(...all.map(a => a.wb.z1));
  const s = Math.min(150 / (X1 - X0), 92 / (Y1 - Y0), 150 / (X1 - X0), 40 / (Z1 - Z0));
  const fx = m + 26, fy = m + 18 + (Y1 - Y0) * s;               // vooraanzicht: X naar rechts, Y omhoog
  const FX = x => fx + (x - X0) * s, FY = y => fy - (y - Y0) * s;
  const rect = (x0, y0, x1, y1, fill) => { if (fill) { doc.setFillColor(...fill); doc.rect(x0, y1, x1 - x0, y0 - y1, 'FD'); } else doc.rect(x0, y1, x1 - x0, y0 - y1); };
  doc.setFontSize(9);
  doc.text('Vooraanzicht', FX(X0), FY(Y1) - 17);
  doc.setLineWidth(0.15);
  // Korpus per kast (lijn), daarna plinten, panelen en fronten (gevuld), van achter naar voor.
  for (const c of cabs) rect(FX(c.body.x0), FY(c.body.y0), FX(c.body.x1), FY(c.body.y1));
  const vis = all.filter(a => ['front', 'plint', 'afwerk', 'paslat', 'greeplijst', 'trespa', 'werkblad', 'spatwand'].includes(a.p.rol) || (a.p.rol === 'zijwand' && a.k?.zichtL + a.k?.zichtR)).sort((a, b) => a.wb.z1 - b.wb.z1);
  for (const a of vis) rect(FX(a.wb.x0), FY(a.wb.y0), FX(a.wb.x1), FY(a.wb.y1), a.p.rol === 'front' || a.p.rol === 'afwerk' || a.p.mat === 'front' ? [250, 246, 238] : [235, 228, 214]);
  doc.setFontSize(7);
  for (const c of cabs) doc.text(c.k.code, (FX(c.body.x0) + FX(c.body.x1)) / 2, (FY(c.body.y0) + FY(c.body.y1)) / 2, { align: 'center' });
  // Totale breedte en breedtes per kast (onder- en bovenrij apart) als kettingmaten.
  dimLine(doc, FX(X0), FY(Y1) - 5, FX(X1), FY(Y1) - 5, `${fmt(X1 - X0)}`);
  const rows = [cabs.filter(c => c.body.y0 < 500), cabs.filter(c => c.body.y0 >= 500)];
  rows.forEach((rw, i) => {
    if (!rw.length) return;
    const yy = i === 0 ? FY(Y0) + 5 : FY(Y1) - 12;
    for (const c of rw.sort((a, b) => a.body.x0 - b.body.x0)) if (c.body.x1 - c.body.x0 > 1) dimLine(doc, FX(c.body.x0), yy, FX(c.body.x1), yy, fmt(c.body.x1 - c.body.x0));
  });
  // Hoogtes vanaf de vloer (links).
  doc.setLineWidth(0.12);
  ordinates(doc, [0, ...cabs.flatMap(c => [c.y0, c.y1, c.body.y0, c.body.y1])], y => FY(y), 'y', FX(X0) - 2, -1);
  // Doorsnedelijn A-A door het midden van de eerste kast.
  const first = cabs.slice().sort((a, b) => a.x0 - b.x0)[0];
  const xs = (first.body.x0 + first.body.x1) / 2;
  doc.setLineDashPattern([3, 1.5, 0.6, 1.5], 0); doc.setDrawColor(200, 40, 40);
  doc.line(FX(xs), FY(Y1) + 2, FX(xs), FY(Y0) - 2); doc.setLineDashPattern([], 0);
  doc.setFontSize(8); doc.setTextColor(200, 40, 40); doc.text('A', FX(xs) + 1, FY(Y1) + 4); doc.text('A', FX(xs) + 1, FY(Y0) - 3); doc.setTextColor(0); doc.setDrawColor(0);
  // Horizontale doorsnede B-B door de onderkasten (X naar rechts, voorkant naar onder); hangkasten gestreept erboven.
  const base = cabs.filter(c => c.body.y0 < 500);
  const hB = base.length ? Math.min(...base.map(c => (c.body.y0 + c.body.y1) / 2)) : (Y0 + Y1) / 2;
  doc.setLineDashPattern([3, 1.5, 0.6, 1.5], 0); doc.setDrawColor(200, 40, 40);
  doc.line(FX(X0) - 3, FY(hB), FX(X1) + 3, FY(hB)); doc.setLineDashPattern([], 0);
  doc.setFontSize(8); doc.setTextColor(200, 40, 40); doc.text('B', FX(X1) + 4, FY(hB) + 1); doc.setTextColor(0); doc.setDrawColor(0);
  const py = FY(Y0) + 26, PX = FX, PZ = z => py + (z - Z0) * s;
  doc.setFontSize(9); doc.text(`Horizontale doorsnede B-B (op ${fmt(hB)} mm)`, PX(X0), py - 3);
  doc.setLineWidth(0.15);
  for (const a of all.filter(a => a.wb.y0 <= hB && a.wb.y1 >= hB)) {
    const fill = a.p.rol === 'front' || a.p.rol === 'afwerk' || a.p.mat === 'front' ? [250, 246, 238] : a.p.rol === 'rug' ? [215, 200, 175] : [235, 228, 214];
    rect(PX(a.wb.x0), PZ(a.wb.z1), PX(a.wb.x1), PZ(a.wb.z0), fill);
  }
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.5, 1], 0);
  for (const c of cabs.filter(c => c.body.y0 >= 500)) rect(PX(c.x0), PZ(c.z1), PX(c.x1), PZ(c.z0));
  doc.setLineDashPattern([], 0);
  for (const a of all.filter(a => a.p.rol === 'afwerk' && a.p.box.h > a.p.dikte + 0.5)) rect(PX(a.wb.x0), PZ(a.wb.z1), PX(a.wb.x1), PZ(a.wb.z0), [250, 246, 238]);
  doc.setFontSize(7);
  for (const c of cabs) doc.text(c.k.code, (PX(c.x0) + PX(c.x1)) / 2, (PZ(c.z0) + PZ(c.z1)) / 2 + (c.body.y0 >= 500 ? -2 : 3), { align: 'center' });
  dimLine(doc, PX(X1) + 5, PZ(Z0), PX(X1) + 5, PZ(Z1), fmt(Z1 - Z0));
  // Doorsnede A-A: alles wat de lijn snijdt, in Z/Y.
  const s2 = Math.min(70 / (Z1 - Z0), 150 / (Y1 - Y0));
  const sx = w - m - 95, SX = z => sx + (z - Z0) * s2, SY = y => m + 22 + (Y1 - y) * s2;
  doc.setFontSize(9); doc.text('Doorsnede A-A', SX(Z0), m + 12);
  const cut = all.filter(a => a.wb.x0 <= xs && a.wb.x1 >= xs);
  for (const a of cut.sort((p1, p2) => (p1.p.rol === 'zijwand') - (p2.p.rol === 'zijwand'))) {
    const fill = a.p.rol === 'front' || a.p.rol === 'afwerk' ? [250, 246, 238] : a.p.rol === 'rug' ? [215, 200, 175] : a.p.rol === 'zijwand' ? null : [205, 190, 165];
    doc.setLineWidth(a.p.rol === 'zijwand' ? 0.35 : 0.15);
    rect(SX(a.wb.z0), SY(a.wb.y0), SX(a.wb.z1), SY(a.wb.y1), fill);
  }
  doc.setLineWidth(0.15);
  doc.line(SX(Z0) - 5, SY(0), SX(Z1) + 5, SY(0));
  const cutCabs = cabs.filter(c => c.x0 <= xs && c.x1 >= xs);
  cutCabs.forEach((c, i) => dimLine(doc, SX(c.z0), SY(c.y1) - 4, SX(c.z1), SY(c.y1) - 4, `${fmt(c.z1 - c.z0)}`));
  ordinates(doc, [0, ...cutCabs.flatMap(c => [c.y0, c.y1, c.body.y0, c.body.y1])], y => SY(y), 'y', SX(Z1) + 3, 1);
  titleBlock(doc, [`${meta.project} · overzicht`, `Totaal ${fmt(X1 - X0)} breed × ${fmt(Y1 - Y0)} hoog × ${fmt(Z1 - Z0)} diep · ${cabs.length} kasten${project.panelen?.length ? ` · ${project.panelen.length} afwerkpanelen` : ''}`], meta.datum);
}

// MARK: - Montagetekening (A3): plattegrond, aanzicht per muur met doorsnede

/** Assen van een kast in de wereld (bovenaanzicht): x-as (breedte) en z-as (naar voor), zoals in worldBox. */
function cabAxes(L) {
  const a = -(Number(L.rot) || 0) * Math.PI / 180, c = Math.round(Math.cos(a) * 1e6) / 1e6, sn = Math.round(Math.sin(a) * 1e6) / 1e6;
  return { ax: [c, -sn], az: [sn, c] };
}

/**
 * Muren (rijen): kasten met dezelfde draaiing en dezelfde achterlijn. Per kast de positie langs de muur (along, vanaf
 * de oorsprong van het project = de muur links/achter).
 */
function wallGroups(project, items) {
  const groups = [];
  for (const it of items) {
    const { ax, az } = cabAxes(it.L);
    const rot = (((Number(it.L.rot) || 0) % 360) + 360) % 360;
    const perp = it.L.x * az[0] + it.L.z * az[1], along = it.L.x * ax[0] + it.L.z * ax[1];
    let g = groups.find(q => q.rot === rot && Math.abs(q.perp - perp) < 30);
    if (!g) { g = { rot, perp, ax, az, cabs: [] }; groups.push(g); }
    g.cabs.push({ it, along });
  }
  for (const g of groups) g.cabs.sort((a, b) => a.along - b.along);
  return groups;
}

/** Plattegrond: muren, kasten (hangkasten gestreept), werkbladen met uitsparingen, obstakels; maatketens per muur. */
function drawPlan(doc, project, S, meta) {
  const { w, h, m } = PAGE;
  const items = projectParts(project, S).filter(it => !it.res.error);
  const groups = wallGroups(project, items);
  const room = roomGeometry(project);
  const bodies = items.map(it => ({ it, wb: worldBox({ x: 0, y: 0, z: 0, w: Number(it.k.breedte), h: Number(it.k.hoogte), d: Number(it.k.diepte) }, it.L),
    hang: PRESETS.find(x => x.id === it.k.type)?.groep === 'Bovenkasten', kolom: PRESETS.find(x => x.id === it.k.type)?.groep === 'Kolomkasten' }));
  const extra = [];   // fronten, paslatten, zijpanelen (bovenaanzicht)
  for (const it of items) for (const p of it.parts) if (['front', 'paslat', 'afwerk', 'plint'].includes(p.rol) && !p.tilt) extra.push({ wb: worldBox(p.box, it.L), p, hang: bodies.find(b => b.it === it).hang });
  const wbs = werkbladGeometry(project, S);
  const pts = [...bodies.flatMap(b => [[b.wb.x0, b.wb.z0], [b.wb.x1, b.wb.z1]]), ...extra.flatMap(e => [[e.wb.x0, e.wb.z0], [e.wb.x1, e.wb.z1]]), ...room.lines.flatMap(l => [[l.x0, l.z0], [l.x1, l.z1]])];
  for (const g of wbs) for (const p of g.parts) { const b = worldBox(p.box, g.L); pts.push([b.x0, b.z0], [b.x1, b.z1]); }
  for (const o of project.obstakels ?? []) pts.push([Number(o.x) || 0, Number(o.z) || 0], [(Number(o.x) || 0) + (Number(o.breedte) || 0), (Number(o.z) || 0) + (Number(o.diepte) || 0)]);
  if (!pts.length) return;
  const X0 = Math.min(...pts.map(q => q[0])) - 700, X1 = Math.max(...pts.map(q => q[0])) + 700;
  const Z0 = Math.min(...pts.map(q => q[1])) - 700, Z1 = Math.max(...pts.map(q => q[1])) + 700;
  const s = Math.min((w - 2 * m - 20) / (X1 - X0), (h - 2 * m - 40) / (Z1 - Z0));
  const ox = m + 10 + ((w - 2 * m - 20) - (X1 - X0) * s) / 2, oy = m + 14;
  const PX = x => ox + (x - X0) * s, PZ = z => oy + (z - Z0) * s;
  doc.setFontSize(12); doc.text('Plattegrond (bovenaanzicht)', m + 4, m + 8);
  // Muren en obstakels.
  doc.setLineWidth(0.8); doc.setDrawColor(90);
  for (const l of room.lines) doc.line(PX(l.x0), PZ(l.z0), PX(l.x1), PZ(l.z1));
  doc.setLineWidth(0.2); doc.setDrawColor(0);
  for (const o of project.obstakels ?? []) {
    const x = Number(o.x) || 0, z = Number(o.z) || 0, bw = Number(o.breedte) || 0, bd = Number(o.diepte) || 0;
    doc.setFillColor(185, 180, 170); doc.rect(PX(x), PZ(z), bw * s, bd * s, 'FD');
    doc.setFontSize(6); doc.text(o.naam || 'Obstakel', PX(x) + 1, PZ(z) + 3);
  }
  // Werkbladen (onder de kasten getekend als omtrek) met uitsparingen.
  for (const g of wbs) {
    const top = g.parts.find(q => q.rol === 'werkblad');
    const { ax, az } = cabAxes(g.L);
    const toW = (x, z) => [g.L.x + x * ax[0] + z * az[0], g.L.z + x * ax[1] + z * az[1]];
    const poly = top.shape3d ? top.shape3d.pts.map(([u, v]) => toW(top.box.x + u, top.box.z + v)) : [[0, 0], [top.box.w, 0], [top.box.w, top.box.d], [0, top.box.d]].map(([u, v]) => toW(top.box.x + u, top.box.z + v));
    doc.setLineWidth(0.35); doc.setDrawColor(40, 90, 170); doc.setLineDashPattern([2, 1], 0);
    const q = poly.map(([x, z]) => [PX(x), PZ(z)]);
    doc.lines(q.slice(1).map((pt, i) => [pt[0] - q[i][0], pt[1] - q[i][1]]), q[0][0], q[0][1], [1, 1], 'S', true);
    doc.setLineDashPattern([], 0);
    for (const c of g.parts.filter(q2 => q2.rol === 'werkblad-uitsparing')) {
      const b = worldBox(c.box, g.L); doc.rect(PX(b.x0), PZ(b.z0), (b.x1 - b.x0) * s, (b.z1 - b.z0) * s);
      doc.setFontSize(5.5); doc.setTextColor(40, 90, 170); doc.text(c.naam, PX(b.x0) + 1, PZ(b.z0) + 2.5); doc.setTextColor(0);
    }
    doc.setDrawColor(0);
  }
  // Kasten: onder- en kolomkasten gevuld, hangkasten gestreept erover; fronten, paslatten, zijpanelen.
  doc.setLineWidth(0.25);
  for (const b of bodies.filter(b => !b.hang)) { doc.setFillColor(...(b.kolom ? [215, 205, 185] : [235, 228, 214])); doc.rect(PX(b.wb.x0), PZ(b.wb.z0), (b.wb.x1 - b.wb.x0) * s, (b.wb.z1 - b.wb.z0) * s, 'FD'); }
  for (const e of extra.filter(e => !e.hang && e.p.rol !== 'plint')) { doc.setFillColor(250, 246, 238); doc.rect(PX(e.wb.x0), PZ(e.wb.z0), Math.max(0.3, (e.wb.x1 - e.wb.x0) * s), Math.max(0.3, (e.wb.z1 - e.wb.z0) * s), 'FD'); }
  doc.setLineDashPattern([1.5, 1], 0);
  for (const b of bodies.filter(b => b.hang)) doc.rect(PX(b.wb.x0), PZ(b.wb.z0), (b.wb.x1 - b.wb.x0) * s, (b.wb.z1 - b.wb.z0) * s);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7);
  for (const b of bodies) doc.text(`${b.it.k.code}${b.hang ? ' (hang)' : ''}`, PX((b.wb.x0 + b.wb.x1) / 2), PZ((b.wb.z0 + b.wb.z1) / 2) + (b.hang ? -1.5 : 2), { align: 'center' });
  // Maatketens per muur, voor de kasten: elke kast (en paslat / zijpaneel) en het totaal, en de afstand vanaf de muur.
  for (const g of groups) {
    // Diepte van de hele rij (onder-, kolom- en hangkasten), zodat de ketens niet over elkaar komen.
    const rowDepth = Math.max(...g.cabs.flatMap(c => c.it.parts.filter(p => !p.tilt).map(p => p.box.z + p.box.d)));
    for (const [rij, filt, step] of [['onder', c => PRESETS.find(x => x.id === c.it.k.type)?.groep !== 'Bovenkasten', 1], ['hang', c => PRESETS.find(x => x.id === c.it.k.type)?.groep === 'Bovenkasten', 2]]) {
      const cs = g.cabs.filter(filt);
      if (!cs.length) continue;
      const tsSet = new Set();
      let depth = 0;
      for (const c of cs) {
        for (const p of c.it.parts) {
          if (p.tilt || (p.rol !== 'paslat' && p.rol !== 'afwerk')) continue;
          tsSet.add(Math.round((c.along + p.box.x) * 10) / 10); tsSet.add(Math.round((c.along + p.box.x + p.box.w) * 10) / 10);
        }
        tsSet.add(c.along); tsSet.add(c.along + Number(c.it.k.breedte));
        depth = Math.max(depth, ...c.it.parts.filter(p => !p.tilt).map(p => p.box.z + p.box.d));
      }
      const ts = [...tsSet].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.5);
      const off = rowDepth + (rij === 'onder' ? 250 : 650);
      void depth; void step;
      const P = (t, d) => [t * g.ax[0] + (g.perp + d) * g.az[0], t * g.ax[1] + (g.perp + d) * g.az[1]];
      doc.setLineWidth(0.12); doc.setDrawColor(rij === 'hang' ? 120 : 0);
      for (let i = 0; i + 1 < ts.length; i++) {
        const [xa, za] = P(ts[i], off), [xb, zb] = P(ts[i + 1], off);
        dimLine(doc, PX(xa), PZ(za), PX(xb), PZ(zb), fmt(ts[i + 1] - ts[i]));
      }
      const [xa, za] = P(ts[0], off + 160), [xb, zb] = P(ts[ts.length - 1], off + 160);
      dimLine(doc, PX(xa), PZ(za), PX(xb), PZ(zb), `${rij === 'hang' ? 'hangkasten ' : ''}${fmt(ts[ts.length - 1] - ts[0])}`);
      if (rij === 'onder' && Math.abs(ts[0]) > 5) { const [x0, z0] = P(0, off), [x1, z1] = P(ts[0], off); dimLine(doc, PX(x0), PZ(z0), PX(x1), PZ(z1), `${fmt(ts[0])} vanaf muur`); }
      doc.setDrawColor(0);
    }
  }
  // Werkbladmaten.
  doc.setFontSize(6.5);
  let ly = h - m - 30;
  for (const g of wbs) {
    const t = `${g.wb.naam || 'Werkblad'}: ${fmt(g.rect.lengte)} × ${fmt(g.rect.diepte)} × ${fmt(g.rect.dikte)} mm${g.cut.length ? ' · ' + g.cut.map(c => `${c.naam} ${fmt(c.b)} × ${fmt(c.d)}, midden ${fmt(c.cx)} vanaf links, ${fmt(c.voor)} vanaf voor`).join(' · ') : ''}`;
    doc.text(doc.splitTextToSize(t, w - 2 * m - 8)[0], m + 4, ly); ly += 3;
  }
  doc.setFontSize(6.5);
  doc.text('Grijs = onder- en kolomkasten, gestreept = hangkasten, blauw gestreept = werkblad met uitsparingen. Maten in mm; maatketens per muur vóór de kasten, gemeten vanaf de muur links/achter (oorsprong van het project).', m + 4, h - m - 17);
  titleBlock(doc, [`${meta.project} · plattegrond`, `${items.length} kasten · ${groups.length} ${groups.length === 1 ? 'muur' : 'muren / rijen'}`], meta.datum);
}

/** Aanzicht van één muur (rij) met maatketens en hoogtes, en rechts een doorsnede. */
function drawWall(doc, project, S, g, nr, meta) {
  const { w, h, m } = PAGE;
  const wbAll = werkbladGeometry(project, S);
  // Alle onderdelen in muurcoördinaten: t = langs de muur (vanaf de oorsprong), y = hoogte, d = diepte vanaf de achterlijn.
  const items = [];
  const toWall = (L, b) => { const wb = worldBox(b, L); const t0 = wb.x0 * g.ax[0] + wb.z0 * g.ax[1], t1 = wb.x1 * g.ax[0] + wb.z1 * g.ax[1];
    const d0 = wb.x0 * g.az[0] + wb.z0 * g.az[1] - g.perp, d1 = wb.x1 * g.az[0] + wb.z1 * g.az[1] - g.perp;
    return { t0: Math.min(t0, t1), t1: Math.max(t0, t1), y0: wb.y0, y1: wb.y1, d0: Math.min(d0, d1), d1: Math.max(d0, d1) }; };
  for (const c of g.cabs) for (const p of c.it.parts) if (!p.tilt) items.push({ p, k: c.it.k, ...toWall(c.it.L, p.box) });
  const myWb = wbAll.filter(x => x.ks.some(k => g.cabs.some(c => c.it.k === k)));
  for (const x of myWb) for (const p of x.parts) items.push({ p, k: null, wbx: x, ...toWall(x.L, p.box) });
  if (!items.length) return;
  const T0 = Math.min(...items.map(i => i.t0)), T1 = Math.max(...items.map(i => i.t1));
  const Yt = Math.max(...items.map(i => i.y1), Number(project.ruimte?.hoogte) || 0), Y0 = Math.min(0, ...items.map(i => i.y0));
  const Dmax = Math.max(...items.map(i => i.d1));
  const secW = 95;
  const s = Math.min((w - 2 * m - secW - 60) / (T1 - T0), (h - 2 * m - 120) / (Yt - Y0));
  const ox = m + 32, base = h - m - 62;
  const PX = t => ox + (t - T0) * s, PY = y => base - (y - Y0) * s;
  doc.setFontSize(12); doc.text(`Muur ${nr}: aanzicht`, m + 4, m + 8);
  // Vloer en plafond.
  doc.setLineWidth(0.5); doc.line(PX(T0) - 10, PY(0), PX(T1) + 10, PY(0));
  if (project.ruimte?.hoogte) { doc.setLineDashPattern([2, 1], 0); doc.line(PX(T0) - 10, PY(Number(project.ruimte.hoogte)), PX(T1) + 10, PY(Number(project.ruimte.hoogte))); doc.setLineDashPattern([], 0); }
  // Van achter naar voor: korpus (lijn), dan werkblad, plinten, panelen en fronten (gevuld).
  doc.setLineWidth(0.15);
  const vis = r => ['front', 'plint', 'afwerk', 'paslat', 'greeplijst', 'trespa', 'werkblad', 'spatwand', 'rondhuid'].includes(r);
  for (const i of items.filter(i => !vis(i.p.rol) && i.p.rol !== 'werkblad-uitsparing').sort((a, b) => a.d1 - b.d1)) doc.rect(PX(i.t0), PY(i.y1), (i.t1 - i.t0) * s, (i.y1 - i.y0) * s);
  for (const i of items.filter(i => vis(i.p.rol)).sort((a, b) => a.d1 - b.d1)) {
    doc.setFillColor(...(i.p.rol === 'front' || i.p.rol === 'afwerk' || i.p.mat === 'front' ? [250, 246, 238] : i.p.rol === 'werkblad' ? [205, 215, 230] : [235, 228, 214]));
    doc.rect(PX(i.t0), PY(i.y1), Math.max(0.2, (i.t1 - i.t0) * s), Math.max(0.2, (i.y1 - i.y0) * s), 'FD');
  }
  doc.setFontSize(7.5);
  for (const c of g.cabs) {
    const L = c.it.L, t0 = c.along, t1 = c.along + Number(c.it.k.breedte);
    doc.text(c.it.k.code, PX((t0 + t1) / 2), PY(L.y + Number(c.it.k.hoogte) / 2), { align: 'center' });
    doc.setFontSize(5.5); doc.text((PRESETS.find(x => x.id === c.it.k.type)?.naam ?? '').slice(0, 26), PX((t0 + t1) / 2), PY(L.y + Number(c.it.k.hoogte) / 2) + 3, { align: 'center' }); doc.setFontSize(7.5);
  }
  // Maatketens: onder (onder- en kolomkasten, paslatten, zijpanelen) en boven (hangkasten), plus totaal en ordinaten vanaf de muur.
  const chain = (filt, yy, label) => {
    const set = new Set();
    for (const i of items.filter(i => i.k && filt(i.k) && ['paslat', 'afwerk'].includes(i.p.rol))) { set.add(Math.round(i.t0 * 10) / 10); set.add(Math.round(i.t1 * 10) / 10); }
    for (const c of g.cabs.filter(c => filt(c.it.k))) { set.add(c.along); set.add(c.along + Number(c.it.k.breedte)); }
    const body = [...new Set(g.cabs.filter(c => filt(c.it.k)).flatMap(c => [c.along, c.along + Number(c.it.k.breedte)]))].sort((a, b) => a - b);
    if (!body.length) return;
    const pts2 = [...set].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.5);
    doc.setLineWidth(0.12);
    for (let i = 0; i + 1 < body.length; i++) if (body[i + 1] - body[i] > 0.5) dimLine(doc, PX(body[i]), yy, PX(body[i + 1]), yy, fmt(body[i + 1] - body[i]));
    dimLine(doc, PX(pts2[0]), yy + (label === 'boven' ? -6 : 6), PX(pts2[pts2.length - 1]), yy + (label === 'boven' ? -6 : 6), `${label === 'boven' ? 'hangkasten ' : 'totaal '}${fmt(pts2[pts2.length - 1] - pts2[0])}`);
    ordinates(doc, pts2, PX, 'x', yy + (label === 'boven' ? -9 : 9), label === 'boven' ? -1 : 1);
  };
  const hang = k => PRESETS.find(x => x.id === k.type)?.groep === 'Bovenkasten';
  chain(k => !hang(k), PY(Y0) + 5, 'onder');
  chain(hang, PY(Yt) - 6, 'boven');
  // Hoogtes vanaf de vloer (links): plint, korpus, werkblad, hangkasten, kolomkasten, plafond.
  const hs = [0];
  for (const c of g.cabs) { hs.push(c.it.L.y, c.it.L.y + Number(c.it.k.hoogte)); }
  for (const x of myWb) hs.push(x.L.y + x.rect.yTop + x.rect.dikte);
  if (project.ruimte?.hoogte) hs.push(Number(project.ruimte.hoogte));
  doc.setLineWidth(0.12);
  ordinates(doc, hs, PY, 'y', PX(T0) - 3, -1);
  doc.setFontSize(6); doc.text('hoogte vanaf de vloer', PX(T0) - 26, PY(Yt) - 2);
  // Doorsnede rechts: door een onderkast met (indien mogelijk) een hangkast erboven, of de eerste kast.
  const pick = g.cabs.find(c => !hang(c.it.k) && g.cabs.some(c2 => hang(c2.it.k) && c2.along < c.along + Number(c.it.k.breedte) / 2 && c2.along + Number(c2.it.k.breedte) > c.along + Number(c.it.k.breedte) / 2)) ?? g.cabs[0];
  const tc = pick.along + Number(pick.it.k.breedte) / 2;
  doc.setLineDashPattern([3, 1.5, 0.6, 1.5], 0); doc.setDrawColor(200, 40, 40);
  doc.line(PX(tc), PY(Yt) + 2, PX(tc), PY(0) + 2); doc.setLineDashPattern([], 0);
  doc.setFontSize(8); doc.setTextColor(200, 40, 40); doc.text('A', PX(tc) + 1, PY(Yt) + 4); doc.setTextColor(0); doc.setDrawColor(0);
  const cut = items.filter(i => i.t0 <= tc && i.t1 >= tc && i.p.rol !== 'werkblad-uitsparing');
  const s2 = Math.min((secW - 30) / (Dmax + 50), (h - 2 * m - 120) / (Yt - Y0));
  const sx = w - m - secW + 10, SX = d => sx + d * s2, SY = y => base - (y - Y0) * s2;
  doc.setFontSize(12); doc.text('Doorsnede A-A', sx - 4, m + 8);
  doc.setLineWidth(0.6); doc.line(SX(0), SY(0), SX(0), SY(Yt));     // muur
  doc.line(SX(0) - 4, SY(0), SX(Dmax) + 6, SY(0));                    // vloer
  for (const i of cut.sort((a, b) => (a.p.rol === 'zijwand') - (b.p.rol === 'zijwand'))) {
    const fill = i.p.rol === 'front' || i.p.rol === 'afwerk' ? [250, 246, 238] : i.p.rol === 'werkblad' ? [205, 215, 230] : i.p.rol === 'rug' ? [215, 200, 175] : i.p.rol === 'zijwand' ? null : [235, 228, 214];
    doc.setLineWidth(i.p.rol === 'zijwand' ? 0.3 : 0.15);
    if (fill) { doc.setFillColor(...fill); doc.rect(SX(i.d0), SY(i.y1), (i.d1 - i.d0) * s2, (i.y1 - i.y0) * s2, 'FD'); } else doc.rect(SX(i.d0), SY(i.y1), (i.d1 - i.d0) * s2, (i.y1 - i.y0) * s2);
  }
  // Diepten en hoogtes in de doorsnede.
  doc.setLineWidth(0.12);
  const stacks = g.cabs.filter(c => c.along <= tc && c.along + Number(c.it.k.breedte) >= tc);
  for (const c of stacks) {
    const its = cut.filter(i => i.k === c.it.k);
    const dK = Number(c.it.k.diepte), dF = Math.max(...its.map(i => i.d1)), yTop = c.it.L.y + Number(c.it.k.hoogte);
    dimLine(doc, SX(0), SY(yTop) - 3, SX(dK), SY(yTop) - 3, fmt(dK));
    if (dF > dK + 0.5) dimLine(doc, SX(0), SY(c.it.L.y) + 4, SX(dF), SY(c.it.L.y) + 4, `${fmt(dF)} met front`);
    const pl = its.find(i => i.p.rol === 'plint');
    if (pl) dimLine(doc, SX(pl.d1), SY(pl.y0) + 3, SX(dF), SY(pl.y0) + 3, `${fmt(dF - pl.d1)} terug`);
  }
  const wt = cut.find(i => i.p.rol === 'werkblad');
  if (wt) {
    dimLine(doc, SX(wt.d0), SY(wt.y1) - 3, SX(wt.d1), SY(wt.y1) - 3, fmt(wt.d1 - wt.d0));
    const under = stacks.find(c => !hang(c.it.k));
    const front = under && Math.max(...cut.filter(i => i.k === under.it.k).map(i => i.d1));
    if (front && wt.d1 > front + 0.5) { doc.setFontSize(6); doc.text(`overstek ${fmt(wt.d1 - front)}`, SX(wt.d1) + 1, SY(wt.y1) + 2); }
    const hk = stacks.find(c => hang(c.it.k));
    if (hk) dimLine(doc, SX(Dmax) + 4, SY(wt.y1), SX(Dmax) + 4, SY(hk.it.L.y), fmt(hk.it.L.y - wt.y1));
  }
  const keyH = [0];
  for (const c of stacks) keyH.push(c.it.L.y, c.it.L.y + Number(c.it.k.hoogte));
  if (wt) keyH.push(wt.y1);
  ordinates(doc, keyH, SY, 'y', SX(Dmax) + 12, 1);
  doc.setFontSize(6.5);
  doc.text('Maten in mm. Onder: kastbreedtes en totaal, met ordinaten vanaf de muur (oorsprong). Boven: hangkasten. Links: hoogtes vanaf de vloer.', m + 4, h - m - 17);
  titleBlock(doc, [`${meta.project} · muur ${nr}`, `${g.cabs.map(c => c.it.k.code).join(', ')} · ${fmt(T1 - T0)} mm`], meta.datum);
}

/** Blad om het beslag en het bevestigingsmateriaal klaar te leggen: per soort, totaal, per kast en een vakje om af te vinken. */
function drawHardwareSheet(doc, project, S, meta) {
  const { w, h, m } = PAGE;
  const items = projectParts(project, S).filter(it => !it.res.error);
  const tot = new Map();       // naam → { aantal, per: Map(kast → aantal) }
  const addTo = (map, naam, kast, n) => { if (!map.has(naam)) map.set(naam, { aantal: 0, per: new Map() }); const e = map.get(naam); e.aantal += n; e.per.set(kast, (e.per.get(kast) ?? 0) + n); };
  for (const { k, res } of items) for (const x of res.hardware) addTo(tot, x.naam, k.code, x.aantal);
  for (const g of werkbladGeometry(project, S)) for (const x of g.hardware ?? []) addTo(tot, x.naam, g.wb.naam || 'Werkblad', x.aantal);
  const ord = new Map();
  for (const { k, res } of items) for (const x of res.bestel ?? []) addTo(ord, x.naam, k.code, x.aantal);
  // Bevestiging aan de muur (schatting volgens de opstelling).
  const grp = k => PRESETS.find(x => x.id === k.type)?.groep;
  for (const g of wallGroups(project, items)) {
    const cs = g.cabs;
    for (const c of cs) if (grp(c.it.k) !== 'Bovenkasten') addTo(tot, 'Muurbevestiging (hoek of schroef + plug)', c.it.k.code, 2);
    const hang = cs.filter(c => grp(c.it.k) === 'Bovenkasten');
    if (hang.length) {
      const len = hang.reduce((a, c) => a + Number(c.it.k.breedte), 0);
      addTo(tot, `Ophangrail (${fmt(len)} mm per rij)`, hang.map(c => c.it.k.code).join('+'), 1);
      addTo(tot, 'Plug + schroef voor de ophangrail', hang.map(c => c.it.k.code).join('+'), Math.max(2, Math.ceil(len / 300) + 1));
    }
  }
  const CATS = [
    ['Scharnieren en montageplaten', /scharnier|montageplaat|blum clip|kruisplaat/i],
    ['Lades en geleiders', /lade|geleider|legrabox|tandem|movento|frontbevestiging/i],
    ['Dempers, push en TIP-ON', /demper|push|tip-on|blumotion/i],
    ['Grepen en knoppen', /greep|knop/i],
    ['Verbinders', /clamex|tabletverbinder|verbind/i],
    ['Muurbevestiging', /muurbevestiging|ophangrail|plug/i],
    ['Deuvels en schroeven', /deuvel|schroef/i],
    ['Legplankdragers en ophangbeslag', /legplankdrager|drager|ophang/i],
    ['Plint en stelpoten', /stelpoot|plint|clip/i],
    ['Lijm en overige', /./],
  ];
  const groups = CATS.map(([t]) => [t, []]);
  for (const [naam, e] of [...tot.entries()].sort((a, b) => a[0].localeCompare(b[0]))) groups[CATS.findIndex(([, re]) => re.test(naam))][1].push([naam, e]);
  doc.setFontSize(12); doc.text('Beslag en bevestiging – klaarleggen', m + 4, m + 8);
  doc.setFontSize(7); doc.text('Totaal voor het hele project; rechts de verdeling per kast. Muurbevestiging en ophangrail zijn een schatting volgens de opstelling. Vink af wat klaarligt.', m + 4, m + 13);
  const cols = [[8, ''], [118, 'Artikel'], [20, 'Aantal'], [w - 2 * m - 8 - 156, 'Per kast']];
  let x0 = m + 4, y = m + 20;
  const colW = (w - 2 * m - 12) / 2;
  let col = 0;
  const line = (cells, bold) => {
    doc.setFontSize(bold ? 7.5 : 7); doc.setFont(undefined, bold ? 'bold' : 'normal');
    let x = x0;
    const widths = [6, colW * 0.52, 14, colW * 0.48 - 26];
    cells.forEach((c, i) => { if (c !== null) doc.text(doc.splitTextToSize(String(c), widths[i] - 1)[0] ?? '', x, y); x += widths[i]; });
    doc.setFont(undefined, 'normal');
  };
  const nextLine = (dy) => { y += dy; if (y > h - m - 22) { if (col === 0) { col = 1; x0 = m + 8 + colW; y = m + 20; } else { doc.addPage(); titleBlock(doc, [`${meta.project} · beslag (vervolg)`, ''], meta.datum); col = 0; x0 = m + 4; y = m + 14; } } };
  void cols;
  for (const [title, list] of groups) {
    if (!list.length) continue;
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.text(title, x0, y); doc.setFont(undefined, 'normal');
    doc.setLineWidth(0.15); doc.line(x0, y + 1.2, x0 + colW - 4, y + 1.2); nextLine(5);
    for (const [naam, e] of list) {
      doc.setLineWidth(0.25); doc.rect(x0, y - 2.6, 3, 3);
      const perTxt = [...e.per.entries()].map(([kk, n]) => `${kk}: ${Math.round(n * 100) / 100}`).join(', ');
      const perLines = doc.setFontSize(7) && doc.splitTextToSize(perTxt, colW * 0.48 - 28);
      line([null, naam, `${Math.round(e.aantal * 100) / 100}×`, null]);
      doc.setFontSize(7); doc.text(perLines, x0 + 6 + colW * 0.52 + 14, y);
      nextLine(4.4 + (perLines.length - 1) * 3);
    }
    nextLine(2.5);
  }
  if (ord.size) {
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.text('Te bestellen / geleverd (lades op maat, HPL, ...)', x0, y); doc.setFont(undefined, 'normal');
    doc.line(x0, y + 1.2, x0 + colW - 4, y + 1.2); nextLine(5);
    for (const [naam, e] of ord) { doc.setLineWidth(0.25); doc.rect(x0, y - 2.6, 3, 3); line([null, naam, `${e.aantal}×`, [...e.per.keys()].join(', ')]); nextLine(4.4); }
  }
  titleBlock(doc, [`${meta.project} · beslag en bevestiging`, `${[...tot.values()].reduce((a, e) => a + 1, 0)} artikelen · ${items.length} kasten`], meta.datum);
}

/** PDF met overzicht en werktekeningen voor de kasten van een project. */
function technicalDrawingPdf(project, S, kasten = project.kasten) {
  // Montagetekening op A3 liggend: plattegrond, per muur een aanzicht met doorsnede, per kast een montageblad en de lijsten.
  // (Geen tekeningen per onderdeel meer: die staan in de MPR-programma's.)
  const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const prev = { ...PAGE };
  Object.assign(PAGE, { w: 420, h: 297, m: 10 });
  try {
    const datum = new Date().toLocaleDateString('nl-BE');
    const meta = { project: project.naam, datum };
    let first = true;
    const newPage = () => { if (!first) doc.addPage(); first = false; };
    const whole = kasten === project.kasten && project.kasten.length;
    if (whole) {
      newPage(); drawPlan(doc, project, S, meta);
      const items = projectParts(project, S).filter(it => !it.res.error);
      wallGroups(project, items).forEach((g, i) => { newPage(); drawWall(doc, project, S, g, i + 1, meta); });
      newPage(); drawProjectOverview(doc, project, S, meta);
    }
    const layout = projectLayout(project);
    for (const k of kasten) {
      const res = buildCabinet(k, S);
      if (res.error) continue;
      newPage();
      drawCabinetOverview(doc, k, res, { ...meta, L: layout[project.kasten.indexOf(k)] });
    }
    if (whole) { newPage(); drawProjectAssembly(doc, project, S, meta); newPage(); drawHardwareSheet(doc, project, S, meta); }
    if (first) { doc.text('Geen kasten om te tekenen.', 20, 20); }
    return { blob: doc.output('blob'), name: `${safeName(project.naam)} - montagetekening.pdf` };
  } finally {
    Object.assign(PAGE, prev);
  }
}

// MARK: - Scancodes (reserve als een etiket ontbreekt)

/** Code 128 (set B): breedtes van balken en spaties (in modules), inclusief start, controlegetal en stop. */
const CODE128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232',
  '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221',
  '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113',
  '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123',
  '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221',
  '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241',
  '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311',
  '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
function code128Widths(text) {
  const vals = [...String(text)].map(ch => Math.min(95, Math.max(0, ch.charCodeAt(0) - 32)));
  const check = (104 + vals.reduce((a, v, i) => a + v * (i + 1), 0)) % 103;
  return [104, ...vals, check, 106].map(v => CODE128[v]).join('').split('').map(Number);
}
/** Barcode tekenen: x, y linksboven, module = breedte van de smalste balk (mm), h = hoogte. Geeft de breedte terug. */
function drawCode128(doc, text, x, y, module, h) {
  const ws = code128Widths(text);
  let cx = x + 10 * module;                     // stille zone
  doc.setFillColor(0);
  ws.forEach((w, i) => { if (i % 2 === 0) doc.rect(cx, y, w * module, h, 'F'); cx += w * module; });
  return cx - x + 10 * module;
}

/**
 * PDF met alle scancodes van het project (zoals op de etiketten van de zaag): per stuk de barcode van programma 1 en,
 * als er een tweede zijde is, programma 2, met kast, onderdeel, maat, plaat en aantal. Voor als een etiket weg is.
 * entries: [{ kast, naam, L, B, mat, aantal, codes: [tekst1, tekst2?] }]
 */
function scanCodesPdf(projectNaam, entries) {
  const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, m = 10, colW = (W - 2 * m) / 2, rowH = 39;
  const perCol = Math.floor((H - 2 * m - 12) / rowH);
  const datum = new Date().toLocaleDateString('nl-BE');
  let page = 0;
  const header = () => {
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`Scancodes ${projectNaam}`, m, m + 4);
    doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.text(`${datum} · pagina ${page + 1} · voor als een etiket ontbreekt`, W - m, m + 4, { align: 'right' });
  };
  header();
  entries.forEach((e, i) => {
    const slot = i % (perCol * 2);
    if (i > 0 && slot === 0) { doc.addPage(); page++; header(); }
    const col = Math.floor(slot / perCol), row = slot % perCol;
    const x = m + col * colW, y = m + 10 + row * rowH;
    doc.setDrawColor(200); doc.setLineWidth(0.2); doc.rect(x + 1, y, colW - 2, rowH - 2);
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text(`${e.kast} · ${e.naam}`.slice(0, 48), x + 3, y + 4.5);
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.text(`${fmt(e.L)} × ${fmt(e.B)} · ${e.mat}${e.aantal > 1 ? ` · ${e.aantal}×` : ''}`.slice(0, 70), x + 3, y + 8.2);
    // Aanslag en volgorde van afplakken (rechtsboven in het vak).
    const kant = [e.kant?.aanslag?.length ? `Aanslag: ${e.kant.aanslag.join(' + ').toLowerCase()}` : '', e.kant?.plak?.length ? `Plakken: ${e.kant.plak.map((n, k) => `${k + 1} ${n.toLowerCase()}`).join(', ')}` : ''].filter(Boolean);
    doc.setFontSize(6.8);
    kant.forEach((t, k) => doc.text(doc.splitTextToSize(t, colW - 8)[0], x + 3, y + 11.4 + k * 3));
    const n = e.codes.length;
    e.codes.forEach((c, j) => {
      const bh = n > 1 ? 6 : 13, by = y + 16.2 + j * (bh + 5.8);     // twee barcodes: duidelijk uit elkaar
      const len = code128Widths(c).reduce((a, b) => a + b, 0) + 20;
      const module = Math.min(0.33, (colW - 8) / len);
      drawCode128(doc, c, x + 3, by, module, bh);
      doc.setFontSize(7); doc.text(`${n > 1 ? (j ? 'zijde B: ' : 'zijde A: ') : ''}${c}`, x + 3, by + bh + 2.8);
    });
  });
  if (!entries.length) { doc.setFontSize(10); doc.text('Geen stukken met een programma.', m, m + 16); }
  return { blob: doc.output('blob'), name: `${safeName(projectNaam)} - scancodes.pdf` };
}
