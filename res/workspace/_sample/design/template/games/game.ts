
export class Game1 {
    onInit(game) {
        console.log("on game init: " + game.name);
		window.document.title = game.title;
    }
}
