import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const scene = new THREE.Scene();

// Game State
let gameStarted = false;
const landingPage = document.getElementById("landing-page");
const playBtn = document.getElementById("play-btn");

// Game Over UI
const gameOverPage = document.getElementById("game-over-page");
const retryBtn = document.getElementById("retry-btn");
const homeBtn = document.getElementById("home-btn");

playBtn.addEventListener("click", () => {
  landingPage.classList.add("hidden");
  gameStarted = true;
  if (player) {
    player.visible = true;
  }
  spawnInitialZombies(); // Spawn zombie saat tombol play ditekan
});

// Retry Button
retryBtn.addEventListener("click", () => {
  gameOverPage.classList.add("hidden");
  resetGame();
  gameStarted = true;
  if (player) player.visible = true;
  spawnInitialZombies();
});

// Home Button
homeBtn.addEventListener("click", () => {
  gameOverPage.classList.add("hidden");
  landingPage.classList.remove("hidden");
  resetGame();
  gameStarted = false; // Back to menu state
  if (player) player.visible = false;
});

function resetGame() {
  // Clear zombies
  zombies.forEach(z => scene.remove(z));
  zombies = [];
  killerZombie = null; // Reset pembunuh

  game_speed = start_speed; // Reset kecepatan
  maxActiveZombies = 12; // Reset jumlah zombie
  spawnTimer = 0;

  // Reset player position
  currentLane = 1;
  if (player) {
    player.position.set(0, 0, 6);
    isJumping = false;
    isRolling = false;
    isDying = false;
    jumpVelocity = 0;

    // Balikin animasi ke Run
    if (runAction) {
      // Stop semua animasi dulu
      if (jumpAction) jumpAction.stop();
      if (rollAction) rollAction.stop();
      if (deathAction) deathAction.stop();
      if (hitAction) hitAction.stop();

      // Nyalain lagi animasi run
      runAction.enabled = true;
      runAction.reset();
      runAction.play();
    }
  }
}

function triggerGameOver(zombie) {
  if (isDying) return; // Cegah trigger double
  gameStarted = false;
  isDying = true;
  killerZombie = zombie; // Simpan siapa yang nabrak

  // Kalo ada zombie yang nabrak, suruh dia animasi nyerang/makan
  if (killerZombie && killerZombie.userData.mixer) {
    const resource = assetResources[killerZombie.userData.type];
    if (resource && resource.animations) {
      // Cari animasi Attack atau Bite
      const attackClip = resource.animations.find(a => a.name.toLowerCase().includes("attack")) ||
        resource.animations.find(a => a.name.toLowerCase().includes("bite")) ||
        resource.animations.find(a => a.name.toLowerCase().includes("eat"));

      if (attackClip) {
        // Stop animasi lari/jalan
        killerZombie.userData.mixer.stopAllAction();

        // Mainin animasi death/makan
        const action = killerZombie.userData.mixer.clipAction(attackClip);
        action.reset();
        action.play();
      }
    }
  }

  // Dapatkan config zombie yang nabrak
  let animToPlay = deathAction; // Default death
  let forceGround = true; // Default jatoh ke tanah

  if (killerZombie) {
    const type = killerZombie.userData.type;
    const config = ZOMBIE_CONFIG[type];

    if (config) {
      // 1. Tentukan animasi player (Death / Hit)
      if (config.playerAnim === "Hit" && hitAction) {
        animToPlay = hitAction;
      }

      // 2. Tentukan posisi player (Ground / Air)
      if (config.playerPos === "air") {
        forceGround = false;
      }
    }
  }

  // Turunin player ke tanah kalo config minta di tanah
  if (player && forceGround) {
    player.position.y = 0;
  }

  isJumping = false;
  jumpVelocity = 0;

  // Matiin semua animasi biar ga tabrakan
  if (runAction) runAction.stop();
  if (jumpAction) jumpAction.stop();
  if (rollAction) rollAction.stop();
  if (deathAction) deathAction.stop();
  if (hitAction) hitAction.stop();

  // Mainin animasi: Hit dulu -> Baru nanti Death (via listener)
  if (hitAction) {
    hitAction.reset();
    hitAction.play();
  } else if (deathAction) {
    // Fallback langsung death kalo ga ada hit
    deathAction.reset();
    deathAction.play();
  } else {
    showGameOverScreen();
  }

  // Kalo ada zombie yang nabrak, suruh dia animasi nyerang/makan
  if (killerZombie && killerZombie.userData.mixer) {
    const resource = assetResources[killerZombie.userData.type];
    const config = ZOMBIE_CONFIG[killerZombie.userData.type];

    if (resource && resource.animations) {
      // Cari animasi Attack atau Bite sesuai CONFIG
      let attackName = config?.attackAnim || "Attack";
      let attackClip = resource.animations.find(a => a.name.toLowerCase().includes(attackName.toLowerCase()));

      // Fallback kalo ga nemu di config
      if (!attackClip) {
        attackClip = resource.animations.find(a => a.name.toLowerCase().includes("attack")) ||
          resource.animations.find(a => a.name.toLowerCase().includes("bite"));
      }

      if (attackClip) {
        // Stop animasi lari/jalan
        killerZombie.userData.mixer.stopAllAction();

        // Mainin animasi attack zombie
        const action = killerZombie.userData.mixer.clipAction(attackClip);

        // Atur loop sesuai config
        if (config && config.attackLoop === "once") {
          action.loop = THREE.LoopOnce;
          action.clampWhenFinished = true;
        } else {
          action.loop = THREE.LoopRepeat;
        }

        action.reset();
        action.play();
      }
    }
  }
}

