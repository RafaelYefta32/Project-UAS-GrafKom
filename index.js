import * as THREE from 'three';

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight,1,1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

cam.position.z = 5;
const kayu_texture = new THREE.TextureLoader().load('./img/kayu.png');
const a_texture = new THREE.TextureLoader().load('./img/a.png');
const b_texture = new THREE.TextureLoader().load('./img/b.png');
const c_texture = new THREE.TextureLoader().load('./img/c.png');
const d_texture = new THREE.TextureLoader().load('./img/d.png');

const materialArr = [
    new THREE.MeshBasicMaterial({map: a_texture}),
    new THREE.MeshBasicMaterial({map: b_texture}),
    new THREE.MeshBasicMaterial({map: c_texture}),
    new THREE.MeshBasicMaterial({map: d_texture}),

];

const geo = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshBasicMaterial({
    map: kayu_texture,
    color: 0x946038
});
const mesh = new THREE.Mesh(geo, materialArr);
mesh.position.set(-2,0,0);
scene.add(mesh)

// geo 2

let light = new THREE.PointLight(0xffffff,100);
light.position.set(0,3,2);
scene.add(light);

// let light2 = new THREE.PointLight(0xffffff,100);
// light2.position.set(0,-3,2);
// scene.add(light2);

const geo2 = new THREE.BoxGeometry(1,1,1);
const material2 = new THREE.MeshLambertMaterial({
    map: kayu_texture,
    color: 0x946038
});
const mesh2 = new THREE.Mesh(geo2, material2);
mesh2.position.set(2,0,0);
scene.add(mesh2)

function draw(){
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;

    mesh2.rotation.x += 0.01;
    mesh2.rotation.y += 0.01;

    requestAnimationFrame(draw);
    renderer.render(scene, cam);
}

draw()