'use strict';
// Schets inlezen: een foto van een handgetekend vooraanzicht (niet op schaal, maten erbij geschreven) wordt door Claude
// gelezen en omgezet in gewone kasten. Eerst een lijst om na te kijken, dan worden de kasten gemaakt zoals met de hand.

// MARK: - Codes op de schets

const SCHETS_CODES = [
  ['O', 'Onderkast', 'onderkast'],
  ['H', 'Hangkast (bovenkast)', 'hangkast, bovenkast'],
  ['K', 'Kolomkast (hoge kast)', 'kolomkast, hoge kast'],
  ['D1 / D2', '1 of 2 deuren', 'deur, 2 deuren'],
  ['L3', '3 lades', '3 lades'],
  ['L2+1', '2 lades boven, 1 grote onder', '2 lades + 1 grote'],
  ['KL', 'Klepdeur (hangkast)', 'klep'],
  ['OPEN', 'Zonder fronten (open kast)', 'open kast'],
  ['G', 'Greeploos (greeplijst)', 'greeploos'],
  ['SP', 'Spoelbakkast', 'spoelbak'],
  ['KP', 'Kookplaat (met lades)', 'kookplaat'],
  ['OV', 'Oven', 'oven'],
  ['MG', 'Microgolf', 'microgolf'],
  ['KK', 'Koelkast', 'koelkast'],
  ['WM / DK', 'Wasmachine / droogkast', 'wasmachine, droogkast'],
  ['X VW', 'Open ruimte, bv. vaatwasser (geen kast)', 'vaatwasser, vrij'],
  ['P50', 'Paslat van 50 mm', 'paslat 50'],
  ['ZP', 'Zijpaneel (afwerkpaneel) aan de zijkant', 'zijpaneel, afwerkpaneel'],
  ['LP2', '2 legplanken', '2 legplanken'],
];

// Gangbare korpusmaten als de schets en het project niets zeggen.
const SCHETS_STANDAARD = { onder: { hoogte: 720, diepte: 560 }, kolom: { hoogte: 2100, diepte: 560 }, hang: { hoogte: 700, diepte: 350 } };

const TOESTEL_NIS = { Oven: 590, Microgolf: 450, Koelkast: 1780, Wasmachine: 870, Droogkast: 870, Toestel: 590 };

