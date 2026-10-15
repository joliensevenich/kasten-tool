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
  const plain = all.filter(p => !p.ops.length && p.rol !== 'zijwand');
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

/** PDF met overzicht en werktekeningen voor de kasten van een project. */
function technicalDrawingPdf(project, S, kasten = project.kasten) {
  const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const datum = new Date().toLocaleDateString('nl-BE');
  let first = true;
  const newPage = () => { if (!first) doc.addPage(); first = false; };
  if (kasten === project.kasten && project.kasten.length) {
    newPage(); drawProjectOverview(doc, project, S, { project: project.naam, datum });
    newPage(); drawProjectAssembly(doc, project, S, { project: project.naam, datum });
  }
  const layout = projectLayout(project);
  for (const k of kasten) {
    const res = buildCabinet(k, S);
    if (res.error) continue;
    newPage();
    drawCabinetOverview(doc, k, res, { project: project.naam, datum, L: layout[project.kasten.indexOf(k)] });
    const names = mprNames(k.code, res.parts);
    for (const p of res.parts) {
      if (!names.has(p.id)) continue;
      const info = partMachining(p);
      const meta = { project: project.naam, kast: k.code, naam: p.naam, datum, mpr: `${names.get(p.id)}${info.ops.B.length ? '_A' : ''}.mpr`,
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
