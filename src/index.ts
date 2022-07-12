import * as BABYLON from "babylonjs";
import { Axis, Color4, KeyboardInfo, Mesh, Observable, Vector3 } from "babylonjs";
import * as GUI from 'babylonjs-gui';

const OPTIONS = {

    axisInfo       : false,
    shuffleExample : false,
    nonAlgoResolve : true,
    
    frameRate      : 10,
    animLength     : 0.25,

    btnSize        : { width      : 220    , height     : 60     },
    btnColors      : { background : "white", foreground : "black"}

}

const sleep  = (ms:number) => new Promise(r => setTimeout(r, ms));

const floorTo = (input:number, digits:number) => Math.floor(input * (10 ** digits)) / (10 ** digits)

const range  = (init:number = 0, end:number, step:number = 1, faulty:boolean = false) => {
    init-=step
    return {
        [Symbol.iterator](){
            return{
                next(){
                    init = floorTo(init+step, 5)
                    if(init >= end) return { done : true }
                    return { value: init, done: false} 
                }
            }
        }
    }
}

const mRange = (size:number) => {
    let n = 0;
    let n2 = 0;
    return{
        [Symbol.iterator](){
            return{
                next(){
                    if(n2 == size) [ n, n2 ] = [ n + 1, 0 ]
                    if( n == size) return { done: true }
                    return { value: [ n, n2++ ], done: false }
                }
            }
        }
    }
}

class Colors{
    static NULL  = new Color4(0    , 0    , 0    )
    static UP    = new Color4(0.968, 0.968, 0.968) // new Color4(0.694, 0.066, 0.196) red
    static BACK  = new Color4(0.968, 0.333, 0    ) // new Color4(0    , 0.588, 0.275) green
    static FRONT = new Color4(0.694, 0.066, 0.196) // new Color4(0    , 0.266, 0.659) blue
    static LEFT  = new Color4(0    , 0.588, 0.275) // new Color4(0.968, 0.968, 0.968) white
    static RIGHT = new Color4(0    , 0.266, 0.659) // new Color4(0.968, 0.87 , 0    ) yellow 
    static DOWN  = new Color4(0.968, 0.87 , 0    ) // new Color4(0.968, 0.333, 0    ) orange
}

class Turns {
    staticAxis  : string
    staticValue : number
    private constructor(axis: string, value: number){
        this.staticAxis  = axis
        this.staticValue = value
    }
    static U = new Turns( "Y", 2 )
    static D = new Turns( "Y", 0 )
    static R = new Turns( "Z", 2 )
    static L = new Turns( "Z", 0 )
    static F = new Turns( "X", 2 )
    static B = new Turns( "X", 0 )
    static Number = Object.getOwnPropertyNames(Turns).filter(e => e.length == 1).length
}

class Cube{

    private cubes     : Array<Array<Mesh[]>>

    private scene     : BABYLON.Scene

    private position  : Vector3

    private resolMove : string = ""

    constructor(scene: BABYLON.Scene, position: Vector3 = Vector3.Zero()){
        this.scene    = scene
        this.position = position
        this.cubes    = new Array(3);
        this.fill()
        for(let [z, plane] of this.cubes.entries()){
            for( let [y, line] of plane.entries()){
                for( let [x, cell] of line.entries()){
                    cell = BABYLON.MeshBuilder.CreateBox(
                        `${x}-${y}-${z}`,
                        {
                            size: 1,
                            faceColors: [
                                (z == 2) ? Colors.RIGHT : Colors.NULL,  // RIGHT  YELLOW
                                (z == 0) ? Colors.LEFT  : Colors.NULL,  // LEFT2  RED
                                (x == 2) ? Colors.FRONT : Colors.NULL,  // LEFT   BLUE
                                (x == 0) ? Colors.BACK  : Colors.NULL,  // RIGHT2 GREEN
                                (y == 2) ? Colors.UP    : Colors.NULL,  // TOP    YELLOW
                                (y == 0) ? Colors.DOWN  : Colors.NULL,  // BOTTOM WHITE
                            ],
                        },
                        scene
                    )
                    if(OPTIONS.axisInfo){
                        let a = new BABYLON.AxesViewer(scene, 1)
                        a.xAxis.parent = cell
                        a.yAxis.parent = cell
                        a.zAxis.parent = cell
                    }
                    cell.position.x = position.x + x + ((x == 1) ? 0 : (x == 0) ? -0.01 : 0.01) - 1
                    cell.position.y = position.y + y + ((y == 1) ? 0 : (y == 0) ? -0.01 : 0.01) - 1
                    cell.position.z = position.z + z + ((z == 1) ? 0 : (z == 0) ? -0.01 : 0.01) - 1
                    this.cubes[y][x][z] = cell
                }
            }
        }
        if(OPTIONS.shuffleExample) this.parseCommands("F'D'F'L'D'LB'LDF'D'R'DLB'R'DLD'B'U'FU'B")
    }