const SCHETS_PROMPT = `Je leest een handgetekende schets van keukenkasten of kasten (vooraanzicht per wand, van links naar rechts).
Het vooraanzicht is vaak in perspectief getekend: dan zie je ook de zijkanten en de diepte. Een dik getekende of gearceerde
zijkant, of een paneel dat tot de vloer of tot het werkblad loopt naast een kast, is een zijpaneel (afwerkpaneel); zet dan
"zijpaneelLinks" / "zijpaneelRechts" op true bij die kast. Een maat langs een schuine (wijkende) lijn is de diepte.
Kijk naar de voorkanten voor de breedtes en de indeling; de zijkanten in perspectief zijn geen aparte kasten.
De schets is NIET op schaal: gebruik alleen de geschreven maten (mm; "60" of "60 cm" betekent 600 mm), nooit de getekende grootte.
Op de schets staan per kast codes of gewone woorden (door elkaar mogelijk):
${SCHETS_CODES.map(([c, n, w]) => `- ${c}: ${n} (of in woorden: ${w})`).join('\n')}
Een vak met een kruis (X) of "vrij" is een open ruimte zonder kast (bv. vaatwasser); geef die met soort "leeg".
Een smal vakje met P en een getal is een paslat (soort "paslat", breedte = het getal).
Hoogtes staan meestal één keer per rij met een maatlijn aan de zijkant; diepte vaak één keer ("diepte 560", "D 560").

Antwoord ALLEEN met JSON, zonder uitleg, in deze vorm:
{
  "wanden": [{
    "naam": "Wand 1",
    "kasten": [{
      "rij": "onder" | "boven",          // onder = op de vloer (onderkasten EN kolomkasten), boven = hangkasten
      "soort": "onder" | "hang" | "kolom" | "leeg" | "paslat",
      "x": getal,                        // begin vanaf de linkerkant van de wand in mm, afgeleid uit de maten (niet uit de tekening)
      "breedte": getal | null, "hoogte": getal | null, "diepte": getal | null,
      "vakken": [                        // van BOVEN naar ONDER; leeg laten voor leeg/paslat
        { "type": "deur", "deuren": 1 | 2 | null, "legplanken": getal | null, "hoogte": getal | null },
        { "type": "lade", "aantal": getal, "hoogte": getal | null },
        { "type": "klep", "legplanken": getal | null, "hoogte": getal | null },
        { "type": "open", "legplanken": getal | null, "hoogte": getal | null },
        { "type": "toestel", "naam": "Oven" | "Microgolf" | "Koelkast" | "Wasmachine" | "Droogkast" | "Toestel", "nis": getal | null, "hoogte": getal | null }
      ],
      "open": true | false,              // OPEN: zonder fronten
      "greeploos": true | false,
      "spoelbak": true | false,
      "zijpaneelLinks": true | false, "zijpaneelRechts": true | false,
      "tekst": "wat er letterlijk bij de kast staat",
      "onzeker": "kort wat je niet zeker kon lezen, anders null"
    }]
  }],
  "plintHoogte": getal | null,
  "bovenOnderkant": getal | null,        // hoogte van de onderkant van de hangkasten boven de vloer, als die er staat
  "hoogteTotVloer": true | false,        // true als de hoogtematen van onder- en kolomkasten tot de vloer lopen (met plint)
  "opmerkingen": ["algemene opmerkingen of twijfels"]
}
Regels: in de bovenrij geef je "x" zo dat een hangkast boven de juiste onderkast staat (gelijk met de randen waar de schets dat toont).
Kolomkasten staan in de rij "onder". Een onderkast zonder vakken-info: één vak "deur". Lades L2+1 = vak lade aantal 2 en daaronder vak lade aantal 1 (groot).
Kookplaat (KP) zonder verdere info: 2 lades. Spoelbak (SP): vak deur en "spoelbak": true.`;

// MARK: - Voorbeeldblad (PDF)