// Fungsi buat nampilin layar game over (dipanggil setelah animasi death selesai)
function showGameOverScreen() {
  gameOverPage.classList.remove("hidden");

  // Ilangin player abis animasi death
  if (player) {
    player.visible = false;
  }

  // Matiin animasi death juga
  if (deathAction) deathAction.stop();
}

function checkCollisions() {
  if (!player || !gameStarted) return;

  const playerBox = new THREE.Box3().setFromObject(player);
  // Kecilin hitbox player biar ga gampang mati
  playerBox.expandByScalar(-0.5);

  // Kalo lagi roll, gepengin hitboxnya
  if (isRolling) {
    playerBox.max.y -= 1.0; // Turunin atap hitbox biar bisa lewat kolong
  }

  for (let zombie of zombies) {
    // Kalau lagi roll dan ketemu kelelawar, skip collision (alias lolos)
    if (isRolling && zombie.userData.type === 'zombie4') {
      continue;
    }

    const zombieBox = new THREE.Box3().setFromObject(zombie);

    // Atur hitbox sesuai tipe musuh
    if (zombie.userData.type === 'zombie4') {
      // Kelelawar kecil/terbang, gedein dikit hitboxnya
      zombieBox.expandByScalar(0.3);
    }
    // Zombie biasa biarin hitbox aslinya biar zombie merangkak kedetect

    if (playerBox.intersectsBox(zombieBox)) {
      triggerGameOver(zombie);
      break;
    }
  }
}


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

// kasih lampu biar terang
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
const assetResources = {};

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

