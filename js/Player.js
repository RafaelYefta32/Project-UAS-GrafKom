import * as THREE from "three";
import { ZOMBIE_CONFIG, GAME_CONSTANTS } from "./Config.js";

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.mixer = null;

        // Actions
        this.runAction = null;
        this.jumpAction = null;
        this.rollAction = null;
        this.deathAction = null;
        this.hitAction = null;

        // State
        this.isJumping = false;
        this.isRolling = false;
        this.isDying = false;
        this.jumpVelocity = 0;
        this.currentLane = 1; // 0: Left, 1: Center, 2: Right
        this.killerType = null;

        // Constants from config
        this.jumpForce = GAME_CONSTANTS.jumpForce;
        this.gravity = GAME_CONSTANTS.gravity;
        this.laneX = GAME_CONSTANTS.laneX;
    }

    setup(gltf, onLoaded) {
        this.mesh = gltf.scene;
        this.mesh.scale.set(1.5, 1.5, 1.5);
        this.mesh.position.set(0, 0, 6);
        this.mesh.rotation.y = Math.PI;
        this.mesh.visible = false;

        this.mesh.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        this.scene.add(this.mesh);

        // Setup Animation
        if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.mesh);
            const animations = gltf.animations;

            const clipRun = animations.find(a => a.name.toLowerCase().includes('run'));
            const clipJump = animations.find(a => a.name.toLowerCase().includes('jump')) || animations.find(a => a.name.toLowerCase().includes('attack'));
            const clipRoll = animations.find(a => a.name.toLowerCase().includes('roll'));
            const clipDeath = animations.find(a => a.name.toLowerCase().includes('death'));
            const clipHit = animations.find(a => a.name.includes('Sword_Slash')) || animations.find(a => a.name.toLowerCase().includes('hit'));

            if (clipRun) {
                this.runAction = this.mixer.clipAction(clipRun);
                this.runAction.play();
            }

            if (clipJump) {
                this.jumpAction = this.mixer.clipAction(clipJump);
                this.jumpAction.loop = THREE.LoopOnce;
                this.jumpAction.clampWhenFinished = true;
            }

            if (clipRoll) {
                this.rollAction = this.mixer.clipAction(clipRoll);
                this.rollAction.loop = THREE.LoopOnce;
                this.rollAction.clampWhenFinished = true;
                this.rollAction.timeScale = 2.0;
            }

            if (clipDeath) {
                this.deathAction = this.mixer.clipAction(clipDeath);
                this.deathAction.loop = THREE.LoopOnce;
                this.deathAction.clampWhenFinished = true;
            }

            if (clipHit) {
                this.hitAction = this.mixer.clipAction(clipHit);
                this.hitAction.loop = THREE.LoopOnce;
                this.hitAction.clampWhenFinished = true;
            }

            // Animation Listener
            this.mixer.addEventListener('finished', (e) => this.onAnimationFinished(e));
        }

        if (onLoaded) onLoaded();
    }

    onAnimationFinished(e) {
        // Roll finished
        if (e.action === this.rollAction) {
            this.isRolling = false;
            if (this.runAction) {
                this.rollAction.crossFadeTo(this.runAction, 0.1, true);
                this.runAction.reset();
                this.runAction.play();
            }
        }

        // Hit finished -> Death or GameOver
        if (e.action === this.hitAction) {
            const config = this.killerType ? ZOMBIE_CONFIG[this.killerType] : null;
            const skipDeath = config ? config.skipDeathAnim : false;

            if (!skipDeath && this.deathAction) {
                this.hitAction.crossFadeTo(this.deathAction, 0.1, false);
                this.deathAction.reset();
                this.deathAction.play();
            } else {
                const evt = new Event('playerDeathFinished');
                window.dispatchEvent(evt);
            }
        }

        if (e.action === this.deathAction) {
            const evt = new Event('playerDeathFinished');
            window.dispatchEvent(evt);
        }
    }

    reset() {
        this.killerType = null;
        this.currentLane = 1;
        this.mesh.position.set(0, 0, 6);
        this.isJumping = false;
        this.isRolling = false;
        this.isDying = false;
        this.jumpVelocity = 0;

        if (this.runAction) {
            if (this.jumpAction) this.jumpAction.stop();
            if (this.rollAction) this.rollAction.stop();
            if (this.deathAction) this.deathAction.stop();
            if (this.hitAction) this.hitAction.stop();

            this.runAction.enabled = true;
            this.runAction.reset();
            this.runAction.play();
        }
    }

    handleInput(key) {
        if (this.isDying) return;

        if (key === "a" || key === "ArrowLeft") {
            if (this.currentLane > 0) this.currentLane--;
        } else if (key === "d" || key === "ArrowRight") {
            if (this.currentLane < 2) this.currentLane++;
        } else if ((key === "w" || key === "ArrowUp") && !this.isJumping && !this.isRolling) {
            this.isJumping = true;
            this.jumpVelocity = this.jumpForce;

            if (this.jumpAction && this.runAction) {
                this.runAction.crossFadeTo(this.jumpAction, 0.1, true);
                this.jumpAction.reset();
                this.jumpAction.play();
            }
        } else if ((key === "s" || key === "ArrowDown") && !this.isRolling && !this.isJumping) {
            this.isRolling = true;
            if (this.rollAction && this.runAction) {
                this.runAction.crossFadeTo(this.rollAction, 0.1, true);
                this.rollAction.reset();
                this.rollAction.play();
            }
        }
    }

    update(delta, gameSpeed, startSpeed) {
        if (this.mixer) {
            const speedRatio = Math.min(gameSpeed / startSpeed, 1.5);
            if (this.runAction) this.runAction.timeScale = speedRatio;
            this.mixer.update(delta);
        }

        // Lane movement
        const targetX = this.laneX[this.currentLane];
        this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, 10 * delta);

        // Jump physics
        if (this.isJumping) {
            this.mesh.position.y += this.jumpVelocity * delta;
            this.jumpVelocity -= this.gravity * delta;

            if (this.mesh.position.y <= 0) {
                this.mesh.position.y = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;

                if (this.jumpAction && this.runAction) {
                    this.jumpAction.crossFadeTo(this.runAction, 0.2, true);
                    this.runAction.reset();
                    this.runAction.play();
                }
            }
        }
    }

    triggerDeath(killerType) {
        this.isDying = true;
        this.killerType = killerType;

        let animToPlay = this.deathAction;
        let forceGround = true;

        if (killerType) {
            const config = ZOMBIE_CONFIG[killerType];
            if (config) {
                if (config.playerAnim === "Hit" && this.hitAction) {
                    animToPlay = this.hitAction;
                }
                if (config.playerPos === "air") {
                    forceGround = false;
                }
            }
        }

        if (forceGround) this.mesh.position.y = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;

        if (this.runAction) this.runAction.stop();
        if (this.jumpAction) this.jumpAction.stop();
        if (this.rollAction) this.rollAction.stop();
        if (this.deathAction) this.deathAction.stop();
        if (this.hitAction) this.hitAction.stop();

        if (animToPlay) {
            animToPlay.reset();
            animToPlay.play();
        } else if (this.deathAction) {
            this.deathAction.reset();
            this.deathAction.play();
        } else {
            // Instant death event
            const evt = new Event('playerDeathFinished');
            window.dispatchEvent(evt);
        }
    }

    getBoundingBox() {
        this.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.mesh);
        box.expandByScalar(-0.5);
        if (this.isRolling) {
            box.max.y -= 1.0;
        }
        return box;
    }
}
