// NOTE: Requires Phaser library

// TUNING:
const maxTextScale = 1.15;
const minTextScale = 0.9;
const textScaleChange = 0.005;
const tapToJumpPrompt = "Tap to Jump!";
const gameGravity = 500;
const jumpHeight = 500;
const gameSpeed = 300;
const jumpTicksPerCharge = 30;
const tiltAngleOnJump = 25;
const startFlowerPosition = 100;
const flowerCount = 3;
const flowerSpacing = 425;
const startingFlowerHeight = 450;
const minPlayAgainViewportX = 0.3;
const maxPlayAgainViewportX = 0.7;
const minPlayAgainViewportY = 0.32;
const maxPlayAgainViewportY = 0.66;
const flowerRespawnThreshold = -100;
const minFlowerSpacingFactor = 1.15;
const maxFlowerSpacingFactor = 1.55;
const minFlowerHeight = 250;
const maxFlowerHeight = 500;

// ASSETS:
const imageNameSplashScreen = "sky";
const flowerSprites = ["flower1", "flower2", "flower3"];
const assbuttSprite = "assbutt";
const playAgainActiveButton = "play_again_active";
const playAgainPressButton = "play_again_press";
const gameLoopSoundAsset = "game_loop";
const gameLoseSoundAsset = "game_lose";

// DEBUGGING:
const debugEnabled = false;

const gameLoadedEvent = new Event("game_loaded");

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
        default: "arcade",
        arcade: {
            gravity: { y: gameGravity }
        }
    },
    input: {
        touch: true,
        activePointers: 3,
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    }
};

let game = new Phaser.Game(config);
let gameArea, assbutt, textPrompt, flowers, playAgainButton, playAgainButtonPressed;
// AUDIO:
let gameLoop, loseSound;

function randomRange(min, max)
{
  return Math.random() * (max - min) + min;
}

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
    flowerSprites.forEach((sprite) => {
        this.load.image(sprite, `img/${sprite}.png`);
    });
    this.load.image(assbuttSprite, "img/assbutt.png");
    this.load.image(playAgainActiveButton, "img/play_again_active.png");
    this.load.image(playAgainPressButton, "img/play_again_press.png");

    // AUDIO
    this.load.audio(gameLoopSoundAsset, "mp3/game_loop.mp3");
    this.load.audio(gameLoseSoundAsset, "mp3/game_lose.mp3");
}

let pointerIsDown = false;
let assbuttOnFlower = false;
const playerStartX = 100;
const playerStartY = canvasHeight / 2 - 100;

function getViewportLocation(pointer)
{
    return {
        x: pointer.x / canvasWidth,
        y: 1 + (pointer.y / canvasHeight),
    };
}

function pointerOnPlayAgainButton(pointer)
{
    if(!(playAgainButton && playAgainButton.visible))
    {
        return false;
    }

    const viewportPos = getViewportLocation(pointer);
    return viewportPos.x >= minPlayAgainViewportX && viewportPos.x <= maxPlayAgainViewportX &&
           viewportPos.y >= minPlayAgainViewportY && viewportPos.y <= maxPlayAgainViewportY;
}