// Atur path model dan skala (scale) di sini
const ZOMBIE_CONFIG = {
  zombie1: { // jalan
    path: "./model/zombie2.glb", // Ganti jadi model zombie besar
    scale: 1.4,
    attackAnim: "Attack",
    playerAnim: "Hit",    // Kena damage dulu
    playerPos: "ground",
    attackLoop: "once",    // Serang kepukul sekali
    moveAnim: "walk"      // Jalan pelan
  },
  zombie2: { // merangkak / kecil
    path: "./model/zombie1.glb",
    scale: 0.5,
    attackAnim: "Attack",
    playerAnim: "Hit",
    playerPos: "ground",
    attackLoop: "repeat"  // Gigit-gigit terus
  },
  zombie3: { // lari / besar
    path: "./model/zombie2.glb",
    scale: 1.4,
    attackAnim: "Bite",
    playerAnim: "Hit",
    playerPos: "ground",
    attackLoop: "once",    // Gigit sekali kuat
    moveAnim: "Run"       // Lari kenceng
  },
  zombie4: { // terbang
    path: "./model/bat.glb",
    scale: 1.4,
    attackAnim: "Bite",
    playerAnim: "Death",    // Langsung Death biar halus (ga dua gerakan)
    playerPos: "ground",  // Jatuh ke tanah
    attackLoop: "once",  // Nyerang terus sambil terbang
    skipDeathAnim: false   // Tetap jalankan death abis hit
  },
};

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
    zombie1: ZOMBIE_CONFIG.zombie1.path,
    zombie2: ZOMBIE_CONFIG.zombie2.path,
    zombie3: ZOMBIE_CONFIG.zombie3.path,
    zombie4: ZOMBIE_CONFIG.zombie4.path
  };

  const load = Object.keys(models).map(async (key) => {
    const gltf = await loader.loadAsync(models[key]);
    assetResources[key] = gltf;
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
        player.position.set(0, 0, 6);    // posisi di depan kamera dikit
        player.rotation.y = Math.PI;     // menghadap depan
        player.visible = false; // Hide completely until game starts


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

          // Cari animasi lari (Run) dan lompat (Jump)
          const clipRun = animations.find(a => a.name.toLowerCase().includes('run'));
          const clipJump = animations.find(a => a.name.toLowerCase().includes('jump')) || animations.find(a => a.name.toLowerCase().includes('attack')); // Fallback attack kalo ga ada jump
          const clipRoll = animations.find(a => a.name.toLowerCase().includes('roll'));

          if (clipRun) {
            runAction = playerMixer.clipAction(clipRun);
            runAction.play();
          }

          if (clipJump) {
            jumpAction = playerMixer.clipAction(clipJump);
            jumpAction.loop = THREE.LoopOnce; // Jangan looping
            jumpAction.clampWhenFinished = true;
          }

          if (clipRoll) {
            rollAction = playerMixer.clipAction(clipRoll);
            rollAction.loop = THREE.LoopOnce; // Jangan looping
            rollAction.clampWhenFinished = true;
            rollAction.timeScale = 2.0;
          }

          // Cari animasi mati (Death)
          const clipDeath = animations.find(a => a.name.toLowerCase().includes('death'));
          if (clipDeath) {
            deathAction = playerMixer.clipAction(clipDeath);
            deathAction.loop = THREE.LoopOnce;
            deathAction.clampWhenFinished = true;
          }

          // Cari animasi ketabrak (HitReceive_2)
          const clipHit = animations.find(a => a.name.includes('Sword_Slash')) ||
            animations.find(a => a.name.toLowerCase().includes('hit'));

          if (clipHit) {
            hitAction = playerMixer.clipAction(clipHit);
            hitAction.loop = THREE.LoopOnce;
            hitAction.clampWhenFinished = true;
          }

          // Listener ketika animasi selesai
          playerMixer.addEventListener('finished', (e) => {
            // Kalo roll selesai, balik ke run
            if (e.action === rollAction) {
              isRolling = false;
              if (runAction) {
                rollAction.crossFadeTo(runAction, 0.1, true);
                runAction.reset();
                runAction.play();
              }
            }

            // Kalo HitReceive selesai, cek apakah lanjut Death atau udahan
            if (e.action === hitAction) {
              const type = killerZombie ? killerZombie.userData.type : null;
              const skipDeath = type ? ZOMBIE_CONFIG[type].skipDeathAnim : false;

              if (!skipDeath && deathAction) {
                // Gunakan crossFade biar transisinya halus 
                hitAction.crossFadeTo(deathAction, 0.1, false);
                deathAction.reset();
                deathAction.play();
              } else {
                showGameOverScreen(); // Fallback atau emang disuruh skip death
              }
            }

            // Kalo Death selesai, baru tampilin layar game over
            if (e.action === deathAction) {
              showGameOverScreen();
            }
          });
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

let zombies = []; // Untuk nyimpen zombie yang di-spawn
const zombieMixer = []; // Untuk menangani animasi zombie

function spawnOneZombie(modelKey, x, z) {
  const resource = assetResources[modelKey];
  if (!resource) return;

  const zombie = SkeletonUtils.clone(resource.scene);

  // Custom Logic untuk Bat (zombie4)
  if (modelKey === 'zombie4') {
    zombie.position.set(x, 1.7, z); // Terbang agak tinggi
    zombie.rotation.y = -Math.PI / 2;    // Putar balik biar menghadap player
  } else {
    zombie.position.set(x, 0, z);
  }

  // Simpan tipe zombie untuk login lain
  zombie.userData.type = modelKey;

  // Scale sesuai konfigurasi per zombie
  const config = ZOMBIE_CONFIG[modelKey];
  const s = config ? config.scale : 1.0;
  zombie.scale.set(s, s, s);

  if (resource.animations && resource.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(zombie);

    // Cari animasi lari (Run), Jalan (Walk), atau Terbang (Fly)
    let clip = null;

    // cek preference dari config (Walk/Run)
    if (config && config.moveAnim) {
      clip = resource.animations.find(a => a.name.toLowerCase().includes(config.moveAnim.toLowerCase()));
    }

    // Fallback
    if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("run"));
    if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("walk"));
    if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("fly")); // Buat kelelawar
    if (!clip) clip = resource.animations[8] || resource.animations[0];

    // Hapus track posisi root
    const tracks = clip.tracks.filter(t => !t.name.endsWith(".position"));
    const fixedClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);

    const action = mixer.clipAction(fixedClip);
    action.play();
    zombie.userData.mixer = mixer;
  }

  zombie.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  scene.add(zombie);
  zombies.push(zombie);
}

