import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const fogColor = 0x4b3b6b;
scene.background = new THREE.Color(fogColor);
scene.fog = new THREE.FogExp2(fogColor, 0.015);

const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
cam.position.set(0, 5, 15);
cam.lookAt(0, 0, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Setup Orbit Controls biar bisa diputar
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true; // biar geraknya smooth ga kaku
controls.dampingFactor = 0.05;
controls.target.set(0, 2, -5); // kameranya liat ke arah player
controls.update();

// kasih tekstur tanah biar ga polos
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("./img/ground.jpg");
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(400, 4);
groundTexture.colorSpace = THREE.SRGBColorSpace;
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture,
  roughness: 0.9,
  metalness: 0.1,
  color: 0x666666,
});

// kasih lampu biar terang (agak serem dikit)
const moonLight = new THREE.DirectionalLight(0xffffff, 2.5);
const playerLight = new THREE.DirectionalLight(0xffffff, 1);
playerLight.position.set(0, 10, 0);
scene.add(playerLight);
moonLight.color.set(0xbfcfff);
moonLight.intensity = 2;
moonLight.position.set(-20, 50, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
moonLight.shadow.bias = -0.0005;
scene.add(moonLight);

const hemiLight = new THREE.HemisphereLight(0xffe6b3, 0x3a2f4f, 1.8);
scene.add(hemiLight);

// load model-model 3D nya
const loader = new GLTFLoader();
const assets = {};

// daftar warna buat material
const ASSET_COLORS = {
  road: 0x3a2f2a,
  fence: 0x6b6b6b,
  fenceDamaged: 0x5a5a5a,

  tree: 0x3f6b4f,
  trunk: 0x7a4a2e,
  rock: 0x6f6f6f,
  grave: 0x9c9c9c,
  crypt: 0x7a7a7a,

  debris: 0x5a5a5a,
  shovel: 0x7a7a7a,

  pumpkin: 0xff8c1a,
  lantern: 0x8a8a8a,
};

// fungsi helper buat warnain material
function tintMaterial(material, color, rough = 0.7, metal = 0.05) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
  });
}

async function loadAssets() {
  const models = {
    road: "./model/road.glb",
    fence: "./model/iron-fence.glb",
    fenceDamaged: "./model/iron-fence-damaged.glb",
    tree: "./model/pine.glb",
    grave: "./model/gravestone-cross.glb",
    pumpkin: "./model/pumpkin-carved.glb",
    lantern: "./model/lantern-candle.glb",
    crypt: "./model/crypt.glb",
    rock: "./model/rocks.glb",
    trunk: "./model/trunk.glb",
    debris: "./model/debris.glb",
    shovel: "./model/shovel.glb",
  };

  const load = Object.keys(models).map(async (key) => {
    const gltf = await loader.loadAsync(models[key]);
    assets[key] = gltf.scene;
    assets[key].traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;

        if (c.material.map) {
          c.material.map.anisotropy = 16;
          c.material.color.set(0xffffff);
        } else {
          const color = ASSET_COLORS[key] ?? 0xffffff;

          c.material = tintMaterial(
            c.material,
            color,
            0.75,
            key === "shovel" ? 0.3 : 0.05
          );
        }

        // Labunya dikasih efek nyala (glow)
        if (key === "pumpkin") {
          c.material.emissive = new THREE.Color(0xffa500);
          c.material.emissiveIntensity = 0.5;
        }
      }
    });

  });

  await Promise.all(load);

  createEnv();
}

function loadPlayer() {
  return new Promise((resolve, reject) => {
    // Gunakan GLTFLoader karena file .glb
    loader.load(
      "./model/Adventurer.glb",
      (gltf) => {
        player = gltf.scene;

        // Atur ukuran dan posisi awal
        player.scale.set(1.5, 1.5, 1.5); // skala
        player.position.set(0, 0, 8);    // posisi di depan kamera dikit
        player.rotation.y = Math.PI;     // menghadap depan

        // Bayangan
        player.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        scene.add(player);

        // Setup animasi bawaan dari modelnya
        if (gltf.animations && gltf.animations.length > 0) {
          playerMixer = new THREE.AnimationMixer(player);
          const animations = gltf.animations;

          // Cek ada animasi apa aja
          console.log("Daftar Animasi:", animations.map((a, i) => `${i}: ${a.name}`));

          // Cari animasi lari (Run)
          const runClip = animations.find(a => a.name.toLowerCase().includes('run'));

          if (runClip) {
            const action = playerMixer.clipAction(runClip);
            action.play();
            console.log("Playing (Found 'Run'):", runClip.name);
          }
        }

        console.log("PLAYER LOADED (Adventurer)");
        resolve(player);
      },
      undefined,
      (error) => {
        console.error("FAILED TO LOAD ADVENTURER", error);
        reject(error);
      }
    );
  });
}

// bikin track jalanan --
const segments = [];
const segment_length = 20;
const segment_count = 8;
const game_speed = 8;

