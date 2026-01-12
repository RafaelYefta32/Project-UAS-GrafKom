import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ZOMBIE_CONFIG, ASSET_COLORS } from "./Config.js";

export class AssetManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.assets = {};
        this.assetResources = {};
    }

    tintMaterial(material, color, rough = 0.7, metal = 0.05) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: rough,
            metalness: metal,
        });
    }

    async loadAssets() {
        const models = {
            road: "./model/env_road.glb",
            fence: "./model/env_fence.glb",
            fenceDamaged: "./model/env_fence_damaged.glb",
            tree: "./model/env_tree.glb",
            grave: "./model/env_gravestone.glb",
            pumpkin: "./model/prop_pumpkin.glb",
            lantern: "./model/prop_lantern.glb",
            crypt: "./model/env_crypt.glb",
            rock: "./model/env_rock.glb",
            trunk: "./model/env_trunk.glb",
            debris: "./model/env_debris.glb",
            shovel: "./model/prop_shovel.glb",
            shield: "./model/prop_shield.glb",
            zombie1: ZOMBIE_CONFIG.zombie1.path,
            zombie2: ZOMBIE_CONFIG.zombie2.path,
            zombie3: ZOMBIE_CONFIG.zombie3.path,
            zombie4: ZOMBIE_CONFIG.zombie4.path
        };

        const load = Object.keys(models).map(async (key) => {
            const gltf = await this.loader.loadAsync(models[key]);
            this.assetResources[key] = gltf;
            this.assets[key] = gltf.scene;

            this.assets[key].traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;

                    if (key === "shield") {
                        return;
                    }

                    if (c.material.map) {
                        c.material.map.anisotropy = 16;
                        c.material.color.set(0xffffff);
                    } else {
                        const color = ASSET_COLORS[key] ?? 0xffffff;

                        c.material = this.tintMaterial(
                            c.material,
                            color,
                            0.75,
                            key === "shovel" ? 0.3 : 0.05
                        );
                    }

                    if (key === "pumpkin") {
                        c.material.emissive = new THREE.Color(0xffa500);
                        c.material.emissiveIntensity = 0.5;
                    }
                }
            });
        });

        await Promise.all(load);
        return {
            assets: this.assets,
            resources: this.assetResources
        };
    }

    loadPlayer() {
        return new Promise((resolve, reject) => {
            this.loader.load(
                "./model/adventurer_female.glb",
                (gltf) => {
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    console.error("FAILED TO LOAD ADVENTURER", error);
                    reject(error);
                }
            );
        });
    }
}
