import * as THREE from "three";
import { GAME_CONSTANTS } from "./Config.js";

export class MapManager {
    constructor(scene, assets) {
        this.scene = scene;
        this.assets = assets;
        this.segments = [];

        this.groundMaterial = this.createGroundMaterial();
    }

    createGroundMaterial() {
        const textureLoader = new THREE.TextureLoader();
        const groundTexture = textureLoader.load("./image/ground.jpg");
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(400, 4);
        groundTexture.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshStandardMaterial({
            map: groundTexture,
            roughness: 0.9,
            metalness: 0.1,
            color: 0x666666,
        });
    }

    createSegment(z_offset) {
        const segmentGroup = new THREE.Group();
        const segment_length = GAME_CONSTANTS.segmentLength;

        // Ground
        const geo = new THREE.PlaneGeometry(2000, segment_length);
        const mesh = new THREE.Mesh(geo, this.groundMaterial);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, -0.15, 0);
        mesh.receiveShadow = true;
        segmentGroup.add(mesh);

        // Road (random gaps)
        if (this.assets.road) { // AI
            for (let z = 0; z < segment_length; z += 2) {
                const lanes = [-2.5, 0, 2.5];
                lanes.forEach((x) => {
                    if (Math.random() < 0.6) {
                        const road = this.assets.road.clone();
                        road.position.set(x, 0, z - segment_length / 2);
                        road.scale.set(2, 2, 2.1);
                        road.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
                        segmentGroup.add(road);
                    }
                });
            }
        }

        // Fences
        for (let z = -segment_length / 2; z < segment_length / 2; z += 4) { // AI
            if (Math.random() < 0.8) {
                const model = Math.random() > 0.5 ? this.assets.fence : this.assets.fenceDamaged;
                if (model) {
                    const fence = model.clone();
                    fence.position.set(-4.5, 0, z);
                    fence.rotation.y = Math.PI / 2;
                    fence.scale.set(1.5, 1.5, 1.5);
                    segmentGroup.add(fence);
                }
            }
            if (Math.random() < 0.8) {
                const model = Math.random() > 0.5 ? this.assets.fence : this.assets.fenceDamaged;
                if (model) {
                    const fence = model.clone();
                    fence.position.set(4.5, 0, z);
                    fence.rotation.y = -Math.PI / 2;
                    fence.scale.set(1.5, 1.5, 1.5);
                    segmentGroup.add(fence);
                }
            }
        }

        // Roadside Decorations (Trees, Lanterns)
        for (let z = -segment_length / 2; z < segment_length / 2; z += 5) { // AI
            if (this.assets.tree && Math.random() > 0.3) {
                const tree = this.assets.tree.clone();
                const isLeft = Math.random() > 0.5;
                const xPos = isLeft ? -8 : 8;
                tree.position.set(xPos, 0, z);
                tree.scale.set(3, 4 + Math.random(), 3);
                segmentGroup.add(tree);
            }

            // Lantern
            if (this.assets.lantern && Math.random() < 0.3) {
                const lantern = this.assets.lantern.clone();
                const lx = Math.random() > 0.5 ? -4 : 4;
                lantern.position.set(lx, 0, z);
                lantern.scale.set(1.5, 1.5, 1.5);
                segmentGroup.add(lantern);
            }
        }

        // Outer Objects
        const scatterCount = 20;
        for (let i = 0; i < scatterCount; i++) { // AI
            const isLeft = Math.random() > 0.5;
            const xOut = isLeft ? -15 - Math.random() * 30 : 15 + Math.random() * 30;
            const zOut = (Math.random() - 0.5) * segment_length;
            const r = Math.random();
            let decor = null;

            if (r < 0.3 && this.assets.tree) {
                decor = this.assets.tree.clone();
                decor.scale.set(3, 3 + Math.random() * 2, 3);
            } else if (r < 0.5 && this.assets.rock) {
                decor = this.assets.rock.clone();
                decor.scale.set(2, 2, 2);
                decor.rotation.y = Math.random() * Math.PI;
            } else if (r < 0.7 && this.assets.grave) {
                decor = this.assets.grave.clone();
                decor.scale.set(1.5, 1.5, 1.5);
                decor.rotation.y = Math.random() - 0.5;
            } else if (r < 0.85 && this.assets.trunk) {
                decor = this.assets.trunk.clone();
                decor.scale.set(2, 2, 2);
            } else if (this.assets.crypt && Math.random() < 0.1) {
                decor = this.assets.crypt.clone();
                decor.scale.set(3, 3, 3);
                decor.rotation.y = Math.random() * Math.PI;
            }

            if (decor) {
                decor.position.set(xOut, 0, zOut);
                segmentGroup.add(decor);
            }
        }

        segmentGroup.position.z = z_offset;
        this.scene.add(segmentGroup);
        this.segments.push(segmentGroup);
    }

    init() {
        // Create initial segments
        for (let i = 0; i < GAME_CONSTANTS.segmentCount; i++) {
            this.createSegment(-i * GAME_CONSTANTS.segmentLength);
        }
    }

    update(delta, speed) { // AI
        if (speed <= 0) return;

        this.segments.forEach((segment) => {
            segment.position.z += speed * delta;
        });

        // Recycle segments
        this.segments.forEach((segment) => {
            if (segment.position.z > 35) {
                const minZ = Math.min(...this.segments.map(s => s.position.z));
                segment.position.z = minZ - GAME_CONSTANTS.segmentLength;
            }
        });
    }
}
