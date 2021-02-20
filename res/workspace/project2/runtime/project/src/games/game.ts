
export class MyGame {
	onInit(game) {
		console.log("on game init: " + game.name);
		console.log("screen size: " + game.width + "x" + game.height);
	}
	sortObjects(obj) {
		obj.zOrder = obj.y;
	}
}
