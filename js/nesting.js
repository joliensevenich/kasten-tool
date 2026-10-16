'use strict';
// Zaagplan: onderdelen op platen schikken met rechte, doorgaande zaagsneden (zoals op een plaatzaag).
// Methode: guillotine-schikking (vrije rechthoeken, "best short side fit", splitsen langs de kortste rest).
// Plaatcoördinaten: X langs de lengte van de plaat (= nerf), Y langs de breedte.

const NEST_DEFAULTS = { plaatLengte: 2800, plaatBreedte: 2070, hplLengte: 3050, hplBreedte: 1300, trespaLengte: 3050, trespaBreedte: 1530, buigLengte: 2500, buigBreedte: 1220, zaagsnede: 4, randafzaag: 10, stripVul: 50 };
// Naam van het plaattype in de platendatabank van HPO (Schelling-zaag): {decor} en {dikte} worden ingevuld.
const HPO_DEFAULTS = { hpoMelamine: 'MEL_{decor}_{dikte}', hpoHpl: 'OPG_{decor}_{dikte}', hpoTrespa: 'TRESPA_{dikte}', hpoBuig: 'BUIGTRIPLEX_{dikte}', hpoMultiplex: 'MULTIPLEX_{dikte}' };

/** Plaatmaat volgens het plaattype: HPL heeft een eigen standaardformaat. */
function sheetSize(N, plaattype) {
  if (plaattype === 'HPL') return { ...N, plaatLengte: N.hplLengte, plaatBreedte: N.hplBreedte };
  if (plaattype === 'Trespa') return { ...N, plaatLengte: N.trespaLengte ?? 3050, plaatBreedte: N.trespaBreedte ?? 1530 };
  if (plaattype === 'Buigtriplex') return { ...N, plaatLengte: N.buigLengte ?? 2500, plaatBreedte: N.buigBreedte ?? 1220 };
  return N;
}

/** Houtdecor: nerf moet in de lengte van de plaat blijven (niet draaien). */
function isWoodDecor(code, decors) {
  const d = decors.find(x => x.code === code);
  return d?.hout ?? /^H/i.test(code ?? '');
}

/**
 * Stukken voor het zaagplan per materiaal. Fronten met doorlopende houtstructuur worden één samengesteld stuk,
 * met de fronten op hun echte plaats ten opzichte van elkaar.
 * Geeft Map(materiaal → [{ label, L, B, rotate, parts?: [{label, x, y, L, B}] }]).
 */
