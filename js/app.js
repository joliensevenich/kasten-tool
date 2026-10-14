'use strict';
// Schermen: Projecten (met kasten en 3D), kasteditor, paneeltekening, zaaglijst en instellingen.

const S = () => Store.settings;

// MARK: - Tabbladen

const TABS = [
  { id: 'projects', label: 'Projecten', icon: 'folder' },
  { id: 'settings', label: 'Instellingen', icon: 'gear' },
];
let currentTab = 0;

function setupTabs() {
  const bar = $('#tabbar');
  TABS.forEach((t, i) => {
    const b = el(`<button class="tab ${i === 0 ? 'active' : ''}" type="button">${icon(t.icon)}<span>${t.label}</span></button>`);
    b.addEventListener('click', () => showTab(i));
    bar.appendChild(b);
  });
}

function showTab(i) {
  currentTab = i;
  $$('.tab').forEach((b, j) => b.classList.toggle('active', i === j));
  $$('.view').forEach((v, j) => v.classList.toggle('active', i === j));
  if (i === 0) Projects.render();
  if (i === 1) { SettingsView.cat = null; SettingsView.render(); }
}

// MARK: - Projecten

const Projects = {
  open: null,       // id van het geopende project
  viewer: null,

  render() {
    const v = $('#view-projects');
    if (this.open && Store.projects.some(p => p.id === this.open)) return this.renderProject();
    this.open = null;
    this.disposeViewer();
    v.innerHTML = `
      <header class="navbar"><div class="navbar-row"><div class="navbar-title">Kasten tool</div>
        <div class="navbar-right"><button class="nav-btn" type="button" id="pr-add" aria-label="Nieuw project">${icon('plus')}</button></div>
      </div></header>
      <div class="content">
        <div class="logo" role="img" aria-label="e. baillien"></div>
        ${Store.projects.length ? `<div class="group"><div class="group-header">Projecten</div><div class="group-body" id="pr-list"></div></div>`
          : `<div class="empty">${icon('cube')}<h2>Nog geen projecten</h2><p>Maak een project aan met +, en voeg er kasten aan toe.</p></div>`}
        <div class="group"><div class="group-body">
          <button class="row button" type="button" id="pr-new"><span class="icon-label">${icon('plus')}Nieuw project</span></button>
          <button class="row button" type="button" id="pr-import"><span class="icon-label">${icon('upload')}Projectbestand openen</span></button>
        </div><div class="group-footer">Een projectbestand kun je doorsturen naar een ander toestel (mail, WhatsApp, AirDrop) en daar openen.</div></div>
        <input type="file" id="pr-file" accept=".json,application/json" class="hidden">
      </div>`;
    const list = $('#pr-list', v);
    for (const p of [...Store.projects].sort((a, b) => (b.gewijzigd ?? 0) - (a.gewijzigd ?? 0))) {
      const row = el(`<button class="row link" type="button"><span class="row-main"><span>${esc(p.naam)}</span>
        <span class="row-sub">${p.kasten.length} ${p.kasten.length === 1 ? 'kast' : 'kasten'}${p.gewijzigd ? ` · ${new Date(p.gewijzigd).toLocaleDateString('nl-BE')}` : ''}</span></span>
        <span class="chev">${icon('right')}</span></button>`);
      row.addEventListener('click', () => { this.open = p.id; this.render(); });
      list?.appendChild(row);
    }
    const create = async () => {
      const r = await alertBox('Nieuw project', 'Geef het project een naam, bijvoorbeeld de naam van de klant of het werfnummer.',
        [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Maak', value: 'ok' }], { input: { placeholder: 'Naam' } });
      if (r.value !== 'ok' || !r.text.trim()) return;
      const p = { id: uid(), naam: r.text.trim(), kasten: [], aangemaakt: Date.now(), gewijzigd: Date.now() };
      Store.projects.push(p);
      Store.save();
      this.open = p.id;
      this.render();
    };
    $('#pr-add', v).addEventListener('click', create);
    $('#pr-new', v).addEventListener('click', create);
    $('#pr-import', v).addEventListener('click', () => { $('#pr-file', v).value = ''; $('#pr-file', v).click(); });
    $('#pr-file', v).addEventListener('change', e => importProject(e.target.files[0]));
  },

  get project() { return Store.projects.find(p => p.id === this.open); },

  renderProject() {
    const v = $('#view-projects');
    const p = this.project;
    this.disposeViewer();
    v.innerHTML = `
      <header class="navbar"><div class="navbar-row">
        <div class="navbar-left"><button class="nav-btn" type="button" id="pj-back">${icon('left')}Projecten</button></div>
        <div class="navbar-title">${esc(p.naam)}</div>
        <div class="navbar-right"><button class="nav-btn" type="button" id="pj-menu" aria-label="Meer">•••</button></div>
      </div></header>
      <div class="content wide">
        <div class="split">
          <div class="split-3d">
            <div class="viewer" id="pj-viewer">${p.kasten.length ? '' : `<div class="viewer-empty">Voeg een kast toe om ze in 3D te zien.</div>`}</div>
            <div class="viewer-tools">
              <button type="button" id="pj-fronts">${icon('eye')}<span>Fronten</span></button>
              <button type="button" id="pj-explode">${icon('explode')}<span>Uit elkaar</span></button>
              <button type="button" id="pj-fit">${icon('cube')}<span>Passend</span></button>
            </div>
          </div>
          <div class="split-side">
            <div class="group"><div class="group-header head-with-btn"><span>Kasten</span>
              <button type="button" class="head-btn" id="pj-add">${icon('plus')}Kast toevoegen</button></div><div class="group-body" id="pj-list"></div></div>
            <div class="group"><div class="group-header">Opstelling</div><div class="group-body">
              ${row('Bovenkasten: onderkant boven vloer', numHTML('pj-boven', p.bovenHoogte ?? '', '1400'))}
            </div><div class="group-footer">Automatisch staan onder- en kolomkasten naast elkaar op de vloer, en bovenkasten in een eigen rij op deze hoogte. Per kast kun je "Plaatsing" op Vrij zetten, voor een hoek, een eiland of bovenkasten boven een bepaalde onderkast.</div></div>
            <div class="group"><div class="group-body">
              <button class="row button" type="button" id="pj-cut"><span class="icon-label">${icon('table')}Zaaglijst en beslag</span></button>
              <button class="row button" type="button" id="pj-plan"><span class="icon-label">${icon('explode')}Zaagplan (platen)</span></button>
              <button class="row button" type="button" id="pj-mpr"><span class="icon-label">${icon('download')}MPR-bestanden (woodWOP)</span></button>
              <button class="row button" type="button" id="pj-csv"><span class="icon-label">${icon('table')}Zaaglijst STK (Schelling HPO)</span></button>
              <button class="row button" type="button" id="pj-import"><span class="icon-label">${icon('copy')}Kasten uit ander project toevoegen</span></button>
              <button class="row button" type="button" id="pj-share"><span class="icon-label">${icon('share')}Projectbestand delen</span></button>
            </div><div class="group-footer">De kasten staan in 3D naast elkaar, in de volgorde van de lijst. De MPR-bestanden komen samen in één zipbestand, per kast een map.</div></div>
          </div>
        </div>
      </div>`;
    $('#pj-back', v).addEventListener('click', () => { this.open = null; this.render(); });
    $('#pj-menu', v).addEventListener('click', () => this.menu());
    $('#pj-add', v).addEventListener('click', () => pickPreset(id => {
      const k = newCabinet(id);
      k.id = uid();
      k.code = `K${p.kasten.length + 1}`;
      p.kasten.push(k);
      touch(p);
      this.renderProject();
      openCabinet(p, k);
    }));
    $('#pj-cut', v).addEventListener('click', () => openCutList(p));
    $('#pj-mpr', v).addEventListener('click', () => exportMpr(p));
    $('#pj-csv', v).addEventListener('click', () => {
      if (!p.kasten.length) { alertBox('Geen kasten', 'Voeg eerst kasten toe aan het project.'); return; }
      const stk = cutListStk(p, cutRows(p).rows);
      shareFile(stk.blob, stk.name);
    });
    $('#pj-plan', v).addEventListener('click', () => openCutPlan(p));
    $('#pj-share', v).addEventListener('click', () => shareProject(p));
    $('#pj-import', v).addEventListener('click', () => importCabinets(p, () => this.renderProject()));
    $('#pj-boven', v).addEventListener('change', e => { p.bovenHoogte = e.target.value === '' ? null : Number(e.target.value); touch(p); this.renderProject(); });

    const list = $('#pj-list', v);
    if (!p.kasten.length) list.innerHTML = '<div class="row"><span class="row-sub">Nog geen kasten.</span></div>';
    p.kasten.forEach((k, i) => {
      const preset = PRESETS.find(x => x.id === k.type);
      const res = buildCabinet(k, S());
      const dims = res.error ? 'Maten nog invullen' : `${k.breedte} × ${k.hoogte} × ${k.diepte} mm`;
      const warn = res.error || res.warnings.length;
      const row = el(`<div class="row kast-row">
        <button class="kast-main" type="button"><span class="kast-code">${esc(k.code)}</span>
          <span class="row-main"><span>${esc(preset?.naam ?? k.type)}</span><span class="row-sub">${esc(dims)}</span></span>
          ${warn ? `<span class="warn-dot" title="Let op">${icon('warning')}</span>` : ''}</button>
        <button class="mini" type="button" data-act="up" aria-label="Naar links" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button class="mini" type="button" data-act="more" aria-label="Meer">•••</button>
      </div>`);
      $('.kast-main', row).addEventListener('click', () => openCabinet(p, k));
      $('[data-act=up]', row).addEventListener('click', () => { [p.kasten[i - 1], p.kasten[i]] = [p.kasten[i], p.kasten[i - 1]]; touch(p); this.renderProject(); });
      $('[data-act=more]', row).addEventListener('click', async () => {
        const c = await actionSheet(k.code, '', [{ label: 'Dupliceren', value: 'dup' }, { label: 'Verwijderen', role: 'destructive', value: 'del' }]);
        if (c === 'dup') { const copy = JSON.parse(JSON.stringify(k)); copy.id = uid(); copy.code = `K${p.kasten.length + 1}`; p.kasten.splice(i + 1, 0, copy); }
        if (c === 'del') p.kasten.splice(i, 1);
        if (c) { touch(p); this.renderProject(); }
      });
      list.appendChild(row);
    });

    if (p.kasten.length) {
      this.viewer = makeViewer($('#pj-viewer', v), { onPick: hit => { if (hit) { const k = p.kasten.find(x => x.id === hit.cab); if (k) openCabinet(p, k, hit.part.id); } } });
      if (!this.viewer) return;
      const layout = projectLayout(p);
      const cabs = [];
      p.kasten.forEach((k, i) => {
        const res = buildCabinet(k, S());
        if (res.error) return;
        const L = layout[i];
        cabs.push({ key: k.id, parts: res.parts, offsetX: L.x, offsetY: L.y, offsetZ: L.z, rot: L.rot });
      });
      this.viewer.showFloor = true;
      this.viewer.floorY = 0;
      this.viewer.show(cabs, { refit: true });
      bindViewerTools(v, this.viewer, 'pj');
    }
  },

  async menu() {
    const p = this.project;
    const c = await actionSheet(p.naam, '', [
      { label: 'Hernoemen', value: 'ren' }, { label: 'Dupliceren', value: 'dup' }, { label: 'Project verwijderen', role: 'destructive', value: 'del' },
    ]);
    if (c === 'ren') {
      const r = await alertBox('Project hernoemen', '', [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Bewaar', value: 'ok' }], { input: { value: p.naam } });
      if (r.value === 'ok' && r.text.trim()) { p.naam = r.text.trim(); touch(p); this.renderProject(); }
    } else if (c === 'dup') {
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = uid(); copy.naam = `${p.naam} (kopie)`; copy.gewijzigd = Date.now();
      Store.projects.push(copy); Store.save();
      this.open = copy.id; this.render();
    } else if (c === 'del') {
      const ok = await alertBox('Project verwijderen?', `"${p.naam}" en alle kasten erin worden verwijderd.`, [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Verwijder', role: 'destructive', value: 'yes' }]);
      if (ok === 'yes') { Store.projects = Store.projects.filter(x => x !== p); Store.save(); this.open = null; this.render(); }
    }
  },

  disposeViewer() { this.viewer?.dispose(); this.viewer = null; },
};

function touch(p) { p.gewijzigd = Date.now(); Store.save(); }

/** 3D-weergave maken; als het toestel geen 3D aankan, een melding in plaats van een fout. */
function makeViewer(container, options) {
  try {
    return new Viewer(container, options);
  } catch (err) {
    console.warn(err);
    container.innerHTML = '<div class="viewer-empty">3D is niet beschikbaar op dit toestel of in deze browser. De rest van de app werkt gewoon.</div>';
    return null;
  }
}

function bindViewerTools(root, viewer, prefix) {
  const fronts = $(`#${prefix}-fronts`, root);
  const modes = ['toon', 'doorzichtig', 'verberg'];
  const labels = { toon: 'Fronten', doorzichtig: 'Doorzichtig', verberg: 'Verborgen' };
  fronts.addEventListener('click', () => {
    const next = modes[(modes.indexOf(viewer.fronts) + 1) % modes.length];
    viewer.setFronts(next);
    $('span', fronts).textContent = labels[next];
    fronts.classList.toggle('on', next !== 'toon');
  });
  const ex = $(`#${prefix}-explode`, root);
  ex.addEventListener('click', () => { viewer.setExplode(!viewer.explode); ex.classList.toggle('on', viewer.explode); });
  $(`#${prefix}-fit`, root).addEventListener('click', () => viewer.fit());
}

/** Keuzelijst met de 20 kasttypes, per groep. */
function pickPreset(onPick) {
  const groups = [...new Set(PRESETS.map(p => p.groep))];
  const body = el(`<div class="content">${groups.map(g => `<div class="group"><div class="group-header">${g}</div><div class="group-body">
    ${PRESETS.filter(p => p.groep === g).map(p => `<button class="row link" type="button" data-id="${p.id}"><span>${esc(p.naam)}</span><span class="chev">${icon('right')}</span></button>`).join('')}
    </div></div>`).join('')}</div>`);
  const sheet = openSheet({ title: 'Kasttype kiezen', left: { label: 'Annuleer' }, body });
  $$('[data-id]', body).forEach(b => b.addEventListener('click', () => { sheet.close(); onPick(b.dataset.id); }));
}

// MARK: - Kasteditor

const OPTIONS = {
  plint: [['stelpoten', 'Stelpoten met plint'], ['vast', 'Vaste plint'], ['geen', 'Geen plint']],
  top: [['regels', 'Regels'], ['vol', 'Volle top']],
  rug: [['groef', 'In groef'], ['opgeschroefd', 'Opgeschroefd paneel'], ['geen', 'Geen rug']],
  front: [['opliggend', 'Opliggend'], ['inliggend', 'Inliggend']],
  greep: [['greep', 'Met greep'], ['tipon', 'TIP-ON'], ['push', 'Push-open'], ['greeplijst', 'Greeploos (houten greeplijst)']],
  deuren: [['auto', 'Automatisch'], ['1', '1 deur'], ['2', '2 deuren']],
  scharnierKant: [['links', 'Links'], ['rechts', 'Rechts']],
  blindKant: [['links', 'Links'], ['rechts', 'Rechts']],
};

const selectHTML = (id, opts, value) => `<select class="picker" id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(value) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const numHTML = (id, value, placeholder = 'mm') => `<input class="input-num" id="${id}" type="number" inputmode="decimal" min="0" step="0.5" placeholder="${placeholder}" value="${value ?? ''}">`;
const toggleHTML = (id, checked) => `<label class="switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span></span></label>`;
const row = (label, control) => `<div class="row"><span class="row-label">${label}</span><div class="row-fill">${control}</div></div>`;

function openCabinet(project, k, selectId = null) {
  const body = el(`<div class="editor">
    <div class="editor-3d">
      <div class="viewer" id="ed-viewer"></div>
      <div class="viewer-tools">
        <button type="button" id="ed-fronts">${icon('eye')}<span>Fronten</span></button>
        <button type="button" id="ed-explode">${icon('explode')}<span>Uit elkaar</span></button>
        <button type="button" id="ed-fit">${icon('cube')}<span>Passend</span></button>
      </div>
    </div>
    <div class="editor-form content" id="ed-form"></div>
  </div>`);
  let viewer = null;
  const sheet = openSheet({
    title: `${k.code} · ${PRESETS.find(x => x.id === k.type)?.naam ?? ''}`, full: true,
    left: { label: 'Klaar', bold: true },
    body,
    onClose: () => { viewer?.dispose(); Projects.render(); },
  });
  setTimeout(() => {
    viewer = makeViewer($('#ed-viewer', body), { onPick: hit => {
      viewer.select(k.id, hit?.part.id);
      if (hit) openPart(k, hit.part.id, () => update());
    } });
    if (viewer) bindViewerTools(body, viewer, 'ed');
    update(true);
    if (selectId) viewer?.select(k.id, selectId);
  }, 340);

  const form = $('#ed-form', body);
  let lastDims = '';

  function update(refit = false) {
    const res = buildCabinet(k, S());
    const dims = `${k.breedte}|${k.hoogte}|${k.diepte}|${k.plintHoogte}`;
    if (viewer) viewer.show(res.error ? [] : [{ key: k.id, parts: res.parts, offsetX: 0 }], { refit: refit || dims !== lastDims });
    lastDims = dims;
    renderLive(res);
    touch(project);
  }

  function renderForm() {
    const preset = PRESETS.find(x => x.id === k.type);
    form.innerHTML = `
      <div class="group"><div class="group-header">Kast</div><div class="group-body">
        <div class="row"><span class="row-label">Code</span><div class="row-fill"><input class="input-plain" id="f-code" value="${esc(k.code)}"></div></div>
        <button class="row link" type="button" id="f-type"><span class="row-label">Type</span><span class="row-value">${esc(preset?.naam ?? k.type)}</span><span class="chev">${icon('right')}</span></button>
        ${row('Breedte', numHTML('f-breedte', k.breedte))}
        ${row('Hoogte (korpus)', numHTML('f-hoogte', k.hoogte))}
        ${row('Diepte (korpus)', numHTML('f-diepte', k.diepte))}
      </div><div class="group-footer">Hoogte en diepte van het korpus, zonder plint en zonder fronten.</div></div>

      <div class="group"><div class="group-header">Korpus</div><div class="group-body">
        ${row('Plint', selectHTML('f-plint', OPTIONS.plint, k.plint))}
        <div id="f-plint-h">${row('Plinthoogte', numHTML('f-plintHoogte', k.plintHoogte))}</div>
        ${row('Plaatdikte korpus', numHTML('f-plaatDikte', k.plaatDikte, `${S().plaat} (standaard)`))}
        ${row('Bovenkant', selectHTML('f-top', OPTIONS.top, k.top))}
        ${row('Rug', selectHTML('f-rug', OPTIONS.rug, k.rug))}
        <div id="f-rug-d">${row('Dikte rug', numHTML('f-rugDikte', k.rugDikte, `${k.rug === 'opgeschroefd' ? S().rugDik : S().rug} (standaard)`))}</div>
        ${k.secties.some(x => x.type === 'toestel') ? `<div class="row"><span class="row-label">Verluchting onder en boven</span>${toggleHTML('f-verluchting', k.verluchting ?? k.secties.some(x => x.verluchting))}</div>` : ''}
        <div class="row"><span class="row-label">Zijwand links in zicht</span>${toggleHTML('f-zichtL', k.zichtL)}</div>
        <div class="row"><span class="row-label">Zijwand rechts in zicht</span>${toggleHTML('f-zichtR', k.zichtR)}</div>
      </div><div class="group-footer">Laat een dikte leeg voor de standaard uit Instellingen. Bij een rug in een groef groeit de groef mee met de rug.${k.secties.some(x => x.type === 'toestel') ? ` Met toestellen: geen rug achter de toestellen en de rug ${S().rugInsprongToestel} mm naar voren; verluchting is een dubbele bodem onderaan en een dubbele regel bovenaan: de binnenste gelijk met de voorkant, de buitenste naar achteren. Met een volle top komt er bovenaan geen dubbele regel: de lucht gaat achter de rug naar boven.` : ''} Een zijwand in zicht wordt verbonden met Clamex, anders met deuvels en schroeven.</div></div>

      <div class="group"><div class="group-header">Decor</div><div class="group-body">
        ${row('Korpus', decorSelectHTML('f-decorKorpus', k.decorKorpus ?? '', [['', `Standaard (${S().decorKorpus})`]]))}
        ${row('Fronten', decorSelectHTML('f-decorFront', k.decorFront ?? '', [['', `Standaard (${S().decorFront})`]]))}
        ${k.rug !== 'geen' ? row('Rug', decorSelectHTML('f-decorRug', k.decorRug ?? '', [['', 'Zoals korpus']])) : ''}
        ${row('Band voorkant korpus', decorSelectHTML('f-bandKorpusDecor', k.bandKorpusDecor ?? 'korpus', [['korpus', 'Zoals korpus'], ['front', 'Zoals fronten']]))}
      </div><div class="group-footer">Per stuk kun je het decor en de band nog aanpassen: tik op het onderdeel.</div></div>

      <div class="group"><div class="group-header">Fronten</div><div class="group-body">
        ${row('Fronten', selectHTML('f-front', OPTIONS.front, k.front))}
        ${k.front !== 'inliggend' ? row('Uitsteken onder', numHTML('f-uitstekOnder', k.uitstekOnder || '', '0')) + row('Uitsteken boven', numHTML('f-uitstekBoven', k.uitstekBoven || '', '0')) : ''}
        <div id="f-uitstek-info"></div>
        ${row('Houtstructuur fronten', selectHTML('f-houtDoorlopend', [['nee', 'Niet doorlopend'], ['kast', 'Doorlopend in deze kast'], ['vorige', 'Doorlopend met de vorige kast']], k.houtDoorlopend ?? 'nee'))}
        ${row('Plaattype fronten', selectHTML('f-frontMateriaal', [['', `Standaard (${S().frontMateriaal})`], ...PLAATTYPES.map(x => [x, x])], k.frontMateriaal ?? ''))}
        ${row('Openen', selectHTML('f-greep', OPTIONS.greep, k.greep))}
        ${k.greep === 'greep' ? row('Greep: hart-op-hart', numHTML('f-greepHart', k.greepHart, `${S().greepHartafstand} (standaard)`)) : ''}
        ${row('Deuren', selectHTML('f-deuren', OPTIONS.deuren, k.deuren))}
        ${row('Scharnieren (1 deur)', selectHTML('f-scharnierKant', OPTIONS.scharnierKant, k.scharnierKant))}
        ${row('Blindpaneel', numHTML('f-blindBreedte', k.blindBreedte || '', 'geen'))}
        ${Number(k.blindBreedte) > 0 ? row('Blindpaneel aan', selectHTML('f-blindKant', OPTIONS.blindKant, k.blindKant)) : ''}
      </div></div>

      <div class="group"><div class="group-header">Plaatsing in het project</div><div class="group-body">
        ${row('Plaatsing', selectHTML('f-plaatsing', [['auto', 'Automatisch (naast elkaar)'], ['vrij', 'Vrij']], k.plaatsing ?? 'auto'))}
        ${k.plaatsing === 'vrij' ? (() => { const L = projectLayout(project)[project.kasten.indexOf(k)] ?? { auto: { x: 0, y: 0 } };
          return row('Positie langs de wand (X)', numHTML('f-posX', k.posX, `${mm(L.auto.x)}`))
            + row('Onderkant korpus boven vloer', numHTML('f-posY', k.posY, `${mm(L.auto.y)}`))
            + row('Afstand van de wand', numHTML('f-posZ', k.posZ, '0'))
            + row('Draaiing', selectHTML('f-rot', [['0', '0°'], ['90', '90° (rechtsom)'], ['180', '180°'], ['270', '270° (linksom)']], String(k.rot ?? 0))); })() : ''}
      </div><div class="group-footer">Vrij: X is de linkerachterhoek van de kast, gemeten langs de wand; de kast draait rond die hoek. Een hoek maak je bijvoorbeeld met 90° op het einde van de rij.</div></div>

      <div class="group"><div class="group-header"><span>Indeling (van boven naar onder)</span></div><div id="f-secs"></div>
        <div class="group-body" style="margin-top:10px"><button class="row button" type="button" id="f-addsec"><span class="icon-label">${icon('plus')}Vak toevoegen</span></button></div>
        <div class="group-footer">Laat de hoogte van een vak leeg om de resterende hoogte automatisch te verdelen.</div></div>

      <div id="f-live"></div>`;

    const bindVal = (id, key, kind = 'str') => {
      const e = $('#' + id, form);
      if (!e) return;
      e.addEventListener(e.type === 'checkbox' ? 'change' : (e.tagName === 'SELECT' ? 'change' : 'input'), () => {
        k[key] = e.type === 'checkbox' ? e.checked : kind === 'num' ? (e.value === '' ? null : Number(e.value)) : e.value;
        if (['blindBreedte', 'plint', 'rug', 'greep', 'front', 'plaatsing'].includes(key)) renderForm();
        update();
      });
    };
    bindVal('f-code', 'code');
    $('#f-code', form).addEventListener('change', () => sheet.setTitle(`${k.code} · ${PRESETS.find(x => x.id === k.type)?.naam ?? ''}`));
    ['breedte', 'hoogte', 'diepte', 'plintHoogte', 'blindBreedte', 'plaatDikte', 'rugDikte', 'uitstekOnder', 'uitstekBoven', 'greepHart'].forEach(key => bindVal('f-' + key, key, 'num'));
    ['plint', 'top', 'rug', 'front', 'greep', 'deuren', 'scharnierKant', 'blindKant', 'frontMateriaal', 'houtDoorlopend', 'plaatsing'].forEach(key => bindVal('f-' + key, key));
    ['posX', 'posY', 'posZ'].forEach(key => bindVal('f-' + key, key, 'num'));
    $('#f-rot', form)?.addEventListener('change', e => { k.rot = Number(e.target.value); update(); });
    ['zichtL', 'zichtR', 'verluchting'].forEach(key => bindVal('f-' + key, key));
    for (const key of ['decorKorpus', 'decorFront', 'decorRug', 'bandKorpusDecor']) {
      const e = $('#f-' + key, form);
      if (e) bindDecor(e, v => { k[key] = v || null; update(); });
    }
    $('#f-plint-h', form).classList.toggle('hidden', k.plint === 'geen');
    $('#f-rug-d', form).classList.toggle('hidden', k.rug === 'geen');
    $('#f-type', form).addEventListener('click', () => pickPreset(async id => {
      if (id === k.type) return;
      const ok = await alertBox('Ander kasttype?', 'De indeling en de opties worden vervangen door die van het nieuwe type. De maten en plaatdiktes blijven.', [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Vervang', value: 'yes' }]);
      if (ok !== 'yes') return;
      const fresh = newCabinet(id);
      Object.assign(k, { ...fresh, id: k.id, code: k.code, breedte: k.breedte, hoogte: k.hoogte, diepte: k.diepte, plintHoogte: k.plintHoogte, plaatDikte: k.plaatDikte, rugDikte: k.rugDikte });
      sheet.setTitle(`${k.code} · ${PRESETS.find(x => x.id === k.type)?.naam ?? ''}`);
      renderForm();
      update();
    }));
    $('#f-addsec', form).addEventListener('click', () => { k.secties.push(sec('deur', { legplanken: 1 })); renderSections(); update(); });
    renderSections();
  }

  function renderSections() {
    const box = $('#f-secs', form);
    box.innerHTML = '';
    const res = buildCabinet(k, S());
    // Van boven naar onder tonen; opgeslagen van onder naar boven.
    [...k.secties].map((s, i) => [s, i]).reverse().forEach(([s, i]) => {
      const zone = res.zones?.[i];
      const zh = zone ? Math.round((zone.y1 - zone.y0) * 10) / 10 : null;
      const card = el(`<div class="group-body sec-card">
        <div class="row"><span class="row-label"><b>Vak ${k.secties.length - i}</b></span><div class="row-fill">
          ${selectHTML(`s-type-${i}`, Object.entries(SECTION_TYPES), s.type)}
          <button class="mini" type="button" data-act="up" aria-label="Omhoog" ${i === k.secties.length - 1 ? 'disabled' : ''}>${icon('up')}</button>
          <button class="mini" type="button" data-act="down" aria-label="Omlaag" ${i === 0 ? 'disabled' : ''}>${icon('down')}</button>
          <button class="mini danger" type="button" data-act="del" aria-label="Verwijder" ${k.secties.length === 1 ? 'disabled' : ''}>${icon('trash')}</button>
        </div></div>
        ${s.type === 'toestel' ? '' : row('Hoogte', numHTML(`s-hoogte-${i}`, s.hoogte, zh != null ? `auto (${mm(zh)})` : 'auto'))}
        ${s.type === 'lade' ? row('Aantal lades', numHTML(`s-lades-${i}`, s.lades, '1')) + row('Geleider', selectHTML(`s-serie-${i}`, SERIES.map(x => [x, x]), s.serie))
          + row('Ladetype', selectHTML(`s-ladeType-${i}`, (S().blum[s.serie]?.types ?? []).map(x => [x.code, `${s.serie} ${x.code} (rug ${x.rugH} mm)`]), s.ladeType || ((S().blum[s.serie]?.types ?? []).some(x => x.code === 'M') ? 'M' : (S().blum[s.serie]?.types?.[0]?.code ?? '')))) : ''}
        ${['deur', 'open', 'klep'].includes(s.type) ? row('Legplanken', numHTML(`s-legplanken-${i}`, s.legplanken, '0')) : ''}
        ${s.type === 'toestel' ? `<div class="row"><span class="row-label">Toestel</span><div class="row-fill"><input class="input-plain" id="s-toestel-${i}" value="${esc(s.toestel)}" placeholder="bv. Oven"></div></div>
          ${row('Inbouwhoogte', numHTML(`s-nis-${i}`, s.nis, s.hoogte ? `vak ${mm(s.hoogte)}` : 'auto'))}
          ${row('Inbouwbreedte (min.)', numHTML(`s-nisBreedte-${i}`, s.nisBreedte, 'mm'))}
          ${row('Inbouwdiepte (min.)', numHTML(`s-nisDiepte-${i}`, s.nisDiepte, 'mm'))}
          ${i === 0 ? `<div class="row"><span class="row-label">Op de vloer (geen bodem)</span>${toggleHTML(`s-opVloer-${i}`, s.opVloer)}</div>` : ''}
          ${zone?.nis != null ? `<div class="row"><span class="row-label">Vrije nis (h × b × d)</span><span class="row-value num" id="s-nisinfo-${i}"><b>${mm(zone.nis)} × ${mm(zone.nisBreedte)} × ${mm(zone.nisDiepte)}</b></span></div>` : ''}` : ''}
      </div>`);
      const bind = (field, kind) => {
        const e = $(`#s-${field}-${i}`, card);
        if (!e) return;
        const ev = e.type === 'checkbox' || e.tagName === 'SELECT' ? 'change' : 'input';
        e.addEventListener(ev, () => {
          s[field] = e.type === 'checkbox' ? e.checked : kind === 'num' ? (e.value === '' ? null : Number(e.value)) : e.value;
          if (field === 'type') { renderForm(); update(); return; }
          if (field === 'serie') { s.ladeType = ''; renderSections(); update(); return; }
          update();
          if (['hoogte', 'lades', 'nis', 'nisBreedte', 'nisDiepte'].includes(field)) refreshZoneHints();
        });
      };
      bind('type'); bind('hoogte', 'num'); bind('lades', 'num'); bind('serie'); bind('legplanken', 'num'); bind('toestel'); bind('opVloer');
      bind('nis', 'num'); bind('nisBreedte', 'num'); bind('nisDiepte', 'num'); bind('ladeType');
      $('[data-act=up]', card).addEventListener('click', () => { [k.secties[i + 1], k.secties[i]] = [k.secties[i], k.secties[i + 1]]; renderSections(); update(); });
      $('[data-act=down]', card).addEventListener('click', () => { [k.secties[i - 1], k.secties[i]] = [k.secties[i], k.secties[i - 1]]; renderSections(); update(); });
      $('[data-act=del]', card).addEventListener('click', () => { k.secties.splice(i, 1); renderSections(); update(); });
      box.appendChild(card);
    });
  }

  /** Automatische hoogtes en vrije nis bijwerken zonder het formulier opnieuw op te bouwen (focus blijft). */
  function refreshZoneHints() {
    const res = buildCabinet(k, S());
    k.secties.forEach((s, i) => {
      const zone = res.zones?.[i];
      const inp = $(`#s-hoogte-${i}`, form);
      if (inp && zone) inp.placeholder = `auto (${mm(zone.y1 - zone.y0)})`;
      const nis = $(`#s-nisinfo-${i}`, form);
      if (nis && zone?.nis != null) nis.innerHTML = `<b>${mm(zone.nis)} × ${mm(zone.nisBreedte)} × ${mm(zone.nisDiepte)}</b>`;
    });
  }

  function renderLive(res) {
    const info = $('#f-uitstek-info', form);
    if (info) {
      const P = k.plint === 'geen' ? 0 : Number(k.plintHoogte) || 0;
      const fronts = res.parts?.filter(p => p.rol === 'front') ?? [];
      if (fronts.length && (Number(k.uitstekOnder) || Number(k.uitstekBoven))) {
        const low = Math.min(...fronts.map(p => p.box.y)), high = Math.max(...fronts.map(p => p.box.y + p.box.h));
        info.innerHTML = `<div class="row"><span class="row-sub">Front van ${mm(P + low)} mm tot ${mm(P + high)} mm boven de vloer${P && low < 0 ? '; de plint staat achter de front' : ''}.</span></div>`;
      } else info.innerHTML = '';
    }
    const box = $('#f-live', form);
    if (!box) return;
    if (res.error) { box.innerHTML = `<div class="notice">${icon('warning')}<span>${esc(res.error)}</span></div>`; return; }
    const parts = res.parts;
    box.innerHTML = `
      ${res.warnings.length ? `<div class="group"><div class="group-header">Let op</div><div class="group-body">${res.warnings.map(w => `<div class="row warn-row">${icon('warning')}<span>${esc(w)}</span></div>`).join('')}</div></div>` : ''}
      <div class="group"><div class="group-header"><span>Onderdelen</span><span>${parts.length}</span></div><div class="group-body" id="f-parts"></div>
        <div class="group-footer">Tik op een onderdeel (of in de 3D-weergave) voor de tekening met boringen en groeven, en om kantenbanden aan te passen.</div></div>
      <div class="group"><div class="group-header">Beslag</div><div class="group-body">${res.hardware.map(h => `<div class="row"><span class="row-label">${esc(h.naam)}</span><span class="row-value num">${h.aantal}</span></div>`).join('') || '<div class="row"><span class="row-sub">Geen beslag.</span></div>'}</div></div>`;
    const list = $('#f-parts', box);
    for (const p of parts) {
      const c = cutInfo(p);
      const r = el(`<button class="row link" type="button"><span class="row-main"><span>${esc(p.naam)}</span>
        <span class="row-sub num">${mm(c.L)} × ${mm(c.B)} × ${p.dikte} · ${p.ops.length} bewerkingen</span></span><span class="chev">${icon('right')}</span></button>`);
      r.addEventListener('click', () => { viewer?.select(k.id, p.id); openPart(k, p.id, () => update()); });
      list.appendChild(r);
    }
  }

  renderForm();
}

// MARK: - Paneel: tekening, maten en kantenbanden

const EDGE_NAMES = {
  zijwand: { u0: 'Achterkant', u1: 'Voorkant', v0: 'Onderkant', v1: 'Bovenkant' },
  liggend: { u0: 'Links', u1: 'Rechts', v0: 'Achterkant', v1: 'Voorkant' },
  legplank: { u0: 'Links', u1: 'Rechts', v0: 'Achterkant', v1: 'Voorkant' },
  lade: { u0: 'Links', u1: 'Rechts', v0: 'Achterkant', v1: 'Voorkant' },
  default: { u0: 'Links', u1: 'Rechts', v0: 'Onderkant', v1: 'Bovenkant' },
};

function openPart(k, partId, onChange) {
  const body = el('<div class="content"></div>');
  const sheet = openSheet({ title: 'Onderdeel', left: { label: 'Klaar', bold: true }, body, wide: true });
  render();

  function render() {
    const res = buildCabinet(k, S());
    const p = res.parts.find(x => x.id === partId);
    if (!p) { sheet.close(); return; }
    sheet.setTitle(p.naam);
    const c = cutInfo(p);
    const names = EDGE_NAMES[p.rol] ?? EDGE_NAMES.default;
    const groups = {};
    for (const op of p.ops) {
      const key = `${op.naam}|${op.kind === 'groef' ? `${op.breedte} × ${op.diepte}` : op.kind === 'uitsparing' ? `${op.w} × ${op.h}` : op.dia ? `Ø${op.dia} × ${op.diepte}` : ''}|${op.edge ? names[op.edge] : op.face ?? ''}`;
      groups[key] = (groups[key] ?? 0) + 1;
    }
    body.innerHTML = `
      <div class="drawing card">${panelSVG(p, names)}</div>
      <div class="group"><div class="group-header">Zaagmaat</div><div class="group-body">
        <div class="row"><span class="row-label">Lengte (langs de nerf)</span><span class="row-value num">${mm(c.L)} mm</span></div>
        <div class="row"><span class="row-label">Breedte</span><span class="row-value num">${mm(c.B)} mm</span></div>
        <div class="row"><span class="row-label">Dikte</span><span class="row-value num">${p.dikte} mm</span></div>
        ${row('Decor', decorSelectHTML('p-decor', k.partDecor?.[p.id] ?? '', [['', `Standaard (${partBaseDecor(k, S(), p)})`]]))}
        ${row('Plaattype', selectHTML('p-type', [['', `Standaard (${partBaseType(k, S(), p)})`], ...PLAATTYPES.map(x => [x, x])], k.partType?.[p.id] ?? ''))}
        ${p.rol === 'front' && k.greep === 'greep' && !/Blindpaneel/.test(p.naam) ? `<div class="row"><span class="row-label">Greep: hart-op-hart</span><div class="row-fill">
          ${numHTML('p-greep', typeof k.frontGreep?.[p.id] === 'number' ? k.frontGreep[p.id] : '', k.greepHart ?? S().greepHartafstand)}</div></div>
          <div class="row"><span class="row-label">Geen greep op deze front</span>${toggleHTML('p-geengreep', k.frontGreep?.[p.id] === 'geen')}</div>` : ''}
      </div><div class="group-footer">De zaagmaat is de eindmaat: de kantenband wordt bij het afplakken afgefreesd.</div></div>
      <div class="group"><div class="group-header">Kantenband</div><div class="group-body">
        ${['u0', 'u1', 'v0', 'v1'].map(e => `<div class="row edge-row"><span class="row-label">${names[e]}</span><div class="row-fill">
          ${selectHTML(`e-${e}`, [['0', 'Geen'], ['1', '1 mm'], ['2', '2 mm']], p.edges[e])}
          ${p.edges[e] ? decorSelectHTML(`ed-${e}`, k.edgeDecor?.[p.id]?.[e] ?? '', [["", `${edgeBaseDecor(k, S(), p)} (std)`]], true) : ''}
        </div></div>`).join('')}
      </div><div class="group-footer">Standaard heeft de band het decor van het paneel; de band op de voorkant van het korpus volgt de keuze bij de kast.</div></div>
      <div class="group"><div class="group-header">Led-verlichting</div><div class="group-body" id="p-leds"></div>
        <div class="group-footer">Een gefreesde groef voor een ledprofiel, met een kabelgat als je dat wil.</div></div>
      <div class="group"><div class="group-body"><button class="row button" type="button" id="p-mpr"><span class="icon-label">${icon('download')}MPR-programma bekijken</span></button></div></div>
      <div class="group"><div class="group-header">Bewerkingen</div><div class="group-body">
        ${Object.entries(groups).map(([key, n]) => { const [naam, maat, waar] = key.split('|'); return `<div class="row"><span class="row-main"><span>${esc(naam)}</span><span class="row-sub">${esc([maat, waar].filter(Boolean).join(' · '))}</span></span><span class="row-value num">${n}×</span></div>`; }).join('') || '<div class="row"><span class="row-sub">Geen bewerkingen.</span></div>'}
      </div></div>`;
    $('#p-mpr', body).addEventListener('click', () => openMprText(k, p));
    const ledBox = $('#p-leds', body);
    (k.leds?.[p.id] ?? []).forEach((led, i) => {
      const r = el(`<div class="row"><span class="row-main"><span>Led-groef ${i + 1}</span><span class="row-sub">${esc(ledSummary(led, p, names))}</span></span>
        <button class="mini danger" type="button" aria-label="Verwijder">${icon('trash')}</button></div>`);
      $('button', r).addEventListener('click', () => { k.leds[p.id].splice(i, 1); onChange?.(); render(); });
      ledBox.appendChild(r);
    });
    const addLed = el(`<button class="row button" type="button"><span class="icon-label">${icon('plus')}Led-groef toevoegen</span></button>`);
    addLed.addEventListener('click', () => openLedForm(p, names, led => {
      k.leds = k.leds ?? {};
      (k.leds[p.id] = k.leds[p.id] ?? []).push(led);
      onChange?.();
      render();
    }));
    ledBox.appendChild(addLed);
    $('#p-type', body).addEventListener('change', e => {
      k.partType = k.partType ?? {};
      if (e.target.value) k.partType[p.id] = e.target.value; else delete k.partType[p.id];
      onChange?.();
      render();
    });
    $('#p-greep', body)?.addEventListener('change', e => {
      k.frontGreep = k.frontGreep ?? {};
      if (e.target.value === '') delete k.frontGreep[p.id]; else k.frontGreep[p.id] = Number(e.target.value);
      onChange?.();
      render();
    });
    $('#p-geengreep', body)?.addEventListener('change', e => {
      k.frontGreep = k.frontGreep ?? {};
      if (e.target.checked) k.frontGreep[p.id] = 'geen'; else delete k.frontGreep[p.id];
      onChange?.();
      render();
    });
    bindDecor($('#p-decor', body), v => {
      k.partDecor = k.partDecor ?? {};
      if (v) k.partDecor[p.id] = v; else delete k.partDecor[p.id];
      onChange?.();
      render();
    });
    for (const e of ['u0', 'u1', 'v0', 'v1']) {
      const sel = $(`#ed-${e}`, body);
      if (!sel) continue;
      bindDecor(sel, v => {
        k.edgeDecor = k.edgeDecor ?? {};
        k.edgeDecor[p.id] = { ...(k.edgeDecor[p.id] ?? {}) };
        if (v) k.edgeDecor[p.id][e] = v; else delete k.edgeDecor[p.id][e];
        onChange?.();
        render();
      });
    }
    for (const e of ['u0', 'u1', 'v0', 'v1']) {
      $(`#e-${e}`, body).addEventListener('change', ev => {
        k.edgeOverrides = k.edgeOverrides ?? {};
        k.edgeOverrides[p.id] = { ...(k.edgeOverrides[p.id] ?? {}), [e]: Number(ev.target.value) };
        onChange?.();
        render();
      });
    }
  }
}

// MARK: - Led-verlichting

const FACE_NAMES = {
  zijwand: [['binnen', 'Binnenkant'], ['buiten', 'Buitenkant']],
  front: [['binnen', 'Binnenkant'], ['voor', 'Voorkant']],
  rug: [['voor', 'Voorkant (binnen)'], ['achter', 'Achterkant']],
  plint: [['binnen', 'Achterkant'], ['voor', 'Voorkant']],
  default: [['onder', 'Onderkant'], ['boven', 'Bovenkant']],
};
const facesFor = p => FACE_NAMES[p.rol] ?? FACE_NAMES.default;

function ledSummary(led, p, names) {
  const face = facesFor(p).find(f => f[0] === led.zijde)?.[1] ?? led.zijde;
  const dir = led.richting === 'v' ? `${names.v0} → ${names.v1}` : `${names.u0} → ${names.u1}`;
  return `${face}, ${dir}, ${mm(led.afstand)} mm van ${names[led.vanaf].toLowerCase()}, ${mm(led.breedte)} × ${mm(led.diepte)}`
    + (Number(led.begin) || Number(led.einde) ? `, inspringen ${mm(led.begin || 0)}/${mm(led.einde || 0)}` : '')
    + (led.kabel && led.kabel !== 'geen' ? `, kabelgat ${led.kabel}` : '');
}

function openLedForm(p, names, onSave) {
  const horizontal = p.rol !== 'zijwand';
  const led = {
    zijde: facesFor(p)[0][0], richting: horizontal ? 'u' : 'v', vanaf: horizontal ? 'v1' : 'u1',
    afstand: S().ledAfstand, begin: 0, einde: 0, breedte: S().ledBreedte, diepte: S().ledDiepte, kabel: 'begin',
  };
  const body = el('<div class="content"></div>');
  const sheet = openSheet({ title: 'Led-groef', left: { label: 'Annuleer' }, right: { label: 'Voeg toe', bold: true, onClick: () => { onSave(led); sheet.close(); } }, body });
  const render = () => {
    const along = led.richting === 'v' ? ['v0', 'v1'] : ['u0', 'u1'];
    const across = led.richting === 'v' ? ['u0', 'u1'] : ['v0', 'v1'];
    if (!across.includes(led.vanaf)) led.vanaf = across[1];
    body.innerHTML = `<div class="group"><div class="group-body">
      ${row('Zijde', selectHTML('l-zijde', facesFor(p), led.zijde))}
      ${row('Richting', selectHTML('l-richting', [['u', `${names.u0} → ${names.u1}`], ['v', `${names.v0} → ${names.v1}`]], led.richting))}
      ${row('Afstand vanaf', selectHTML('l-vanaf', across.map(e => [e, names[e]]), led.vanaf))}
      ${row('Afstand (hart van de groef)', numHTML('l-afstand', led.afstand))}
      ${row(`Inspringen bij ${names[along[0]].toLowerCase()}`, numHTML('l-begin', led.begin))}
      ${row(`Inspringen bij ${names[along[1]].toLowerCase()}`, numHTML('l-einde', led.einde))}
      ${row('Breedte groef', numHTML('l-breedte', led.breedte))}
      ${row('Diepte groef', numHTML('l-diepte', led.diepte))}
      ${row('Kabelgat', selectHTML('l-kabel', [['geen', 'Geen'], ['begin', `Bij ${names[along[0]].toLowerCase()}`], ['einde', `Bij ${names[along[1]].toLowerCase()}`]], led.kabel))}
    </div><div class="group-footer">Inspringen 0 = de groef loopt tot aan de rand. Het kabelgat (Ø${S().ledKabelDia}) gaat door de plaat, in de groef op ${S().ledKabelAfstand} mm van het uiteinde.</div></div>`;
    for (const key of ['zijde', 'richting', 'vanaf', 'kabel']) $(`#l-${key}`, body).addEventListener('change', e => { led[key] = e.target.value; if (key === 'richting') render(); });
    for (const key of ['afstand', 'begin', 'einde', 'breedte', 'diepte']) $(`#l-${key}`, body).addEventListener('input', e => { led[key] = Number(e.target.value) || 0; });
  };
  render();
}

const MATERIAL_NAMES = { korpus: 'Korpus', front: 'Front', rug: 'Rug', lade: 'Lade' };
const decorOf = code => S().decors.find(d => d.code === code);
const decorName = code => { const d = decorOf(code); return d ? `${d.code} ${d.naam}` : (code || '–'); };
const matLabel = p => `${decorName(p.decor)} · ${p.plaattype ?? 'Melamine'} · ${p.dikte} mm`;

/** Keuzelijst met decors; `first` zijn extra keuzes bovenaan, zoals "Standaard". */
function decorSelectHTML(id, value, first = [], short = false) {
  const opts = [...first, ...S().decors.map(d => [d.code, short ? d.code : `${d.code} ${d.naam}`])];
  if (value && !opts.some(([v]) => v === value)) opts.push([value, value]);
  opts.push(['__nieuw', 'Ander decor…']);
  return selectHTML(id, opts, value ?? '');
}

/** Bij "Ander decor…": code en naam vragen, toevoegen aan de bibliotheek. Geeft de code of null. */
async function askNewDecor() {
  const r = await alertBox('Nieuw decor', 'Code en naam, bijvoorbeeld "U727 Steengrijs".', [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Voeg toe', value: 'ok' }], { input: { placeholder: 'Code en naam' } });
  if (r.value !== 'ok' || !r.text.trim()) return null;
  const [code, ...rest] = r.text.trim().split(/\s+/);
  if (!decorOf(code)) { S().decors.push({ code, naam: rest.join(' '), kleur: '#cccccc' }); Store.save(); }
  return code;
}

/** Koppelt een decorkeuze; "Ander decor…" vraagt een nieuw decor. */
function bindDecor(select, apply) {
  select.addEventListener('change', async () => {
    let v = select.value;
    if (v === '__nieuw') {
      v = await askNewDecor();
      if (v == null) { select.value = select.dataset.prev ?? ''; return; }
    }
    select.dataset.prev = v;
    apply(v);
  });
  select.dataset.prev = select.value;
}

/** Tekening van een paneel met boringen, groeven, uitsparingen en kantenbanden. */
function panelSVG(p, names) {
  const W = p.uLen, H = p.vLen;
  const pad = Math.max(W, H) * 0.08 + 30;
  const vb = `${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`;
  const Y = v => H - v;   // v naar boven
  const s = Math.max(W, H) / 400;  // lijndikte in verhouding
  const panelColor = decorOf(p.decor)?.kleur;
  let g = `<rect x="0" y="0" width="${W}" height="${H}" class="pnl" stroke-width="${s * 1.5}"${panelColor ? ` style="fill:${panelColor}"` : ''}/>`;
  // Kantenbanden
  // Band als smal vak net buiten de rand, in de kleur van zijn decor.
  const band = e => {
    if (!p.edges[e]) return '';
    const w = s * (p.edges[e] === 2 ? 9 : 6);
    const kleur = decorOf(p.edgeDecor?.[e])?.kleur ?? '#e08a1e';
    const r = e === 'u0' ? [-w, 0, w, H] : e === 'u1' ? [W, 0, w, H] : e === 'v1' ? [0, -w, W, w] : [0, H, W, w];
    return `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" class="band" style="fill:${kleur}" stroke-width="${s * 0.8}"/>`;
  };
  g += band('u0') + band('u1') + band('v0') + band('v1');
  for (const op of p.ops) {
    if (op.kind === 'groef') {
      const horiz = Math.abs(op.v2 - op.v1) < Math.abs(op.u2 - op.u1);
      g += horiz
        ? `<rect x="${Math.min(op.u1, op.u2)}" y="${Y(op.v1) - op.breedte / 2}" width="${Math.abs(op.u2 - op.u1)}" height="${op.breedte}" class="groove${op.frees ? ' led' : ''}"/>`
        : `<rect x="${op.u1 - op.breedte / 2}" y="${Y(Math.max(op.v1, op.v2))}" width="${op.breedte}" height="${Math.abs(op.v2 - op.v1)}" class="groove${op.frees ? ' led' : ''}"/>`;
    } else if (op.kind === 'uitsparing') {
      g += `<rect x="${op.u}" y="${Y(op.v + op.h)}" width="${op.w}" height="${op.h}" class="notch"/>`;
    } else if (op.kind === 'clamex' && op.edge == null) {
      g += `<rect x="${op.u - 25}" y="${Y(op.v) - 4}" width="50" height="8" rx="3" class="clamex"/>`;
    } else if (op.edge) {
      // Bewerking in de kant: driehoekje op de rand.
      const m = 9 * s;
      let x, y, pts;
      if (op.edge === 'u0') { x = 0; y = Y(op.pos); pts = `${x},${y - m} ${x + m * 1.4},${y} ${x},${y + m}`; }
      else if (op.edge === 'u1') { x = W; y = Y(op.pos); pts = `${x},${y - m} ${x - m * 1.4},${y} ${x},${y + m}`; }
      else if (op.edge === 'v0') { x = op.pos; y = H; pts = `${x - m},${y} ${x},${y - m * 1.4} ${x + m},${y}`; }
      else { x = op.pos; y = 0; pts = `${x - m},${y} ${x},${y + m * 1.4} ${x + m},${y}`; }
      g += `<polygon points="${pts}" class="${op.kind === 'clamex' ? 'clamex' : 'edgeop'}"/>`;
    } else if (op.kind === 'boring') {
      const cls = op.doorgaand ? 'hole through' : op.naam === 'Systeemboring' ? 'hole sys' : 'hole';
      g += `<circle cx="${op.u}" cy="${Y(op.v)}" r="${Math.max(op.dia / 2, 2 * s)}" class="${cls}" stroke-width="${s}"/>`;
    }
  }
  // Maten en randnamen
  const fs = Math.max(W, H) / 26;
  g += `<text x="${W / 2}" y="${H + pad * 0.62}" font-size="${fs}" text-anchor="middle" class="dim">${mm(W)}</text>`;
  g += `<text x="${-pad * 0.55}" y="${H / 2}" font-size="${fs}" text-anchor="middle" class="dim" transform="rotate(-90 ${-pad * 0.55} ${H / 2})">${mm(H)}</text>`;
  g += `<text x="${W / 2}" y="${-pad * 0.35}" font-size="${fs * 0.75}" text-anchor="middle" class="edge-name">${names.v1}</text>`;
  g += `<text x="${W + pad * 0.45}" y="${H / 2}" font-size="${fs * 0.75}" text-anchor="middle" class="edge-name" transform="rotate(90 ${W + pad * 0.45} ${H / 2})">${names.u1}</text>`;
  return `<svg viewBox="${vb}" class="panel-svg" role="img" aria-label="Tekening ${esc(p.naam)}">${g}</svg>
    <div class="legend"><span><i class="lg hole"></i>Boring</span><span><i class="lg through"></i>Doorgaand</span><span><i class="lg sys"></i>Systeemboring</span><span><i class="lg edgeop"></i>In de kant</span><span><i class="lg groove"></i>Groef</span><span><i class="lg led"></i>Led-groef</span><span><i class="lg clamex"></i>Clamex</span><span><i class="lg band"></i>Kantenband</span></div>`;
}

// MARK: - Zaaglijst

function cutRows(project) {
  const rows = [];
  const hardware = {};
  for (const k of project.kasten) {
    const res = buildCabinet(k, S());
    if (res.error) continue;
    for (const p of res.parts) {
      const c = cutInfo(p);
      rows.push({ kast: k.code, naam: p.naam, mat: matLabel(p), dikte: p.dikte, ...c });
    }
    for (const h of res.hardware) hardware[h.naam] = (hardware[h.naam] ?? 0) + h.aantal;
  }
  // Gelijke onderdelen binnen dezelfde kast samenvoegen.
  const merged = [];
  for (const r of rows) {
    const same = merged.find(m => m.kast === r.kast && m.naam.replace(/ (links|rechts|\d+)$/, '') === r.naam.replace(/ (links|rechts|\d+)$/, '')
      && m.mat === r.mat && m.L === r.L && m.B === r.B && ['L1', 'L2', 'B1', 'B2'].every(e => m[e] === r[e] && (!r[e] || m[e + 'd'] === r[e + 'd'])));
    if (same) { same.aantal++; if (same.naam !== r.naam) same.naam = same.naam.replace(/ (links|rechts|\d+)$/, ''); }
    else merged.push({ ...r, aantal: 1 });
  }
  // Kantenband in meter, per dikte en decor.
  const bands = {};
  for (const r of merged) for (const e of ['L1', 'L2', 'B1', 'B2']) {
    if (!r[e]) continue;
    const key = `${r[e]} mm · ${decorName(r[e + 'd'])}`;
    bands[key] = (bands[key] ?? 0) + (e[0] === 'L' ? r.L : r.B) * r.aantal / 1000;
  }
  return { rows: merged, hardware: Object.entries(hardware).map(([naam, aantal]) => ({ naam, aantal })),
    bands: Object.entries(bands).map(([naam, m]) => ({ naam, meter: Math.round(m * 100) / 100 })) };
}

function openCutList(project) {
  const { rows, hardware, bands } = cutRows(project);
  const mats = [...new Set(rows.map(r => r.mat))];
  const band = (r, e) => r[e] ? `${r[e]} ${esc(r[e + 'd'])}` : '–';
  const body = el(`<div class="content wide">
    ${mats.map(m => `<div class="group"><div class="group-header"><span>${esc(m)}</span><span>${rows.filter(r => r.mat === m).reduce((t, r) => t + r.aantal, 0)} stuks</span></div>
      <div class="table-wrap"><table class="cut"><thead><tr><th>Kast</th><th>Onderdeel</th><th class="n">Aantal</th><th class="n">Lengte</th><th class="n">Breedte</th><th class="n">L1</th><th class="n">L2</th><th class="n">B1</th><th class="n">B2</th></tr></thead>
      <tbody>${rows.filter(r => r.mat === m).map(r => `<tr><td>${esc(r.kast)}</td><td>${esc(r.naam)}</td><td class="n">${r.aantal}</td><td class="n">${mm(r.L)}</td><td class="n">${mm(r.B)}</td><td class="n">${band(r, 'L1')}</td><td class="n">${band(r, 'L2')}</td><td class="n">${band(r, 'B1')}</td><td class="n">${band(r, 'B2')}</td></tr>`).join('')}</tbody></table></div>
      <div class="group-body cut-list">${rows.filter(r => r.mat === m).map(r => {
        const bands = ['L1', 'L2', 'B1', 'B2'].filter(e => r[e]).map(e => `${e} ${r[e]} ${r[e + 'd']}`).join(', ');
        return `<div class="row"><span class="kast-code">${esc(r.kast)}</span><span class="row-main"><span>${esc(r.naam)}</span>
          <span class="row-sub num">${mm(r.L)} × ${mm(r.B)} mm${bands ? ` · band ${bands}` : ''}</span></span><span class="row-value num"><b>${r.aantal}×</b></span></div>`;
      }).join('')}</div></div>`).join('')}
    <div class="group"><div class="group-header">Kantenband</div><div class="group-body">${bands.map(b => `<div class="row"><span class="row-label">${esc(b.naam)}</span><span class="row-value num">${mm(b.meter)} m</span></div>`).join('') || '<div class="row"><span class="row-sub">Geen kantenband.</span></div>'}</div>
      <div class="group-footer">Netto lengte, zonder overmaat.</div></div>
    <div class="group"><div class="group-header">Beslag</div><div class="group-body">${hardware.map(h => `<div class="row"><span class="row-label">${esc(h.naam)}</span><span class="row-value num">${h.aantal}</span></div>`).join('') || '<div class="row"><span class="row-sub">Geen beslag.</span></div>'}</div>
    <div class="group-footer">Lengte = langs de nerf. L1/L2 = band op de lange kanten, B1/B2 = op de korte kanten, met dikte (mm) en decor. De zaagmaat is de eindmaat.</div></div>
  </div>`);
  openSheet({
    title: `Zaaglijst ${project.naam}`, full: true, left: { label: 'Klaar', bold: true },
    right: { icon: 'share', label: 'Exporteren', onClick: async () => {
      const c = await actionSheet('Zaaglijst exporteren', '', [
        { label: 'Excel (.xlsx)', value: 'xlsx' }, { label: 'STK voor de zaag (Schelling HPO)', value: 'stk' }, { label: 'CSV', value: 'csv' }]);
      if (c === 'xlsx') shareFile(cutListXlsx(project, rows, hardware, bands), `Zaaglijst ${safeName(project.naam)}.xlsx`);
      if (c === 'csv') shareFile(cutListCsv(project, rows), `Zaaglijst ${safeName(project.naam)}.csv`);
      if (c === 'stk') { const stk = cutListStk(project, rows); shareFile(stk.blob, stk.name); }
    } },
    body,
  });
}

/**
 * Zaaglijst als CSV voor de optimalisatiesoftware van de zaag (bv. HPO op een IMA Schelling).
 * Eén rij per stuk, vaste kolommen; in HPO stel je één keer een importsjabloon in met deze kolomvolgorde.
 * Scheidingsteken ; en decimaalpunt (instelbaar), UTF-8.
 */
const CSV_COLUMNS = ['Nr', 'Project', 'Kast', 'Onderdeel', 'Materiaal', 'Decor', 'Plaattype', 'Dikte', 'Lengte', 'Breedte', 'Aantal', 'Draaien', 'Band L1', 'Band L2', 'Band B1', 'Band B2'];
function cutListCsv(project, rows) {
  const N = S().nest;
  const sep = N.csvScheiding || ';';
  const dec = N.csvDecimaal || '.';
  const num = n => String(Math.round(Number(n) * 10) / 10).replace('.', dec);
  const cell = v => { const t = String(v ?? ''); return /[";\n,]/.test(t) || t.includes(sep) ? `"${t.replace(/"/g, '""')}"` : t; };
  // Materiaalcode: decor, plaattype en dikte, zoals de zaag ze als plaatmateriaal kent (bv. W980_MEL_18).
  const matCode = r => `${r.decor}_${(r.plaattype ?? 'Melamine') === 'HPL' ? 'HPL' : 'MEL'}_${num(r.dikte)}`;
  const band = (r, e) => r[e] ? `${num(r[e])} ${r[e + 'd'] ?? ''}`.trim() : '';
  const lines = [CSV_COLUMNS.map(cell).join(sep)];
  rows.forEach((r, i) => {
    const draaien = isWoodDecor(r.decor, S().decors) ? 0 : 1;   // houtdecor: nerf in de lengte, niet draaien
    lines.push([i + 1, project.naam, r.kast, r.naam, matCode(r), r.decor, r.plaattype ?? 'Melamine', num(r.dikte), num(r.L), num(r.B), r.aantal, draaien,
      band(r, 'L1'), band(r, 'L2'), band(r, 'B1'), band(r, 'B2')].map(cell).join(sep));
  });
  return new Blob(['\ufeff' + lines.join('\r\n') + '\r\n'], { type: 'text/csv' });
}

// MARK: - STK voor de Schelling-zaag (HPO), volgens "NC data format 4.12 for standard import"
// Vaste kolommen gescheiden door één spatie; tekstvelden links uitgelijnd en aangevuld met spaties,
// getallen rechts uitgelijnd met voorloopnullen; maten in 1/1000 mm; elke regel eindigt met CR LF.

const stkText = (v, n) => {
  // Alleen ASCII (é → e) en zonder regeleinden.
  const t = String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '').slice(0, n);
  return t.padEnd(n, ' ');
};
const stkNum = (v, n) => String(Math.max(0, Math.round(Number(v) || 0))).slice(-n).padStart(n, '0');
const stkMm = mmValue => stkNum(Math.round(Number(mmValue) * 1000), 8);
const stkLine = fields => fields.join(' ');

/** Plaattype zoals in de platendatabank van HPO, volgens het sjabloon in de instellingen (bv. MEL_{decor}_{dikte} → MEL_W980_18). */
const stkBoardType = r => {
  const N = { ...HPO_DEFAULTS, ...(S().nest ?? {}) };
  const tpl = (r.plaattype ?? 'Melamine') === 'HPL' ? N.hpoHpl : N.hpoMelamine;
  return String(tpl || '{decor}').replace(/\{decor\}/gi, r.decor ?? '').replace(/\{dikte\}/gi, String(Math.round(Number(r.dikte) * 10) / 10));
};

/** Naam van de stuklijst: tevens de bestandsnaam, hoogstens 20 tekens, zonder verboden tekens. */
const stkName = project => (project.naam || 'Stuklijst').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 20) || 'Stuklijst';

const STK_GUID = '{00000000-0000-0000-0000-000000000000}';

/** Tekst als UTF-16 LE met BOM, zoals HPO zelf zijn .stk-bestanden schrijft. */
function utf16le(text) {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff; bytes[1] = 0xfe;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); bytes[2 + i * 2] = c & 255; bytes[3 + i * 2] = c >> 8; }
  return bytes;
}

// Opbouw overgenomen van stuklijsten die HPO zelf exporteerde (voorbeelden/stk): L01, L06, per onderdeel F01 + F06 + F09 + F80, L$.
function cutListStk(project, rows) {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const name = stkName(project);
  const lines = [];
  // L01: kopregel van de stuklijst.
  lines.push(stkLine(['L', '01', stkText(name, 20), stkText('', 20), date, date, '0', '0', '2', stkText('', 20), '0']));
  // L06: databanken gebruiken (platen, kanten, ...).
  lines.push(stkLine(['L', '06', stkText('', 20), '1', '1', '1', '1', '1', '1', '0', '0', '0', stkText('', 20)]));
  rows.forEach((r, i) => {
    const nr = i + 1;
    const wood = isWoodDecor(r.decor, S().decors);
    const bands = ['L1', 'L2', 'B1', 'B2'].filter(e => r[e]).map(e => `${e}:${r[e]} ${r[e + 'd'] ?? ''}`.trim()).join(' ');
    // F01: één regel per onderdeel. A = lengte langs de nerf, B = breedte; zaagmaat = eindmaat.
    lines.push(stkLine([
      'F', '01',
      stkNum(nr, 4),                 // volgnummer
      stkNum(0, 4),                  // gecombineerd nummer
      '0',                           // categorie: normaal stuk
      stkNum(r.aantal, 6),           // aantal besteld
      stkNum(r.aantal, 6),           // aantal geoptimaliseerd
      stkText(stkBoardType(r), 20),  // plaattype (moet bestaan in de platendatabank van HPO)
      stkMm(r.dikte),                // plaatdikte
      stkMm(r.L), stkMm(r.B),        // zaagmaat A en B
      stkMm(r.L), stkMm(r.B),        // eindmaat A en B
      stkText(`${r.kast}_${r.naam}`, 20), // omschrijving
      wood ? '0' : '2',              // draaien: houtdecor niet (nerf langs A), unikleur wel
      '9', '9',                      // prioriteit, kwaliteit
      '0',                           // alleen gedraaid gebruiken: nee
      stkNum(0, 2),                  // groep
      stkNum(0, 6), stkNum(0, 3),    // overlevering stuks / %
      stkNum(0, 6), stkNum(0, 3),    // onderlevering stuks / %
      '1', '0',                      // optimaliseren: ja; klein onderdeel: nee
      stkText('', 20),               // positienummer extern (NC-programma)
      stkText('', 20),               // regelnummer extern (2e NC-programma)
      stkText(bands ? `Band ${bands}` : '', 40), // bewerkingsnotitie: kantenband
      '1', '0',                      // etiket afdrukken: ja; paklijst: nee
      stkText(r.kast, 20),           // bronbouwgroep (kast)
      stkText(name, 20),             // bronstuklijst
      stkNum(nr, 9),                 // nummer in de stuklijst
      date,                          // leverdatum
      '0', '0',                      // oriëntatie in de strook; status
      stkNum(0, 3), stkNum(0, 2), stkNum(0, 2), // intern, maatvermenigvuldiger A en B
      ' ' + stkNum(0, 6),            // aantalcorrectie (met tekenpositie)
      '1', stkNum(0, 8),             // toegestaan in 3e fase; max. afval 3e fase
      stkNum(0, 4), stkNum(0, 8),    // frontpatroon, primaire sleutel
      '0', STK_GUID, STK_GUID, STK_GUID, '0',
    ]));
    lines.push(`F 06 1${' '.repeat(22)}01 001 01${' '.repeat(85)}0`);
    lines.push('F 09 00000000 00000000 00000000 00000000 XXXX');
    lines.push(`F 80 00000000 00000000 00000000 00000000 0000 ${' '.repeat(83)} 00 00 00 00 00000000 00000000 ${' '.repeat(41)}`);
  });
  lines.push('L$');
  return { blob: new Blob([utf16le(lines.join('\r\n') + '\r\n')], { type: 'application/octet-stream' }), name: `${name}.stk` };
}

function cutListXlsx(project, rows, hardware, bands) {
  const b = (r, e) => r[e] ? `${r[e]} mm ${r[e + 'd']}` : '';
  return makeXlsx([
    { name: 'Zaaglijst', columns: [8, 30, 26, 11, 8, 8, 10, 10, 16, 16, 16, 16],
      rows: [['Kast', 'Onderdeel', 'Decor', 'Plaat', 'Dikte', 'Aantal', 'Lengte', 'Breedte', 'Band L1', 'Band L2', 'Band B1', 'Band B2'],
        ...rows.map(r => [r.kast, r.naam, decorName(r.decor), r.plaattype ?? 'Melamine', r.dikte, r.aantal, r.L, r.B, b(r, 'L1'), b(r, 'L2'), b(r, 'B1'), b(r, 'B2')])] },
    { name: 'Kantenband', columns: [36, 10], rows: [['Kantenband', 'Meter'], ...bands.map(x => [x.naam, x.meter])] },
    { name: 'Beslag', columns: [40, 10], rows: [['Beslag', 'Aantal'], ...hardware.map(h => [h.naam, h.aantal])] },
  ]);
}

// MARK: - Zaagplan

function openCutPlan(project) {
  const N = S().nest;
  const groups = nestingItems(project, S(), matLabel, N.zaagsnede);
  const body = el('<div class="content wide plan"></div>');
  let totalSheets = 0;
  const parts = [];
  for (const [key, items] of groups) {
    const NS = sheetSize(N, key.split(' · ')[1]);
    const { sheets, tooBig } = nest(items, NS);
    totalSheets += sheets.length;
    const decorCode = key.split(' ')[0];
    const color = decorOf(decorCode)?.kleur ?? '#e9dcc3';
    const wood = isWoodDecor(decorCode, S().decors);
    const usage = sheets.length ? Math.round(sheets.reduce((t, s) => t + s.usage, 0) / sheets.length * 100) : 0;
    parts.push(`<div class="group"><div class="group-header"><span>${esc(key)}</span><span>${sheets.length} ${sheets.length === 1 ? 'plaat' : 'platen'} · ${usage}% benut</span></div>
      ${tooBig.length ? `<div class="notice">${icon('warning')}<span>Past niet op een plaat van ${NS.plaatLengte} × ${NS.plaatBreedte}: ${tooBig.map(t => esc(t.label)).join(', ')}.</span></div>` : ''}
      ${sheets.map((sh, i) => {
        const list = [];
        const svg = sheetSVG(sh, NS, color, list);
        return `<div class="card plan-sheet"><div class="plan-title">Plaat ${i + 1} van ${sheets.length} · ${NS.plaatLengte} × ${NS.plaatBreedte} mm · ${Math.round(sh.usage * 100)}% benut${wood ? ' · nerf ⟷' : ''}</div>${svg}
          <ol class="plan-list">${list.map(x => `<li><span class="num">${x.n}</span><span>${esc(x.label)}</span><span class="num">${mm(x.L)} × ${mm(x.B)}${x.rotated ? ' ↻' : ''}${x.set ? ` · set ${x.set}` : ''}</span></li>`).join('')}</ol></div>`;
      }).join('')}
    </div>`);
  }
  body.innerHTML = `<div class="notice">${icon('ruler')}<span>Platen: melamine ${N.plaatLengte} × ${N.plaatBreedte} mm, HPL ${N.hplLengte} × ${N.hplBreedte} mm; zaagsnede ${N.zaagsnede} mm, randafzaag ${N.randafzaag} mm (aan te passen in Instellingen). Houtdecors blijven met de nerf in de lengte van de plaat; unikleuren mogen draaien. Alle sneden lopen recht door, zoals op een plaatzaag.</span></div>`
    + (parts.join('') || '<div class="empty"><h2>Geen onderdelen</h2><p>Vul eerst de maten van de kasten in.</p></div>')
    + `<div class="group-footer">Totaal ${totalSheets} ${totalSheets === 1 ? 'plaat' : 'platen'}. Op elk stuk staan de benaming en de maat (lengte × breedte); de lijst onder elke plaat geeft hetzelfde in tekst. Samengestelde stukken met doorlopende nerf staan gestreept omlijnd; zaag ze eerst als één stuk. ↻ = gedraaid (alleen bij unikleuren).</div>`;
  openSheet({ title: `Zaagplan ${project.naam}`, full: true, left: { label: 'Klaar', bold: true },
    right: { label: 'Afdrukken', onClick: () => window.print() }, body });
}

/** Tekening van één plaat met de stukken erop; elk stuk krijgt een nummer (de lijst komt in `list`). */
function sheetSVG(sh, N, color, list) {
  const L = N.plaatLengte, B = N.plaatBreedte;
  // Benaming en maat van het stuk op de plaat; bij smalle, hoge stukken verticaal geschreven.
  const label = (x, y, w, h, n) => {
    const it = list[n - 1];
    const vertical = h > w * 1.3;
    const len = vertical ? h : w, thick = vertical ? w : h;
    const name = it.label, dims = `${mm(it.L)} × ${mm(it.B)}${it.rotated ? ' ↻' : ''}`;
    // Lettergrootte: past in de lengte (ca. 0,55 × grootte per teken) en in de dikte (twee regels).
    let size = Math.min(70, (len - 16) / (Math.max(name.length, dims.length) * 0.64), (thick - 10) / 2.4);
    let lines = [name, dims];
    if (size < 18) {
      // Te klein voor twee regels: één regel met de naam, eventueel ingekort.
      size = Math.min(60, (thick - 8) / 1.2);
      const max = Math.floor((len - 12) / (size * 0.64));
      lines = [name.length > max ? name.slice(0, Math.max(1, max - 1)) + '…' : name];
      if (size < 10 || max < 2) return '';
    }
    const cx = x + w / 2, cy = y + h / 2;
    const tr = vertical ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
    const lh = size * 1.15;
    return `<g${tr}>` + lines.map((t, i) => `<text x="${cx}" y="${cy + (i - (lines.length - 1) / 2) * lh + size * 0.35}" font-size="${i ? size * 0.85 : size}" text-anchor="middle" class="${i ? 'plan-dims' : 'plan-label'}">${esc(t)}</text>`).join('') + '</g>';
  };
  let g = `<rect x="0" y="0" width="${L}" height="${B}" class="plan-board"/>`;
  for (const p of sh.placed) {
    if (p.parts) {
      // Samengesteld stuk: de fronten op hun plaats, samen omlijnd.
      for (const f of p.parts) {
        const n = list.length + 1;
        list.push({ n, label: f.label, L: f.L, B: f.B, set: p.set });
        g += `<rect x="${p.x + f.x}" y="${p.y + f.y}" width="${f.L}" height="${f.B}" class="plan-part" style="fill:${color}"/>` + label(p.x + f.x, p.y + f.y, f.L, f.B, n);
      }
      g += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" class="plan-set"/>`;
    } else {
      const n = list.length + 1;
      list.push({ n, label: p.label, L: p.L, B: p.B, rotated: p.rotated });
      g += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" class="plan-part" style="fill:${color}"/>` + label(p.x, p.y, p.w, p.h, n);
    }
  }
  // Maatlijnen: lengte onder de plaat, breedte links ernaast.
  const t = 18;
  g += `<line x1="0" y1="${B + 45}" x2="${L}" y2="${B + 45}" class="plan-dimline"/>`
    + `<line x1="0" y1="${B + 45 - t}" x2="0" y2="${B + 45 + t}" class="plan-dimline"/><line x1="${L}" y1="${B + 45 - t}" x2="${L}" y2="${B + 45 + t}" class="plan-dimline"/>`
    + `<text x="${L / 2}" y="${B + 120}" font-size="64" text-anchor="middle" class="plan-dimtext">${L} mm</text>`;
  g += `<line x1="-45" y1="0" x2="-45" y2="${B}" class="plan-dimline"/>`
    + `<line x1="${-45 - t}" y1="0" x2="${-45 + t}" y2="0" class="plan-dimline"/><line x1="${-45 - t}" y1="${B}" x2="${-45 + t}" y2="${B}" class="plan-dimline"/>`
    + `<text x="-90" y="${B / 2}" font-size="64" text-anchor="middle" class="plan-dimtext" transform="rotate(-90 -90 ${B / 2})">${B} mm</text>`;
  return `<svg viewBox="-150 -20 ${L + 170} ${B + 160}" class="plan-svg" role="img" aria-label="Zaagplan ${L} × ${B} mm">${g}</svg>`;
}

// MARK: - MPR

async function exportMpr(project) {
  if (!project.kasten.length) { alertBox('Geen kasten', 'Voeg eerst kasten toe aan het project.'); return; }
  const { blob, count, notes } = projectMprZip(project, S(), { ...S().mpr, tools: S().tools });
  const warnings = [];
  const checks = notes.filter(n => /geen |te kort/.test(n));
  if (checks.length) warnings.push(`${checks.length} ${checks.length === 1 ? 'onderdeel heeft' : 'onderdelen hebben'} een boring waarvoor geen passend gereedschap in de gereedschapslijst staat (zie LEESMIJ.txt).`);
  if (S().mpr.groefMethode === 'zaag' && !S().mpr.groefTool) warnings.push('Het gereedschap voor de rugwandgroef is niet ingevuld (Instellingen › Machine); woodWOP kiest dan zelf of vraagt erom.');
  const msg = [`${count} programma's.`, ...warnings, ...(notes.length ? [`Nog manueel: ${notes.length} punten, zie LEESMIJ.txt in het zipbestand.`] : []),
    'Controleer elk programma eerst in de simulatie van woodWOP.'].join('\n\n');
  const c = await alertBox('MPR-bestanden', msg, [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Delen of bewaren', value: 'ok' }]);
  if (c === 'ok') shareFile(blob, `MPR ${safeName(project.naam)}.zip`);
}

function openMprText(k, p) {
  const { files, skipped, frame } = mprForPart(p, { ...S().mpr, tools: S().tools }, safeName(`${k.code}_${p.id}`));
  const body = el(`<div class="content">
    <div class="notice">${icon('ruler')}<span>Ligging op de machine: ${mm(frame.L)} × ${mm(frame.B)} mm (X × Y), zijde "${esc(frame.up)}" naar boven, nulpunt linksvoor.${skipped.length ? ` Niet in het bestand: ${[...new Set(skipped)].join(', ')}.` : ''}</span></div>
    ${files.map(f => `<div class="group"><div class="group-header"><span>${esc(f.name)}</span></div><pre class="code">${esc(f.text)}</pre></div>`).join('')}
  </div>`);
  openSheet({ title: 'MPR', wide: true, left: { label: 'Klaar', bold: true },
    right: { icon: 'share', label: 'Delen', onClick: () => {
      if (files.length === 1) shareFile(new Blob([files[0].text], { type: 'text/plain' }), files[0].name);
      else { const z = new ZipWriter(); files.forEach(f => z.add(f.name, f.text)); shareFile(z.finalize(), `${safeName(`${k.code}_${p.id}`)}.zip`); }
    } }, body });
}

// MARK: - Kasten uit andere projecten

function importCabinets(project, onDone) {
  const others = Store.projects.filter(x => x !== project && x.kasten.length);
  if (!others.length) { alertBox('Geen andere projecten', 'Er zijn geen andere projecten met kasten op dit toestel. Een project van een ander toestel open je eerst via "Projectbestand openen".'); return; }
  const body = el(`<div class="content">${others.map(o => `<div class="group"><div class="group-header"><span>${esc(o.naam)}</span>
      <button type="button" class="link-btn" data-all="${o.id}">Alles</button></div><div class="group-body">
      ${o.kasten.map(k => `<label class="row"><input type="checkbox" class="pick" data-p="${o.id}" data-k="${k.id}">
        <span class="kast-code">${esc(k.code)}</span><span class="row-main"><span>${esc(PRESETS.find(x => x.id === k.type)?.naam ?? k.type)}</span>
        <span class="row-sub">${k.breedte ?? '?'} × ${k.hoogte ?? '?'} × ${k.diepte ?? '?'} mm</span></span></label>`).join('')}
    </div></div>`).join('')}
    <div class="group-footer">De gekozen kasten worden gekopieerd naar "${esc(project.naam)}". Het andere project blijft ongewijzigd.</div></div>`);
  const sheet = openSheet({ title: 'Kasten toevoegen', left: { label: 'Annuleer' }, body,
    right: { label: 'Voeg toe', bold: true, onClick: () => {
      const picked = $$('.pick:checked', body);
      const used = new Set(project.kasten.map(k => k.code));
      let n = project.kasten.length;
      for (const c of picked) {
        const src = Store.projects.find(x => x.id === c.dataset.p).kasten.find(k => k.id === c.dataset.k);
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = uid();
        // Code behouden als die nog vrij is, anders een nieuwe.
        if (used.has(copy.code)) { do { n++; copy.code = `K${n}`; } while (used.has(copy.code)); }
        used.add(copy.code);
        copy.plaatsing = 'auto';
        project.kasten.push(copy);
      }
      touch(project);
      sheet.close();
      onDone();
      if (picked.length) alertBox('Kasten toegevoegd', `${picked.length} ${picked.length === 1 ? 'kast' : 'kasten'} toegevoegd. Ze staan automatisch achteraan in de opstelling.`);
    } } });
  $$('[data-all]', body).forEach(b => b.addEventListener('click', () => {
    const boxes = $$(`.pick[data-p="${b.dataset.all}"]`, body);
    const on = !boxes.every(x => x.checked);
    boxes.forEach(x => { x.checked = on; });
  }));
}

// MARK: - Projectbestand

function shareProject(p) {
  const data = JSON.stringify({ app: 'KastenTool', version: 1, exportedAt: new Date().toISOString(), project: p }, null, 2);
  shareFile(new Blob([data], { type: 'application/json' }), `${safeName(p.naam)}.kasten.json`);
}

async function importProject(file) {
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { data = null; }
  if (!data || data.app !== 'KastenTool' || !data.project?.kasten) { alertBox('Openen mislukt', 'Dit bestand is geen projectbestand van de Kasten tool.'); return; }
  const p = data.project;
  const existing = Store.projects.find(x => x.id === p.id);
  if (existing) {
    const c = await actionSheet(`"${p.naam}" bestaat al op dit toestel.`, '', [{ label: 'Vervangen door dit bestand', role: 'destructive', value: 'replace' }, { label: 'Als kopie toevoegen', value: 'copy' }]);
    if (!c) return;
    if (c === 'replace') Store.projects = Store.projects.filter(x => x !== existing);
    else { p.id = uid(); p.naam = `${p.naam} (kopie)`; }
  }
  p.gewijzigd = Date.now();
  Store.projects.push(p);
  Store.save();
  Projects.open = p.id;
  Projects.render();
}

// MARK: - Instellingen

const SETTING_GROUPS = [
  ['Platen', [['plaat', 'Korpus (mm)'], ['front', 'Fronten (mm)'], ['rug', 'Rug in groef (mm)'], ['rugDik', 'Opgeschroefde rug (mm)'], ['ladeBodemDikte', 'Ladebodem en -rug (mm)']]],
  ['Rugwandgroef', [['groefBreedte', 'Breedte'], ['groefDiepte', 'Diepte'], ['rugInsprong', 'Afstand tot achterkant'], ['rugSpeling', 'Speling per kant'], ['rugSchroefAfstand', 'Schroefafstand opgeschroefde rug']]],
  ['Kantenband', [['bandKorpus', 'Voorkant korpus (mm)'], ['bandLegplank', 'Voorkant legplank (mm)'], ['bandFront', 'Rondom fronten (mm)']]],
  ['Fronten', [['voeg', 'Voeg tussen fronten'], ['deurMaxBreedte', 'Max. breedte van één deur'], ['greepHartafstand', 'Greep hart-op-hart (standaard)'], ['greepDia', 'Greepgat Ø'], ['greepRand', 'Greep afstand tot rand'], ['greepVanBoven', 'Greep (deur) vanaf boven'], ['greeplijstBinnenHoogte', 'Greeplijst: binnenhoogte'], ['greeplijstBinnenDiepte', 'Greeplijst: binnendiepte']]],
  ['Deuvels en schroeven', [['deuvelDia', 'Deuvel Ø'], ['deuvelLengte', 'Deuvel lengte'], ['deuvelEersteVoor', 'Eerste deuvel vanaf voor'], ['deuvelPaar', 'Tweede deuvel: + (paar)'], ['deuvelLaatsteAchter', 'Laatste deuvel vanaf achter'], ['deuvelMaxTussen', 'Max. afstand ertussen'], ['schroefVoor', 'Eerste schroef vanaf voor'], ['schroefAchter', 'Laatste schroef vanaf achter'], ['deuvelDiepteVlak', 'Diepte in het vlak'], ['deuvelDiepteKant', 'Diepte in de kant'], ['schroefDia', 'Schroefgat Ø']]],
  ['Clamex', [['clamexMarge', 'Eerste en laatste vanaf voor/achter'], ['clamexMaxAfstand', 'Max. tussenafstand'], ['clamexDeuvel', 'Deuvel naast de Clamex (±)']]],
  ['Hangkasten', [['ophangVanBoven', 'Ophanggaten vanaf boven'], ['ophangVanAchter', 'Ophanggaten vanaf achter'], ['ophangDia', 'Ophanggat Ø'], ['ophangDiepte', 'Ophanggat diepte']]],
  ['Scharnieren', [['montageplaatVoor', 'Montageplaat vanaf voorkant'], ['montageplaatTussen', 'Afstand tussen gaten'], ['montageplaatDia', 'Gat Ø'], ['montageplaatDiepte', 'Gat diepte'], ['potDia', 'Pot Ø'], ['potDiepte', 'Pot diepte'], ['potRand', 'Pot afstand tot rand'], ['scharnierRand', 'Scharnier vanaf boven/onder'], ['scharnierDeuvelDiepte', 'Deuvelgaatjes scharnier diepte'], ['plaatjeHoogte', 'Hoogte montageplaatje'], ['scharnierVrij', 'Vrij rond regels/tussenbodems'], ['demperRand', 'Demper vanaf de hoek'], ['demperDia', 'Demper Ø'], ['demperDiepte', 'Demper diepte']]],
  ['Systeemboringen', [['systeemVoor', 'Vanaf voorkant'], ['systeemAchter', 'Vanaf rug'], ['systeemRaster', 'Raster'], ['systeemMarge', 'Vanaf boven/onder'], ['systeemDia', 'Ø'], ['systeemDiepte', 'Diepte']]],
  ['Led-verlichting', [['ledBreedte', 'Breedte groef'], ['ledDiepte', 'Diepte groef'], ['ledAfstand', 'Standaard afstand tot rand'], ['ledKabelDia', 'Kabelgat Ø'], ['ledKabelAfstand', 'Kabelgat vanaf einde groef']]],
  ['Overige', [['regelBreedte', 'Breedte regels'], ['rugInsprongToestel', 'Rug bij toestellen: afstand tot achterkant'], ['legplankInsprong', 'Legplank inspringing voor'], ['legplankSpeling', 'Legplank speling per kant'], ['plintInsprong', 'Plint inspringing'], ['verluchtingInsprong', 'Verluchting: buitenste bodem/regel achteruit'], ['verluchtingSpleet', 'Verluchting: spleet']]],
];

const SettingsView = {
  renderTools() {
    const box = $('#st-tools');
    const s = S();
    const kinds = [['boorV', 'Verticaal boorblok'], ['boorH', 'Horizontale boren'], ['boorL', 'Lange boren'], ['frees', 'Frezen'], ['zaag', 'Zagen']];
    box.innerHTML = '';
    $('#tl-count').textContent = `${s.tools.length} stuks`;
    for (const [kind, title] of kinds) {
      const list = s.tools.filter(t => t.soort === kind);
      if (!list.length) continue;
      box.appendChild(el(`<div class="row sub-head"><span class="row-sub"><b>${title}</b></span></div>`));
      for (const t of list) {
        const r = el(`<button class="row link" type="button"><span class="kast-code">${esc(t.nr)}</span><span class="row-main"><span>${esc(t.naam)}</span>
          <span class="row-sub">Ø${mm(t.dia)} · ${mm(t.lengte)} mm${t.richting ? ` · ${t.richting}` : ''}</span></span></button>`);
        r.addEventListener('click', async () => {
          const res = await alertBox(`Gereedschap ${t.nr}`, 'Diameter en bruikbare lengte in mm, bijvoorbeeld "8 30".',
            [{ label: 'Verwijder', role: 'destructive', value: 'del' }, { label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Bewaar', value: 'ok' }],
            { input: { value: `${t.dia} ${t.lengte}` } });
          if (res.value === 'del') s.tools = s.tools.filter(x => x !== t);
          else if (res.value === 'ok') { const [d, l] = res.text.replace(/,/g, '.').split(/\s+/).map(Number); if (d > 0) t.dia = d; if (l > 0) t.lengte = l; }
          else return;
          Store.save(); this.renderTools();
        });
        box.appendChild(r);
      }
    }
    const reset = el(`<button class="row button" type="button">Lijst van de P110 terugzetten</button>`);
    reset.addEventListener('click', () => { s.tools = JSON.parse(JSON.stringify(P110_TOOLS)); Store.save(); this.renderTools(); });
    box.appendChild(reset);
  },

  renderDecors() {
    const box = $('#st-decors');
    const s = S();
    box.innerHTML = '';
    s.decors.forEach((d, i) => {
      const r = el(`<div class="row decor-row">
        <input type="color" class="swatch" value="${esc(d.kleur)}" aria-label="Kleur ${esc(d.code)}">
        <input class="input-plain left code" value="${esc(d.code)}" aria-label="Code">
        <input class="input-plain left" value="${esc(d.naam)}" placeholder="Naam" aria-label="Naam">
        <label class="hout-check" title="Houtstructuur (nerf)"><input type="checkbox" ${isWoodDecor(d.code, s.decors) ? 'checked' : ''}>Hout</label>
        <button class="mini danger" type="button" aria-label="Verwijder">${icon('trash')}</button></div>`);
      const [kleur, code, naam, hout] = $$('input', r);
      hout.addEventListener('change', () => { d.hout = hout.checked; Store.save(); });
      kleur.addEventListener('input', () => { d.kleur = kleur.value; Store.save(); });
      code.addEventListener('change', () => { if (code.value.trim()) { d.code = code.value.trim(); Store.save(); } });
      naam.addEventListener('change', () => { d.naam = naam.value.trim(); Store.save(); });
      $('button', r).addEventListener('click', async () => {
        const ok = await alertBox(`${d.code} verwijderen?`, 'Kasten die dit decor gebruiken, tonen dan alleen de code.', [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Verwijder', role: 'destructive', value: 'yes' }]);
        if (ok === 'yes') { s.decors.splice(i, 1); Store.save(); this.renderDecors(); }
      });
      box.appendChild(r);
    });
    const add = el(`<button class="row button" type="button"><span class="icon-label">${icon('plus')}Decor toevoegen</span></button>`);
    add.addEventListener('click', async () => { if (await askNewDecor()) this.renderDecors(); });
    box.appendChild(add);
  },

  render() {
    const v = $('#view-settings');
    const s = S();
    v.innerHTML = `
      <header class="navbar"><div class="navbar-row">
        <div class="navbar-left"><button class="nav-btn hidden" type="button" id="st-back">${icon('left')}Instellingen</button></div>
        <div class="navbar-title" id="st-title">Instellingen</div></div></header>
      <div class="content" id="st-content">
        <div id="st-menu"></div>
        <div class="notice" data-cat="*">${icon('ruler')}<span>Alle maten in mm. Wijzigingen gelden meteen voor alle kasten in alle projecten.</span></div>
        ${SETTING_GROUPS.map(([title, fields]) => `<div class="group"><div class="group-header">${title}</div><div class="group-body">
          ${fields.map(([key, label]) => row(label, numHTML(`st-${key}`, s[key]))).join('')}
        </div></div>`).join('')}
        <div class="group"><div class="group-header">Decors</div><div class="group-body" id="st-decors"></div>
          <div class="group-body" style="margin-top:10px">
            ${row('Standaard korpus', decorSelectHTML('st-decorKorpus', s.decorKorpus))}
            ${row('Standaard fronten', decorSelectHTML('st-decorFront', s.decorFront))}
            ${row('Plaattype fronten', selectHTML('st-frontMateriaal', PLAATTYPES.map(x => [x, x]), s.frontMateriaal))}
          </div>
          <div class="group-footer">Tik op het kleurvak om de kleur in 3D te kiezen (een benadering). "Hout" = decor met nerf: in het zaagplan blijft de nerf in de lengte van de plaat.</div></div>
        <div class="group"><div class="group-header">Zaagplan</div><div class="group-body">
          ${row('Melamine: plaatlengte', numHTML('nz-plaatLengte', s.nest.plaatLengte))}
          ${row('Melamine: plaatbreedte', numHTML('nz-plaatBreedte', s.nest.plaatBreedte))}
          ${row('HPL: plaatlengte', numHTML('nz-hplLengte', s.nest.hplLengte))}
          ${row('HPL: plaatbreedte', numHTML('nz-hplBreedte', s.nest.hplBreedte))}
          ${row('Zaagsnede', numHTML('nz-zaagsnede', s.nest.zaagsnede))}
          ${row('Randafzaag', numHTML('nz-randafzaag', s.nest.randafzaag))}
          <div class="row"><span class="row-label">HPO-plaattype melamine</span><div class="row-fill"><input class="input-plain" id="nz-hpoMelamine" value="${esc(s.nest.hpoMelamine ?? HPO_DEFAULTS.hpoMelamine)}"></div></div>
          <div class="row"><span class="row-label">HPO-plaattype HPL</span><div class="row-fill"><input class="input-plain" id="nz-hpoHpl" value="${esc(s.nest.hpoHpl ?? HPO_DEFAULTS.hpoHpl)}"></div></div>
          ${row('CSV: scheidingsteken', selectHTML('nz-csvScheiding', [[';', 'Puntkomma ;'], [',', 'Komma ,'], ['\t', 'Tab']], s.nest.csvScheiding ?? ';'))}
          ${row('CSV: decimaalteken', selectHTML('nz-csvDecimaal', [['.', 'Punt (12.5)'], [',', 'Komma (12,5)']], s.nest.csvDecimaal ?? '.'))}
        </div><div class="group-footer">De nerf loopt in de lengte van de plaat. De CSV-zaaglijst (Zaaglijst › Exporteren) heeft de kolommen: ${CSV_COLUMNS.join(', ')}. In HPO op de zaag stel je één keer een importsjabloon in met die volgorde. HPO-plaattype: de naam van de plaat in de platendatabank van de zaag, {decor} en {dikte} worden ingevuld (MEL_{decor}_{dikte} → MEL_W980_18). Die naam moet exact bestaan in HPO.</div></div>
        <div class="group"><div class="group-header">Machine (woodWOP)</div><div class="group-body">
          <div class="row"><span class="row-label">Frees voor uitsparingen</span><div class="row-fill"><input class="input-num" id="mp-freesContour" value="${esc(s.mpr.freesContour)}"></div></div>
          <div class="row"><span class="row-label">Kleine frees</span><div class="row-fill"><input class="input-num" id="mp-freesKlein" value="${esc(s.mpr.freesKlein)}"></div></div>
          ${row('Rugwandgroef', selectHTML('mp-groefMethode', [['zaag', 'Zagen (Nuten)'], ['frees', 'Frezen (kleine frees)']], s.mpr.groefMethode))}
          <div class="row"><span class="row-label">Zaag voor de groef</span><div class="row-fill"><input class="input-num" id="mp-groefTool" placeholder="nummer" value="${esc(s.mpr.groefTool)}"></div></div>
          ${row('Boren tot diepte', selectHTML('mp-boorModusBlind', [['LS', 'LS (langzaam-snel)'], ['SS', 'SS (snel-snel)']], s.mpr.boorModusBlind))}
          ${row('Doorgaand boren', selectHTML('mp-boorModusDoor', [['LSL', 'LSL (langzaam-snel-langzaam)'], ['SSS', 'SSS (snel)']], s.mpr.boorModusDoor))}
          ${row('Extra diepte doorgaand', numHTML('mp-doorExtra', s.mpr.doorExtra))}
          <div class="row"><span class="row-label">Clamex als macro (lamello_p_system)</span>${toggleHTML('mp-clamex', s.mpr.clamex)}</div>
        </div><div class="group-footer">Gereedschapsnummers zoals in het gereedschapsbeheer van de P110. Boringen kiest woodWOP zelf op diameter; de app controleert of er een boor met die diameter en lengte is.</div></div>
        <div class="group"><div class="group-header"><span>Gereedschap P110</span><span id="tl-count"></span></div><div class="group-body" id="st-tools"></div>
          <div class="group-footer">Overgenomen van de foto's van het gereedschapsbeheer. Diameter = 2 × radius (G1), lengte = bruikbare lengte (G3.1). Tik op een regel om aan te passen.</div></div>
        <div class="group"><div class="group-header">Opties</div><div class="group-body">
          <div class="row"><span class="row-label">Schroeven tussen de deuvels</span>${toggleHTML('st-schroeven', s.schroeven)}</div>
          <div class="row"><span class="row-label">Deuvelgaten bij de scharnierpot</span>${toggleHTML('st-potDeuvels', s.potDeuvels)}</div>
          <div class="row"><span class="row-label">Systeemboringen voor legplanken</span>${toggleHTML('st-systeemboringen', s.systeemboringen)}</div>
          <div class="row"><span class="row-label">Hangkasten: gaten voor ophangbeslag</span>${toggleHTML('st-ophangGaten', s.ophangGaten)}</div>
          <div class="row"><span class="row-label">Deuren: gaten voor dempers</span>${toggleHTML('st-dempers', s.dempers)}</div>
        </div></div>
        ${SERIES.map(serie => `<div class="group"><div class="group-header">Blum ${serie}</div><div class="group-body">
          ${row('Bodem: binnenbreedte min', numHTML(`bl-${serie}-bodemB`, s.blum[serie].bodemB))}
          ${row('Bodem: NL min', numHTML(`bl-${serie}-bodemD`, s.blum[serie].bodemD))}
          ${row('Rug: binnenbreedte min', numHTML(`bl-${serie}-rugB`, s.blum[serie].rugB))}
          <div class="row sub-head"><span class="row-sub"><b>Ladetypes</b> (code · hoogte laderug)</span></div>
          ${s.blum[serie].types.map((ty, j) => `<div class="row"><input class="input-plain left code" id="bt-${serie}-${j}-code" value="${esc(ty.code)}" style="width:70px;flex:none;font-weight:600">
            <div class="row-fill">${numHTML(`bt-${serie}-${j}-rugH`, ty.rugH)}<button class="mini danger" type="button" id="bt-${serie}-${j}-del" aria-label="Verwijder">${icon('trash')}</button></div></div>`).join('')}
          <button class="row button" type="button" id="bt-${serie}-add"><span class="icon-label">${icon('plus')}Ladetype toevoegen</span></button>
          ${row('Geleider: gathoogte boven vak', numHTML(`bl-${serie}-gatHoogte`, s.blum[serie].gatHoogte))}
          <div class="row"><span class="row-label">Geleider: gaten vanaf voorkant</span><div class="row-fill"><input class="input-plain" id="bl-${serie}-gaten" value="${s.blum[serie].gaten.join(', ')}"></div></div>
        </div></div>`).join('')}
        <div class="group-footer" data-cat="lades" style="margin:-16px 0 24px">Controleer de Blum-maten met de montagehandleiding van de gebruikte geleider en ladehoogte.</div>
        <div class="group"><div class="group-body"><button class="row button danger" type="button" id="st-reset">Standaardwaarden herstellen</button></div></div>
        <div class="group"><div class="group-body"><div class="row"><span class="row-label">Versie</span><span class="row-value">0.2 (met MPR, nog te testen)</span></div></div>
          <div class="footer-logo" role="img" aria-label="e. baillien"></div></div>
      </div>`;
    for (const [, fields] of SETTING_GROUPS) for (const [key] of fields) {
      $(`#st-${key}`, v).addEventListener('change', e => { if (e.target.value !== '') { s[key] = Number(e.target.value); Store.save(); } });
    }
    for (const key of ['schroeven', 'potDeuvels', 'systeemboringen', 'ophangGaten', 'dempers']) $(`#st-${key}`, v).addEventListener('change', e => { s[key] = e.target.checked; Store.save(); });
    this.renderDecors();
    this.renderTools();
    $('#st-frontMateriaal', v).addEventListener('change', e => { s.frontMateriaal = e.target.value; Store.save(); });
    for (const key of ['decorKorpus', 'decorFront']) bindDecor($(`#st-${key}`, v), val => { s[key] = val; Store.save(); this.render(); });
    for (const key of Object.keys(NEST_DEFAULTS)) $(`#nz-${key}`, v)?.addEventListener('change', e => { if (e.target.value !== '') { s.nest[key] = Number(e.target.value); Store.save(); } });
    for (const key of ['csvScheiding', 'csvDecimaal']) $(`#nz-${key}`, v).addEventListener('change', e => { s.nest[key] = e.target.value; Store.save(); });
    for (const key of Object.keys(HPO_DEFAULTS)) $(`#nz-${key}`, v).addEventListener('change', e => { s.nest[key] = e.target.value.trim() || HPO_DEFAULTS[key]; Store.save(); });
    for (const key of Object.keys(MPR_DEFAULTS)) {
      $(`#mp-${key}`, v)?.addEventListener('change', e => { s.mpr[key] = key === 'clamex' ? e.target.checked : key === 'doorExtra' ? Number(e.target.value) || 0 : e.target.value.trim(); Store.save(); });
    }
    for (const serie of SERIES) {
      s.blum[serie].types.forEach((ty, j) => {
        $(`#bt-${serie}-${j}-code`, v).addEventListener('change', e => { if (e.target.value.trim()) { ty.code = e.target.value.trim(); Store.save(); } });
        $(`#bt-${serie}-${j}-rugH`, v).addEventListener('change', e => { if (e.target.value !== '') { ty.rugH = Number(e.target.value); Store.save(); } });
        $(`#bt-${serie}-${j}-del`, v).addEventListener('click', () => { if (s.blum[serie].types.length > 1) { s.blum[serie].types.splice(j, 1); Store.save(); this.render(); } });
      });
      $(`#bt-${serie}-add`, v).addEventListener('click', async () => {
        const r = await alertBox(`Ladetype ${serie}`, 'Code en hoogte van de laderug, bijvoorbeeld "K 128".', [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Voeg toe', value: 'ok' }], { input: { placeholder: 'Code hoogte' } });
        if (r.value !== 'ok' || !r.text.trim()) return;
        const [code, h] = r.text.trim().split(/\s+/);
        s.blum[serie].types.push({ code, rugH: Number(h) || s.blum[serie].rugH });
        Store.save();
        this.render();
      });
      for (const key of ['bodemB', 'bodemD', 'rugB', 'gatHoogte']) {
        $(`#bl-${serie}-${key}`, v).addEventListener('change', e => { if (e.target.value !== '') { s.blum[serie][key] = Number(e.target.value); Store.save(); } });
      }
      $(`#bl-${serie}-gaten`, v).addEventListener('change', e => {
        const list = e.target.value.split(/[,; ]+/).map(Number).filter(n => n > 0);
        if (list.length) { s.blum[serie].gaten = list; Store.save(); }
      });
    }
    $('#st-reset', v).addEventListener('click', async () => {
      const ok = await alertBox('Standaardwaarden herstellen?', 'Alle instellingen gaan terug naar de standaard. Je projecten blijven bewaard.', [{ label: 'Annuleer', role: 'cancel', value: 'no' }, { label: 'Herstel', role: 'destructive', value: 'yes' }]);
      if (ok === 'yes') { Store.settings = mergeSettings(null); Store.save(); this.render(); }
    });
    this.organize();
  },

  /** Instellingen als menu: per categorie een eigen pagina in plaats van één lange lijst. */
  cat: null,
  organize() {
    const v = $('#view-settings');
    const CATS = [
      { id: 'platen', naam: 'Platen en kantenband', icon: 'table', groepen: ['Platen', 'Kantenband', 'Rugwandgroef'] },
      { id: 'decors', naam: 'Decors', icon: 'eye', groepen: ['Decors'] },
      { id: 'constructie', naam: 'Constructie', icon: 'cube', groepen: ['Deuvels en schroeven', 'Clamex', 'Systeemboringen', 'Hangkasten', 'Opties', 'Overige'] },
      { id: 'fronten', naam: 'Fronten, scharnieren en grepen', icon: 'list', groepen: ['Fronten', 'Scharnieren'] },
      { id: 'lades', naam: 'Lades (Blum)', icon: 'explode', groepen: ['Blum'] },
      { id: 'led', naam: 'Led-verlichting', icon: 'plus', groepen: ['Led-verlichting'] },
      { id: 'zaagplan', naam: 'Zaagplan', icon: 'ruler', groepen: ['Zaagplan'] },
      { id: 'machine', naam: 'Machine en gereedschap', icon: 'gear', groepen: ['Machine', 'Gereedschap'] },
    ];
    // Elke groep krijgt zijn categorie volgens de titel; groepen zonder titel (herstellen, versie) staan op het menu.
    for (const g of $$('#st-content > .group', v)) {
      const title = $('.group-header', g)?.textContent.trim() ?? '';
      const cat = CATS.find(c => c.groepen.some(n => title.startsWith(n)));
      g.dataset.cat = cat ? cat.id : 'menu';
    }
    const menu = $('#st-menu', v);
    menu.innerHTML = `<div class="group"><div class="group-body">${CATS.map(c => `<button class="row link" type="button" data-open="${c.id}">
      <span class="icon-label">${icon(c.icon)}${c.naam}</span><span class="row-sub st-sum" style="margin-left:auto">${this.summary(c.id)}</span><span class="chev">${icon('right')}</span></button>`).join('')}</div>
      <div class="group-footer">Alle maten in mm. Wijzigingen gelden meteen voor alle kasten in alle projecten.</div></div>`;
    $$('[data-open]', menu).forEach(b => b.addEventListener('click', () => { this.cat = b.dataset.open; this.show(CATS); v.scrollTop = 0; }));
    $('#st-back', v).addEventListener('click', () => { this.cat = null; this.show(CATS); v.scrollTop = 0; });
    if (this.cat && !CATS.some(c => c.id === this.cat)) this.cat = null;
    this.show(CATS);
  },

  show(CATS) {
    const v = $('#view-settings');
    const cat = this.cat;
    $('#st-menu', v).classList.toggle('hidden', !!cat);
    $('#st-back', v).classList.toggle('hidden', !cat);
    $('#st-title', v).textContent = cat ? CATS.find(c => c.id === cat).naam : 'Instellingen';
    for (const e of $$('#st-content > [data-cat]', v)) {
      const c = e.dataset.cat;
      e.classList.toggle('hidden', cat ? !(c === cat || c === '*') : c !== 'menu');
    }
    if (!cat) $$('.st-sum', v).forEach((x, i) => { x.textContent = this.summary(CATS[i].id); });
  },

  /** Korte samenvatting naast elke categorie. */
  summary(id) {
    const s = S();
    switch (id) {
      case 'platen': return `${s.plaat} mm · rug ${s.rug} mm`;
      case 'decors': return `${s.decors.length} decors`;
      case 'constructie': return `deuvels ${s.deuvelDia} × ${s.deuvelLengte}`;
      case 'fronten': return `greep ${s.greepHartafstand} mm`;
      case 'lades': return SERIES.join(', ');
      case 'led': return `${s.ledBreedte} × ${s.ledDiepte}`;
      case 'zaagplan': return `${s.nest.plaatLengte} × ${s.nest.plaatBreedte}`;
      case 'machine': return `${s.tools.length} gereedschappen`;
      default: return '';
    }
  },
};

// MARK: - Opstarten

async function start() {
  await Store.load();
  setupTabs();
  Projects.render();
  navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Offline niet beschikbaar:', err));
  }
}

start();
