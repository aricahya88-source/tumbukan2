import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="app-shell">
    <div class="hud">
      <h1>Simulasi Tumbukan 2 Bola 3D</h1>
      <p>
        Atur massa, kecepatan awal, dan jenis tumbukan. Dua bola bergerak pada satu lintasan,
        bertumbukan, lalu menampilkan perubahan momentum, energi kinetik, dan efek menggelinding.
      </p>

      <div class="stats">
        <div class="stat-card">
          <span class="stat-label">Mode tumbukan</span>
          <span class="stat-value" data-mode-name>Lenting sempurna</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Koefisien restitusi</span>
          <span class="stat-value" data-restitution>1.00</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Status</span>
          <span class="stat-value" data-status>Berjalan</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Jumlah tumbukan</span>
          <span class="stat-value" data-collision-count>0</span>
        </div>
        <div class="stat-card wide">
          <span class="stat-label">Peristiwa terakhir</span>
          <span class="stat-value small" data-last-event>Belum ada tumbukan antarbenda</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Momentum total</span>
          <span class="stat-value small" data-total-momentum>0.00 kg·m/s</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Energi kinetik total</span>
          <span class="stat-value small" data-total-energy>0.00 J</span>
        </div>
      </div>

      <div class="segmented">
        <button class="mode-chip active" data-mode="elastic">Lenting sempurna</button>
        <button class="mode-chip" data-mode="partial">Lenting sebagian</button>
        <button class="mode-chip" data-mode="inelastic">Tak lenting sama sekali</button>
      </div>

      <div class="controls">
        <button data-apply>Terapkan parameter</button>
        <button class="secondary" data-reset>Mulai ulang</button>
        <button class="secondary" data-pause>Pause</button>
      </div>

      <div class="slider-panel">
        <div class="slider-card slider-blue">
          <h2>Bola A</h2>
          <label>
            Massa <span data-value="left-mass">1.50 kg</span>
            <input data-input="left-mass" type="range" min="0.5" max="5" step="0.1" value="1.5" />
          </label>
          <label>
            Kecepatan awal <span data-value="left-speed">5.00 m/s</span>
            <input data-input="left-speed" type="range" min="-8" max="8" step="0.1" value="5" />
          </label>
        </div>

        <div class="slider-card slider-orange">
          <h2>Bola B</h2>
          <label>
            Massa <span data-value="right-mass">2.00 kg</span>
            <input data-input="right-mass" type="range" min="0.5" max="5" step="0.1" value="2" />
          </label>
          <label>
            Kecepatan awal <span data-value="right-speed">-2.00 m/s</span>
            <input data-input="right-speed" type="range" min="-8" max="8" step="0.1" value="-2" />
          </label>
        </div>
      </div>

      <div class="toggle-row">
        <label class="toggle-pill">
          <input data-toggle="show-vectors" type="checkbox" checked />
          <span>Tampilkan vektor momentum</span>
        </label>
        <label class="toggle-pill">
          <input data-toggle="show-labels" type="checkbox" checked />
          <span>Tampilkan label</span>
        </label>
      </div>

      <div class="formula-box">
        <strong>Model tumbukan 1D</strong>
        <span>Momentum total dipertahankan, sedangkan jenis tumbukan diatur oleh koefisien restitusi.</span>
        <span>Pada tumbukan tak lenting sama sekali, kedua bola bergerak bersama setelah tumbukan.</span>
      </div>

      <div class="legend">
        Drag untuk memutar kamera. Scroll untuk zoom. Simulasi dibuat pada satu lintasan agar
        hubungan antara teori dan animasi lebih mudah diamati.
      </div>
    </div>

    <div class="overlay" data-overlay></div>
    <canvas class="webgl"></canvas>
    <div class="credit">Vite + Three.js + solver tumbukan analitik + requestAnimationFrame</div>
  </div>
