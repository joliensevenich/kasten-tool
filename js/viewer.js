'use strict';
// 3D-weergave van één of meer kasten met three.js. Draaien met één vinger, zoomen met twee, tik op een paneel om het te kiezen.

const COLORS = {
  korpus: 0xe9dcc3,
  front: 0xc8a57a,
  rug: 0xb99a6f,
  lade: 0xdcccaa,
  trespa: 0x3a3a3a,
  plintbak: 0xc9a77a,
  selected: 0x3d8bd9,
};

/** Kleur van het decor, anders een standaardkleur per soort onderdeel. */
function partColor(p) {
  if (p.kleur && /^#[0-9a-f]{6}$/i.test(p.kleur)) return parseInt(p.kleur.slice(1), 16);
  return COLORS[p.mat] ?? COLORS.korpus;
}

/** Prisma voor een paneel met een vorm (p.shape in u/v), rond het midden van zijn box. */
function shapeGeometry(p) {
  const b = p.box, c = [b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2];
  const plane = p.shape3d ? p.shape3d.plane : (p.rol === 'zijwand' || p.rol === 'stijl') ? 'zy' : 'xy';
  const at = ([u, v], e) => plane === 'zy' ? [b.x + e - c[0], b.y + v - c[1], b.z + u - c[2]]
    : plane === 'xz' ? [b.x + u - c[0], b.y + e - c[1], b.z + v - c[2]]
    : [b.x + u - c[0], b.y + v - c[1], b.z + e - c[2]];
  const th = plane === 'zy' ? b.w : plane === 'xz' ? b.h : b.d;
  const pts = p.shape3d?.pts ?? p.shape;
  const holes = p.shape3d?.holes ?? [];                    // openingen in het paneel (bv. de nis in een ronde kop)
  const all = [pts, ...holes].flat();
  const pos = [];
  const tri = (a, b2, c2) => pos.push(...a, ...b2, ...c2);
  // Boven- en onderkant: driehoeken (ook voor een L-vorm, niet alleen bolle vormen).
  const V = q => q.map(([u, v]) => new THREE.Vector2(u, v));
  for (const [i, j, q] of THREE.ShapeUtils.triangulateShape(V(pts), holes.map(V))) {
    tri(at(all[i], 0), at(all[q], 0), at(all[j], 0));
    tri(at(all[i], th), at(all[j], th), at(all[q], th));
  }
  for (const ring of [pts, ...holes]) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], n = ring[(i + 1) % ring.length];
    tri(at(a, 0), at(n, 0), at(n, th));
    tri(at(a, 0), at(n, th), at(a, th));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

class Viewer {
  constructor(container, { onPick } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.explode = false;
    this.fronts = 'toon';    // 'toon' | 'doorzichtig' | 'verberg'
    this.selected = null;
    this.items = [];

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 10, 100000);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.55);
    sun.position.set(1, 2, 1.5);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-1.5, 0.5, -1);
    this.scene.add(fill);
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener('change', () => this.render());

    // Tikken (zonder slepen) kiest een paneel. In de verplaatsmodus sleep je de gekozen kast over de vloer.
    let down = null;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', e => {
      down = { x: e.clientX, y: e.clientY };
      if (this.moveMode && this.movingCab) {
        const hit = this.raycast(e);
        if (hit?.object.userData.cab === this.movingCab) {
          const holder = this.holders.get(this.movingCab);
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -holder.position.y);
          const start = this.planePoint(e, plane);
          if (start) {
            this.drag = { plane, start, pos: holder.position.clone(), id: e.pointerId };
            this.controls.enabled = false;
            try { canvas.setPointerCapture(e.pointerId); } catch { /* geen actieve aanwijzer */ }
          }
        }
      }
    });
    canvas.addEventListener('pointermove', e => {
      if (!this.drag) return;
      const pt = this.planePoint(e, this.drag.plane);
      if (!pt) return;
      const x = this.drag.pos.x + pt.x - this.drag.start.x, z = this.drag.pos.z + pt.z - this.drag.start.z;
      const snapped = this.onDrag?.(this.movingCab, x, z) ?? { x, z };
      const holder = this.holders.get(this.movingCab);
      holder.position.x = snapped.x; holder.position.z = snapped.z;
      this.render();
    });
    const endDrag = e => {
      if (!this.drag) return;
      try { canvas.releasePointerCapture?.(this.drag.id); } catch { /* al losgelaten */ }
      this.drag = null;
      this.controls.enabled = true;
      down = null;
      this.onDragEnd?.(this.movingCab);
    };
    canvas.addEventListener('pointerup', e => {
      if (this.drag) { endDrag(e); return; }
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) this.pick(e);
      down = null;
    });
    canvas.addEventListener('pointercancel', endDrag);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    const loop = () => {
      if (!this.disposed) {
        if (this.controls.update()) this.render();
        this.frame = requestAnimationFrame(loop);
      }
    };
    loop();
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  render() { if (!this.disposed) this.renderer.render(this.scene, this.camera); }

  /** Kast verplaatsen zonder alles opnieuw op te bouwen. */
  setCabinetTransform(key, x, y, z, rot) {
    const h = this.holders?.get(key);
    if (!h) return;
    h.position.set(x, y, z);
    h.rotation.y = -THREE.MathUtils.degToRad(rot ?? 0);
    this.render();
  }

  /** Een hele kast oplichten (verplaatsmodus). */
  highlightCab(key) {
    this.movingCab = key;
    for (const { mesh, cab } of this.items) mesh.material.emissive?.setHex(cab === key ? 0x1d4e89 : 0x000000);
    this.render();
  }

  /** Panelen markeren (bv. HPL aanduiden): fn(part, cabKey) → true = gemarkeerd; null = alles terug normaal. */
  markParts(fn, hex = 0xb35a00) {
    for (const { mesh, cab } of this.items) mesh.material.emissive?.setHex(fn && fn(mesh.userData.part, cab) ? hex : 0x000000);
    this.render();
  }

  setMoveMode(on) {
    this.moveMode = on;
    if (!on) this.highlightCab(null);
  }

  raycast(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    const meshes = this.items.filter(i => i.mesh.visible && !(i.mesh.material.transparent)).map(i => i.mesh);
    return ray.intersectObjects(meshes, false)[0];
  }

  planePoint(e, plane) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    return ray.ray.intersectPlane(plane, new THREE.Vector3());
  }

  /** cabinets: [{ key, parts, offsetX }] */
  show(cabinets, { refit = false } = {}) {
    this.cabinets = cabinets;
    this.holders = new Map();
    for (const item of this.items) {
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      item.lines.geometry.dispose();
      item.lines.material.dispose();
    }
    this.group.clear();
    this.items = [];
    const bounds = new THREE.Box3();
    for (const cab of cabinets) {
      // Elke kast in een eigen groep: positie in het project en draaiing rond de linkerachterhoek.
      const holder = new THREE.Group();
      holder.position.set(cab.offsetX ?? 0, cab.offsetY ?? 0, cab.offsetZ ?? 0);
      holder.rotation.y = -THREE.MathUtils.degToRad(cab.rot ?? 0);
      this.group.add(holder);
      this.holders.set(cab.key, holder);
      const cabBox = new THREE.Box3();
      for (const p of cab.parts) cabBox.expandByPoint(new THREE.Vector3(p.box.x, p.box.y, p.box.z)).expandByPoint(new THREE.Vector3(p.box.x + p.box.w, p.box.y + p.box.h, p.box.z + p.box.d));
      const center = cabBox.getCenter(new THREE.Vector3());
      for (const p of cab.parts) {
        const geo = p.shape || p.shape3d ? shapeGeometry(p) : new THREE.BoxGeometry(Math.max(p.box.w, 0.5), Math.max(p.box.h, 0.5), Math.max(p.box.d, 0.5));
        const mat = new THREE.MeshLambertMaterial({ color: partColor(p), side: p.shape || p.shape3d ? THREE.DoubleSide : THREE.FrontSide });
        const mesh = new THREE.Mesh(geo, mat);
        const pos = new THREE.Vector3(p.box.x + p.box.w / 2, p.box.y + p.box.h / 2, p.box.z + p.box.d / 2);
        mesh.userData = { part: p, cab: cab.key, base: pos.clone(), center };
        const dark = (partColor(p) >> 16 & 255) + (partColor(p) >> 8 & 255) + (partColor(p) & 255) < 200;
        if (p.tilt) mesh.rotation.set(p.tilt.x ?? 0, 0, p.tilt.z ?? 0);
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: dark ? 0x9a9a9a : 0x3a3226, transparent: true, opacity: 0.45 }));
        mesh.add(lines);
        holder.add(mesh);
        this.items.push({ mesh, lines, part: p, cab: cab.key });
      }
    }
    this.applyState();
    if (this.movingCab) this.highlightCab(this.movingCab);
    this.group.updateMatrixWorld(true);
    for (const { mesh } of this.items) bounds.expandByObject(mesh);
    this.bounds = bounds;
    // Vloer onder een opstelling van meerdere kasten.
    if (this.floor) { this.scene.remove(this.floor); this.floor.geometry.dispose(); this.floor.material.dispose(); this.floor = null; }
    if (this.showFloor && !bounds.isEmpty()) {
      const size = bounds.getSize(new THREE.Vector3()), c = bounds.getCenter(new THREE.Vector3());
      const geo = new THREE.PlaneGeometry(size.x + 1200, size.z + 1200);
      this.floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xcfcac0, side: THREE.DoubleSide }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.position.set(c.x, (this.floorY ?? 0) - 0.5, c.z);
      this.scene.add(this.floor);
    }
    if (refit || !this.fitted) this.fit();
    this.render();
  }

  applyState() {
    for (const { mesh, part, cab } of this.items) {
      const { base, center } = mesh.userData;
      const pos = base.clone();
      if (this.explode) {
        const dir = base.clone().sub(center);
        const f = part.rol === 'front' ? new THREE.Vector3(0, 0, 160) : new THREE.Vector3(Math.sign(dir.x) * 70, Math.sign(dir.y) * 50, part.rol === 'rug' ? -90 : 0);
        if (part.rol === 'legplank' || part.rol === 'lade') f.set(0, 0, 60);
        pos.add(f);
      }
      mesh.position.copy(pos);
      const isFront = part.rol === 'front';
      mesh.visible = !(isFront && this.fronts === 'verberg');
      const sel = this.selected && this.selected.cab === cab && this.selected.id === part.id;
      mesh.material.color.setHex(sel ? COLORS.selected : partColor(part));
      mesh.material.transparent = isFront && this.fronts === 'doorzichtig';
      mesh.material.opacity = mesh.material.transparent ? 0.28 : 1;
      mesh.material.depthWrite = !mesh.material.transparent;
    }
    this.render();
  }

  setExplode(on) { this.explode = on; this.applyState(); }
  setFronts(mode) { this.fronts = mode; this.applyState(); }
  select(cab, id) { this.selected = id ? { cab, id } : null; this.applyState(); }

  fit() {
    if (!this.bounds || this.bounds.isEmpty()) return;
    this.fitted = true;
    const size = this.bounds.getSize(new THREE.Vector3());
    const center = this.bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 200);
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.05;
    const dir = new THREE.Vector3(0.55, 0.38, 1).normalize();
    this.camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    this.camera.near = dist / 50;
    this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
    this.render();
  }

  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    const meshes = this.items.filter(i => i.mesh.visible && !(i.mesh.material.transparent)).map(i => i.mesh);
    const hit = ray.intersectObjects(meshes, false)[0];
    const data = hit?.object.userData;
    // Ook het punt en de richting van het vlak in wereldcoördinaten (voor afwerkpanelen).
    let point = null, normal = null;
    if (hit) {
      point = hit.point.clone();
      normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null;
    }
    this.onPick?.(data ? { cab: data.cab, part: data.part, point, normal } : null);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    for (const item of this.items) { item.mesh.geometry.dispose(); item.mesh.material.dispose(); item.lines.geometry.dispose(); item.lines.material.dispose(); }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