function schetsVoorbeeldPdf() {
  const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ink = () => doc.setDrawColor(20, 40, 110), txt = () => doc.setTextColor(20, 40, 110);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Schets voor de Kasten tool: voorbeeld', 15, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(60);
  doc.text(doc.splitTextToSize('Teken per wand een vooraanzicht van links naar rechts, op gewoon papier. Niet op schaal: de app gebruikt alleen de maten die je erbij schrijft. '
    + 'Zet in elke kast een code (of gewone woorden) en de breedte eronder. Hoogte één keer per rij aan de zijkant, diepte één keer per rij. '
    + 'In perspectief tekenen mag: dan ziet de app ook zijpanelen (ZP) en de diepte langs de schuine lijn. '
    + 'Neem de foto recht van boven, met goed licht, het hele blad in beeld.', 180), 15, 25);

  // Voorbeeldtekening (bewust niet op schaal)
  ink(); txt(); doc.setLineWidth(0.5);
  const y0 = 131, bx = 24;                    // vloerlijn onderkasten (bovenkant plint)
  const onder = [['O L3', 600, 28], ['O D2 SP', 800, 34], ['X VW', 600, 22], ['O KP', 900, 36], ['P50', 50, 6]];
  let x = bx;
  const hO = 30;
  doc.setFontSize(10);
  for (const [code, w, pw] of onder) {
    if (code.startsWith('X')) { doc.setLineDashPattern([1.5, 1.2], 0); doc.rect(x, y0 - hO, pw, hO); doc.line(x, y0 - hO, x + pw, y0); doc.line(x + pw, y0 - hO, x, y0); doc.setLineDashPattern([], 0); }
    else doc.rect(x, y0 - hO, pw, hO);
    if (code === 'O L3') for (let i = 1; i < 3; i++) doc.line(x, y0 - hO + i * hO / 3, x + pw, y0 - hO + i * hO / 3);
    if (code === 'O KP') doc.line(x, y0 - hO / 2, x + pw, y0 - hO / 2);
    doc.setFont('helvetica', 'bold');
    if (code === 'P50') doc.text('P', x + pw / 2, y0 - hO / 2, { align: 'center' });
    else {
      // label in een vrij stuk: bovenste lade / bovenste helft, met witte achtergrond (ook over het kruis)
      const ty = code === 'O L3' ? y0 - hO + hO / 6 + 1.3 : code === 'O KP' ? y0 - hO + hO / 4 + 1.3 : y0 - hO / 2 + 1.3;
      const tw = doc.getTextWidth(code) + 2;
      doc.setFillColor(255, 255, 255); doc.rect(x + pw / 2 - tw / 2, ty - 3.6, tw, 4.8, 'F');
      doc.text(code, x + pw / 2, ty, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal');
    doc.text(String(w), x + pw / 2, y0 + 6, { align: 'center' });
    x += pw;
  }
  // kolomkast rechts
  const kw = 26, kh = 82;
  doc.rect(x, y0 - kh, kw, kh); doc.line(x, y0 - 56, x + kw, y0 - 56); doc.line(x, y0 - 40, x + kw, y0 - 40);
  doc.setFont('helvetica', 'bold'); doc.text('K', x + kw / 2, y0 - 68, { align: 'center' }); doc.text('OV', x + kw / 2, y0 - 47, { align: 'center' }); doc.text('MG', x + kw / 2, y0 - 30, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.text('600', x + kw / 2, y0 + 6, { align: 'center' });
  const xEnd = x + kw;
  // hangkasten boven (met een gat boven de kookplaat)
  const yh = y0 - hO - 18, hh = 24;
  const boven = [['H D1', 600, 28], ['H D2', 800, 34], ['H KL', 600, 22]];
  x = bx;
  for (const [code, w, pw] of boven) {
    doc.rect(x, yh - hh, pw, hh);
    doc.setFont('helvetica', 'bold'); doc.text(code, x + pw / 2, yh - hh / 2 + 1, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text(String(w), x + pw / 2, yh + 4.5, { align: 'center' });
    x += pw;
  }
  doc.setFontSize(8); doc.text(['(dampkap:', 'geen kast)'], x + 13, yh - hh / 2, { align: 'center' });
  doc.setFontSize(10);
  doc.rect(x + 26, yh - hh, 14, hh); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(['H', 'OPEN'], x + 33, yh - hh / 2 - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('400', x + 33, yh + 4.5, { align: 'center' });
  // Perspectief: bovenvlak van de onderkasten, zijkant van de kolomkast, zijpaneel links (ZP).
  const ox = 9, oy = -6;
  doc.line(bx, y0 - hO, bx + ox, y0 - hO + oy);
  doc.line(bx + ox, y0 - hO + oy, xEnd - kw, y0 - hO + oy);
  doc.line(xEnd, y0, xEnd + ox, y0 + oy); doc.line(xEnd, y0 - kh, xEnd + ox, y0 - kh + oy); doc.line(xEnd + ox, y0 + oy, xEnd + ox, y0 - kh + oy);
  doc.line(xEnd - kw, y0 - kh, xEnd - kw + ox, y0 - kh + oy); doc.line(xEnd - kw + ox, y0 - kh + oy, xEnd + ox, y0 - kh + oy);
  doc.setFontSize(8.5); doc.text('560', xEnd + ox / 2 + 1.5, y0 + oy / 2 + 3.5, { angle: Math.atan2(-oy, ox) * 180 / Math.PI });
  // zijpaneel: dik, gearceerd, tot de vloer
  const zx = bx - 3;
  doc.rect(zx, y0 - hO, 3, hO + 8);
  for (let yy = y0 - hO + 2; yy < y0 + 8; yy += 2.5) doc.line(zx, yy, zx + 3, yy - 2);
  doc.line(zx, y0 - hO, zx + ox, y0 - hO + oy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('ZP', zx - 1, y0 - hO - 2, { align: 'right' }); doc.setFont('helvetica', 'normal');
  // maatlijnen hoogte
  const dim = (xx, ya, yb, label) => { doc.line(xx, ya, xx, yb); doc.line(xx - 1.5, ya, xx + 1.5, ya); doc.line(xx - 1.5, yb, xx + 1.5, yb); doc.text(label, xx - 2, (ya + yb) / 2, { angle: 90, align: 'center' }); };
  dim(bx - 9, y0, y0 - hO, '720');
  dim(bx - 9, yh, yh - hh, '700');
  dim(xEnd + ox + 6, y0 + oy, y0 - kh + oy, '2100');
  doc.line(bx - 12, y0 + 9, xEnd + 16, y0 + 9);
  doc.setFontSize(9); doc.text('vloer', xEnd + 12, y0 + 12, { align: 'right' });
  doc.text('plint 100   ·   diepte onder 560   ·   diepte boven 350   ·   onderkant hangkasten 1400', bx, y0 + 17);
  doc.setTextColor(120); doc.setFontSize(8);
  doc.text('Getekend zonder schaal: de 50 mm paslat mag even breed lijken als een kast, de breedte staat eronder.', bx, y0 + 22);

  // Codelijst
  let y = 163;
  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Codes (of schrijf gewone woorden)', 15, y);
  y += 6; doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold'); doc.text('Code', 15, y); doc.text('Betekenis', 42, y); doc.text('In woorden mag ook', 120, y);
  doc.setLineWidth(0.2); doc.setDrawColor(150); doc.line(15, y + 1.5, 195, y + 1.5);
  doc.setFont('helvetica', 'normal');
  for (const [c, n, w] of SCHETS_CODES) { y += 4.8; doc.setFont('helvetica', 'bold'); doc.text(c, 15, y); doc.setFont('helvetica', 'normal'); doc.text(n, 42, y); doc.setTextColor(90); doc.text(w, 120, y); doc.setTextColor(0); }
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.text('Combineren:', 15, y); doc.setFont('helvetica', 'normal');
  const uitleg = ['O L3 = onderkast met 3 lades  ·  K OV MG = kolomkast met oven en microgolf  ·  H D2 G = hangkast met 2 deuren, greeploos.',
    'In woorden bv.: "onderkast 3 lades 600", "hoge kast oven + microgolf", "open bovenkast 2 legplanken".',
    'De vakken van een hoge kast teken je van boven naar onder met een streep ertussen, met de code in elk vak.'];
  for (const u of uitleg) for (const l of doc.splitTextToSize(u, 153)) { doc.text(l, 42, y); y += 4.6; }
  return { blob: doc.output('blob'), name: 'Schets voorbeeld.pdf' };
}

// MARK: - Foto lezen met Claude

const SCHETS_KEY = 'kasten.claudeKey', SCHETS_MODEL = 'kasten.claudeModel';
const schetsGet = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const schetsSet = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* geen opslag */ } };

/** Foto verkleinen (lange zijde max 1800 px) en als JPEG base64 teruggeven. */
async function schetsImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('De foto kan niet geopend worden.')); i.src = url; });
    const sc = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    return { dataUrl, base64: dataUrl.split(',')[1] };
  } finally { URL.revokeObjectURL(url); }
}