`;

const canvas = document.querySelector('.webgl');
const overlay = document.querySelector('[data-overlay]');
const statusValue = document.querySelector('[data-status]');
const modeNameValue = document.querySelector('[data-mode-name]');
const restitutionValue = document.querySelector('[data-restitution]');
const collisionCountValue = document.querySelector('[data-collision-count]');
const lastEventValue = document.querySelector('[data-last-event]');
const totalMomentumValue = document.querySelector('[data-total-momentum]');
const totalEnergyValue = document.querySelector('[data-total-energy]');
const applyButton = document.querySelector('[data-apply]');
const resetButton = document.querySelector('[data-reset]');
const pauseButton = document.querySelector('[data-pause]');
const sliderInputs = [...document.querySelectorAll('[data-input]')];
const sliderValues = Object.fromEntries(
  [...document.querySelectorAll('[data-value]')].map((node) => [node.dataset.value, node]),
);
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const vectorToggle = document.querySelector('[data-toggle="show-vectors"]');
const labelToggle = document.querySelector('[data-toggle="show-labels"]');

const parameters = {
  leftMass: 1.5,
  rightMass: 2.0,
  leftSpeed: 5.0,
  rightSpeed: -2.0,
  collisionMode: 'elastic',
  showVectors: true,
  showLabels: true,
};

const collisionModes = {
  elastic: { label: 'Lenting sempurna', restitution: 1.0 },
  partial: { label: 'Lenting sebagian', restitution: 0.45 },
  inelastic: { label: 'Tak lenting sama sekali', restitution: 0.0 },
};

const radius = 0.72;
const laneY = radius + 0.02;
const bounds = { left: -6.6, right: 6.6 };
const wallRestitution = 0.96;
const fixedStep = 1 / 120;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071018);
scene.fog = new THREE.Fog(0x071018, 16, 36);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 7.8, 13.5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 7;
controls.maxDistance = 24;

scene.add(new THREE.AmbientLight(0xffffff, 0.82));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
keyLight.position.set(8, 14, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 40;
keyLight.shadow.camera.left = -14;
keyLight.shadow.camera.right = 14;
keyLight.shadow.camera.top = 14;
keyLight.shadow.camera.bottom = -14;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x60a5fa, 24, 32, 2);
rimLight.position.set(-10, 5, -6);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(16, 0.6, 8),
  new THREE.MeshStandardMaterial({ color: 0x132b42, roughness: 0.88, metalness: 0.08 }),
);
floor.position.set(0, -0.3, 0);
floor.receiveShadow = true;
scene.add(floor);

const lane = new THREE.Mesh(
  new THREE.BoxGeometry(14.5, 0.08, 2.6),
  new THREE.MeshStandardMaterial({ color: 0x0b1623, roughness: 0.92, metalness: 0.05 }),
);
lane.position.set(0, 0.02, 0);
lane.receiveShadow = true;
scene.add(lane);

const laneMarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x5b9cff,
  emissive: 0x17315a,
  roughness: 0.5,
});

for (let i = -6; i <= 6; i += 2) {
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.08), laneMarkMaterial);
  marker.position.set(i, 0.08, 0);
  scene.add(marker);
}

const railMaterial = new THREE.MeshStandardMaterial({
  color: 0x0f1d2b,
  roughness: 0.84,
  metalness: 0.12,
});

[
  { x: 0, y: 0.5, z: -1.55, sx: 14.8, sy: 0.35, sz: 0.22 },
  { x: 0, y: 0.5, z: 1.55, sx: 14.8, sy: 0.35, sz: 0.22 },
  { x: -7.35, y: 0.8, z: 0, sx: 0.28, sy: 1.2, sz: 3.3 },
  { x: 7.35, y: 0.8, z: 0, sx: 0.28, sy: 1.2, sz: 3.3 },
].forEach((spec) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.sx, spec.sy, spec.sz), railMaterial);
  mesh.position.set(spec.x, spec.y, spec.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
});

const gridHelper = new THREE.GridHelper(16, 16, 0x3c79d0, 0x20344f);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

const tmpVec = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const clock = new THREE.Clock();

let accumulator = 0;
let isPaused = false;
let collisionCount = 0;
let activeCollision = false;
let stuckPair = false;
let bodies = [];
let lastCollisionSummary = 'Belum ada tumbukan antarbenda';

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function createBallTexture(baseColor, accentColor, label) {
  const size = 512;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext('2d');

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 120, size, 70);
  ctx.fillRect(0, 320, size, 70);

  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 120, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'bold 132px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createLabel(colorHex) {
  const el = document.createElement('div');
  el.className = 'ball-label';
  el.style.setProperty('--label-accent', `#${colorHex.toString(16).padStart(6, '0')}`);
  overlay.appendChild(el);
  return el;
}

