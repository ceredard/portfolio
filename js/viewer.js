// 3D CAD viewer — STL, 3MF, OBJ, GLB/GLTF.
// Usage: mountViewer(containerEl, { src: "/assets/models/part.stl", units: "mm", up: "z", color: "#b9c3cf" })
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ext(src) {
  return (src.split("?")[0].split(".").pop() || "").toLowerCase();
}

function loadModel(src, color) {
  const kind = ext(src);
  const mat = () =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), metalness: 0.35, roughness: 0.45 });
  return new Promise((resolve, reject) => {
    if (kind === "stl") {
      new STLLoader().load(src, (geo) => {
        geo.computeVertexNormals();
        resolve(new THREE.Mesh(geo, mat()));
      }, undefined, reject);
    } else if (kind === "glb" || kind === "gltf") {
      new GLTFLoader().load(src, (g) => resolve(g.scene), undefined, reject);
    } else if (kind === "obj") {
      new OBJLoader().load(src, (o) => {
        o.traverse((c) => { if (c.isMesh) c.material = mat(); });
        resolve(o);
      }, undefined, reject);
    } else if (kind === "3mf") {
      new ThreeMFLoader().load(src, (o) => resolve(o), undefined, reject);
    } else {
      reject(new Error(`Unsupported file type .${kind}. Use STL, 3MF, OBJ, GLB or GLTF.`));
    }
  });
}

export function mountViewer(el, opts = {}) {
  const { src, units = "mm", color = "#b9c3cf", autoRotate = true } = opts;
  const up = (opts.up || (["glb", "gltf"].includes(ext(src)) ? "y" : "z")).toLowerCase();

  el.classList.add("viewer");
  el.innerHTML = `
    <div class="viewer-status">Loading model…</div>
    <div class="viewer-hint" hidden>Drag to rotate · scroll to zoom · right-drag to pan</div>
    <div class="viewer-bar" hidden>
      <div class="viewer-tools">
        <button type="button" data-act="reset">Reset</button>
        <button type="button" data-act="wire" aria-pressed="false">Wire</button>
        <button type="button" data-act="spin" aria-pressed="${autoRotate && !reduceMotion}">Spin</button>
        <button type="button" data-act="full">Full</button>
      </div>
      <div class="viewer-dims"></div>
    </div>`;
  const status = el.querySelector(".viewer-status");
  const bar = el.querySelector(".viewer-bar");
  const hint = el.querySelector(".viewer-hint");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x1a1c20, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1e5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = autoRotate && !reduceMotion;
  controls.autoRotateSpeed = 1.2;

  let root = null, home = null, grid = null, wire = false;

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el);
  resize();

  let running = true;
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) loop(); }).observe(el);
  function loop() {
    if (!running) return;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function frame() {
    camera.position.copy(home.pos);
    controls.target.copy(home.target);
    controls.update();
  }

  el.querySelector('[data-act="reset"]').onclick = frame;
  el.querySelector('[data-act="wire"]').onclick = (e) => {
    wire = !wire;
    e.currentTarget.setAttribute("aria-pressed", wire);
    root.traverse((c) => {
      if (c.isMesh) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => (m.wireframe = wire));
    });
  };
  el.querySelector('[data-act="spin"]').onclick = (e) => {
    controls.autoRotate = !controls.autoRotate;
    e.currentTarget.setAttribute("aria-pressed", controls.autoRotate);
  };
  el.querySelector('[data-act="full"]').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
  };
  renderer.domElement.addEventListener("pointerdown", () => {
    hint.hidden = true;
  }, { once: true });

  loadModel(src, color)
    .then((obj) => {
      root = new THREE.Group();
      if (up === "z") obj.rotation.x = -Math.PI / 2;
      root.add(obj);
      scene.add(root);

      // Measure in model units, then center on the origin and sit on the grid.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center).add(new THREE.Vector3(0, size.y / 2, 0));

      const radius = size.length() / 2 || 1;
      grid = new THREE.GridHelper(radius * 4, 20, 0x3a414b, 0x252a31);
      scene.add(grid);

      const dist = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.05;
      const target = new THREE.Vector3(0, size.y / 2, 0);
      home = { target, pos: target.clone().add(new THREE.Vector3(1, 0.7, 1.1).normalize().multiplyScalar(dist)) };
      camera.near = dist / 200; camera.far = dist * 50; camera.updateProjectionMatrix();
      controls.minDistance = radius * 0.3; controls.maxDistance = dist * 6;
      frame();

      // Report dimensions in CAD axis order (X × Y × Z) with Z as the build/up axis.
      const [x, y, z] = up === "z" ? [size.x, size.z, size.y] : [size.x, size.z, size.y];
      const f = (n) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
      el.querySelector(".viewer-dims").textContent = `${f(x)} × ${f(y)} × ${f(z)} ${units}`;

      status.remove();
      bar.hidden = false;
      hint.hidden = false;
      loop();
    })
    .catch((err) => {
      console.error(err);
      status.textContent = "Couldn't load this model. " + (err?.message || "");
    });
}

// Mount any element with data-model="url" when it scrolls near view.
export function autoMount(scope = document) {
  const els = scope.querySelectorAll("[data-model]:not([data-mounted])");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const d = e.target.dataset;
      mountViewer(e.target, { src: d.model, units: d.units, up: d.up, color: d.color });
    });
  }, { rootMargin: "200px" });
  els.forEach((el) => { el.dataset.mounted = "1"; io.observe(el); });
}