function spawnInitialZombies() {
  const zombieTypes = ["zombie1", "zombie2", "zombie3", "zombie4"];
  let zPos = -60;

  // Spawn 12 gelombang
  for (let i = 0; i < 12; i++) {
    const isDouble = Math.random() < 0.3; // 30% double spawn

    if (isDouble) {
      const lanes = [0, 1, 2].sort(() => 0.5 - Math.random()).slice(0, 2);
      lanes.forEach(lane => {
        const type = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
        spawnOneZombie(type, laneX[lane], zPos);
      });
    } else {
      const lane = Math.floor(Math.random() * 3);
      const type = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
      spawnOneZombie(type, laneX[lane], zPos);
    }

    zPos -= (25 + Math.random() * 15);
  }
}

// bikin track jalanan --
const segments = [];
const segment_length = 20;
const segment_count = 8;
let game_speed = 8;
const start_speed = 8;
const max_speed = 30; // Kecepatan maksimal
const acceleration = 0.5; // Penambahan kecepatan per detik

// Variable untuk spawn zombie tambahan
let spawnTimer = 0;
let spawn_interval = 1.0;
let maxActiveZombies = 50; // Awalnya 50 zombie
const max_zombie_limit = 150; // Mentok di 150 zombie 

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
  // Tunggu player beres di-load
  await loadPlayer();

  // Bikin jalanan awal berjejer ke belakang
  // Mulai dari z=0 mundur ke belakang
  for (let i = 0; i < segment_count; i++) {
    createsegment(-i * segment_length);
  }

  draw();
}


let player;
let playerMixer;
let runAction, jumpAction, rollAction, deathAction, hitAction; // Action untuk animasi
let isJumping = false;
let isRolling = false;
let isDying = false; // Flag buat cek lagi mati apa engga
let killerZombie = null; // Zombie yang bunuh player
let jumpVelocity = 0;
const GRAVITY = 35; // Gravitasi lebih kuat biar berat
const JUMP_FORCE = 12; // Kekuatan lompat