function createBall({ label, shortLabel, color, accent, x, mass, velocity }) {
  const visual = new THREE.Group();
  scene.add(visual);

  const roller = new THREE.Group();
  visual.add(roller);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 64),
    new THREE.MeshStandardMaterial({
      map: createBallTexture(color, accent, shortLabel),
      roughness: 0.32,
      metalness: 0.08,
    }),
  );
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.rotation.set(0.22, 0.15, 0);
  roller.add(sphere);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.92, 40),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -radius + 0.021;
  shadow.scale.set(1.08, 0.72, 1);
  visual.add(shadow);

  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(),
    0.001,
    Number(color.replace('#', '0x')),
    0.28,
    0.15,
  );
  scene.add(arrow);

  return {
    label,
    mass,
    x,
    v: velocity,
    visual,
    roller,
    sphere,
    shadow,
    arrow,
    labelEl: createLabel(Number(color.replace('#', '0x'))),
    spin: 0,
    initialX: x,
    initialV: velocity,
  };
}

function clearBodies() {
  bodies.forEach((body) => {
    scene.remove(body.visual);
    scene.remove(body.arrow);
    body.sphere.geometry.dispose();
    body.sphere.material.map.dispose();
    body.sphere.material.dispose();
    body.shadow.geometry.dispose();
    body.shadow.material.dispose();
    body.arrow.line.geometry.dispose();
    body.arrow.line.material.dispose();
    body.arrow.cone.geometry.dispose();
    body.arrow.cone.material.dispose();
    body.labelEl.remove();
  });
  bodies = [];
}

function buildSceneObjects() {
  clearBodies();

  bodies = [
    createBall({
      label: 'Bola A',
      shortLabel: 'A',
      color: '#38bdf8',
      accent: '#083b6a',
      x: -4.5,
      mass: parameters.leftMass,
      velocity: parameters.leftSpeed,
    }),
    createBall({
      label: 'Bola B',
      shortLabel: 'B',
      color: '#f97316',
      accent: '#6b2203',
      x: 4.5,
      mass: parameters.rightMass,
      velocity: parameters.rightSpeed,
    }),
  ];

  syncVisuals();
  setOverlayVisibility();
}

function updateSliderReadouts() {
  sliderValues['left-mass'].textContent = `${formatNumber(parameters.leftMass)} kg`;
  sliderValues['right-mass'].textContent = `${formatNumber(parameters.rightMass)} kg`;
  sliderValues['left-speed'].textContent = `${formatNumber(parameters.leftSpeed)} m/s`;
  sliderValues['right-speed'].textContent = `${formatNumber(parameters.rightSpeed)} m/s`;
}

function updateModeButtons() {
  modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === parameters.collisionMode);
  });
}

function kineticEnergy(body) {
  return 0.5 * body.mass * body.v * body.v;
}

function updateStats() {
  const mode = collisionModes[parameters.collisionMode];
  modeNameValue.textContent = mode.label;
  restitutionValue.textContent = formatNumber(mode.restitution, 2);
  statusValue.textContent = isPaused ? 'Pause' : stuckPair ? 'Berjalan bersama' : 'Berjalan';
  collisionCountValue.textContent = String(collisionCount);
  lastEventValue.textContent = lastCollisionSummary;

  const totalMomentum = bodies.reduce((sum, body) => sum + body.mass * body.v, 0);
  const totalEnergy = bodies.reduce((sum, body) => sum + kineticEnergy(body), 0);
  totalMomentumValue.textContent = `${formatNumber(totalMomentum)} kg·m/s`;
  totalEnergyValue.textContent = `${formatNumber(totalEnergy)} J`;
  pauseButton.textContent = isPaused ? 'Lanjutkan' : 'Pause';
}

