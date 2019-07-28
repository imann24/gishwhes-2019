// NOTE: Requires Phaser library

const imageNameSplashScreen = "sky";
const os = getMobileOperatingSystem(); // requires compat.js

let canvasWidth, canvasHeight, scaleParams, autoResize;
if (os === "iOS") {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    scaleParams = {};
    autoResize = false;
} else {
    canvasWidth = window.innerWidth * window.devicePixelRatio,
    canvasHeight = window.innerHeight * window.devicePixelRatio,
    scaleParams = {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    };
    autoResize = true;
}

let config = {
    type: Phaser.AUTO,
    width: canvasWidth,
    height: canvasHeight,
    autoResize: autoResize,
    scale: scaleParams,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 }
        }
    },
    scene: {
        preload: preload,
        create: create
    }
};

let game = new Phaser.Game(config);

function preload ()
{
    this.load.image(imageNameSplashScreen, "../img/sky.jpg");
}

function create ()
{
    const sky = this.add.image(canvasWidth / 2, canvasHeight / 2, 'sky');
}
