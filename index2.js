import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import ui_overlay from './ui_overlay';

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight,1,1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

cam.position.z = 10;

let light = new THREE.PointLight(0xffffff,100);
light.position.set(-1,3,10);
scene.add(light);

const texture = new THREE.TextureLoader();
const batu_texture = await texture.load('./img/badlands-boulders_albedo.png')
const normal_texture = await texture.load('./img/badlands-boulders_normal-dx.png')
const roughness_texture = await texture.load('./img/badlands-boulders_roughness.png')

// const geo = new THREE.BoxGeometry(1,1,1);
// const geo = new THREE.SphereGeometry(1,50,50);
// const material = new THREE.MeshStandardMaterial({
//     map: batu_texture,
//     normalMap: normal_texture,
//     roughnessMap:  roughness_texture,
// });
// const mesh = new THREE.Mesh(geo, material);
// scene.add(mesh)

// const geo2 = new THREE.PlaneGeometry(8,8,10,10);
// const mat_geo2 = new THREE.MeshBasicMaterial({color:0xffffff});
// const mesh_lantai = new THREE.Mesh(geo2, mat_geo2);
// mesh_lantai.position.set(0,0,-1);
// scene.add(mesh_lantai);

const clock = new THREE.Clock();

let modelLoader = new GLTFLoader();
let modelScene = await modelLoader.loadAsync("./model/Animated Zombie.glb");

let model = modelScene.scene;
model.traverse((obj) => {
    if (obj.isMesh){
        obj.castShadow = true;
    }
})

let model_animation = modelScene.animations;
let mixer = new THREE.AnimationMixer(model);

let anim1 = mixer.clipAction(model_animation[0])
let anim2 = mixer.clipAction(model_animation[1])
let anim3 = mixer.clipAction(model_animation[2])
let anim4 = mixer.clipAction(model_animation[3])
let anim5 = mixer.clipAction(model_animation[4])

anim5.play();

scene.add(model);
model.position.set(0,-3,0)

const control = new OrbitControls(cam, renderer.domElement);

const gui = new ui_overlay();
// mesh.matrixAutoUpdate = false;
function draw(){
    control.update();
    // let rMatrix = new THREE.Matrix4().makeRotationY(gui.param.y);
    // let tMatrix = new THREE.Matrix4().makeTranslation(gui.param.x, 0, gui.param.z);
    // let result = new THREE.Matrix4().multiplyMatrices(tMatrix,rMatrix);

    const delta = clock.getDelta(); 
    if (mixer) {
        mixer.update(delta);
    }

    // mesh.matrix.fromArray(result.toArray());
    // mesh.rotation.x += 0.01;
    // mesh.rotation.y += 0.01;

    // mesh2.rotation.x += 0.01;
    // mesh2.rotation.y += 0.01;

    requestAnimationFrame(draw);
    renderer.render(scene, cam);
}

draw()