function nestingItems(project, S, labelOf, kerf = 0) {
  const groups = new Map();
  const push = (key, item) => { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); };
  const sets = [];        // [{ key, fronts: [{ label, x (positie in de hoogte), y (positie in de breedte), L, B }] }]
  let current = null;
  let offset = 0;         // positie van de kast in de rij (voor doorlopend met de vorige kast)
  for (const { k, res, parts } of projectParts(project, S)) {
    const W = Number(k.breedte) || 0;
    if (res.error) { offset += W; continue; }
    const mode = k.houtDoorlopend ?? 'nee';
    if (mode !== 'vorige' || !current) current = null;
    for (const p of sawParts(parts, S).filter(q => !q.nietZagen)) {
      const c = cutInfo(p);
      const key = labelOf(p);
      const wood = isWoodDecor(p.decor, S.decors);
      const label = `${p.kastLabel ?? k.code} ${p.naam}`;
      if (p.rol === 'front' && mode !== 'nee' && wood) {
        if (!current || current.key !== key) { current = { key, fronts: [] }; sets.push(current); }
        // Fronten: nerf langs de hoogte → X van de plaat = hoogte, Y = breedte in de rij.
        current.fronts.push({ label, x: p.box.y, y: offset + p.box.x, L: c.L, B: c.B });
        continue;
      }
      push(key, { label, L: c.L, B: c.B, rotate: !wood && !p.vasteRichting });   // buigtriplex: buigrichting vast
    }
    if (mode === 'nee') current = null;
    offset += W;
  }
  for (const g of werkbladGeometry(project, S)) for (const p of g.parts.filter(q => (q.rol === 'werkblad' || q.rol === 'spatwand') && q.materiaal === 'plaat')) {
    const c = cutInfo(p);
    push(labelOf(p), { label: `Werkblad ${p.naam}`, L: c.L, B: c.B, rotate: !isWoodDecor(p.decor, S.decors) });
  }
  for (const pn of project.panelen ?? []) {
    const p = panelPartFull(pn, S);
    const c = cutInfo(p);
    push(labelOf(p), { label: `Afwerking ${p.naam}`, L: c.L, B: c.B, rotate: !isWoodDecor(p.decor, S.decors) });
  }
  sets.forEach((set, i) => {
    // Bij elke overgang tussen twee rijen of kolommen fronten komt er een zaagsnede bij.
    const xs = [...new Set(set.fronts.map(f => Math.round(f.x)))].sort((a, b) => a - b);
    const ys = [...new Set(set.fronts.map(f => Math.round(f.y)))].sort((a, b) => a - b);
    for (const f of set.fronts) { f.x += xs.indexOf(Math.round(f.x)) * kerf; f.y += ys.indexOf(Math.round(f.y)) * kerf; }
    const x0 = Math.min(...set.fronts.map(f => f.x)), y0 = Math.min(...set.fronts.map(f => f.y));
    const x1 = Math.max(...set.fronts.map(f => f.x + f.L)), y1 = Math.max(...set.fronts.map(f => f.y + f.B));
    push(set.key, {
      label: `Fronten met doorlopende nerf (set ${i + 1})`, L: x1 - x0, B: y1 - y0, rotate: false, set: i + 1,
      parts: set.fronts.map(f => ({ ...f, x: f.x - x0, y: f.y - y0 })),
    });
  });
  return groups;
}

/**
 * Zaaglogica van een plaatzaag: eerst stroken over de lengte van de plaat (stukken met dezelfde breedte samen),
 * dan elke strook dwars in stukken (langste eerst). Een iets smaller stuk (tot stripVul mm) mag een strook opvullen
 * met één bijsnede. Liever een logisch zaagplan dan het minste afval.
 */
function nestStrips(items, N) {
  const L = N.plaatLengte, B = N.plaatBreedte, k = N.zaagsnede, trim = N.randafzaag;
  const Lu = L - 2 * trim, Bu = B - 2 * trim, fill = N.stripVul ?? 50;
  const tooBig = [];
  // Ligging: nerf (niet draaibaar) in de lengte; unikleur met de lange kant in de lengte (smalste strook).
  const prepared = [];
  for (const it of items) {
    let len = it.L, wid = it.B, rot = false;
    if (it.rotate && it.B > it.L) { len = it.B; wid = it.L; rot = true; }
    if (len > Lu + 0.01 || wid > Bu + 0.01) {
      if (it.rotate && !rot && it.B <= Lu && it.L <= Bu) { len = it.B; wid = it.L; rot = true; } else { tooBig.push(it); continue; }
    }
    prepared.push({ it, len, wid, rot });
  }
  prepared.sort((a, b) => b.wid - a.wid || b.len - a.len);
  const strips = [];   // { w, used, parts: [{ p, x }] }
  const room = (st, len) => st.used + (st.parts.length ? k : 0) + len <= Lu + 0.01;
  for (const pr of prepared) {
    let st = strips.find(s => Math.abs(s.w - pr.wid) < 0.6 && room(s, pr.len));
    if (!st) st = strips.find(s => s.w > pr.wid && s.w - pr.wid <= fill && room(s, pr.len));
    if (!st) { st = { w: pr.wid, used: 0, parts: [] }; strips.push(st); }
    const x = st.used + (st.parts.length ? k : 0);
    st.parts.push({ pr, x });
    st.used = x + pr.len;
  }
  // Stroken op platen: breedste eerst, gelijke breedtes naast elkaar.
  strips.sort((a, b) => b.w - a.w);
  const sheets = [];
  for (const st of strips) {
    let sh = sheets.find(s => s.usedB + (s.strips.length ? k : 0) + st.w <= Bu + 0.01);
    if (!sh) { sh = { strips: [], usedB: 0, placed: [] }; sheets.push(sh); }
    const y = sh.usedB + (sh.strips.length ? k : 0);
    sh.strips.push({ y: trim + y, w: st.w, n: sh.strips.length + 1 });
    sh.usedB = y + st.w;
    for (const { pr, x } of st.parts) sh.placed.push({ ...pr.it, x: trim + x, y: trim + y, w: pr.len, h: pr.wid, rotated: pr.rot });
  }
  for (const s of sheets) s.usage = s.placed.reduce((t, p) => t + p.w * p.h, 0) / (L * B);
  return { sheets, tooBig };
}

