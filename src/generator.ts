
export class RuntimeGenerator {

    constructor() {

    }

    static genBasicGameJson() {
        let json = {
            script: false,
            components:
            {
                display:
                {
                    width: 640,
                    height: 480,
                    layers: ["bg", "map", "npc", "obj", "fog", "ui"]
                },

                event:
                {
                    onInit: "onInit"
                }
            },
            packs: [],
            basics: ["display", "stage", "tween", "transition", "mouse", "keyboard", "gamepad", "event"],
            scenes: ["scene1"]
        }
        return json;
    }

    static genBasicSceneJson() {
        let json = {
            script: false,
            components:
            {
                display:
                {
                    bgcolor: "#ffffff"
                }
            },
            preload: 
            {
                images: [],
                musics: [],
                sounds: [],
                jsons:  []
            },
            systems: ["motion"],
            sprites: []
        }
        return json;
    }

    static genBasicPlotJson() {
        let json = {
            script: false,
            components:
            {
                plot: true,
                event:
                {
                    onUpdate: "onUpdate"
                }
            }
        }
        return json;
    }

    static genBasicSpriteObjectJson(tpl: string = "") {
        let json = {
            active: true,
            script: false,
            template: tpl ? tpl : null,
            components:
            {
                display:
                {
                    x: 100,
                    y: 100,
                    angle: 0,
                    scale:
                    {
                        x: 1.0,
                        y: 1.0
                    },
                    anchor:
                    {
                        x: 0.5,
                        y: 0.5
                    }
                }
            }
        }
        return json;
    }

    static genBasicPanelObjectJson(tpl: string = "panel") {
        let json = {
            active: true,
            script: false,
            template: tpl ? tpl : null,
            components:
            {
                display:
                {
                    x: 10,
                    y: 10,
                    width: 120,
                    height: 60
                }
            }
        }
        return json;
    }

    static genBasicPlotObjectJson(tpl: string = "plot") {
        let json = {
            active: true,
            script: true,
            template: tpl ? tpl : null
        }
        return json;
    }

    static genBasicPlotObjectScript(tpl: string = "plot") {
        let tscript = `

export class Plot1 {
    * onUpdate(sprite) {
        console.log("plot started - " + sprite.name);
        console.log("plot ended - " + sprite.name);
        sprite.active = false;
    }
}

`;
        return tscript;
    }

    static genEmptyClassScript(className: string = "Game1") {
        let tscript = `

export class ` + className + ` {
    
}

`;
        return tscript;
    }

}