function create()
{
    const center = gameCenter();
    const gameArea = this.add.image(center.x, center.y, imageNameSplashScreen);
    gameArea.displayWidth = canvasWidth;
    gameArea.displayHeight = canvasHeight;

    assbutt = this.physics.add.sprite(playerStartX, playerStartY, assbuttSprite);
    assbutt.displayWidth = 86;
    assbutt.displayHeight = 88.5;

    flowers = [];
    for (var i = 0; i < flowerCount; i++) {
        const sprite = flowerSprites[i % flowerSprites.length];
        const flowerPosX = startFlowerPosition + i * flowerSpacing;
        const flower = this.physics.add.sprite(flowerPosX, startingFlowerHeight, sprite);
        flower.displayWidth = 200;
        flower.displayHeight = 300;
        flower.body.allowGravity = false;
        this.physics.add.overlap(assbutt, flower, (assbuttCollide) => {
            assbuttOnFlower = true;
        }, null, this);
        flowers.push(flower);
    }

    textPrompt = this.add.text(center.x - 150, center.y - 100, tapToJumpPrompt, {
        font: "65px Helvetica",
        fontStyle: "strong",
        fill: "#ff0044",
        stroke: "#000000",
        strokeThickness: "3",
    });

    this.input.on("pointerdown", (pointer) => {
        // iOS workaround: touch event not working (https://github.com/photonstorm/phaser/issues/4682)
        if(game.device.os.iOS && pointerOnPlayAgainButton(pointer))
        {
            playAgainButtonDown();
            return;
        }

        if(textPrompt.text === tapToJumpPrompt)
        {
            textPrompt.text = "";
        }

        if(!gameIsOver)
        {
            flowers.forEach((f) => {
                f.setVelocity(-gameSpeed, 0);
            });
        }
        pointerIsDown = true;
    }, this);
    this.input.on("pointerup", (pointer) => {
        // iOS workaround: touch event not working (https://github.com/photonstorm/phaser/issues/4682)
        if(game.device.os.iOS && pointerOnPlayAgainButton(pointer))
        {
            playAgainButtonPress();
            return;
        }

        pointerIsDown = false;
        if(playAgainButtonPressed)
        {
            playAgainButtonPressed.visible = false;
        }
    }, this);

    game.input.touch.startListeners();

    // AUDIO
    gameLoop = this.sound.add(gameLoopSoundAsset);
    gameLoop.play();
    gameLoop.loop = true;

    loseSound = this.sound.add(gameLoseSoundAsset);

    // Dismisses the loading screen:
    document.dispatchEvent(gameLoadedEvent)
}

let jumpedForFirstTime = false;
let textGrowing = true;
let remainingJumpTicks = jumpTicksPerCharge;
let gameIsOver = false;
let gameOverFirstTime = true;

function playAgainButtonDown()
{
    playAgainButtonPressed.visible = true;
}

function playAgainButtonPress()
{
    gameIsOver = false;
    assbutt.x = playerStartX;
    assbutt.y = playerStartY;
    let flowerPos = startFlowerPosition;
    flowers.forEach((f) => {
        f.x = flowerPos;
        f.y = startingFlowerHeight;
        f.setVelocity(0, 0);
        flowerPos += flowerSpacing;
    });
    assbutt.body.allowGravity = true;
    playAgainButton.active = false;
    playAgainButton.visible = false;
    playAgainButtonPressed.visible = false;
    assbuttOnFlower = false;
    pointerIsDown = false;
    gameLoop.play();
    loseSound.stop();
}

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
        flowers.forEach((f) => {
            f.setVelocity(0, 0);
        });
    }
    else
    {
        assbutt.body.allowGravity = true;
        if(jumpedForFirstTime)
        {
            assbutt.setAngle(tiltAngleOnJump, 0);
            assbutt.setVelocity(0, jumpHeight);
            flowers.forEach((f) => {
                f.setVelocity(-gameSpeed, 0);
            });
        }
    }

    if(pointerIsDown && remainingJumpTicks)
    {
        jumpedForFirstTime = true;
        assbutt.setVelocity(0, -jumpHeight);
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
        gameLoop.pause();
        loseSound.play()
        setTimeout(() => {
            gameLoop.play();
        }, loseSound.duration * 1000);
        remainingJumpTicks = 0;
        gameIsOver = true;
        jumpedForFirstTime = false;
        assbutt.body.allowGravity = false;
        flowers.forEach((f) => {
            f.setVelocity(0, 0);
        });
        if(gameOverFirstTime)
        {
            playAgainButton = this.add.sprite(center.x, center.y, playAgainActiveButton).setInteractive();
            playAgainButtonPressed = this.add.image(center.x, center.y, playAgainPressButton)
            playAgainButtonPressed.visible = false;
            playAgainButton = playAgainButton.setInteractive();
            playAgainButton.on("pointerdown", (pointer) => {
                playAgainButtonDown();
            }, this);
            playAgainButton.on("pointerup", (pointer) => {
                playAgainButtonPress();
            }, this);
            gameOverFirstTime = false;
        }
        else
        {
            playAgainButton.active = true;
            playAgainButton.visible = true;
        }
    }

    spawnOffset = 0;
    flowers.forEach((flower) => {
        if(flower.x < flowerRespawnThreshold)
        {
            flower.x += canvasWidth * randomRange(minFlowerSpacingFactor, maxFlowerSpacingFactor) + spawnOffset;
            flower.y = randomRange(minFlowerHeight, maxFlowerHeight);
            spawnOffset += flowerSpacing;
        }
    })
}