function setOverlayVisibility() {
  overlay.classList.toggle('hide-labels', !parameters.showLabels);
  bodies.forEach((body) => {
    body.arrow.visible = parameters.showVectors;
    body.labelEl.classList.toggle('hidden', !parameters.showLabels);
  });
}

function resetSimulation() {
  collisionCount = 0;
  activeCollision = false;
  stuckPair = false;
  lastCollisionSummary = 'Belum ada tumbukan antarbenda';
  accumulator = 0;

  bodies[0].mass = parameters.leftMass;
  bodies[0].x = bodies[0].initialX = -4.5;
  bodies[0].v = bodies[0].initialV = parameters.leftSpeed;
  bodies[0].spin = 0;

  bodies[1].mass = parameters.rightMass;
  bodies[1].x = bodies[1].initialX = 4.5;
  bodies[1].v = bodies[1].initialV = parameters.rightSpeed;
  bodies[1].spin = 0;

  syncVisuals();
  updateStats();
}

function applyWallBounce(body) {
  if (body.x - radius < bounds.left) {
    body.x = bounds.left + radius;
    body.v = Math.abs(body.v) * wallRestitution;
  } else if (body.x + radius > bounds.right) {
    body.x = bounds.right - radius;
    body.v = -Math.abs(body.v) * wallRestitution;
  }
}

function applyPairWallBounce() {
  const leftBody = bodies[0];
  const rightBody = bodies[1];

  if (leftBody.x - radius < bounds.left) {
    leftBody.x = bounds.left + radius;
    rightBody.x = leftBody.x + radius * 2;
    leftBody.v = Math.abs(leftBody.v) * wallRestitution;
    rightBody.v = leftBody.v;
  } else if (rightBody.x + radius > bounds.right) {
    rightBody.x = bounds.right - radius;
    leftBody.x = rightBody.x - radius * 2;
    rightBody.v = -Math.abs(rightBody.v) * wallRestitution;
    leftBody.v = rightBody.v;
  }
}

function solveBallCollision() {
  const leftBody = bodies[0];
  const rightBody = bodies[1];
  const distance = rightBody.x - leftBody.x;
  const touching = distance <= radius * 2;
  const approaching = leftBody.v > rightBody.v;

  if (!touching || !approaching) {
    if (distance > radius * 2 + 0.02) {
      activeCollision = false;
    }
    return;
  }

  if (activeCollision) {
    return;
  }

  activeCollision = true;

  const midpoint = (leftBody.x + rightBody.x) * 0.5;
  leftBody.x = midpoint - radius;
  rightBody.x = midpoint + radius;

  const u1 = leftBody.v;
  const u2 = rightBody.v;
  const m1 = leftBody.mass;
  const m2 = rightBody.mass;

  const beforeMomentum = m1 * u1 + m2 * u2;
  const beforeEnergy = kineticEnergy(leftBody) + kineticEnergy(rightBody);

  if (parameters.collisionMode === 'inelastic') {
    const commonVelocity = beforeMomentum / (m1 + m2);
    leftBody.v = commonVelocity;
    rightBody.v = commonVelocity;
    stuckPair = true;
  } else {
    const e = collisionModes[parameters.collisionMode].restitution;
    const v1 = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / (m1 + m2);
    const v2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / (m1 + m2);
    leftBody.v = v1;
    rightBody.v = v2;
  }

  const afterMomentum = leftBody.mass * leftBody.v + rightBody.mass * rightBody.v;
  const afterEnergy = kineticEnergy(leftBody) + kineticEnergy(rightBody);

  collisionCount += 1;
  lastCollisionSummary =
    `${collisionModes[parameters.collisionMode].label}: ` +
    `vA ${formatNumber(u1)}→${formatNumber(leftBody.v)} m/s, ` +
    `vB ${formatNumber(u2)}→${formatNumber(rightBody.v)} m/s, ` +
    `p ${formatNumber(beforeMomentum)}→${formatNumber(afterMomentum)} kg·m/s, ` +
    `Ek ${formatNumber(beforeEnergy)}→${formatNumber(afterEnergy)} J`;

  updateStats();
}

