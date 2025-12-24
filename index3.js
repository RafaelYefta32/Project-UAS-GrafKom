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
const vertice = new Float32Array( [
    // 1,-1,1,
    // 1,1,1,
    // -1,-1,1,

    // 1,1,1,
    // -1,1,1,
    // -1,-1,1,

    // 1,-1,-1,
    // 1,1,-1,
    // -1,-1,-1,

    // 1,1,-1,
    // -1,1,-1,
    // -1,-1,-1

    // 1,1,1,  // titik 0
    // -1,-1,1, // titik 1
    // 1,-1,1, // titik 2
    // -1,1,1, // titik 3

    // 1,1,-1, // titik 4
    // -1,-1,-1, // titik 5
    // 1,-1,-1, // titik 6
    // -1,1,-1 // titik 7
    -1,-1,0,
    -1,1,0,
    1,-1,0,
    1,1,0,

] );
const indices = [
    0,2,1,
    2,3,1,
];
const colors = new Float32Array([
    1,0,0,
    1,0,0,
    1,0,0,
    1,0,0,
]);
const uvs = new Float32Array([
    0,0,    
    0,1,
    1,0,
    1,1,
]);

const geometry2 = new THREE.BufferGeometry();
geometry2.setAttribute("position", new THREE.BufferAttribute(vertice, 3));
geometry2.setAttribute("color", new THREE.BufferAttribute(colors, 3));
geometry2.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
geometry2.setIndex(indices);
const material2 = new THREE.MeshBasicMaterial({ map: a_texture });
const mesh2 = new THREE.Mesh(geometry2, material2);
scene.add(mesh2);

function draw(){
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;

    // mesh2.rotation.x += 0.01;
    // mesh2.rotation.y += 0.01;

    requestAnimationFrame(draw);
    renderer.render(scene, cam);
}

draw()