async function schetsLezen(base64, key, model) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model, max_tokens: 8000, system: SCHETS_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }, { type: 'text', text: 'Lees deze schets en geef de JSON.' }] }] }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = body?.error?.message || `HTTP ${r.status}`;
    throw new Error(r.status === 401 ? 'De API-sleutel klopt niet.' : r.status === 429 ? 'Te veel aanvragen of geen tegoed meer op je API-account.' : msg);
  }
  const text = (body.content ?? []).filter(c => c.type === 'text').map(c => c.text).join('');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Het antwoord bevat geen kasten.');
  return JSON.parse(text.slice(a, b + 1));
}

// MARK: - Van gelezen schets naar kasten

const num0 = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Preset-id voor een gelezen kast. */
function schetsPreset(it) {
  const eerst = it.vakken?.[0]?.type;
  if (it.soort === 'hang') return eerst === 'klep' ? 'boven-klep' : 'boven-deuren';
  if (it.soort === 'kolom') return 'kolom';
  if (it.spoelbak) return 'spoelbak';
  return it.greeploos ? 'onder-greeploos' : 'onder-greep';
}

/** Vakken van de schets → secties van de kast. */
function schetsSecties(it) {
  const out = [];
  for (const v of it.vakken ?? []) {
    const h = num0(v.hoogte);
    if (v.type === 'lade') out.push(sec('lade', { lades: Math.max(1, num0(v.aantal) ?? 1), hoogte: h }));
    else if (v.type === 'toestel') {
      const naam = TOESTEL_NIS[v.naam] ? v.naam : 'Toestel';
      out.push(sec('toestel', { toestel: naam, nis: num0(v.nis) ?? TOESTEL_NIS[naam], hoogte: h }));
    } else if (v.type === 'klep') out.push(sec('klep', { legplanken: num0(v.legplanken) ?? 1, hoogte: h }));
    else if (v.type === 'open') out.push(sec('open', { legplanken: num0(v.legplanken) ?? 1, hoogte: h }));
    else out.push(sec('deur', { legplanken: num0(v.legplanken) ?? (it.soort === 'hang' ? 2 : 1), hoogte: h }));
  }
  // Lades onderaan een kolom- of onderkast: één ladevak met alle lades als ze elkaar volgen.
  return out;
}