    async Uturn(anti :boolean = false){
        let slice = this.cubes[2];
        await this.swapFace(slice, Axis.Y, (anti)?-1:1);
        this.reMap(slice, Turns.U, anti)
    }
    
    async Rturn(anti : boolean = false){
        let slice = [
            [this.cubes[0][0][2], this.cubes[0][1][2], this.cubes[0][2][2]],
            [this.cubes[1][0][2], this.cubes[1][1][2], this.cubes[1][2][2]],
            [this.cubes[2][0][2], this.cubes[2][1][2], this.cubes[2][2][2]]  
        ]
        await this.swapFace(slice, Axis.Z, (anti)?-1:1);
        this.reMap(slice, Turns.R, anti)
    }

    async Fturn(anti: boolean = false){
        let slice = [
            [this.cubes[2][2][2], this.cubes[2][2][1], this.cubes[2][2][0]],
            [this.cubes[1][2][2], this.cubes[1][2][1], this.cubes[1][2][0]],
            [this.cubes[0][2][2], this.cubes[0][2][1], this.cubes[0][2][0]],
        ]
        await this.swapFace(slice, Axis.X, (anti)?-1:1);
        this.reMap(slice, Turns.F, anti)
    }
    
    async Dturn(anti : boolean = false){
        let slice = this.cubes[0];
        await this.swapFace(slice, Axis.Y, (anti)?-1:1);
        this.reMap(slice, Turns.D, anti)
    }

    async Lturn(anti : boolean = false){
        let slice = [
            [this.cubes[0][0][0], this.cubes[0][1][0], this.cubes[0][2][0]],
            [this.cubes[1][0][0], this.cubes[1][1][0], this.cubes[1][2][0]],
            [this.cubes[2][0][0], this.cubes[2][1][0], this.cubes[2][2][0]]  
        ]
        await this.swapFace(slice, Axis.Z, (anti)?-1:1);
        this.reMap(slice, Turns.L, anti)
    }

    async Bturn(anti : boolean = false){
        let slice = [
            [this.cubes[2][0][2], this.cubes[2][0][1], this.cubes[2][0][0]],
            [this.cubes[1][0][2], this.cubes[1][0][1], this.cubes[1][0][0]],
            [this.cubes[0][0][2], this.cubes[0][0][1], this.cubes[0][0][0]],
        ]
        await this.swapFace(slice, Axis.X, (anti)?-1:1);
        this.reMap(slice, Turns.B, anti)
    }

