// NOTE: Requires Phaser library

// TUNING:
// UI
const maxTextScale = 1.15;
const minTextScale = 0.9;
const textScaleChange = 0.005;
const tapToJumpPrompt = "Tap to Jump!";
const minDigits = 5;
const jumpBarUpdateTime = 500;
// World
const gameGravity = 500;
const gameSpeed = 300;
const metersTraveledPerTick = 10;
const aboveFlowerThresold = 150;
const horizontalFlowerThreshold = 130;
const scoreBumpIncrement = 5000;
// Player
const jumpHeight = 500;
const initialJumpHeight = 1500;
const initialJumpTimeMilliseconds = 850;
const jumpTicksPerCharge = 65;
const jumpTicketsCostForInitialJump = 20;
const tiltAngleOnJump = 25;
const minPlayAgainViewportX = 0.3;
const maxPlayAgainViewportX = 0.7;
const minPlayAgainViewportY = 0.32;
const maxPlayAgainViewportY = 0.66;
// Flowers
const startFlowerPosition = 100;
const flowerCount = 3;
const flowerSpacing = 400;
const flowerRespawnThreshold = -100;
const minFlowerSpacingFactor = 1.15;
const maxFlowerSpacingFactor = 1.65;
const minFlowerHeight = 400;
const maxFlowerHeight = 250;
const startingFlowerHeight = minFlowerHeight - 50;

// ASSETS:
const imageNameSplashScreen = "sky";
const flowerSprites = ["flower1", "flower2", "flower3"];
const assbuttSprite = "assbutt";
const playAgainActiveButton = "play_again_active";
const playAgainPressButton = "play_again_press";
const gameLoopSoundAsset = "game_loop";
const gameLoseSoundAsset = "game_lose";
const gameScoreBumpSoundAsset = "game_score_bump";
const jumpBarBackgroundImage = "jump_bar_background";
const jumpBarFillImage = "jump_bar_fill";

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
// WORLD GAME OBJECTS
let gameArea, assbutt, flowers;
// UI:
let textPrompt, meters, playAgainButton, playAgainButtonPressed, jumpBarBackground, jumpBarFill, jumpBarMask;
// AUDIO:
let gameLoop, loseSound, gameScoreBump, activeSFX;

Math.lerp = function(value1, value2, amount)
{
	amount = amount < 0 ? 0 : amount;
	amount = amount > 1 ? 1 : amount;
	return value1 + (value2 - value1) * amount;
};

Math.range = function(min, max)
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

    // WORLD
    this.load.image(imageNameSplashScreen, "img/background.jpg");
    flowerSprites.forEach((sprite) => {
        this.load.image(sprite, `img/${sprite}.png`);
    });
    this.load.image(assbuttSprite, "img/assbutt.png");

    // UI
    this.load.image(playAgainActiveButton, "img/play_again_active.png");
    this.load.image(playAgainPressButton, "img/play_again_press.png");
    this.load.image(jumpBarBackgroundImage, "img/jump_bar_background.png");
    this.load.image(jumpBarFillImage, "img/jump_bar_fill.png");

    // AUDIO
    this.load.audio(gameLoopSoundAsset, "mp3/game_loop.mp3");
    this.load.audio(gameLoseSoundAsset, "mp3/game_lose.mp3");
    this.load.audio(gameScoreBumpSoundAsset, "mp3/game_score_bump.mp3");
}

let pointerIsDown = false;
let assbuttOnFlower = false;
let metersTraveled = 0;
let nextScoreBump = scoreBumpIncrement;
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

function getMetersTraveledDisplay()
{
    let metersString = new String(metersTraveled);
    if(metersString.length < minDigits)
    {
        const zeroPadding = minDigits - metersString.length;
        metersString = "0".repeat(zeroPadding) + metersString;
    }
    return `${metersString}m`;
}

function updateMetersTraveled(newMeters)
{
    metersTraveled = newMeters;
    meters.text = getMetersTraveledDisplay();
}

function updateJumpBarMask(fillDecimal)
{
    jumpBarMask.displayHeight = jumpBarFill.displayHeight * fillDecimal;
    jumpBarMask.y = jumpBarFill.y + (jumpBarFill.displayHeight - jumpBarMask.displayHeight) / 2;
}