function stepSimulation(dt) {
  if (isPaused) return;

  accumulator += Math.min(dt, 0.05);

  while (accumulator >= fixedStep) {
    if (stuckPair) {
      const dx = bodies[0].v * fixedStep;
      bodies[0].x += dx;
      bodies[1].x = bodies[0].x + radius * 2;
      bodies[0].spin -= dx / radius;
      bodies[1].spin -= dx / radius;
      applyPairWallBounce();
    } else {
      bodies.forEach((body) => {
        const dx = body.v * fixedStep;
        body.x += dx;
        body.spin -= dx / radius;
        applyWallBounce(body);
      });

      solveBallCollision();
    }

    accumulator -= fixedStep;
  }
}

function syncVisuals() {
  bodies.forEach((body) => {
    body.visual.position.set(body.x, laneY, 0);
    body.roller.rotation.z = body.spin;

    const momentum = body.mass * body.v;
    const magnitude = Math.abs(momentum);
    tmpDir.set(Math.sign(momentum || 1), 0, 0);

    body.arrow.position.set(body.x, laneY + 1.05, 0);
    body.arrow.setDirection(tmpDir);
    body.arrow.setLength(Math.max(0.25, Math.min(4.2, 0.24 * magnitude + 0.35)), 0.3, 0.18);

    tmpVec.set(body.x, laneY + 1.7, 0).project(camera);
    const x = (tmpVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmpVec.y * 0.5 + 0.5) * window.innerHeight;
    const hidden = tmpVec.z > 1;

    body.labelEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    body.labelEl.style.opacity = hidden ? '0' : '1';
    body.labelEl.innerHTML = `
      <strong>${body.label}</strong>
      <span>m = ${formatNumber(body.mass)} kg</span>
      <span>v = ${formatNumber(body.v)} m/s</span>
      <span>p = ${formatNumber(body.mass * body.v)} kg·m/s</span>
      <span>${body.v >= 0 ? 'arah +x (ke kanan)' : 'arah -x (ke kiri)'}</span>
    `;
  });
}

sliderInputs.forEach((input) => {
  input.addEventListener('input', (event) => {
    const value = Number(event.currentTarget.value);

    switch (event.currentTarget.dataset.input) {
      case 'left-mass':
        parameters.leftMass = value;
        break;
      case 'right-mass':
        parameters.rightMass = value;
        break;
      case 'left-speed':
        parameters.leftSpeed = value;
        break;
      case 'right-speed':
        parameters.rightSpeed = value;
        break;
      default:
        break;
    }

    updateSliderReadouts();
  });
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    parameters.collisionMode = button.dataset.mode;
    updateModeButtons();
    updateStats();
  });
});

vectorToggle.addEventListener('change', () => {
  parameters.showVectors = vectorToggle.checked;
  setOverlayVisibility();
});

labelToggle.addEventListener('change', () => {
  parameters.showLabels = labelToggle.checked;
  setOverlayVisibility();
});

applyButton.addEventListener('click', () => {
  buildSceneObjects();
  resetSimulation();
});

resetButton.addEventListener('click', resetSimulation);

pauseButton.addEventListener('click', () => {
  isPaused = !isPaused;
  updateStats();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

updateSliderReadouts();
updateModeButtons();
buildSceneObjects();
resetSimulation();

function animate() {
  const delta = clock.getDelta();
  stepSimulation(delta);
  syncVisuals();
  updateStats();
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();