/** Korte omschrijving van de vakken voor de controlelijst. */
function schetsVakTekst(it) {
  if (it.soort === 'leeg') return 'open ruimte (geen kast)';
  if (it.soort === 'paslat') return 'paslat';
  return (it.vakken ?? []).map(v => v.type === 'lade' ? `${v.aantal ?? 1} lade${(v.aantal ?? 1) > 1 ? 's' : ''}` : v.type === 'toestel' ? (v.naam || 'toestel')
    : v.type === 'deur' ? `${v.deuren === 2 ? '2 deuren' : v.deuren === 1 ? '1 deur' : 'deur(en)'}` : v.type === 'klep' ? 'klep' : 'open vak').join(' / ')
    + (it.spoelbak ? ' · spoelbak' : '') + (it.greeploos ? ' · greeploos' : '') + (it.open ? ' · zonder fronten' : '')
    + (it.zijpaneelLinks ? ' · zijpaneel links' : '') + (it.zijpaneelRechts ? ' · zijpaneel rechts' : '');
}

/** Kasten maken in het project. opts: { plint, totVloer, bovenOnderkant } */
function schetsMaakKasten(p, data, opts) {
  const made = [];
  let wandX = 0;
  for (const wand of data.wanden ?? []) {
    const items = (wand.kasten ?? []).filter(it => !it._weg);
    const rijOnder = items.filter(it => it.rij !== 'boven' && it.soort !== 'hang');
    const rijBoven = items.filter(it => it.rij === 'boven' || it.soort === 'hang');
    // Onderrij: posities uit de breedtes na elkaar (de schets is niet op schaal); paslatten horen bij de buurkast.
    // Maten die maar één keer per rij op de schets staan, gelden voor de hele rij.
    const eerste = (pred, key) => num0(items.find(it => pred(it) && num0(it[key]) !== null)?.[key]);
    const rijMaat = {
      onder: { hoogte: eerste(it => it.soort === 'onder', 'hoogte'), diepte: eerste(it => it.soort === 'onder' || it.soort === 'kolom', 'diepte') },
      kolom: { hoogte: eerste(it => it.soort === 'kolom', 'hoogte'), diepte: eerste(it => it.soort === 'kolom' || it.soort === 'onder', 'diepte') },
      hang: { hoogte: eerste(it => it.soort === 'hang', 'hoogte'), diepte: eerste(it => it.soort === 'hang', 'diepte') },
    };
    const placed = [];
    let x = 0, wandBreedte = 0;
    const plaats = (rij, boven) => {
      let cx = 0, prev = null, pendingLinks = 0;
      for (const it of rij) {
        const w = num0(it.breedte) ?? 0;
        if (boven && num0(it.x) !== null) cx = Math.max(cx, num0(it.x));
        if (it.soort === 'paslat') {
          if (prev && !prev.k.paslat?.rechts) prev.k.paslat = { ...(prev.k.paslat ?? {}), rechts: w };
          else pendingLinks = w;
          cx += w; continue;
        }
        if (it.soort === 'leeg') { cx += w; prev = null; continue; }
        const k = createCabinet(p, schetsPreset(it));
        const eigen = new Set(k.eigen ?? []);
        const secs = schetsSecties(it);
        if (secs.length) k.secties = secs;
        const deur = (it.vakken ?? []).find(v => v.type === 'deur' && v.deuren);
        if (deur) { k.deuren = String(deur.deuren); }
        if (it.greeploos) { k.greep = 'greeplijst'; eigen.add('greep'); }
        if (it.open) k.zonderFronten = true;
        if (it.zijpaneelLinks || it.zijpaneelRechts) k.zijpaneel = { links: !!it.zijpaneelLinks, rechts: !!it.zijpaneelRechts };
        if (pendingLinks) { k.paslat = { ...(k.paslat ?? {}), links: pendingLinks }; pendingLinks = 0; }
        if (w) k.breedte = w;
        const isOnderOfKolom = it.soort !== 'hang';
        if (isOnderOfKolom && opts.plint != null) { k.plintHoogte = opts.plint; eigen.add('plintHoogte'); }
        const rm = rijMaat[it.soort] ?? {};
        let h = num0(it.hoogte) ?? rm.hoogte;
        if (h && isOnderOfKolom && opts.totVloer && k.plint !== 'geen') h -= Number(k.plintHoogte) || 0;
        if (h) { k.hoogte = h; eigen.add('hoogte'); }
        const d = num0(it.diepte) ?? rm.diepte;
        if (d) { k.diepte = d; eigen.add('diepte'); }
        // Nog altijd leeg (niet op de schets, geen projectstandaard): gangbare maten.
        const def = SCHETS_STANDAARD[it.soort] ?? SCHETS_STANDAARD.onder;
        if (!(Number(k.hoogte) > 0)) k.hoogte = def.hoogte;
        if (!(Number(k.diepte) > 0)) k.diepte = def.diepte;
        if (!(Number(k.breedte) > 0)) k.breedte = 600;
        if (k.plint !== 'geen' && !(Number(k.plintHoogte) > 0)) k.plintHoogte = 100;
        k.eigen = [...eigen];
        k.notitie = it.tekst ? `Schets: ${it.tekst}` : undefined;
        p.kasten.push(k);
        placed.push({ k, it, x: cx, boven });
        made.push(k);
        prev = { k };
        cx += w;
      }
      return cx;
    };
    x = plaats(rijOnder, false);
    const xb = plaats(rijBoven, true);
    wandBreedte = Math.max(x, xb);
    // Hoogte van de hangkasten: opgegeven onderkant, anders boven gelijk met een kolomkast op deze wand, anders projectstandaard.
    const kolom = placed.find(q => q.it.soort === 'kolom');
    for (const q of placed) {
      const k = q.k;
      const plint = k.plint === 'geen' ? 0 : Number(k.plintHoogte) || 0;
      let y = plint;
      if (q.boven) {
        if (opts.bovenOnderkant) y = opts.bovenOnderkant;
        else if (kolom) y = (kolom.k.plint === 'geen' ? 0 : Number(kolom.k.plintHoogte) || 0) + Number(kolom.k.hoogte) - Number(k.hoogte);
        else y = Number(p.bovenHoogte) || 1400;
      }
      Object.assign(k, { plaatsing: 'vrij', posX: wandX + q.x, posY: y, posZ: 0, rot: 0 });
    }
    wandX += wandBreedte + 1000;      // volgende wand ernaast; met Verplaatsen zet je hem in de hoek
  }
  return made;
}

