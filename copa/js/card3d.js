// ===== card3d.js — mostra a figurinha como um CARD 3D holográfico (WebGL) =====
// Usa Three.js embutido no projeto (carrega só quando a criança cria a figurinha).
// Tem espessura, sombra de contato, luz que corre e brilho holográfico que segue
// a inclinação do celular (giroscópio) ou o dedo. Fallback: quem chamar mostra a imagem 2D.

let T = null, loading = null;
function loadThree() {
  if (T) return Promise.resolve(T);
  if (!loading) loading = import('./three.module.min.js').then((m) => (T = m, m)).catch(() => null);
  return loading;
}

let renderer, scene, camera, group, holoMat, frontTex, spec, mountEl;
let curRX = 0.06, curRY = -0.35, tgtRX = 0.06, tgtRY = -0.35, holoX = 0, idle = true;

export async function mountCard(srcCanvas, container) {
  const three = await loadThree();
  if (!three || !container) return false;
  mountEl = container;
  try {
    if (!renderer) initScene(three, container);
    applyTexture(three, srcCanvas);
    resize();
    return true;
  } catch (e) { return false; }
}

function initScene(three, container) {
  renderer = new three.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = three.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new three.Scene();
  camera = new three.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 11.2);

  scene.add(new three.AmbientLight(0xffffff, 0.9));
  const key = new three.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 6, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  scene.add(key);
  spec = new three.PointLight(0xfff2cc, 1.0, 40); spec.position.set(0, 2, 7); scene.add(spec);

  group = new three.Group(); scene.add(group);

  const floor = new three.Mesh(new three.PlaneGeometry(30, 30), new three.ShadowMaterial({ opacity: 0.34 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -4.2; floor.receiveShadow = true; scene.add(floor);

  animate();
  window.addEventListener('resize', resize);

  const setTilt = (nx, ny) => { idle = false; tgtRY = nx * 0.7; tgtRX = ny * -0.5; holoX = nx; };
  container.addEventListener('pointermove', (e) => {
    const r = container.getBoundingClientRect();
    setTilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  }, { passive: true });
  container.addEventListener('pointerleave', () => { idle = true; }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || !mountEl || mountEl.offsetParent === null) return;   // só quando visível
    const c = (v) => Math.max(-1, Math.min(1, v));
    setTilt(c(e.gamma / 26), c((e.beta - 40) / 26));
  }, { passive: true });
}

function applyTexture(three, canvas) {
  const w = 4.3, h = w * (7.8 / 5.0), d = 0.18;   // proporção real 5,0×7,8 cm
  if (!group._card) {
    frontTex = new three.CanvasTexture(canvas);
    frontTex.colorSpace = three.SRGBColorSpace; frontTex.anisotropy = 8;
    const front = new three.MeshStandardMaterial({ map: frontTex, roughness: 0.32, metalness: 0.2 });
    const edge = new three.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const back = new three.MeshStandardMaterial({ color: 0x0b2f36, roughness: 0.6, metalness: 0.1 });
    // ordem de faces do BoxGeometry: +x,-x,+y,-y,+z(frente),-z(verso)
    const card = new three.Mesh(new three.BoxGeometry(w, h, d), [edge, edge, edge, edge, front, back]);
    card.castShadow = true; group.add(card); group._card = card;

    holoMat = new three.MeshBasicMaterial({
      map: makeHolo(three), transparent: true, opacity: 0.7,
      blending: three.AdditiveBlending, depthWrite: false,
    });
    const holo = new three.Mesh(new three.PlaneGeometry(w * 0.985, h * 0.985), holoMat);
    holo.position.z = d / 2 + 0.012; group.add(holo);
  } else {
    frontTex.image = canvas; frontTex.needsUpdate = true;
  }
}

// textura holográfica: FAIXA arco-íris diagonal que varre o card (foil), resto transparente
function makeHolo(three) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.translate(256, 256); g.rotate(-Math.PI / 4); g.translate(-256, -256);   // banda diagonal
  const grd = g.createLinearGradient(0, 90, 0, 422);
  grd.addColorStop(0.00, 'rgba(255,255,255,0)');
  grd.addColorStop(0.28, 'rgba(255,110,200,0.85)');
  grd.addColorStop(0.42, 'rgba(255,215,120,0.95)');
  grd.addColorStop(0.50, 'rgba(255,255,255,1)');
  grd.addColorStop(0.58, 'rgba(140,240,180,0.95)');
  grd.addColorStop(0.72, 'rgba(140,200,255,0.85)');
  grd.addColorStop(1.00, 'rgba(200,120,255,0)');
  g.fillStyle = grd; g.fillRect(-260, 0, 1032, 512);
  // finas listras de brilho dentro da faixa
  g.globalAlpha = 0.25; g.strokeStyle = '#fff'; g.lineWidth = 4;
  for (let y = 90; y < 422; y += 16) { g.beginPath(); g.moveTo(-260, y); g.lineTo(772, y); g.stroke(); }
  const tex = new three.CanvasTexture(c);
  tex.wrapS = tex.wrapT = three.RepeatWrapping;
  return tex;
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  const t = performance.now();
  // parado: balança sozinho de leve (mostra o 3D); com toque/giro segue o alvo
  if (idle) { tgtRY = -0.35 + Math.sin(t * 0.0006) * 0.28; tgtRX = 0.06 + Math.cos(t * 0.0005) * 0.06; holoX = tgtRY; }
  curRX += (tgtRX - curRX) * 0.1; curRY += (tgtRY - curRY) * 0.1;
  group.rotation.x = curRX; group.rotation.y = curRY;
  if (holoMat && holoMat.map) holoMat.map.offset.set(holoX * 0.4 + t * 0.00002, holoX * 0.2);
  if (spec) spec.position.x = Math.sin(t * 0.0007) * 5;
  renderer.render(scene, camera);
}

function resize() {
  if (!renderer || !mountEl) return;
  const w = mountEl.clientWidth || 260, h = mountEl.clientHeight || 400;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
