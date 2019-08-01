const playButtonId = "play_button";

function hideElement(id)
{
    const element = document.getElementById(id);
    element.style.display = "none";
    element.style.width = "0px";
    element.style.height = "0px";
}

function playGame()
{
    hideElement("loading");
    hideElement(playButtonId);
    document.dispatchEvent(new Event("game_start"));
}

document.addEventListener("game_loaded", ()=>
{
    hideElement("loading_text");
    const playButton = document.getElementById(playButtonId);
    playButton.style.display = "block";
    const setPlayButtonImagePress = ()=> {
        playButton.src = "./img/play_press.png";
    };
    const setPlayButtonImageActive = ()=> {
        playButton.src = "./img/play_active.png";
    };
    const updateButtonAndPlayGame = ()=> {
        setPlayButtonImagePress();
        playGame();
    };
    playButton.addEventListener("pointerdown", setPlayButtonImagePress);
    playButton.addEventListener("touchstart", setPlayButtonImagePress);
    playButton.addEventListener("pointerout", setPlayButtonImageActive);
    playButton.addEventListener("touchcancel", setPlayButtonImageActive);
    playButton.addEventListener("pointerup", updateButtonAndPlayGame);
    playButton.addEventListener("touchend", updateButtonAndPlayGame);
});
