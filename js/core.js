'use strict';
// Hulpmiddelen: opslag, vensters, meldingen, delen en Excel.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const mm = n => (Math.round(Number(n) * 10) / 10).toLocaleString('nl-BE');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const ICONS = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cube: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  list: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  download: '<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>',
  upload: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  explode: '<path d="M4 4h6v6H4zM14 14h6v6h-6zM14 4h6v6h-6zM4 14h6v6H4z"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  ruler: '<path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// MARK: - Opslag (op dit toestel: localStorage én IndexedDB, de nieuwste telt)

const KEY = 'kastentool.v1';

const IDB = {
  db: null,
  open() {
    if (!this.db) {
      this.db = new Promise((resolve, reject) => {
        const req = indexedDB.open('kastentool', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('data');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.db;
  },
  async get() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction('data').objectStore('data').get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  async put(value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put(value, KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },
};

const Store = {
  projects: [],
  settings: null,

  async load() {
    this.settings = mergeSettings(null);
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch { /* leeg */ }
    try {
      const stored = await IDB.get();
      if (stored && (!data || (stored.savedAt ?? 0) > (data.savedAt ?? 0))) data = stored;
    } catch (err) { console.warn('IndexedDB niet beschikbaar:', err); }
    if (data) {
      this.projects = data.projects ?? [];
      this.settings = mergeSettings(data.settings);
    }
  },

  save() {
    const data = { savedAt: Date.now(), projects: this.projects, settings: this.settings };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { console.error(err); }
    IDB.put(JSON.parse(JSON.stringify(data))).catch(err => console.error(err));
  },
};

/** Nieuwe instellingen (uit een nieuwere versie) krijgen hun standaardwaarde. */
function mergeSettings(saved) {
  const base = { ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), mpr: { ...MPR_DEFAULTS }, nest: { ...NEST_DEFAULTS } };
  if (!saved) return base;
  const out = { ...base, ...saved, blum: { ...base.blum }, mpr: { ...MPR_DEFAULTS, ...(saved.mpr ?? {}) }, nest: { ...NEST_DEFAULTS, ...(saved.nest ?? {}) },
    decors: Array.isArray(saved.decors) && saved.decors.length ? saved.decors : base.decors,
    grepen: Array.isArray(saved.grepen) ? saved.grepen : [], greepMerken: Array.isArray(saved.greepMerken) && saved.greepMerken.length ? saved.greepMerken : base.greepMerken };
  // Oude standaard (deuvels om de 50,5 mm) vervangen door de nieuwe (30 mm van de randen, ongeveer 80 mm ertussen).
  if (saved.deuvelAfstand === 50.5) { out.deuvelAfstand = 80; out.deuvelMarge = 30; }
  for (const serie of Object.keys(base.blum)) {
    out.blum[serie] = { ...base.blum[serie], ...(saved.blum?.[serie] ?? {}) };
    if (!Array.isArray(out.blum[serie].types) || !out.blum[serie].types.length) out.blum[serie].types = base.blum[serie].types;
  }
  return out;
}

// MARK: - Delen en opslaan

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Deelmenu (mail, WhatsApp, AirDrop, Bewaar in Bestanden); anders downloaden. */
async function shareFile(blob, name) {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; } catch (err) { if (err.name === 'AbortError') return false; }
  }
  download(blob, name);
  return true;
}

const safeName = s => String(s || 'project').replace(/[\\/:*?"<>|]+/g, '-').trim();

// MARK: - Vensters en meldingen

const overlays = () => $('#overlays');

function makeBackdrop(onClick) {
  const b = el('<div class="backdrop"></div>');
  if (onClick) b.addEventListener('click', onClick);
  overlays().appendChild(b);
  requestAnimationFrame(() => b.classList.add('show'));
  return b;
}

/** Venster dat van onder openschuift. left/right: { label, bold, icon, onClick } */
function openSheet({ title, left, right, body, full = false, wide = false, onClose }) {
  const backdrop = makeBackdrop(full ? null : () => close());
  const sheet = el(`<div class="sheet ${full ? 'full' : ''} ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <header class="navbar"><div class="navbar-row">
      <div class="navbar-left"></div><div class="navbar-title">${esc(title)}</div><div class="navbar-right"></div>
    </div></header><div class="sheet-body"></div></div>`);
  const makeBtn = (cfg, holder) => {
    if (!cfg) return null;
    const b = el(`<button class="nav-btn ${cfg.bold ? 'bold' : ''}" type="button">${cfg.icon ? icon(cfg.icon) : ''}${esc(cfg.label ?? '')}</button>`);
    b.addEventListener('click', () => cfg.onClick ? cfg.onClick(api) : close());
    $(holder, sheet).appendChild(b);
    return b;
  };
  const leftBtn = makeBtn(left, '.navbar-left');
  const rightBtn = makeBtn(right, '.navbar-right');
  $('.sheet-body', sheet).appendChild(body);
  overlays().appendChild(sheet);
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('show')));
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.activeElement?.blur?.();
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
    setTimeout(() => { sheet.remove(); backdrop.remove(); onClose?.(); }, 320);
  }
  const api = { el: sheet, body, close, leftBtn, rightBtn, setTitle: t => { $('.navbar-title', sheet).textContent = t; } };
  return api;
}

/** Melding in het midden. buttons: [{ label, role: 'cancel' | 'destructive', value }]; input: { value, placeholder } */
function alertBox(title, message = '', buttons = [{ label: 'OK', role: 'cancel' }], { input } = {}) {
  return new Promise(resolve => {
    const backdrop = makeBackdrop();
    const wrap = el(`<div class="alert-wrap"><div class="alert" role="alertdialog">
      <div class="alert-text"><div class="alert-title">${esc(title)}</div>
      ${message ? `<div class="alert-msg">${esc(message)}</div>` : ''}
      ${input ? `<input class="alert-input" type="text" placeholder="${esc(input.placeholder ?? '')}" value="${esc(input.value ?? '')}">` : ''}
      </div><div class="alert-buttons ${buttons.length > 2 ? 'stacked' : ''}"></div></div></div>`);
    const ordered = buttons.length > 2
      ? [...buttons.filter(b => b.role !== 'cancel'), ...buttons.filter(b => b.role === 'cancel')]
      : [...buttons.filter(b => b.role === 'cancel'), ...buttons.filter(b => b.role !== 'cancel')];
    const field = $('.alert-input', wrap);
    for (const b of ordered) {
      const btn = el(`<button type="button" class="${b.role ?? ''}">${esc(b.label)}</button>`);
      btn.addEventListener('click', () => {
        const value = b.value ?? b.label;
        const text = field?.value;
        wrap.remove();
        backdrop.remove();
        resolve(input ? { value, text } : value);
      });
      $('.alert-buttons', wrap).appendChild(btn);
    }
    overlays().appendChild(wrap);
    requestAnimationFrame(() => $('.alert', wrap).classList.add('show'));
    if (field) setTimeout(() => { field.focus(); field.select(); }, 50);
  });
}

/** Keuzemenu onderaan. Geeft de `value` van de knop, of null. */
function actionSheet(title, message, buttons) {
  return new Promise(resolve => {
    let done = false;
    const backdrop = makeBackdrop();
    const wrap = el(`<div class="action-wrap"><div class="action">
      <div class="action-group">${title || message ? `<div class="action-head">${title ? `<b>${esc(title)}</b>` : ''}${esc(message ?? '')}</div>` : ''}</div>
      <div class="action-group"><button type="button" class="cancel">Annuleer</button></div></div></div>`);
    const finish = value => {
      if (done) return;
      done = true;
      $('.action', wrap).classList.remove('show');
      backdrop.classList.remove('show');
      setTimeout(() => { wrap.remove(); backdrop.remove(); }, 280);
      resolve(value);
    };
    const group = $('.action-group', wrap);
    for (const b of buttons) {
      const btn = el(`<button type="button" class="${b.role ?? ''} ${title || message ? 'after-head' : ''}">${esc(b.label)}</button>`);
      btn.addEventListener('click', () => finish(b.value ?? b.label));
      group.appendChild(btn);
    }
    $('.cancel', wrap).addEventListener('click', () => finish(null));
    wrap.addEventListener('click', e => { if (e.target === wrap) finish(null); });
    overlays().appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => $('.action', wrap).classList.add('show')));
  });
}

