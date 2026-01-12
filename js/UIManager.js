export class UIManager {
    constructor(audioManager) {
        this.audioManager = audioManager;

        // Pages
        this.landingPage = document.getElementById("landing-page");
        this.gameOverPage = document.getElementById("game-over-page");
        this.gameHud = document.getElementById("game-hud");
        this.settingsModal = document.getElementById("settings-modal");

        // Buttons
        this.playBtn = document.getElementById("play-btn");
        this.retryBtn = document.getElementById("retry-btn");
        this.homeBtn = document.getElementById("home-btn");
        this.settingsBtn = document.getElementById("settings-btn");
        this.closeSettingsBtn = document.getElementById("close-settings-btn");

        // Labels
        this.distanceValueEl = document.getElementById("distance-value");
        this.highScoreValueEl = document.getElementById("high-score-value");
        this.finalDistanceEl = document.getElementById("final-distance");
        this.bestScoreEl = document.getElementById("best-score");

        // Settings
        this.musicVolumeSlider = document.getElementById("music-volume");
        this.sfxVolumeSlider = document.getElementById("sfx-volume");
        this.musicValueDisplay = document.getElementById("music-value");
        this.sfxValueDisplay = document.getElementById("sfx-value");

        // Shield UI
        this.shieldBarContainer = document.getElementById("shield-bar-container");
        this.shieldBarFill = document.getElementById("shield-bar-fill");

        this.initSettings();
        this.initListeners();
    }

    initSettings() {
        this.updateVolumeDisplay(this.audioManager.musicVolume, this.audioManager.sfxVolume);

        // Update high score display on load
        const highScore = parseInt(sessionStorage.getItem("zombrush_high_score")) || 0;
        this.highScoreValueEl.textContent = highScore + " m";
    }

    updateVolumeDisplay(musicVol, sfxVol) {
        this.musicVolumeSlider.value = musicVol;
        this.sfxVolumeSlider.value = sfxVol;
        this.musicValueDisplay.textContent = musicVol + "%";
        this.sfxValueDisplay.textContent = sfxVol + "%";
    }

    initListeners() {
        this.settingsBtn.addEventListener("click", () => {
            this.settingsModal.classList.remove("hidden");
        });

        this.closeSettingsBtn.addEventListener("click", () => {
            this.settingsModal.classList.add("hidden");
        });

        this.musicVolumeSlider.addEventListener("input", (e) => {
            const value = e.target.value;
            this.audioManager.setMusicVolume(value);
            this.musicValueDisplay.textContent = value + "%";
        });

        this.sfxVolumeSlider.addEventListener("input", (e) => {
            const value = e.target.value;
            this.audioManager.setSfxVolume(value);
            this.sfxValueDisplay.textContent = value + "%";
        });
    }

    // Callbacks setup
    onPlay(callback) {
        this.playBtn.addEventListener("click", callback);
    }

    onRetry(callback) {
        this.retryBtn.addEventListener("click", callback);
    }

    onHome(callback) {
        this.homeBtn.addEventListener("click", callback);
    }

    showGameHUD() {
        this.landingPage.classList.add("hidden");
        this.gameOverPage.classList.add("hidden");
        this.gameHud.classList.remove("hidden");
    }

    showGameOver(distance, highScore) {
        this.gameHud.classList.add("hidden");
        this.gameOverPage.classList.remove("hidden");

        this.finalDistanceEl.textContent = distance + " m";
        this.bestScoreEl.textContent = highScore + " m";
    }

    showHome(highScore) {
        this.gameOverPage.classList.add("hidden");
        this.gameHud.classList.add("hidden");
        this.landingPage.classList.remove("hidden");
        this.highScoreValueEl.textContent = highScore + " m";
    }

    updateDistance(distance) {
        this.distanceValueEl.textContent = Math.floor(distance);
    }

    updateShieldBar(percent) {
        this.shieldBarFill.style.width = percent + "%";
    }

    showShieldBar(visible) {
        if (visible) {
            this.shieldBarContainer.classList.remove("hidden");
        } else {
            this.shieldBarContainer.classList.add("hidden");
        }
    }
}