const clock = new THREE.Clock();

// Logika pindah jalur
let currentLane = 1; // 0: Kiri, 1: Tengah, 2: Kanan
const laneX = [-2.5, 0, 2.5]; // Posisi X untuk tiap jalur

window.addEventListener("keydown", (e) => {
  if (!player || !gameStarted) return;

  if (e.key === "a" || e.key === "ArrowLeft") {
    if (currentLane > 0) currentLane--;
  } else if (e.key === "d" || e.key === "ArrowRight") {
    if (currentLane < 2) currentLane++;
  } else if ((e.key === "w" || e.key === "ArrowUp") && !isJumping && !isRolling) {

    // Tombol Lompat
    isJumping = true;
    jumpVelocity = JUMP_FORCE;

    // Lari ke lompat
    if (jumpAction && runAction) {
      runAction.crossFadeTo(jumpAction, 0.1, true);
      jumpAction.reset();
      jumpAction.play();
    }
  } else if ((e.key === "s" || e.key === "ArrowDown") && !isRolling && !isJumping) {
    isRolling = true;

    if (rollAction && runAction) {
      runAction.crossFadeTo(rollAction, 0.1, true);
      rollAction.reset();
      rollAction.play();
    }
  }
});

function updateDifficulty(delta) {
  if (!gameStarted) return;

  // Menaikkan kecepatan
  if (game_speed < max_speed) {
    // Speed nambah pelan-pelan setiap frame
    game_speed += acceleration * delta * 0.1; 
  }

  // Menaikkan kapasitas zombie
  // Semakin cepat game, semakin banyak zombie yang boleh muncul
  if (maxActiveZombies < max_zombie_limit) {
    maxActiveZombies += delta * 0.5;
  }

  // Mempercepat Spawn Interval
  // Semakin lama main, semakin ngebut spawn-nya (min 0.3 detik)
  if (spawn_interval > 0.3) {
    spawn_interval -= delta * 0.005; 
  }

  // Spawn zombie baru
  spawnTimer += delta;
  
  // Jika waktu spawn tercapai dan jumlah zombie masih di bawah batas kapasitas
  if (spawnTimer > spawn_interval && zombies.length < Math.floor(maxActiveZombies)) {
    spawnTimer = 0;

    // Cari posisi paling belakang
    let minZ = -60;
    if (zombies.length > 0) {
      minZ = Math.min(...zombies.map(z => z.position.z));
    }

    // Ada kemungkinan spawn 2-3 zombie sekaligus
    const burstChance = Math.random();
    let spawnCount = 1;

    if (game_speed > 12 && burstChance < 0.30) spawnCount = 3;
    else if (game_speed > 8 && burstChance < 0.50) spawnCount = 2;

    // Pastikan tidak numpuk di satu lane
    const availableLanes = [0, 1, 2].sort(() => 0.5 - Math.random());
    
    // Tentukan tipe zombie dulu
    let selectedTypes = [];
    if (spawnCount === 3) {
        // Kalau 3 zombie, harus ada yang bisa dilewatin (zombie4 atau zombie2)
        const passableTypes = ["zombie2", "zombie4"];
        const allTypes = ["zombie1", "zombie2", "zombie3", "zombie4"];
        
        // Pastikan minimal satu yang aman
        selectedTypes.push(passableTypes[Math.floor(Math.random() * passableTypes.length)]);
        
        // Sisanya random
        for (let k = 1; k < spawnCount; k++) {
             selectedTypes.push(allTypes[Math.floor(Math.random() * allTypes.length)]);
        }
    } else {
         // Kalau cuma 1 atau 2, random aja bebas
         const allTypes = ["zombie1", "zombie2", "zombie3", "zombie4"];
         for (let k = 0; k < spawnCount; k++) {
             selectedTypes.push(allTypes[Math.floor(Math.random() * allTypes.length)]);
         }
    }

    for (let i = 0; i < spawnCount; i++) {
        const laneIndex = availableLanes[i];
        const type = selectedTypes[i];
        
        // Spawn agak jauh di belakang, kasih variasi jarak dikit biar gak terlalu baris
        const offsetZ = Math.random() * 5; 
        spawnOneZombie(type, laneX[laneIndex], minZ - 10 - offsetZ);
    }
  }
}

