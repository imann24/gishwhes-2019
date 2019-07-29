// NOTE: Requires Phaser library

// TUNING:
const maxTextScale = 1.15;
const minTextScale = 0.9;
const textScaleChange = 0.005;
const tapToJumpPrompt = "Tap to Jump!";
const gameGravity = 500;
const jumpHeight = 500;
const jumpVelocity = 300;
const jumpTicksPerCharge = 35;
const tiltAngleOnJump = 25;

// ASSETS:
const imageNameSplashScreen = "sky";
const flowerSprite = "flower";
const assbuttSprite = "assbutt";
const playAgainActiveButton = "play_again_active";
const playAgainPressButton = "play_again_press";

// DEBUGGING:
const debugEnabled = false;

const gameLoadedEvent = new Event('game_loaded');

let canvasWidth, canvasHeight;
canvasWidth = window.innerWidth;
canvasHeight = window.innerHeight;

let config = {
    type: Phaser.AUTO,
    width: canvasWidth,
    height: canvasHeight,
    autoResize: true,
    scaleParams: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: gameGravity }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    }
};

let game = new Phaser.Game(config);
let gameArea, assbutt, textPrompt, firstFlower, playAgainButton, playAgainButtonPressed;

function gameCenter()
{
    return {
        x : canvasWidth / 2,
        y : canvasHeight / 2,
    };
}

function preload()
{
    this.load.setBaseURL(window.location.href);
    this.load.image(imageNameSplashScreen, "img/background.jpg");
    this.load.image(flowerSprite, "img/flower.png");
    this.load.image(assbuttSprite, "img/assbutt.png");
    this.load.image(playAgainActiveButton, "img/play_again_active.png");
    this.load.image(playAgainPressButton, "img/play_again_press.png");
}

let pointerIsDown = false;
let assbuttOnFlower = false;
const playerStartX = 100;
const playerStartY = canvasHeight / 2 - 100;
function create()
{
    const center = gameCenter();
    const gameArea = this.add.image(center.x, center.y, imageNameSplashScreen);
    gameArea.displayWidth = canvasWidth;
    gameArea.displayHeight = canvasHeight;

    firstFlower = this.physics.add.sprite(100, 500, flowerSprite);
    firstFlower.displayWidth = 128;
    firstFlower.displayHeight = 512;
    firstFlower.body.allowGravity = false;

    assbutt = this.physics.add.sprite(playerStartX, playerStartY, assbuttSprite);
    assbutt.displayWidth = 112;
    assbutt.displayHeight = 99;
    this.physics.add.overlap(assbutt, firstFlower, (assbuttCollide) => {
        assbuttOnFlower = true;
    }, null, this);

    textPrompt = this.add.text(center.x - 150, center.y - 100, tapToJumpPrompt, {
        font: "65px Helvetica",
        fontStyle: "strong",
        fill: "#ff0044",
        stroke: "#000000",
        strokeThickness: "3",
    });

    this.input.on("pointerdown", (pointer) => {
        pointerIsDown = true;
    }, this);
    this.input.on("pointerup", (pointer) => {
        pointerIsDown = false;
        if(playAgainButtonPressed)
        {
            playAgainButtonPressed.visible = false;
        }
        if(textPrompt.text === tapToJumpPrompt)
        {
            textPrompt.text = "";
        }
    }, this);

    game.input.touch.startListeners();

    // Dismisses the loading screen:
    document.dispatchEvent(gameLoadedEvent)
}

let jumpedForFirstTime = false;
let textGrowing = true;
let remainingJumpTicks = jumpTicksPerCharge;
let gameIsOver = false;
let gameOverFirstTime = true;

function update()
{
    if(gameIsOver)
    {
        return;
    }

    const center = gameCenter();
    if(textPrompt.text)
    {
        const delta = textGrowing ? textScaleChange : -textScaleChange;
        textPrompt.scale += delta;
        if(textPrompt.scale < minTextScale || textPrompt.scale > maxTextScale)
        {
            textGrowing = !textGrowing;
        }
    }

    if(assbuttOnFlower)
    {
        remainingJumpTicks = jumpTicksPerCharge;
        assbutt.body.allowGravity = false;
        assbutt.setAngle(0, 0);
        assbutt.setVelocity(0, 0);
    }
    else
    {
        assbutt.body.allowGravity = true;
        if(jumpedForFirstTime)
        {
            assbutt.setAngle(tiltAngleOnJump, 0);
            assbutt.setVelocity(jumpVelocity / 2, jumpHeight);
        }
    }

    if(pointerIsDown && remainingJumpTicks)
    {
        jumpedForFirstTime = true;
        assbutt.setVelocity(jumpVelocity, -jumpHeight);
        assbutt.setAngle(-tiltAngleOnJump, 0);
        remainingJumpTicks--;
        assbuttOnFlower = false;
        if(debugEnabled)
        {
            console.log(remainingJumpTicks);
        }
    }

    if(assbutt.y > game.canvas.height)
    {
        gameIsOver = true;
        assbutt.body.allowGravity = false;
        if(gameOverFirstTime)
        {
            playAgainButton = this.add.sprite(center.x, center.y, playAgainActiveButton).setInteractive();
            playAgainButtonPressed = this.add.image(center.x, center.y, playAgainPressButton)
            playAgainButtonPressed.visible = false;
            playAgainButton = playAgainButton.setInteractive();
            playAgainButton.on("pointerover", (pointer) => {
                playAgainButtonPressed.visible = true;
            }, this);
            playAgainButton.on("pointerup", (pointer) => {
                gameIsOver = false;
                assbutt.x = playerStartX;
                assbutt.y = playerStartY;
                assbutt.body.allowGravity = true;
                playAgainButton.active = false;
                playAgainButton.visible = false;
            }, this);
            gameOverFirstTime = false;
        }
        else
        {
            playAgainButton.active = true;
            playAgainButton.visible = true;
        }
    }
}
