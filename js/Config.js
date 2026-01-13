export const ZOMBIE_CONFIG = { // AI
    zombie1: {
        path: "./model/enemy_white_zombie.glb",
        scale: 0.35,
        attackAnim: "Attack",
        playerAnim: "Hit",
        playerPos: "ground",
        attackLoop: "once",
        moveAnim: "walk",
        speed: 3
    },
    zombie2: {
        path: "./model/enemy_zombie_crawler.glb",
        scale: 0.5,
        attackAnim: "Attack",
        playerAnim: "Hit",
        playerPos: "ground",
        attackLoop: "repeat",
        speed: 5
    },
    zombie3: {
        path: "./model/enemy_zombie_walker.glb",
        scale: 1.4,
        attackAnim: "Bite",
        playerAnim: "Hit",
        playerPos: "ground",
        attackLoop: "once",
        moveAnim: "Run",
        speed: 15
    },
    zombie4: {
        path: "./model/enemy_bat.glb",
        scale: 1.4,
        attackAnim: "Bite",
        playerAnim: "Death",
        playerPos: "ground",
        attackLoop: "once",
        skipDeathAnim: false,
        speed: 8
    },
};

export const ASSET_COLORS = {
    road: 0x3a2f2a,
    fence: 0x6b6b6b,
    fenceDamaged: 0x5a5a5a,

    tree: 0x3f6b4f,
    trunk: 0x7a4a2e,
    rock: 0x6f6f6f,
    grave: 0x9c9c9c,
    crypt: 0x7a7a7a,

    debris: 0x5a5a5a,
    shovel: 0x7a7a7a,

    pumpkin: 0xff8c1a,
    lantern: 0x8a8a8a,
};

export const GAME_CONSTANTS = {
    laneX: [-2.5, 0, 2.5],
    segmentLength: 20,
    segmentCount: 8,
    startSpeed: 8,
    gravity: 35,
    jumpForce: 12,
    shieldMaxDuration: 10
};