// MARK: - Venster

function openSketchImport(p, onDone) {
  const st = { fase: 'foto', foto: null, data: null, fout: null, bezig: false };
  const body = el(`<div class="content" id="sk"></div>`);
  const sheet = openSheet({ title: 'Schets inlezen', left: { label: 'Annuleer' }, body, wide: true });
  const render = () => {
    const key = schetsGet(SCHETS_KEY), model = schetsGet(SCHETS_MODEL) || 'claude-sonnet-5-5';
    if (st.fase === 'foto') {
      body.innerHTML = `
        <div class="group"><div class="group-body">
          <button class="row link" type="button" id="sk-vb"><span class="icon-label">${icon('download')}Voorbeeldblad met de codes (PDF)</span><span class="chev">${icon('right')}</span></button>
        </div><div class="group-footer">Teken per wand een vooraanzicht op gewoon papier, niet op schaal: alleen de maten die je erbij schrijft tellen. Codes of gewone woorden mogen allebei.</div></div>
        <div class="group"><div class="group-header">Lezen met Claude</div><div class="group-body">
          ${row('API-sleutel', `<input class="input-plain" id="sk-key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(key)}">`)}
          ${row('Model', selectHTML('sk-model', [['claude-sonnet-5-5', 'Sonnet (snel, goedkoop)'], ['claude-opus-5-5', 'Opus (leest moeilijk handschrift beter)']], model))}
        </div><div class="group-footer">De sleutel maak je op console.anthropic.com (API keys). Ze blijft alleen op dit toestel. De foto gaat naar Anthropic om gelezen te worden; dat kost enkele eurocent per foto.</div></div>
        <div class="group"><div class="group-body">
          <label class="row button" for="sk-file"><span class="icon-label">${icon('upload')}Foto nemen of kiezen</span></label>
          <input type="file" id="sk-file" accept="image/*" style="display:none">
        </div></div>
        ${st.foto ? `<div class="group"><div class="group-body" style="padding:8px"><img src="${st.foto.dataUrl}" style="max-width:100%;border-radius:8px"></div></div>
          <div class="group"><div class="group-body"><button class="row button" type="button" id="sk-go" ${st.bezig ? 'disabled' : ''}>${st.bezig ? 'Bezig met lezen… (even geduld)' : 'Schets lezen'}</button></div></div>` : ''}
        ${st.fout ? `<div class="group"><div class="group-body"><div class="row"><span class="row-sub" style="color:var(--red, #c00)">${esc(st.fout)}</span></div></div></div>` : ''}`;
      $('#sk-vb', body).addEventListener('click', () => { const d = schetsVoorbeeldPdf(); shareFile(d.blob, d.name); });
      $('#sk-key', body).addEventListener('change', e => schetsSet(SCHETS_KEY, e.target.value.trim()));
      $('#sk-model', body).addEventListener('change', e => schetsSet(SCHETS_MODEL, e.target.value));
      $('#sk-file', body).addEventListener('change', async e => {
        const f = e.target.files?.[0];
        if (!f) return;
        try { st.foto = await schetsImage(f); st.fout = null; } catch (err) { st.fout = err.message; }
        render();
      });
      $('#sk-go', body)?.addEventListener('click', async () => {
        const k2 = $('#sk-key', body).value.trim();
        if (!k2) { st.fout = 'Vul eerst je API-sleutel in.'; render(); return; }
        schetsSet(SCHETS_KEY, k2);
        st.bezig = true; st.fout = null; render();
        try {
          st.data = await schetsLezen(st.foto.base64, k2, $('#sk-model', body)?.value || model);
          if (!st.data.wanden?.some(w => w.kasten?.length)) throw new Error('Er werden geen kasten herkend. Neem de foto recht van boven met goed licht.');
          st.fase = 'controle';
        } catch (err) { st.fout = `Lezen lukte niet: ${err.message}`; }
        st.bezig = false; render();
      });
      return;
    }
    // Controle: lijst per wand, aanpasbaar.
    const d = st.data;
    const soorten = [['onder', 'Onderkast'], ['kolom', 'Kolomkast'], ['hang', 'Hangkast'], ['leeg', 'Open ruimte'], ['paslat', 'Paslat']];
    const totaal = (d.wanden ?? []).reduce((t, w) => t + (w.kasten ?? []).filter(it => !it._weg && !['leeg', 'paslat'].includes(it.soort)).length, 0);
    body.innerHTML = `
      ${st.foto ? `<details class="group"><summary class="group-header" style="cursor:pointer">Foto bekijken</summary><div class="group-body" style="padding:8px"><img src="${st.foto.dataUrl}" style="max-width:100%;border-radius:8px"></div></details>` : ''}
      ${(d.wanden ?? []).map((w, wi) => `<div class="group"><div class="group-header">${esc(w.naam || `Wand ${wi + 1}`)}</div><div class="group-body">
        ${(w.kasten ?? []).map((it, ii) => it._weg ? '' : `<div class="row" style="flex-wrap:wrap;gap:6px;align-items:center">
          <span class="row-label" style="min-width:150px">${esc(it.tekst || '—')}<br><span class="row-sub">${esc(schetsVakTekst(it))}</span>
            ${it.onzeker ? `<br><span class="row-sub" style="color:var(--orange, #c60)">${icon('warning')} ${esc(it.onzeker)}</span>` : ''}</span>
          <div class="row-fill" style="gap:6px;flex-wrap:wrap">
            ${selectHTML(`sk-s-${wi}-${ii}`, soorten, it.soort)}
            <input class="input-num" id="sk-b-${wi}-${ii}" type="number" placeholder="breedte" value="${it.breedte ?? ''}" style="width:80px">
            ${['leeg', 'paslat'].includes(it.soort) ? '' : `<input class="input-num" id="sk-h-${wi}-${ii}" type="number" placeholder="hoogte" value="${it.hoogte ?? ''}" style="width:80px">
            <input class="input-num" id="sk-d-${wi}-${ii}" type="number" placeholder="diepte" value="${it.diepte ?? ''}" style="width:80px">`}
            <button class="mini danger" type="button" data-weg="${wi}-${ii}" aria-label="Weglaten">${icon('trash')}</button>
          </div></div>`).join('')}
      </div></div>`).join('')}
      <div class="group"><div class="group-header">Voor alle kasten</div><div class="group-body">
        ${row('Plinthoogte', numHTML('sk-plint', d.plintHoogte ?? '', 'standaard'))}
        <div class="row"><span class="row-label">Hoogtes van onder- en kolomkasten zijn tot de vloer (met plint)</span>${toggleHTML('sk-vloer', !!d.hoogteTotVloer)}</div>
        ${row('Onderkant hangkasten boven de vloer', numHTML('sk-boven', d.bovenOnderkant ?? '', 'gelijk met kolomkast of standaard'))}
      </div><div class="group-footer">Lege hoogte of diepte: zoals een andere kast in dezelfde rij, anders de projectstandaard (of 720/700/2100 hoog, 560/350 diep). Alles wat je hier niet ziet (indeling, lades, toestellen) staat in de kast en pas je daarna aan zoals altijd.</div></div>
      ${(d.opmerkingen ?? []).length ? `<div class="group"><div class="group-header">Opmerkingen bij het lezen</div><div class="group-body">${d.opmerkingen.map(o => `<div class="row"><span class="row-sub">${esc(o)}</span></div>`).join('')}</div></div>` : ''}
      <div class="group"><div class="group-body">
        <button class="row button" type="button" id="sk-make">${totaal} ${totaal === 1 ? 'kast' : 'kasten'} maken</button>
        <button class="row link" type="button" id="sk-terug"><span>Andere foto</span><span class="chev">${icon('right')}</span></button>
      </div></div>`;
    (d.wanden ?? []).forEach((w, wi) => (w.kasten ?? []).forEach((it, ii) => {
      $(`#sk-s-${wi}-${ii}`, body)?.addEventListener('change', e => { it.soort = e.target.value; it.rij = e.target.value === 'hang' ? 'boven' : it.rij === 'boven' && e.target.value !== 'leeg' && e.target.value !== 'paslat' ? 'onder' : it.rij; render(); });
      for (const [pre, key] of [['b', 'breedte'], ['h', 'hoogte'], ['d', 'diepte']]) $(`#sk-${pre}-${wi}-${ii}`, body)?.addEventListener('change', e => { it[key] = num0(e.target.value); });
    }));
    $$('[data-weg]', body).forEach(b => b.addEventListener('click', () => { const [wi, ii] = b.dataset.weg.split('-').map(Number); d.wanden[wi].kasten[ii]._weg = true; render(); }));
    $('#sk-plint', body).addEventListener('change', e => { d.plintHoogte = num0(e.target.value); });
    $('#sk-vloer', body).addEventListener('change', e => { d.hoogteTotVloer = e.target.checked; });
    $('#sk-boven', body).addEventListener('change', e => { d.bovenOnderkant = num0(e.target.value); });
    $('#sk-terug', body).addEventListener('click', () => { st.fase = 'foto'; render(); });
    $('#sk-make', body).addEventListener('click', () => {
      const made = schetsMaakKasten(p, d, { plint: num0(d.plintHoogte), totVloer: !!d.hoogteTotVloer, bovenOnderkant: num0(d.bovenOnderkant) });
      touch(p); sheet.close(); onDone(made);
    });
  };
  render();
}