// MARK: - Excel (.xlsx) met één of meer bladen

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** ZIP zonder compressie (genoeg voor .xlsx en voor een map met MPR-bestanden). */
class ZipWriter {
  constructor() { this.parts = []; this.central = []; this.offset = 0; this.count = 0; }
  add(path, contents) {
    if (typeof contents === 'string') contents = new TextEncoder().encode(contents);
    const name = new TextEncoder().encode(path);
    const crc = crc32(contents);
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true);
    local.setUint32(18, contents.length, true); local.setUint32(22, contents.length, true); local.setUint16(26, name.length, true);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true); central.setUint16(8, 0x0800, true);
    central.setUint16(12, time, true); central.setUint16(14, date, true); central.setUint32(16, crc, true);
    central.setUint32(20, contents.length, true); central.setUint32(24, contents.length, true); central.setUint16(28, name.length, true);
    central.setUint32(42, this.offset, true);
    this.parts.push(new Uint8Array(local.buffer), name, contents);
    this.central.push(new Uint8Array(central.buffer), name);
    this.offset += 30 + name.length + contents.length;
    this.count++;
  }
  finalize(type = 'application/zip') {
    const cdSize = this.central.reduce((t, p) => t + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, this.count, true); end.setUint16(10, this.count, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, this.offset, true);
    return new Blob([...this.parts, ...this.central, new Uint8Array(end.buffer)], { type });
  }
}

const xmlEscape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** sheets: [{ name, columns: [breedte], rows: [[waarde]] }]; de eerste rij is vet (kopregel). */
function makeXlsx(sheets) {
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const zip = new ZipWriter();
  const col = i => { let n = i + 1, s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  zip.add('[Content_Types].xml', H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    + '</Types>');
  zip.add('_rels/.rels', H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.add('xl/workbook.xml', H + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    + sheets.map((s, i) => `<sheet name="${xmlEscape(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>');
  zip.add('xl/_rels/workbook.xml.rels', H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.add('xl/styles.xml', H + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E5EA"/></patternFill></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
    + '</styleSheet>');
  sheets.forEach((s, i) => {
    let xml = H + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
    (s.columns ?? []).forEach((w, c) => { xml += `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`; });
    xml += '</cols><sheetData>';
    s.rows.forEach((row, r) => {
      xml += `<row r="${r + 1}">`;
      row.forEach((v, c) => {
        const ref = `${col(c)}${r + 1}`;
        const st = r === 0 ? ' s="1"' : '';
        if (typeof v === 'number' && Number.isFinite(v)) xml += `<c r="${ref}"${st}><v>${v}</v></c>`;
        else if (v != null && v !== '') xml += `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
      });
      xml += '</row>';
    });
    xml += '</sheetData></worksheet>';
    zip.add(`xl/worksheets/sheet${i + 1}.xml`, xml);
  });
  return zip.finalize('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