function createsegment(z_offset) {
  const segmentGroup = new THREE.Group();

  // tanah
  const geo = new THREE.PlaneGeometry(2000, segment_length);
  const mesh = new THREE.Mesh(geo, groundMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.15, 0);
  mesh.receiveShadow = true;
  segmentGroup.add(mesh);

  // jalan (random bolong dikit biar variatif)
  if (assets.road) {
    for (let z = 0; z < segment_length; z += 2) {
      const lanes = [-2.5, 0, 2.5];
      lanes.forEach((x) => {
        if (Math.random() < 0.6) {
          const road = assets.road.clone();
          road.position.set(x, 0, z - segment_length / 2);
          road.scale.set(2, 2, 2.1);
          road.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
          segmentGroup.add(road);
        }
      });
    }
  }

  // bikin pagar kanan kiri
  for (let z = -segment_length / 2; z < segment_length / 2; z += 4) {
    if (Math.random() < 0.8) {
      const model = Math.random() > 0.5 ? assets.fence : assets.fenceDamaged;
      if (model) {
        const fence = model.clone();
        fence.position.set(-4.5, 0, z);
        fence.rotation.y = Math.PI / 2;
        fence.scale.set(1.5, 1.5, 1.5);
        segmentGroup.add(fence);
      }
    }
    if (Math.random() < 0.8) {
      const model = Math.random() > 0.5 ? assets.fence : assets.fenceDamaged;
      if (model) {
        const fence = model.clone();
        fence.position.set(4.5, 0, z);
        fence.rotation.y = -Math.PI / 2;
        fence.scale.set(1.5, 1.5, 1.5);
        segmentGroup.add(fence);
      }
    }
  }

  // hiasan pinggir jalan (pohon dll)
  for (let z = -segment_length / 2; z < segment_length / 2; z += 5) {
    if (assets.tree && Math.random() > 0.3) {
      const tree = assets.tree.clone();
      const isLeft = Math.random() > 0.5;
      const xPos = isLeft ? -8 : 8;
      tree.position.set(xPos, 0, z);
      tree.scale.set(3, 4 + Math.random(), 3);
      segmentGroup.add(tree);
    }

    // Lantern
    if (assets.lantern && Math.random() < 0.3) {
      const lantern = assets.lantern.clone();
      const lx = Math.random() > 0.5 ? -4 : 4;
      lantern.position.set(lx, 0, z);
      lantern.scale.set(1.5, 1.5, 1.5);
      segmentGroup.add(lantern);
    }
  }

  // objek-objek di luar jalan
  const scatterCount = 20;
  for (let i = 0; i < scatterCount; i++) {
    const isLeft = Math.random() > 0.5;
    const xOut = isLeft ? -15 - Math.random() * 30 : 15 + Math.random() * 30;
    const zOut = (Math.random() - 0.5) * segment_length;
    const r = Math.random();
    let decor = null;

    if (r < 0.3 && assets.tree) {
      decor = assets.tree.clone();
      decor.scale.set(3, 3 + Math.random() * 2, 3);
    } else if (r < 0.5 && assets.rock) {
      decor = assets.rock.clone();
      decor.scale.set(2, 2, 2);
      decor.rotation.y = Math.random() * Math.PI;
    } else if (r < 0.7 && assets.grave) {
      decor = assets.grave.clone();
      decor.scale.set(1.5, 1.5, 1.5);
      decor.rotation.y = Math.random() - 0.5;
    } else if (r < 0.85 && assets.trunk) {
      decor = assets.trunk.clone();
      decor.scale.set(2, 2, 2);
    } else if (assets.crypt && Math.random() < 0.1) { // Kuburan (rare item)
      decor = assets.crypt.clone();
      decor.scale.set(3, 3, 3);
      decor.rotation.y = Math.random() * Math.PI;
    }

    if (decor) {
      decor.position.set(xOut, 0, zOut);
      segmentGroup.add(decor);
    }
  }

  segmentGroup.position.z = z_offset;
  scene.add(segmentGroup);
  segments.push(segmentGroup);
}

async function createEnv() {
  // 1. Tunggu player beres di-load
  await loadPlayer();

  // 2. Bikin jalanan awal berjejer ke belakang
  // Mulai dari z=0 mundur ke belakang (negatif Z)
  for (let i = 0; i < segment_count; i++) {
    createsegment(-i * segment_length);
  }

  draw();
}

let player;
let playerMixer;
const clock = new THREE.Clock();

// Logika pindah jalur (kiri - tengah - kanan)
let currentLane = 1; // 0: Kiri, 1: Tengah, 2: Kanan
const laneX = [-2.5, 0, 2.5]; // Posisi X untuk tiap jalur

window.addEventListener("keydown", (e) => {
  if (!player) return;

  if (e.key === "a" || e.key === "ArrowLeft") {
    if (currentLane > 0) currentLane--;
  } else if (e.key === "d" || e.key === "ArrowRight") {
    if (currentLane < 2) currentLane++;
  }
});

function draw() {
  requestAnimationFrame(draw);
  const delta = clock.getDelta();

  if (playerMixer) {
    playerMixer.update(delta);
  }

  // Geser player ke jalur yg dipilih (pake lerp biar halus)
  if (player) {
    const targetX = laneX[currentLane];
    player.position.x = THREE.MathUtils.lerp(player.position.x, targetX, 10 * delta);
  }

  controls.update();

  // Jalanin semua objek ke arah kamera
  segments.forEach((segment) => {
    segment.position.z += game_speed * delta;
  });

  // Cek kalo jalan udah lewat kamera (di belakang kita)
  // terus lempar lagi ke ujung belakang
  segments.forEach((segment) => {
    if (segment.position.z > segment_length) { // Jika sudah lewat kamera (batas aman)

      // Cari posisi paling ujung belakang
      const minZ = Math.min(...segments.map(s => s.position.z));

      // Tempel di belakangnya
      // Pas-in biar ga ada celah (no gap)
      segment.position.z = minZ - segment_length;
    }
  });

  renderer.render(scene, cam);
}

window.addEventListener("resize", () => {
  cam.aspect = window.innerWidth / window.innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadAssets();