    async parseCommands(commands: string){
        commands = commands.toUpperCase()
        for(let char = 0; char < commands.length; char++){
            switch(commands[char]){
                case "U": if(commands[char+1] == "'"){char++; await this.Uturn(true); if(OPTIONS.nonAlgoResolve) this.resolMove = "U" + this.resolMove} else {await this.Uturn(); if(OPTIONS.nonAlgoResolve) this.resolMove = "U'" + this.resolMove} break;
                case "R": if(commands[char+1] == "'"){char++; await this.Rturn(true); if(OPTIONS.nonAlgoResolve) this.resolMove = "R" + this.resolMove} else {await this.Rturn(); if(OPTIONS.nonAlgoResolve) this.resolMove = "R'" + this.resolMove} break;
                case "F": if(commands[char+1] == "'"){char++; await this.Fturn(true); if(OPTIONS.nonAlgoResolve) this.resolMove = "F" + this.resolMove} else {await this.Fturn(); if(OPTIONS.nonAlgoResolve) this.resolMove = "F'" + this.resolMove} break;
                case "D": if(commands[char+1] == "'"){char++; await this.Dturn(true); if(OPTIONS.nonAlgoResolve) this.resolMove = "D" + this.resolMove} else {await this.Dturn(); if(OPTIONS.nonAlgoResolve) this.resolMove = "D'" + this.resolMove} break;
                case "L": if(commands[char+1] == "'"){char++; await this.Lturn(true); if(OPTIONS.nonAlgoResolve) this.resolMove = "L" + this.resolMove} else {await this.Lturn(); if(OPTIONS.nonAlgoResolve) this.resolMove = "L'" + this.resolMove} break;
                case "B": if(commands[char+1] == "'"){char++; await this.Bturn(true); if(OPTIONS.nonAlgoResolve) this.resolMove = "B" + this.resolMove} else {await this.Bturn(); if(OPTIONS.nonAlgoResolve) this.resolMove = "B'" + this.resolMove} break;
            }
        }
    }

    async resolve(){
        OPTIONS.nonAlgoResolve = false
        await this.parseCommands(this.resolMove)
        OPTIONS.nonAlgoResolve = true
        this.resolMove = ""
    }

    private swapFace = async (f:Array<Mesh[]>, axis: Vector3, rotation:number = 1) => {
        let w        = 1/OPTIONS.frameRate
        let waitTime = OPTIONS.animLength * w * 1000
        for await(let i of range(0, 1, 1/OPTIONS.frameRate)){
            console.log(i)
            Promise.all([
                f[0][0].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[0][1].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[0][2].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[1][0].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[1][1].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[1][2].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[2][0].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[2][1].rotateAround(this.position, axis, w * rotation * (Math.PI/2)),
                f[2][2].rotateAround(this.position, axis, w * rotation * (Math.PI/2))
            ])
            await sleep(waitTime)
        }
    }
    
    private reMap = (f:Array<Mesh[]>, turn: Turns, anti: boolean) => {
        switch( turn.staticAxis ){
            case "Y":
                [
                    this.cubes[turn.staticValue][0][0],
                    this.cubes[turn.staticValue][0][1],
                    this.cubes[turn.staticValue][0][2],
                    this.cubes[turn.staticValue][1][0],
                    this.cubes[turn.staticValue][1][2],
                    this.cubes[turn.staticValue][2][0],
                    this.cubes[turn.staticValue][2][1],
                    this.cubes[turn.staticValue][2][2],
                ] = (anti) ? [
                    f[0][2],
                    f[1][2],
                    f[2][2],
                    f[0][1],
                    f[2][1],
                    f[0][0],
                    f[1][0],
                    f[2][0],
                ] : [
                    f[2][0],
                    f[1][0],
                    f[0][0],
                    f[2][1],
                    f[0][1],
                    f[2][2],
                    f[1][2],
                    f[0][2]
                ]
                break
            case "X":
                [
                    this.cubes[0][turn.staticValue][0],
                    this.cubes[0][turn.staticValue][1],
                    this.cubes[0][turn.staticValue][2],
                    this.cubes[1][turn.staticValue][0],
                    this.cubes[1][turn.staticValue][2],
                    this.cubes[2][turn.staticValue][0],
                    this.cubes[2][turn.staticValue][1],
                    this.cubes[2][turn.staticValue][2],
                ] = (anti) ? [
                    f[0][2],
                    f[1][2],
                    f[2][2],
                    f[0][1],
                    f[2][1],
                    f[0][0],
                    f[1][0],
                    f[2][0],
                ] : [
                    f[2][0],
                    f[1][0],
                    f[0][0],
                    f[2][1],
                    f[0][1],
                    f[2][2],
                    f[1][2],
                    f[0][2]
                ]
            break
            case "Z":
                [
                    this.cubes[0][0][turn.staticValue],
                    this.cubes[0][1][turn.staticValue],
                    this.cubes[0][2][turn.staticValue],
                    this.cubes[1][0][turn.staticValue],
                    this.cubes[1][2][turn.staticValue],
                    this.cubes[2][0][turn.staticValue],
                    this.cubes[2][1][turn.staticValue],
                    this.cubes[2][2][turn.staticValue]
                ] = (anti) ? [
                    f[0][2],
                    f[1][2],
                    f[2][2],
                    f[0][1],
                    f[2][1],
                    f[0][0],
                    f[1][0],
                    f[2][0],
                ] : [
                    f[2][0],
                    f[1][0],
                    f[0][0],
                    f[2][1],
                    f[0][1],
                    f[2][2],
                    f[1][2],
                    f[0][2]
                ]
            break
        }
    }