let jumpBarAnimation = null;
function updateJumpTicks(remaining, animated=true)
{
    let difference = Math.abs(remainingJumpTicks - remaining);
    if(difference === 0)
    {
        return;
    }

    if(jumpBarAnimation)
    {
        clearTimeout(jumpBarAnimation);
    }
    let startingJumpTicks = remainingJumpTicks;
    remainingJumpTicks = remaining;

    if(difference === 1 || !animated)
    {
        updateJumpBarMask(remainingJumpTicks / jumpTicksPerCharge);
        return;
    }

    let tickTime = jumpBarUpdateTime / difference;
    let timer = 0;
    let updateVisualBar;
    updateVisualBar = () => {
        updateJumpBarMask(Math.lerp(startingJumpTicks, remaining, timer / jumpBarUpdateTime) / jumpTicksPerCharge);
        timer += tickTime;
        if (timer < jumpBarUpdateTime) {
            jumpBarAnimation = setTimeout(updateVisualBar, tickTime);
        } else {
            updateJumpBarMask(remaining / jumpTicksPerCharge);
        }
    };
    jumpBarAnimation = setTimeout(updateVisualBar, tickTime);
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
            if(flower.y - assbutt.y > aboveFlowerThresold && Math.abs(flower.x - assbutt.x) < horizontalFlowerThreshold)
            {
                assbuttOnFlower = true;
                if(!jumpedForFirstTime)
                {
                    updateJumpTicks(jumpTicksPerCharge);
                }
            }
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

    meters = this.add.text(center.x - 75, 25, getMetersTraveledDisplay(), {
        font: "30px Helvetica",
        fontStyle: "strong",
        fill: "#1f76b8",
        stroke: "#000000",
        strokeThickness: "2",
        textAlign: "right",
    });

    const jumpBarX = canvasWidth - 25;
    const jumpBarY = 140;
    jumpBarBackground = this.add.image(jumpBarX, jumpBarY, jumpBarBackgroundImage);
    jumpBarFill = this.add.image(jumpBarX, jumpBarY, jumpBarFillImage);
    jumpBarMask = this.make.image({
        x: jumpBarX,
        y: jumpBarY,
        key: 'mask',
        add: false
    });
    jumpBarMask.displayWidth = jumpBarFill.displayWidth;
    jumpBarMask.displayHeight = jumpBarFill.displayHeight;
    jumpBarFill.mask = new Phaser.Display.Masks.BitmapMask(this, jumpBarMask);
    updateJumpTicks(0, animted=false);

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
    gameScoreBump = this.sound.add(gameScoreBumpSoundAsset);

    // Dismisses the loading screen:
    document.dispatchEvent(gameLoadedEvent)
}

let jumpedForFirstTime = false;
let textGrowing = true;
let remainingJumpTicks = jumpTicksPerCharge;
let gameIsOver = false;
let gameOverFirstTime = true;
let initialJumpVelocity = false;

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
    updateMetersTraveled(0);
    nextScoreBump = scoreBumpIncrement;
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
        updateJumpTicks(jumpTicksPerCharge);
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
            if(!initialJumpVelocity)
            {
                assbutt.setVelocity(0, jumpHeight);
            }
            flowers.forEach((f) => {
                f.setVelocity(-gameSpeed, 0);
            });
            updateMetersTraveled(metersTraveled + metersTraveledPerTick);
        }
    }

    if(pointerIsDown && assbuttOnFlower)
    {
        assbuttOnFlower = false;

        assbutt.setVelocity(0, -jumpHeight);
        updateJumpTicks(remainingJumpTicks - jumpTicketsCostForInitialJump);
        initialJumpVelocity = true;
        setTimeout(()=> {
            initialJumpVelocity = false;
        }, initialJumpTimeMilliseconds);
    }

    if(pointerIsDown && remainingJumpTicks)
    {
        jumpedForFirstTime = true;
        if(!initialJumpVelocity)
        {
            assbutt.setAngle(-tiltAngleOnJump, 0);
            assbutt.setVelocity(0, -jumpHeight);
            updateJumpTicks(remainingJumpTicks - 1)
        }
        if(debugEnabled)
        {
            console.log(remainingJumpTicks);
        }
    }

    if(assbutt.y > game.canvas.height)
    {
        gameLoop.pause();
        if(activeSFX)
        {
            activeSFX.stop();
        }
        loseSound.play()
        activeSFX = loseSound;
        setTimeout(() => {
            if(activeSFX === loseSound)
            {
                gameLoop.resume();
            }
        }, loseSound.duration * 1000);
        updateJumpTicks(0)
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
    else if(assbutt.y < 25)
    {
        if(!initialJumpVelocity)
        {
            assbutt.y = 25;
        }
        assbutt.setAngle(0, 0);
    }

    spawnOffset = 0;
    flowers.forEach((flower) => {
        if(flower.x < flowerRespawnThreshold)
        {
            flower.x += canvasWidth * Math.range(minFlowerSpacingFactor, maxFlowerSpacingFactor) + spawnOffset;
            flower.y = Math.range(minFlowerHeight, maxFlowerHeight);
            spawnOffset += flowerSpacing;
        }
    });

    if(metersTraveled >= nextScoreBump)
    {
        nextScoreBump += scoreBumpIncrement;
        if(activeSFX)
        {
            activeSFX.stop();
        }
        gameScoreBump.play();
        activeSFX = gameScoreBump;
        gameLoop.pause();
        setTimeout(()=> {
            if(activeSFX === gameScoreBump)
            {
                gameLoop.resume();
            }
        }, gameScoreBump.duration * 1000);
    }
}
