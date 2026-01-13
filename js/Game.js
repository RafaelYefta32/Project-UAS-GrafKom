import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AssetManager } from "./AssetManager.js";
import { AudioManager } from "./AudioManager.js";
import { UIManager } from "./UIManager.js";
import { Player } from "./Player.js";
import { MapManager } from "./MapManager.js";
import { ZombieManager } from "./ZombieManager.js";
import { ShieldManager } from "./ShieldManager.js";
import { GAME_CONSTANTS, ZOMBIE_CONFIG } from "./Config.js";

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();

        // Managers
        this.assetManager = new AssetManager();
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager(this.audioManager);
        this.mapManager = null;
        this.player = null;
        this.zombieManager = null;
        this.shieldManager = null;

        // Game State
        this.gameStarted = false;
        this.gameSpeed = GAME_CONSTANTS.startSpeed;
        this.distance = 0;
        this.killerZombie = null;

        this.initThree();
        this.initListeners();
    }

    initThree() {
        this.scene = new THREE.Scene();
        const fogColor = 0x4b3b6b;
        this.scene.background = new THREE.Color(fogColor);
        this.scene.fog = new THREE.FogExp2(fogColor, 0.015);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, -10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 2, -5);
        this.controls.update();

        // Lights
        const moonLight = new THREE.DirectionalLight(0xffffff, 2.5);
        const playerLight = new THREE.DirectionalLight(0xffffff, 1);
        playerLight.position.set(0, 10, 0);
        this.scene.add(playerLight);

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
        this.scene.add(moonLight);

        const hemiLight = new THREE.HemisphereLight(0xffe6b3, 0x3a2f4f, 1.8);
        this.scene.add(hemiLight);

        // Window Resize
        window.addEventListener("resize", () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async start() {
        const { assets, resources } = await this.assetManager.loadAssets();

        this.mapManager = new MapManager(this.scene, assets);
        this.mapManager.init();

        this.player = new Player(this.scene);
        // Load player
        const playerGltf = await this.assetManager.loadPlayer();
        this.player.setup(playerGltf, () => {
            console.log("Player Loaded");
        });

        this.zombieManager = new ZombieManager(this.scene, resources);
        this.shieldManager = new ShieldManager(this.scene, assets, this.uiManager);

        this.uiManager.onPlay(() => this.startGame());
        this.uiManager.onRetry(() => this.retryGame());
        this.uiManager.onHome(() => this.goHome());

        // Game Loop
        this.draw();
    }

    initListeners() {
        window.addEventListener("keydown", (e) => {
            if (this.gameStarted && this.player) {
                this.player.handleInput(e.key);
            }
        });

        window.addEventListener('playerDeathFinished', () => {
            this.showGameOverScreen();
        });
    }

    startGame() {
        this.uiManager.showGameHUD();
        this.gameStarted = true;
        this.distance = 0;
        this.uiManager.updateDistance(0);

        if (this.player) this.player.mesh.visible = true;

        this.zombieManager.spawnInitialZombies();
        this.audioManager.playMusic();
    }

    retryGame() {
        this.resetGame();
        this.startGame();
    }

    goHome() {
        this.resetGame();
        this.gameStarted = false;
        if (this.player) this.player.mesh.visible = false;
        this.audioManager.stopMusic();

        const highScore = parseInt(sessionStorage.getItem("zombrush_high_score")) || 0;
        this.uiManager.showHome(highScore);
    }

    resetGame() {
        this.zombieManager.reset();
        this.shieldManager.reset();
        this.gameSpeed = GAME_CONSTANTS.startSpeed;
        if (this.player) this.player.reset();
        this.killerZombie = null;
        this.distance = 0;
    }

    triggerGameOver(zombie) {
        if (this.player.isDying) return;
        this.gameStarted = false;
        this.killerZombie = zombie;

        this.audioManager.stopMusic();
        this.audioManager.playScream();

        // Zombie Attack Animation
        if (zombie) { // AI
            const config = ZOMBIE_CONFIG[zombie.userData.type];
            const loopType = (config && config.attackLoop === "repeat") ? THREE.LoopRepeat : THREE.LoopOnce;

            this.zombieManager.playAnimation(zombie, "Attack", loopType);
        }

        // Trigger Player Death
        const killerType = zombie ? zombie.userData.type : null;
        this.player.triggerDeath(killerType);
    }

    showGameOverScreen() {
        const finalDist = Math.floor(this.distance);
        let highScore = parseInt(sessionStorage.getItem("zombrush_high_score")) || 0;
        if (finalDist > highScore) {
            highScore = finalDist;
            sessionStorage.setItem("zombrush_high_score", highScore);
        }

        this.uiManager.showGameOver(finalDist, highScore);
        if (this.player) this.player.mesh.visible = false;
    }

    checkCollisions() { // AI
        if (!this.player || !this.gameStarted || this.player.isDying) return;

        const playerBox = this.player.getBoundingBox();

        for (let zombie of this.zombieManager.zombies) {
            if (zombie.userData.isDead) continue;
            if (this.player.isRolling && zombie.userData.type === 'zombie4') continue;

            zombie.updateMatrixWorld(true);
            const zombieBox = new THREE.Box3().setFromObject(zombie);

            if (zombie.userData.type === 'zombie4') {
                zombieBox.expandByScalar(0.3);
            } else if (zombie.userData.type === 'zombie1') {
                zombieBox.expandByScalar(0.8);
            } else {
                zombieBox.expandByScalar(0.2);
            }

            if (playerBox.intersectsBox(zombieBox)) {
                if (this.shieldManager.hasShield) {
                    this.zombieManager.playAnimation(zombie, "Death", THREE.LoopOnce);
                    zombie.userData.isDead = true;

                    // Delayed removal
                    setTimeout(() => {
                        zombie.userData.markForRemoval = true;
                    }, 3000);
                } else {
                    this.triggerGameOver(zombie);
                    break;
                }
            }
        }
    }

    draw() {
        requestAnimationFrame(() => this.draw());
        const delta = this.clock.getDelta();

        if (this.gameStarted) {
            this.distance += this.gameSpeed * delta;
            this.uiManager.updateDistance(this.distance);

            this.gameSpeed += delta * 0.3; // Acceleration
        }

        this.controls.update();

        // Updates
        if (this.player) this.player.update(delta, this.gameSpeed, GAME_CONSTANTS.startSpeed);
        if (this.mapManager) this.mapManager.update(delta, this.gameStarted ? this.gameSpeed : 0);
        if (this.zombieManager) this.zombieManager.update(delta, this.gameSpeed, this.gameStarted, this.distance);
        if (this.shieldManager) this.shieldManager.update(delta, this.gameStarted, this.gameSpeed, this.player, this.zombieManager);

        if (this.gameStarted) {
            this.checkCollisions();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