    private fill(){
        for(let i = 0; i < 3; i++){
            let a = new Array(3)
            for(let j = 0; j < 3; j++) a [j] = new Array(3)
            this.cubes[i] = a
        }
    }
}

let canvas = document.getElementById("canvas") as HTMLCanvasElement

let engine      = new BABYLON.Engine(canvas, true)

let obs         = new Observable<void>()

let howManyBtns = 0

let applyStyle  = (b: GUI.Button) => {
    var finalHMB = howManyBtns
    b.left       = (-1 * canvas.offsetWidth/2) + OPTIONS.btnSize.width/2 + (howManyBtns%2)*OPTIONS.btnSize.width;
    b.top        = -Turns.Number*OPTIONS.btnSize.height / 2 + (finalHMB-finalHMB%2) * (OPTIONS.btnSize.height)/2
    b.width      = `${OPTIONS.btnSize.width}px`
    b.height     = `${OPTIONS.btnSize.height}px`
    b.color      = OPTIONS.btnColors.foreground
    b.background = OPTIONS.btnColors.background
    howManyBtns++
    obs.add(() => {
        b.left = (-1 * canvas.offsetWidth/2) + OPTIONS.btnSize.width/2 + (finalHMB%2)*OPTIONS.btnSize.width
        b.top  = -180 + (finalHMB-finalHMB%2) * (OPTIONS.btnSize.height)/2
    })
}

var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera("Camera", 9 * Math.PI / 4, Math.PI / 4, 20, BABYLON.Vector3.Zero(), scene);

    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 40, 0), scene);
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, -40, 0), scene);

    light.intensity = 0.9;
    let cube = new Cube(scene)
    let UI   = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI")
    let Btns = [
        GUI.Button.CreateSimpleButton("U", "giro U" ),
        GUI.Button.CreateSimpleButton("U'","giro U'"),
        GUI.Button.CreateSimpleButton("R", "giro R" ),
        GUI.Button.CreateSimpleButton("R'","giro R'"),
        GUI.Button.CreateSimpleButton("F", "giro F" ),
        GUI.Button.CreateSimpleButton("F'","giro F'"),
        GUI.Button.CreateSimpleButton("D", "giro D" ),
        GUI.Button.CreateSimpleButton("D'","giro D'"),
        GUI.Button.CreateSimpleButton("L", "giro L" ),
        GUI.Button.CreateSimpleButton("L'","giro L'"),
        GUI.Button.CreateSimpleButton("B", "giro B" ),
        GUI.Button.CreateSimpleButton("B'","giro B'")
    ]
    
    if(OPTIONS.nonAlgoResolve)scene.onKeyboardObservable.add((kbEvent: KeyboardInfo) => {if(kbEvent.type === BABYLON.KeyboardEventTypes.KEYUP && kbEvent.event.key.toUpperCase() === "R") cube.resolve()})
    

    Btns.forEach(btn => {applyStyle(btn); UI.addControl(btn); btn.onPointerUpObservable.add(()=>cube.parseCommands(btn.name))})

    //@ts-ignore
    window.cube = cube;
    return scene;
};

let scene = createScene()

engine.runRenderLoop(() => scene.render());

window.addEventListener("resize", () => {
    engine.resize()
    obs.notifyObservers()
});