var global = {
    // Keys and other mathematical constants
    KEY_ESC: 27,
    KEY_ENTER: 13,
    KEY_CHAT: 13,
    KEY_FIREFOOD: 119,
    KEY_SPLIT: 32,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    borderDraw: false,
    spin: -Math.PI,
    enemySpin: -Math.PI,
    mobile: false,
    foodSides: 10,
    virusSides: 20,
    food: [
       {"width": 73, "height": 46, "column": 6, "row": 1, "begin": 0, "right": 0, "left": 1},
       {"width": 80, "height": 70, "column": 1, "row": 1, "begin": 0, "right": 0, "left": 1},
       {"width": 60, "height": 50, "column": 1, "row": 1, "begin": 0, "right": 0, "left": 1},
       {"width": 60, "height": 48, "column": 1, "row": 1, "begin": 0, "right": 0, "left": 1}
    ],
    jellyFish: [
        {"width": 94, "height": 138, "column": 3, "row": 1, "begin": 0, "right": 0, "left": 1},
        {"width": 94, "height": 138, "column": 3, "row": 1, "begin": 0, "right": 1, "left": 1}
    ],
    enemy: [
        {"width": 273, "height": 215/2, "column": 3, "row": 1, "begin": 0, "right": 0, "left": 1}
    ],
    boom: [
        {"width": 85, "height": 86, "column": 10, "row": 1, "begin": 0, "right": 0, "left": 1}
    ],
    airBubble: {
        "maxAirBubble": 3,
        "typeMax": 4
    },
    // Canvas
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    gameWidth: 5000,
    gameHeight: 5000,
    xoffset: -0,
    yoffset: -0,
    gameStart: false,
    disconnected: false,
    died: false,
    kicked: false,
    continuity: false,
    startPingTime: 0,
    toggleMassState: 0,
    backgroundColor: '#f2fbff',
    lineColor: '#000000',
    red: '#007703',
    yellow: '#fffd34',
    fishType:[
        {"mass": 20, "width": 128, "height": 94, "column": 1, "row": 1},    
        {"mass": 30, "width": 128, "height": 121, "column":1, "row": 1}, 
        {"mass": 40, "width": 92,  "height": 116, "column":1, "row": 1}, 
        {"mass": 50, "width": 142, "height": 119, "column":1, "row": 1}, 
        {"mass": 60, "width": 166, "height": 134, "column":1, "row": 1},    
        {"mass": 70, "width": 154, "height": 126, "column":1, "row": 1}, 
        {"mass": 80, "width": 168, "height": 126, "column":1, "row": 1}, 
        {"mass": 90, "width": 154, "height": 125, "column":1, "row": 1}
     ],
     direct: {
        "LEFT": 1,
        "RIGHT": 2
    },
    colorFocus: "#FF482E",
    colorBlur: "#66ADFF",
    radarWidth: 150,
    radarHeight:150,
    radiusRadar: 2,
    colorUserRadar: "#66ADFF",
    colorPlayerRadar: "#FFFFFF",
    status: {
        "LIVE": 0,
        "DIED": 1
    },
    imageShock: {
        x: 163,
        y: 80
    },
    levelUp:{
        x: -30,
        y: 60,
    },
    hasEnemy: false,
    normalMaxMove: 10,
    speedMaxMove: 80,
    timeServer: 17,
    timeDraw: 1,
    timeStep: 1
};