function draw() {
  requestAnimationFrame(draw);
  const delta = clock.getDelta();

  updateDifficulty(delta*5);
  // console.log(game_speed);

  if (playerMixer) {
    // Sync animation speed with game speed
    const speedRatio = Math.min(game_speed / start_speed, 1.5);
    
    // Only scale RUN animation
    if (runAction) {
        runAction.timeScale = speedRatio;
    }

    playerMixer.update(delta);
  }

  // Geser player ke jalur yg dipilih
  if (player && gameStarted) {
    // Geser X (Lane)
    const targetX = laneX[currentLane];
    player.position.x = THREE.MathUtils.lerp(player.position.x, targetX, 10 * delta);

    // Geser Y (Lompat)
    if (isJumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity -= GRAVITY * delta;

      // Mendarat ke tanah
      if (player.position.y <= 0) {
        player.position.y = 0;
        isJumping = false;
        jumpVelocity = 0;

        // Lompat ke lari
        if (jumpAction && runAction) {
          jumpAction.crossFadeTo(runAction, 0.2, true);
          runAction.reset();
          runAction.play();
        }
      }
    }
  }

  controls.update();

  // Update zombies
  zombies.forEach((zombie) => {
    const isKiller = (zombie === killerZombie);

    // Update Animasi
    // update animasi alo game jalan ato ini zombie yang lagi makan player
    if (gameStarted || isKiller) {
      if (zombie.userData.mixer) {
        zombie.userData.mixer.update(delta);
      }
    }

    // Update Posisi/Movement
    // Cuma gerak kalo game jalan (jadi zombie lain freeze)
    if (gameStarted) {
      // Logika pergerakan zombie
      zombie.position.z += (game_speed + 2) * delta;

      if (zombie.position.z > 10) {
        // Recycle ke belakang
        const minZ = Math.min(...zombies.map(z => z.position.z));

        // Chance untuk grouping/sejajar
        const gap = Math.random() < 0.3 ? 0 : (15 + Math.random() * 10);
        zombie.position.z = minZ - gap;

        if (gap === 0) {
          // Cari lane yang kosong di minZ
          const buddy = zombies.find(z => Math.abs(z.position.z - minZ) < 3.5);
          const busyLaneX = buddy ? buddy.position.x : -999;
          const availableLanes = laneX.filter(x => x !== busyLaneX);
          zombie.position.x = availableLanes.length > 0 ? availableLanes[Math.floor(Math.random() * availableLanes.length)] : laneX[Math.floor(Math.random() * 3)];
        } else {
          zombie.position.x = laneX[Math.floor(Math.random() * 3)];
        }
      }
    }
  });


  // Jalanin semua objek ke arah kamera
  // Update jalan/segmen cuma kalo game jalan
  if (gameStarted) {
    // Jalanin semua objek ke arah kamera
    segments.forEach((segment) => {
      segment.position.z += game_speed * delta;
    });

    // Cek kalo jalan udah lewat kamera (di belakang kita)
    // terus lempar lagi ke ujung belakang
    segments.forEach((segment) => {
      if (segment.position.z > segment_length) { // Jika sudah lewat kamera 

        // Cari posisi paling ujung belakang
        const minZ = Math.min(...segments.map(s => s.position.z));

        // Tempel di belakangnya
        // Pas in biar ga ada celah 
        segment.position.z = minZ - segment_length;
      }
    });
  }

  renderer.render(scene, cam);

  if (gameStarted) {
    checkCollisions();
  }
}


window.addEventListener("resize", () => {
  cam.aspect = window.innerWidth / window.innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadAssets();
