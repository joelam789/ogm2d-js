
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
                }
            },
            packs: [],
            basics: ["display", "stage", "tween", "transition", "mouse", "keyboard", "gamepad", "event"],
            scenes: ["stage1"]
        }
        return json;
    }

    static genBasicStageJson() {
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

    static genBasicStageObjectJson(tpl: string = "") {
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

}

