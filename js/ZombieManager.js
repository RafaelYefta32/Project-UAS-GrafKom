import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { ZOMBIE_CONFIG, GAME_CONSTANTS } from "./Config.js";

export class ZombieManager {
    constructor(scene, assetResources) {
        this.scene = scene;
        this.assetResources = assetResources;
        this.zombies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;
        this.maxActiveZombies = 50;
        this.maxZombieLimit = 150;

        this.laneX = GAME_CONSTANTS.laneX;
    }

    reset() {
        this.zombies.forEach(z => this.scene.remove(z));
        this.zombies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;
        this.maxActiveZombies = 12;
    }

    spawnOneZombie(modelKey, x, z) { // AI
        const resource = this.assetResources[modelKey];
        if (!resource) return;

        const zombie = SkeletonUtils.clone(resource.scene);

        if (modelKey === 'zombie4') {
            zombie.position.set(x, 1.7, z);
            zombie.rotation.y = -Math.PI / 2;
        } else {
            zombie.position.set(x, 0, z);
        }

        zombie.userData.type = modelKey;

        const config = ZOMBIE_CONFIG[modelKey];
        const s = config ? config.scale : 1.0;
        zombie.scale.set(s, s, s);

        if (resource.animations && resource.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(zombie);
            let clip = null;

            if (config && config.moveAnim) {
                clip = resource.animations.find(a => a.name.toLowerCase().includes(config.moveAnim.toLowerCase()));
            }

            if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("run"));
            if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("walk"));
            if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("fly"));
            if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes("idle"));

            if (!clip && resource.animations.length > 0) {
                clip = resource.animations[0];
            }

            if (clip) {
                // Filter position
                const filteredTracks = clip.tracks.filter(t => {
                    const name = t.name.toLowerCase();
                    return !name.includes('.position') ||
                        (!name.includes('root') && !name.includes('hip') && !name.includes('armature'));
                });

                const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
                let finalClip;

                if (filteredTracks.length > 0) {
                    finalClip = new THREE.AnimationClip(
                        clip.name + "_" + uniqueId,
                        clip.duration,
                        filteredTracks
                    );
                } else {
                    finalClip = clip.clone();
                    finalClip.name = clip.name + "_" + uniqueId;
                }

                const action = mixer.clipAction(finalClip);
                action.loop = THREE.LoopRepeat;
                action.clampWhenFinished = false;
                action.timeScale = 1;
                action.weight = 1;
                action.enabled = true;
                action.reset();
                action.play();

                zombie.userData.mixer = mixer;
                zombie.userData.currentAction = action;
            }
        }

        zombie.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        this.scene.add(zombie);
        this.zombies.push(zombie);
    }

    spawnInitialZombies() { // AI
        const zombieTypes = ["zombie1", "zombie2", "zombie3", "zombie4"];
        let zPos = -80;

        for (let i = 0; i < 12; i++) {
            const isDouble = Math.random() < 0.3;

            if (isDouble) {
                const lanes = [0, 1, 2].sort(() => 0.5 - Math.random()).slice(0, 2);
                lanes.forEach(lane => {
                    const type = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
                    this.spawnOneZombie(type, this.laneX[lane], zPos);
                });
            } else {
                const lane = Math.floor(Math.random() * 3);
                const type = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
                this.spawnOneZombie(type, this.laneX[lane], zPos);
            }

            zPos -= (35 + Math.random() * 20);
        }
    }

    update(delta, gameSpeed, gameStarted, distance = 0) { // AI
        if (!gameStarted && this.zombies.length === 0) return;

        // Update mixers and movement
        this.zombies.forEach((zombie) => {
            // Update Animation
            if (zombie.userData.mixer) {
                zombie.userData.mixer.update(delta);
            }

            if (gameStarted) {
                const config = ZOMBIE_CONFIG[zombie.userData.type];
                const runSpeed = (config && config.speed) ? config.speed : 2;

                // If dead, move with ground (gameSpeed). If alive, move slightly faster (attacking).
                const speed = zombie.userData.isDead ? gameSpeed : (gameSpeed + runSpeed);
                zombie.position.z += speed * delta;

                // Despawn
                if (zombie.position.z > 35) {
                    this.scene.remove(zombie);
                    zombie.userData.markForRemoval = true;
                }
            }
        });

        // Cleanup despawned zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            if (this.zombies[i].userData.markForRemoval) {
                this.zombies.splice(i, 1);
            }
        }

        // Spawning Logic
        if (!gameStarted) return;

        // Difficulty Scaling based on Distance
        // Increase max zombies by 1 every 100 meters
        this.maxActiveZombies = 12 + Math.floor(distance / 100);
        this.maxActiveZombies = Math.min(this.maxActiveZombies, this.maxZombieLimit);

        // Decrease spawn interval based on distance
        // Minimum 0.3s interval.
        this.spawnInterval = Math.max(0.3, 1.0 - (distance / 2500));

        this.spawnTimer += delta;

        if (this.spawnTimer > this.spawnInterval && this.zombies.length < Math.floor(this.maxActiveZombies)) {
            this.spawnTimer = 0;

            let minZ = -60;
            if (this.zombies.length > 0) {
                minZ = Math.min(...this.zombies.map(z => z.position.z));
            }

            const burstChance = Math.random();
            let spawnCount = 1;

            if (gameSpeed > 12 && burstChance < 0.30) spawnCount = 3;
            else if (gameSpeed > 8 && burstChance < 0.50) spawnCount = 2;

            const availableLanes = [0, 1, 2].sort(() => 0.5 - Math.random());
            let selectedTypes = [];

            if (spawnCount === 3) {
                const passableTypes = ["zombie2", "zombie4"];
                const allTypes = ["zombie1", "zombie2", "zombie3", "zombie4"];
                selectedTypes.push(passableTypes[Math.floor(Math.random() * passableTypes.length)]);
                for (let k = 1; k < spawnCount; k++) {
                    selectedTypes.push(allTypes[Math.floor(Math.random() * allTypes.length)]);
                }
            } else {
                const allTypes = ["zombie1", "zombie2", "zombie3", "zombie4"];
                for (let k = 0; k < spawnCount; k++) {
                    selectedTypes.push(allTypes[Math.floor(Math.random() * allTypes.length)]);
                }
            }

            for (let i = 0; i < spawnCount; i++) {
                const laneIndex = availableLanes[i];
                const type = selectedTypes[i];
                const offsetZ = Math.random() * 10;
                this.spawnOneZombie(type, this.laneX[laneIndex], minZ - 30 - offsetZ);
            }
        }
    }

    playAnimation(zombie, animName, loopType = THREE.LoopRepeat) { // AI
        if (!zombie || !zombie.userData.mixer) return;
        const resource = this.assetResources[zombie.userData.type];
        if (!resource || !resource.animations) return;

        let clip = resource.animations.find(a => a.name.toLowerCase().includes(animName.toLowerCase()));

        // Fallback for Death
        if (!clip && animName === 'Death') {
            clip = resource.animations.find(a => a.name.toLowerCase().includes('die'));
            if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes('fall'));
            if (!clip) clip = resource.animations.find(a => a.name.toLowerCase().includes('down'));
        }

        if (clip) {
            zombie.userData.mixer.stopAllAction();
            const action = zombie.userData.mixer.clipAction(clip);
            action.loop = loopType;
            action.clampWhenFinished = (loopType === THREE.LoopOnce);
            action.reset();
            action.play();
        } else if (animName === 'Death') {
            zombie.userData.mixer.stopAllAction();
        }
    }
}