/** Schikt stukken op platen. Geeft { sheets: [{ placed: [...] }], tooBig: [...] }. */
function nest(items, N) {
  if ((N.methode ?? 'stroken') === 'stroken') return nestStrips(items, N);
  const L = N.plaatLengte, B = N.plaatBreedte, k = N.zaagsnede, trim = N.randafzaag;
  const usableL = L - 2 * trim, usableB = B - 2 * trim;
  const sheets = [];
  const tooBig = [];
  const newSheet = () => { const s = { free: [{ x: trim, y: trim, w: usableL, h: usableB }], placed: [] }; sheets.push(s); return s; };
  const fits = (it, w, h) => w <= usableL + 0.01 && h <= usableB + 0.01;

  // Grootste stukken eerst (op langste zijde, dan oppervlakte).
  const order = [...items].sort((a, b) => Math.max(b.L, b.B) - Math.max(a.L, a.B) || b.L * b.B - a.L * a.B);
  for (const it of order) {
    const options = [[it.L, it.B, false]];
    if (it.rotate) options.push([it.B, it.L, true]);
    if (!options.some(([w, h]) => fits(it, w, h))) { tooBig.push(it); continue; }
    let best = null;
    for (const sheet of sheets) {
      for (const [ri, r] of sheet.free.entries()) {
        for (const [w, h, rot] of options) {
          if (w <= r.w + 0.01 && h <= r.h + 0.01) {
            const score = Math.min(r.w - w, r.h - h);
            if (!best || score < best.score) best = { sheet, ri, w, h, rot, score };
          }
        }
      }
    }
    if (!best) {
      const sheet = newSheet();
      const [w, h, rot] = options.find(([w, h]) => fits(it, w, h));
      best = { sheet, ri: 0, w, h, rot };
    }
    const { sheet, ri, w, h, rot } = best;
    const r = sheet.free[ri];
    sheet.placed.push({ ...it, x: r.x, y: r.y, w, h, rotated: rot });
    // Splitsen langs de kortste rest; de zaagsnede hoort bij het geplaatste stuk.
    const wk = Math.min(w + k, r.w), hk = Math.min(h + k, r.h);
    const wRem = r.w - wk, hRem = r.h - hk;
    const parts = wRem < hRem
      ? [{ x: r.x + wk, y: r.y, w: wRem, h: hk }, { x: r.x, y: r.y + hk, w: r.w, h: hRem }]
      : [{ x: r.x + wk, y: r.y, w: wRem, h: r.h }, { x: r.x, y: r.y + hk, w: wk, h: hRem }];
    sheet.free.splice(ri, 1, ...parts.filter(p => p.w > 1 && p.h > 1));
  }
  for (const s of sheets) {
    const area = s.placed.reduce((t, p) => t + p.w * p.h, 0);
    s.usage = area / (L * B);
  }
  return { sheets, tooBig };
}
