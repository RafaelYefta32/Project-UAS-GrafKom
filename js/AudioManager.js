export class AudioManager {
    constructor() {
        // Load saved volume from localStorage
        this.musicVolume = localStorage.getItem("zombrush_music_volume") ?? 50;
        this.sfxVolume = localStorage.getItem("zombrush_sfx_volume") ?? 70;

        // Background Music Setup
        this.bgMusic = new Audio("./audio/spook.mp3");
        this.bgMusic.loop = true;
        this.bgMusic.volume = this.musicVolume / 100;

        // Death Scream Sound Effect
        this.screamSound = new Audio("./audio/male_scream.mp3");
        this.screamSound.volume = this.sfxVolume / 100;
    }

    playMusic() {
        this.bgMusic.currentTime = 0;
        this.bgMusic.play();
    }

    stopMusic() {
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }

    playScream() {
        this.screamSound.currentTime = 0;
        this.screamSound.play();
    }

    setMusicVolume(value) {
        this.musicVolume = value;
        this.bgMusic.volume = value / 100;
        localStorage.setItem("zombrush_music_volume", value);
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
        this.screamSound.volume = value / 100;
        localStorage.setItem("zombrush_sfx_volume", value);
    }
}
