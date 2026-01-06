import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

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

// setup tekstur utk ground
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

// setup lightning
const moonLight = new THREE.DirectionalLight(0xffffff, 2.5);
const playerLight = new THREE.DirectionalLight(0xffffff, 1);
playerLight.position.set(0, 10, 0);
scene.add(playerLight);
moonLight.color.set(0xbfcfff);
moonLight.intensity = 2;
moonLight.position.set(-20, 50, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
moonLight.shadow.bias = -0.0005;
scene.add(moonLight);

const hemiLight = new THREE.HemisphereLight(0xffe6b3, 0x3a2f4f, 1.8);
scene.add(hemiLight);

// load aset2 model
const loader = new GLTFLoader();
const assets = {};

// color pallete
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

// helper material
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

      // 🎃 Pumpkin glow (HANYA untuk pumpkin)
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
  const fbxLoader = new FBXLoader();

  fbxLoader.load("./model/characterMedium.fbx", (fbx) => {
    player = fbx;

    // ⚠️ SKALA & POSISI FIX
    player.scale.set(0.05, 0.05, 0.05);
    player.position.set(0, -5.2, -5);

    player.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    // animasi
    if (fbx.animations.length > 0) {
      playerMixer = new THREE.AnimationMixer(player);
      const action = playerMixer.clipAction(fbx.animations[0]);
      action.play();
    }

    scene.add(player);
    console.log("PLAYER LOADED", player);
  });
}

// generate environment --
const segments = [];
const segment_length = 20;
const segment_count = 8;
const game_speed = 15;

function createsegment(z_offset) {
  const segmentGroup = new THREE.Group();

  // ground
  const geo = new THREE.PlaneGeometry(2000, segment_length);
  const mesh = new THREE.Mesh(geo, groundMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.15, 0);
  mesh.receiveShadow = true;
  segmentGroup.add(mesh);

  // road
  if (assets.road) {
    for (let z = 0; z < segment_length; z += 2) {
      const lanes = [-2.5, 0, 2.5];
      lanes.forEach((x) => {
        if (Math.random() < 0.7) {
          const road = assets.road.clone();
          road.position.set(x, 0, z - segment_length / 2);
          road.scale.set(2, 2, 2.1);
          road.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
          segmentGroup.add(road);
        } else {
          if (assets.debris && Math.random() < 0.5) {
            const deb = assets.debris.clone();
            deb.position.set(x, -0.1, z - segment_length / 2);
            deb.rotation.y = Math.random() * Math.PI;
            segmentGroup.add(deb);
          }
        }
      });
    }
  }

  // pagar
  for (let z = -segment_length / 2; z < segment_length / 2; z += 4) {
    if (Math.random() < 0.6) {
      const model = Math.random() > 0.4 ? assets.fence : assets.fenceDamaged;
      if (model) {
        const fence = model.clone();
        fence.position.set(-4.5, 0, z);
        fence.rotation.y = Math.PI / 2;
        fence.scale.set(1.5, 1.5, 1.5);
        segmentGroup.add(fence);
      }
    }
    if (Math.random() < 0.6) {
      const model = Math.random() > 0.4 ? assets.fence : assets.fenceDamaged;
      if (model) {
        const fence = model.clone();
        fence.position.set(4.5, 0, z);
        fence.rotation.y = -Math.PI / 2;
        fence.scale.set(1.5, 1.5, 1.5);
        segmentGroup.add(fence);
      }
    }
  }

  // dekorasi
  for (let z = -segment_length / 2; z < segment_length / 2; z += 6) {
    if (assets.tree && Math.random() > 0.4) {
      const tree = assets.tree.clone();
      const isLeft = Math.random() > 0.5;
      const xPos = isLeft ? -8 : 8;
      tree.position.set(xPos, 0, z);
      tree.scale.set(3, 4 + Math.random(), 3);
      segmentGroup.add(tree);
    }

    if (assets.lantern && Math.random() < 0.4) {
      const lantern = assets.lantern.clone();
      const lx = Math.random() > 0.5 ? -4 : 4;
      lantern.position.set(lx, 0, z);
      lantern.scale.set(1.5, 1.5, 1.5);
      segmentGroup.add(lantern);

      const light = new THREE.PointLight(0xffcc66, 2.5, 10);
      light.position.set(lx, 1.5, z);
      light.castShadow = true;
      segmentGroup.add(light);
    }
  }

  // lingkungan luar
  const scatterCount = 30;
  for (let i = 0; i < scatterCount; i++) {
    const isLeft = Math.random() > 0.5;
    const xOut = isLeft ? -15 - Math.random() * 40 : 15 + Math.random() * 40;
    const zOut = (Math.random() - 0.5) * segment_length;
    const r = Math.random();
    let decor = null;

    if (r < 0.15 && assets.crypt) {
      decor = assets.crypt.clone();
      decor.scale.set(3, 3, 3);
      decor.rotation.y = Math.random() * Math.PI;
    } else if (r < 0.35 && assets.rock) {
      decor = assets.rock.clone();
      decor.scale.set(2 + Math.random(), 2 + Math.random(), 2);
      decor.rotation.y = Math.random() * Math.PI;
    } else if (r < 0.6 && assets.tree) {
      decor = assets.tree.clone();
      decor.scale.set(3, 3 + Math.random() * 3, 3);
    } else if (r < 0.75 && assets.trunk) {
      decor = assets.trunk.clone();
      decor.scale.set(2, 2, 2);
      decor.rotation.y = Math.random() * Math.PI;
    } else if (assets.grave) {
      decor = assets.grave.clone();
      decor.scale.set(1.5, 1.5, 1.5);
      decor.rotation.y = Math.random() - 0.5;
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

function createEnv() {
  for (let i = 0; i < segment_count; i++) {
    createsegment(-i * segment_length);
  }
  draw();
}

// --
let player;
let playerMixer;
const clock = new THREE.Clock();
function draw() {
  requestAnimationFrame(draw);
  const delta = clock.getDelta();

  if (playerMixer) {
    playerMixer.update(delta);
  }

  segments.forEach((segment) => {
    segment.position.z += game_speed * delta;

    if (segment.position.z > segment_length) {
      const farZ = Math.min(...segments.map((c) => c.position.z));
      segment.position.z = farZ - segment_length + 0.1;
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
loadPlayer();

