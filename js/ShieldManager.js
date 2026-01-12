import * as THREE from "three";
import { GAME_CONSTANTS } from "./Config.js";

export class ShieldManager {
    constructor(scene, assets, uiManager) {
        this.scene = scene;
        this.assets = assets;
        this.uiManager = uiManager;

        this.shieldPickups = [];
        this.hasShield = false;
        this.shieldDuration = 0;
        this.shieldMaxDuration = GAME_CONSTANTS.shieldMaxDuration;
        this.playerShieldMesh = null;

        this.spawnTimer = 0;
        this.spawnInterval = 5;

        this.laneX = GAME_CONSTANTS.laneX;
    }

    reset() {
        this.hasShield = false;
        this.shieldDuration = 0;
        this.spawnTimer = 0;

        this.uiManager.showShieldBar(false);

        if (this.playerShieldMesh) {
            this.scene.remove(this.playerShieldMesh);
            this.playerShieldMesh = null;
        }

        this.shieldPickups.forEach(s => this.scene.remove(s));
        this.shieldPickups = [];
    }

    spawnShieldPickup(z) {
        if (!this.assets.shield) return;

        const shield = this.assets.shield.clone();
        const lane = Math.floor(Math.random() * 3);
        shield.position.set(this.laneX[lane], 1.0, z);
        shield.scale.set(0.5, 0.5, 0.5);

        shield.traverse((c) => {
            if (c.isMesh) {
                c.material = c.material.clone();
                c.material.emissive = new THREE.Color(0x00bcd4);
                c.material.emissiveIntensity = 0.5;
            }
        });

        shield.userData.rotationSpeed = 2;
        shield.userData.floatOffset = Math.random() * Math.PI * 2;

        this.scene.add(shield);
        this.shieldPickups.push(shield);
    }

    activateShield() {
        this.hasShield = true;
        this.shieldDuration = this.shieldMaxDuration;

        this.uiManager.showShieldBar(true);
        this.uiManager.updateShieldBar(100);

        if (this.assets.shield) {
            this.playerShieldMesh = this.assets.shield.clone();
            this.playerShieldMesh.scale.set(1.0, 1.0, 1.0);
            this.playerShieldMesh.position.set(0, 1.5, -1);
            this.playerShieldMesh.rotation.set(0, Math.PI, 0);

            this.scene.add(this.playerShieldMesh);
        }
    }

    deactivateShield() {
        this.hasShield = false;
        this.shieldDuration = 0;
        this.uiManager.showShieldBar(false);

        if (this.playerShieldMesh) {
            this.scene.remove(this.playerShieldMesh);
            this.playerShieldMesh = null;
        }
    }

    update(delta, gameStarted, gameSpeed, player, zombieManager) {
        // Update pickups
        const time = Date.now() * 0.001;
        for (let i = this.shieldPickups.length - 1; i >= 0; i--) {
            const shield = this.shieldPickups[i];

            if (gameStarted) {
                shield.rotation.y += shield.userData.rotationSpeed * delta;
                shield.position.y = 1.0 + Math.sin(time * 3 + shield.userData.floatOffset) * 0.3;
                shield.position.z += (gameSpeed + 2) * delta;
            }

            if (shield.position.z > 35) {
                this.scene.remove(shield);
                this.shieldPickups.splice(i, 1);
            }
        }

        // Spawn new shields
        if (gameStarted) {
            this.spawnTimer += delta;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;

                // Request: chance 75%
                if (!this.hasShield && Math.random() < 0.75) {
                    let minZ = -60;
                    if (zombieManager && zombieManager.zombies.length > 0) {
                        minZ = Math.min(...zombieManager.zombies.map(z => z.position.z));
                    }
                    this.spawnShieldPickup(minZ - 20);
                }
            }
        }

        // Update active shield
        if (this.hasShield) {
            this.shieldDuration -= delta;

            const percent = (this.shieldDuration / this.shieldMaxDuration) * 100;
            this.uiManager.updateShieldBar(percent);

            if (this.playerShieldMesh && player && player.mesh) {
                this.playerShieldMesh.position.x = player.mesh.position.x;
                this.playerShieldMesh.position.z = player.mesh.position.z - 1;
                this.playerShieldMesh.position.y = player.mesh.position.y + 1.5;
            }

            if (this.shieldDuration <= 0) {
                this.deactivateShield();
            }
        }

        // Collision with Player (Pickup)
        if (player && gameStarted) {
            const playerBox = player.getBoundingBox();
            playerBox.expandByScalar(0.2);

            for (let i = this.shieldPickups.length - 1; i >= 0; i--) {
                const shield = this.shieldPickups[i];
                const shieldBox = new THREE.Box3().setFromObject(shield);

                if (playerBox.intersectsBox(shieldBox)) {
                    if (this.hasShield) {
                        this.shieldDuration = this.shieldMaxDuration;
                        this.uiManager.updateShieldBar(100);
                    } else {
                        this.activateShield();
                    }
                    this.scene.remove(shield);
                    this.shieldPickups.splice(i, 1);
                    break;
                }
            }
        }
    }
}
