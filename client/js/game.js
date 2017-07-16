function Game() { };
var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var c = document.getElementById('cvs');
var radarCvs = document.getElementById('radar');
var shadowCanvas = document.getElementById('shadowCanvas');
var shadowCtx = shadowCanvas.getContext('2d');
var graph = c.getContext('2d');
var graphRada = radarCvs.getContext('2d');
shadowCanvas.width = screenWidth, shadowCanvas.height = screenHeight;
c.width = screenWidth/2; c.height = screenHeight/2;
radarCvs.width =global.radarWidth; radarCvs.height = global.radarHeight;

var maxBubble = 2;
var numberUser = 0;
var foodConfig = {
    border: 0,
};
var start = {};
var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screenWidth / 2,
    y: global.screenHeight / 2,
    screenWidth: global.screenWidth,
    screenHeight: global.screenHeight,
    target: {x: global.screenWidth / 2, y: global.screenHeight / 2}
};
global.player = player;
var foods = [];
var lights = [];
var booms = [];
var jellyFish = [];
var itemBoom = [];
var enemies = [];
var airBubbles = [];
var radarUser = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var bots = [];
var bubbles = [];
var airBubbles = [];
var target = {x: player.x, y: player.y};
global.target = target;
var imageItemBoom = document.getElementById("itemBoom");
var imageBlasting = document.getElementById("blasting");
var imageShock = document.getElementById("shock");
var imageLight = document.getElementById("light");
var imageBubble = document.getElementById("bubble");
var imageFood = [
    document.getElementById("food"),
    document.getElementById("food2"),
    document.getElementById("food3"),
    document.getElementById("food4")
    ];
var imageAirBubble = [
    document.getElementById("airBubble"),
    document.getElementById("airBubble2"),
    document.getElementById("airBubble3"),
    document.getElementById("airBubble4")
    ];
var imageShark = document.getElementById("shark");
var imageJellyFish = document.getElementById("jellyFish");
var imageEat = document.getElementById("eating");

var audioBubble = document.getElementById("audio_bubble");
var audioBoom = document.getElementById("audio_boom");
    audioBoom.volume = 0.6;
var audioGrow = document.getElementById("audio_grow");
var audioGameover = document.getElementById("audio_gameover");
var audioMain = document.getElementById("audio_main");
    audioMain.volume = 0.4;
var audioShark = document.getElementById("audio_shark");
$( "#speed" ).click(function() {
    socket.emit('mouseLeft');
    window.canvas.reenviar = false;
});

$( "#absorb" ).click(function() {
    socket.emit('mouseRight');
    window.canvas.reenviar = false;
});

$( "#boom" ).click(function() {
    socket.emit('addBoom');
    window.canvas.reenviar = false;
});
function resize(socket) {
    if (!socket) return;

    player.screenWidth = c.width = global.screenWidth = global.playerType == 'player' ? window.innerWidth : global.gameWidth;
    player.screenHeight = c.height = global.screenHeight = global.playerType == 'player' ? window.innerHeight : global.gameHeight;

    if (global.playerType == 'spectate') {
        player.x = global.gameWidth / 2;
        player.y = global.gameHeight / 2;
    }

    socket.emit('windowResized', { screenWidth: global.screenWidth, screenHeight: global.screenHeight });
}
var lastTarget = undefined;
var deltaTime = 0;
var lastDeltaTime = new Date().getTime();

var latency = 0;
var lastLatencyTime = new Date().getTime();
var historyDuration = 0;
var historyFrame = [];
var dt = 0;
var predictedState = undefined; 
var onLatency = true;
var latencyIndex = 0;
var latencyIndexTime = [];
function OnServerFrame(serverFrame){
    // console.log(serverFrame);
    dt = Math.max(0, historyDuration - latency);
    historyDuration -= dt;
    while(historyFrame.length > 0 && dt > 0){
        if(dt >= historyFrame[0].DeltaTime){
            dt -= historyFrame[0].DeltaTime;
            historyFrame.splice(0,1);
        }else {
            var t = 1 - dt/ historyFrame[0].DeltaTime;
            historyFrame[0].DeltaTime -= dt;
            historyFrame[0].DeltaPosition.x *= t;
            historyFrame[0].DeltaPosition.y *= t;
            break;
        }
    }
    predictedState = Object.assign({},serverFrame);
    // console.log("predictedState: ", predictedState);
    for (var i = 0; i < historyFrame.length; i++) {
        predictedState.x += historyFrame[i].DeltaPosition.x;
        predictedState.y += historyFrame[i].DeltaPosition.y;
    }
}
Game.prototype.handleNetwork = function(socket, socketServer,room) {
window.canvas = new Canvas();
window.chat = new ChatClient();
  console.log('Game connection process here');
    // Handle error.
    socket.on('connect_failed', function () {
        socket.close();
        global.disconnected = true;
    });

    socket.on('disconnect', function () {
        socket.close();
        global.disconnected = true;
        window.setTimeout(function() {
            // document.getElementById('gameAreaWrapper').style.opacity = 0;
            // document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            global.died = false;
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
    });

    // Handle connection.
    socket.on('welcome', function (playerSettings) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screenWidth;
        player.screenHeight = global.screenHeight;
        player.target = window.canvas.target;
        global.player = player;
        window.chat.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        c.focus();
    });

    socket.on('gameSetup', function(data) {
        global.gameWidth = data.gameWidth;
        global.gameHeight = data.gameHeight;
        resize(socket);
    });

    socket.on('leaderboard', function (data) {
        leaderboard = data.leaderboard;
        var status = '<span class="title">Leaderboard</span>';
        for (var i = 0; i < leaderboard.length; i++) {
            status += '<br />';
            if (leaderboard[i].id == player.id){
                if(leaderboard[i].name.length !== 0)
                    status += '<div class="me" style="float:left;">' + (i + 1) + '. ' + leaderboard[i].name + '</div><div style="float:right">'+ leaderboard[i].kill+ "</div>";
                else
                    status += '<div class="me" style="float:left">' + (i + 1) + '. An unnamed fish</div><div style="float:right">'+ leaderboard[i].kill+ "</div>";
            } else {
                if(leaderboard[i].name.length !== 0)
                    status += '<div style="float:left;">' + (i + 1) + '. ' + leaderboard[i].name + '</div><div style="float:right">'+ leaderboard[i].kill+ "</div>";
                else
                    status += '<div style="float:left">' + (i + 1) + '. An unnamed fish</div><div style="float:right">'+ leaderboard[i].kill+ "</div>";
            }

        }
        document.getElementById('status').innerHTML = status;
    });
    socket.on('serverSendPlayerChat', function (data) {
        window.chat.addChatLine(data.sender, data.message, false);
    });
    // Handle movement.
    socket.on('serverTellPlayerMove', function (userData, foodsList, itemBoomList, massList, lightList, jellyFishList, boomList, visibleEnemy, botVisible, radarUsr, nbUser) {
        var currentTime = new Date().getTime();
        global.timeDraw = 0;
        global.timeStep = currentTime - lastLatencyTime;
        // onLatency = true;
        // latency = deltaTime + 10;
        lastLatencyTime = currentTime;
        
        numberUser = nbUser;
        // lastPlayer = {
        //     x: player.x,
        //     y: player.y
        // };
        // countDelay = 0;
        var playerData;
        for(var i =0; i< userData.length; i++) {
            if(typeof(userData[i].id) == "undefined") {
                playerData = userData[i];
                i = userData.length;
            }
        }
    
        if(playerData != undefined){
            // player = playerData;

            var index = playerData.latencyIndex;
            // console.log("index : ", index );
            // console.log("latencyIndexTime : ", latencyIndexTime );
            for (var i = 0; i < latencyIndexTime.length; i++) {
                if(latencyIndexTime[i].index < index){
                    latencyIndexTime.splice(i,1);
                    i--;
                }else {
                    latency = new Date().getTime() - latencyIndexTime[i].time;
                    // console.log("latency: ", latency);
                    // console.log("latencyIndex: ", index);
                    break;
                }
            }

            OnServerFrame(playerData);
            // console.log("position: ", playerData.x - predictedState.x, playerData.y - predictedState.y);
            // player.x = playerData.x;
            // player.y = playerData.y;
            player.numberBoom = playerData.numberBoom;
            player.target = playerData.target;
            player.radius = playerData.radius;
            player.name = playerData.name;
            player.direction = playerData.direction;
            player.frameAnimation = playerData.frameAnimation;
            player.massTotal = Math.round(playerData.massTotal);
            player.kill = playerData.kill;
            player.timeAcceleration = playerData.timeAcceleration;
            player.timeSpeed = playerData.timeSpeed;
            player.width = playerData.width;
            player.height = playerData.height;
            player.levelUp = playerData.levelUp;
            player.jellyCollision = playerData.jellyCollision;
            player.living = playerData.living;
            player.light = playerData.light;
            player.eatting = playerData.eatting;
            player.rank = playerData.rank;
            player.speed = playerData.speed;
            player.isHut = playerData.isHut;
            player.radius = playerData.radius;
        }

        users = userData;
        foods = foodsList;
        radarUser = radarUsr;
        itemBoom = itemBoomList;
        fireFood = massList;    
        jellyFish = jellyFishList;
        booms = boomList;
        enemies = visibleEnemy;
        bots = botVisible;
        lights = lightList;
        if(enemies.length > 0  && !global.hasEnemy){
            audioShark.play();
            global.hasEnemy = true;
        }
        if(enemies.length == 0){
            global.hasEnemy = false;
        }
    });

    // Death.
    socket.on('RIP', function () {
        global.gameStart = false;
        global.died = true;
        // socketServer.emit('leaveRoom', room);
        window.setTimeout(function() {
            // document.getElementById('gameAreaWrapper').style.opacity = 0;
            // document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            global.died = false;
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
    });
    
}

Game.prototype.handleLogic = function() {
  console.log('Game is running');
  // This is where you update your game logic
}
function addAirBubble(toAdd) {
    while (toAdd--) {
        airBubbles.push({
            // Make IDs unique.
            id: ((new Date()).getTime() + '' + airBubbles.length) >>> 0,
            x: Math.round((Math.random()*2 -1)*global.screenWidth/2) + player.x,
            y: global.screenHeight/2 + player.y,
            target: {
                x : 0,
                y : Math.round(Math.random()*global.screenHeight/2) +player.y
            },
            level: Math.round(Math.random()*(global.airBubble.typeMax - 1))
        });
    }
}
function addBubble(toAdd) {
    while (toAdd--) {
        bubbles.push({
            // Make IDs unique.
            id: ((new Date()).getTime() + '' + bubbles.length) >>> 0,
            x: global.screenWidth/2 + Math.random()* 100 - 50,
            y: global.screenHeight/2 + Math.random() *50,
            target: {
                x : 0,
                y : global.screenHeight/2 - Math.random() *200
            },
            scale: Math.random()* 0.5
        });
    }
}
function drawCircle(graph, centerX, centerY, radius, sides) {
    var theta = 0;
    var x = 0;
    var y = 0;

    graph.beginPath();

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        graph.lineTo(x, y);
    }

    graph.closePath();
    graph.fill();
    graph.stroke();
}

function drawRadar(radarData){
    graphRada.clearRect(0,0,global.radarWidth, global.radarHeight);
    graphRada.fillStyle = global.colorPlayerRadar;
    graphRada.lineWidth = 0;
    drawCircle(graphRada, Math.floor(player.x / global.gameWidth * global.radarWidth) ,
        Math.floor(player.y / global.gameHeight * global.radarHeight),
        4, global.foodSides);

    graphRada.fillStyle = global.colorUserRadar;
    radarData.forEach(function(item){
        drawCircle(graphRada, Math.floor(item.x / global.gameWidth * global.radarWidth) ,
        Math.floor(item.y / global.gameHeight * global.radarHeight),
        global.radiusRadar, global.foodSides);
        
    });

}


function drawJellyFish(obj) {
 graph.beginPath();

    var i = obj.level;
    drawSprite(imageJellyFish, global.jellyFish[i].begin, global.jellyFish[i].column, global.jellyFish[i].right, global.jellyFish[i].width, global.jellyFish[i].height,obj.frameAnimation, obj, player);

 graph.closePath();
}

function drawSpriteObj(image, sprite, obj) {
    // var i = obj.level;
    // graph.drawImage(imageFood[i],obj.x - player.x + global.screenWidth / 2,obj.y - player.y + global.screenHeight / 2);
    if(obj.jellyCollision != undefined && obj.jellyCollision.status){
        graph.drawImage(imageShock, global.screenWidth / 2 -80 + obj.x - player.x , global.screenHeight / 2 -100 + obj.y - player.y);
    }
    if(obj.direction == undefined){
        drawSprite(image, sprite.begin, sprite.column, sprite.right, sprite.width, sprite.height,obj.frameAnimation, obj, player);
        return;
    }
    if(obj.direction == global.direct.RIGHT){
            drawSprite(image, sprite.begin, sprite.column, sprite.right, sprite.width, sprite.height,obj.frameAnimation, obj, player);
        } else {
            drawSprite(image, sprite.begin, sprite.column, sprite.left, sprite.width, sprite.height,obj.frameAnimation, obj, player);
    }
   
}

function drawFireFood(mass) {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = playerConfig.border+10;
    drawCircle(graph, mass.x - player.x + global.screenWidth / 2,
               mass.y - player.y + global.screenHeight / 2,
               mass.radius-5, 18 + (~~(mass.masa/5)));
}

function drawBoom(obj) {
    var sprite = global.boom[0];
    if(obj.status == global.status.LIVE){
        graph.strokeStyle = '#eddd07';
        graph.fillStyle = '#f23744';
        graph.lineWidth = playerConfig.border+10;
        drawCircle(graph, obj.x - player.x + global.screenWidth / 2,
                   obj.y - player.y + global.screenHeight / 2,
                   40, 20);
        //drawSprite(imageBoom, sprite.begin, sprite.column, sprite.right, sprite.width, sprite.height,obj.frameAnimation, obj, player);
    }else {
        graph.drawImage(imageBlasting,obj.x - player.x + global.screenWidth / 2 - imageBlasting.width/2,obj.y - player.y + global.screenHeight / 2 - imageBlasting.height/2);
        audioBoom.play();
    }
}

function drawItemBoom(itemBoom) {
    graph.drawImage(imageItemBoom,itemBoom.x - player.x + global.screenWidth / 2,itemBoom.y - player.y + global.screenHeight / 2);
}

function getFishSpriteData(level){
    var fishSprite = {};
    var fish = {
        type: global.fishType[level],
        state: level + 1
    };

    fishSprite.type = fish["state"];
    fishSprite.state = document.getElementById("state" + fish["state"]);
    fishSprite.colBegin = 0;
    fishSprite.rawLeftBegin = 1;
    fishSprite.rawRightBegin = 0;
    fishSprite.colCount = fish["type"].column;
    fishSprite.rowCount = fish["type"].row;
    fishSprite.width = fish["type"].width;
    fishSprite.height = fish["type"].height;
    
    return fishSprite;
}

function drawSprite(sprite, beginCol, col, beginRow, width, height, posSprite, user, player){
    graph.drawImage(sprite,(posSprite % col + beginCol)*width,height*(parseInt(posSprite / col) + beginRow), width, height, ((global.screenWidth / 2) - width /2) + (user.x - player.x), ((global.screenHeight / 2) - height / 2) + (user.y - player.y), width, height);
}

var tmp = 0;

function distance2Points(x1, y1, x2, y2){
    return (Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)));
}

var prevPositionPlayer = {
    x: 0,
    y: 0
};

const maxDistanceMove = 20;
var positionQueue = [];

var prevPositionUsers = [];
var curPositionUsers = [];


function getPosition(user){
    var result = {};
    result.id = user.id;
    result.x = user.x;
    result.y = user.y;

    return result;
}

function updateStateFish(){
    var items = document.getElementsByClassName('img-color-2');
    
    if(player.timeSpeed.status){
        items[0].style.backgroundColor = global.colorFocus;
    }else items[0].style.backgroundColor = global.colorBlur;

    if(player.timeAcceleration.status){    
        items[1].style.backgroundColor = global.colorFocus;
    }else items[1].style.backgroundColor = global.colorBlur;

    if(player.numberBoom.status){
        items[2].style.backgroundColor = global.colorFocus;
    }else items[2].style.backgroundColor = global.colorBlur;

    $('#numberBoom').text(player.numberBoom.number);
    $('#yourKill').text(player.kill);
    $('#yourRank').text (player.rank + "/" + numberUser);
    var colorIco = document.getElementsByClassName('img-color');
    for (var i = 0; i < colorIco.length; i++) {
        colorIco[i].style.backgroundColor=global.colorBlur;
    }
    colorIco[player.levelUp.level].style.backgroundColor = global.colorFocus;


}

function getDistance(p1, p2) {
    try{
        if(p2 == undefined)
            return Infinity;
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));    
    }catch(err){
        console.log('Error');
        console.log(err);
        console.log(p1,p2);
    }
    
}

function drawPlayersNew(userCurrent) {
    if(!userCurrent.living.status)
        return;
    // if(userCurrent.id == undefined){
    //     userCurrent = player;
    // }
    var currentSprite = getFishSpriteData(userCurrent.levelUp.level);
    
    

    graph.lineWidth = 1;
    graph.strokeStyle = global.lineColor;
    graph.globalAlpha = 1;
    graph.beginPath();

    if(userCurrent.jellyCollision.status){
       graph.drawImage(imageShock, global.screenWidth / 2 - global.imageShock.x/2 + userCurrent.x - player.x , global.screenHeight / 2 - global.imageShock.y + userCurrent.y - player.y);
    }
    // var positionUser = {};
    if(userCurrent.type != "bot"){
        if(userCurrent.id != undefined && userCurrent.dataPosition != undefined){
            // console.log("AAA", userCurrent.dataPosition);

            // positionUser = {
            userCurrent.x = userCurrent.dataPosition[0].x + (userCurrent.dataPosition[1].x - userCurrent.dataPosition[0].x)*( global.timeDraw /global.timeStep);
            userCurrent.y = userCurrent.dataPosition[0].y + (userCurrent.dataPosition[1].y - userCurrent.dataPosition[0].y)*( global.timeDraw /global.timeStep);
            // };
            // if(global.timeDraw > global.timeStep){
            //     userCurrent.dataPosition[1].x = positionUser.x;   
            //     userCurrent.dataPosition[1].y = positionUser.y;
            // }
            if(isNaN(positionUser.x)){
                console.log("BBB: ", userCurrent.dataPosition, global.timeDraw, global.timeStep);
            }
            // console.log("AAA", userCurrent.dataPosition);
            
        }else {
            userCurrent.x = player.x;
            userCurrent.y = player.y;
        }
    }
    var circle = {
        x: userCurrent.x - start.x,
        y: userCurrent.y - start.y
    };
    if(userCurrent.direction == global.direct.RIGHT){
        drawSprite(currentSprite.state, currentSprite.colBegin, currentSprite.colCount, currentSprite.rawRightBegin, currentSprite.width, currentSprite.height, userCurrent.frameAnimation, userCurrent, player);
    } else {
        drawSprite(currentSprite.state, currentSprite.colBegin, currentSprite.colCount, currentSprite.rawLeftBegin , currentSprite.width, currentSprite.height, userCurrent.frameAnimation, userCurrent, player);
    }
    if(userCurrent.id == undefined){
        waveImage(userCurrent);
        graph.fillStyle = global.red;
        graph.fillRect(circle.x +(- 100)/2 ,circle.y + currentSprite.height/2 + 10,100,10);
        graph.fillStyle = global.yellow;
        var massPercent = Math.min(100,(userCurrent.massTotal - userCurrent.levelUp.minMass )/ (userCurrent.levelUp.targetMass - userCurrent.levelUp.minMass)* 100);
        graph.fillRect(circle.x + (- 100)/2,circle.y + currentSprite.height/2 + 10,massPercent,10);
        if(userCurrent.levelUp.status){
            audioGrow.play();
            graph.drawImage(imageEat,userCurrent.levelUp.level * 103 ,0,103, 100,circle.x, circle.y - 150,103,100);
        }
    
    }
    graph.stroke();
    graph.globalAlpha = 1;

    graph.lineJoin = 'round';
    graph.lineCap = 'round';
    graph.fill();
    graph.stroke();
    var nameCell = "";
    if(typeof(userCurrent.id) == "undefined")
        nameCell = player.name;
    else
        nameCell = userCurrent.name;

    var fontSize = Math.max(54 / 3, 12);
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = playerConfig.textColor;
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = 'round';
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold ' + fontSize + 'px sans-serif';

    if (global.toggleMassState === 0) {
        graph.strokeText(nameCell, circle.x, circle.y);
        graph.fillText(nameCell, circle.x, circle.y);
    } else {
        graph.strokeText(nameCell, circle.x, circle.y);
        graph.fillText(nameCell, circle.x, circle.y);
        graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
        if(nameCell.length === 0) fontSize = 0;
        graph.strokeText(Math.round(userCurrent.massTotal), circle.x, circle.y+fontSize);
        graph.fillText(Math.round(userCurrent.massTotal), circle.x, circle.y+fontSize);
    }
}


function valueInRange(min, max, value) {
    return Math.min(max, Math.max(min, value));
}

var i = 0;
var seaweedSpritePos = 0;
var s = 0;
const speed_seaweed = 10;

var seaweedSprite = {
  colLeftBegin : 0,
  colRightBegin : 0,
  colCount : 8,
  rawLeftBegin : 0,
  rawRightBegin : 1,
  rawCount : 1,
  width : 80,
  height : 164/2
}

function drawSeaweed(sprite, beginCol, col, beginRaw, raw, width, height, posSprite, player){

    graph.drawImage(sprite, (posSprite % col + beginCol)*width, height*(parseInt(posSprite / col) + beginRaw), width, height, (global.gameWidth / 2 - (player.x - global.screenWidth / 2)), ((global.gameHeight - 50) - (player.y - global.screenHeight / 2)), width, height);

}

function drawgrid(graph) {
    graph.lineWidth = 1;
    graph.strokeStyle = global.lineColor;
    graph.globalAlpha = 0.75;
    // graph.beginPath();

    // graph.fillStyle="white";
    graph.  clearRect(0, 0, global.screenWidth, global.screenWidth);
    var img = document.getElementById("bgImg");
    graph.drawImage(img, (img.width-img.width*(global.screenWidth/global.gameWidth))*((player.x) / global.gameWidth), (img.height-img.height*(global.screenHeight/global.gameHeight))*((player.y)/global.gameHeight), img.width*(global.screenWidth/global.gameWidth), img.height*(global.screenHeight/global.gameHeight), 0, 0, global.screenWidth, global.screenHeight);
    graph.stroke();
    graph.globalAlpha = 1;
   // shadowCtx
    shadowCtx.fillStyle= '#000000';
    shadowCtx.fillRect(0,0,global.screenWidth,global.screenHeight);
    
    shadowCtx.globalCompositeOperation = "destination-out";
    var gradient;
    
    {   gradient = shadowCtx.createRadialGradient(global.gameWidth/2- player.x, global.gameHeight/50 - player.y, global.gameWidth/10, global.gameWidth/2 - player.x, global.gameHeight/4 - player.y, global.gameWidth/2);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        gradient.addColorStop(1, "rgba(255, 255, 255, .1)");
        shadowCtx.fillStyle = gradient;
        shadowCtx.fillRect(0, 0, global.screenWidth, global.screenHeight);
    }
    
    gradient = shadowCtx.createRadialGradient(global.screenWidth/2, global.screenHeight/2 + 30, 10, global.screenWidth/2, global.screenHeight/2 + 30, player.light.radius);
    
    gradient.addColorStop(       0, 'rgba( 0, 0, 0,  1 )' );
    gradient.addColorStop( 0.8, 'rgba( 0, 0, 0, .1 )' );
    gradient.addColorStop(       1, 'rgba( 0, 0, 0,  0 )' );
    shadowCtx.fillStyle = gradient;
    shadowCtx.fillRect(0, 0, global.screenWidth, global.screenHeight);

    for (var i = 0; i < lights.length; i++) {
        var item = lights[i];
        gradient = shadowCtx.createRadialGradient(item.x - start.x +30, item.y - start.y +30, 10, item.x - start.x +30, item.y - start.y +30, 30);
        gradient.addColorStop(       0, 'rgba( 0, 0, 0,  1 )' );
        gradient.addColorStop( 0.8, 'rgba( 0, 0, 0, .1 )' );
        gradient.addColorStop(       1, 'rgba( 0, 0, 0,  0 )' );
        shadowCtx.fillStyle = gradient;
        shadowCtx.fillRect(0, 0, global.screenWidth, global.screenHeight);
    }
    shadowCtx.globalCompositeOperation="source-over";
}

function waveImage(obj) {
    // if(player.id -= -1)
    //     return;
    var w = obj.width,
        h = obj.height ,
        posX = Math.round(obj.x - start.x - obj.width/2),
        posY = Math.round(obj.y - start.y - obj.height/2);
    var options = {
            squeeze: -0.12,
            period : 150,
            amplitude: 3,
            wavelength: Math.round(w/2)
        };
    // var options = obj.options;
          
    var od = graph.getImageData( posX, posY, w, h).data;
    
    var id = graph.getImageData(posX, posY, w, h ),
        d = id.data,
        now = ( new Date() )/options.period,
        y,
        x,
        lastO,
        shade,
        sq = ( y - h/2 ) * options.squeeze,
        px,
        pct,
        o,
        y2,
        opx;

    for ( y = 0; y < h; y += 1 ) {
        lastO = 0;
        shade = 0;
        sq = ( y - h/2 ) * options.squeeze;

        for ( x = 0; x < w; x += 1 ) {
            if(obj.direction == global.direct.LEFT)
                px  = ( y * w + x ) * 4;
            else px  = ( y * w + w-x ) * 4;
            pct = x/w;
            o   = Math.cos( x/options.wavelength - now ) * options.amplitude * pct;
            y2  = y + ( o + sq * pct ) << 0;
            if(obj.direction == global.direct.LEFT)
                opx = ( y2 * w + x ) * 4;
            else opx = ( y2 * w + w-x ) * 4;
            // opx = ( y2 * w + x ) * 4;
            // console.log(opx);
            // shade = (o-lastO) * options.shading;
            d[px+0] = od[opx  ]+shade;
            d[px+1] = od[opx+1]+shade;
            d[px+2] = od[opx+2]+shade;
            d[px+3] = od[opx+3];
            lastO = o;
        }
    }
    graph.putImageData( id, posX, posY );

}

function updateBubble(){
    for (var i = 0; i < bubbles.length; i++) {
        bubbles[i].y -= Math.round(Math.random() * 4 );
        graph.drawImage(imageBubble, 0, 0, imageBubble.width, imageBubble.height, bubbles[i].x, bubbles[i].y, Math.round(imageBubble.width * bubbles[i].scale), Math.round(imageBubble.height * bubbles[i].scale));
        if(bubbles[i].y < bubbles[i].target.y){
            bubbles[i] = {};
            bubbles.splice(i,1);
            i--;
        }
    }
    if(maxBubble > bubbles.length){
        addBubble(maxBubble - bubbles.length);
    }

    for (var i = 0; i < airBubbles.length; i++) {
            airBubbles[i].y -=7;
            graph.drawImage(imageAirBubble[airBubbles[i].level], airBubbles[i].x - start.x,airBubbles[i].y - start.y);
            if(airBubbles[i].target.y > airBubbles[i].y){
                airBubbles[i] = {};
                airBubbles.splice(i,1);
                i--;
            }
    }

    if(global.airBubble.maxAirBubble > airBubbles.length){
        addAirBubble(global.airBubble.maxAirBubble - airBubbles.length);
    }

}

function movePlayer(player, time) {
   
    // var position ={
    //     x: player.x,
    //     y: player.y
    // };
    // console.log("OLD: ", position.x, " ", position.y);
    if(player.isHut == true){
        var deg = Math.atan2(player.target.y, player.target.x);

        var slowDown = 1;
        
        // if(player.target != undefined)
        //     slowDown = 1 + 1.0 / util.log(Math.max(10,util.getDistance(position, player.target)), 20);

       deltaY = player.speedAbsorb * (time/ global.timeServer) * Math.sin(deg)/slowDown;
       deltaX = player.speedAbsorb * (time/ global.timeServer) * Math.cos(deg)/slowDown;
        
        player.y += deltaY;
        player.x += deltaX;
        player.speedAbsorb -= 0.5;
        if(player.speedAbsorb < 0) {
            player.isHut = false;
        }
        return;
    }

    if(player.jellyCollision.status == true){
        return;
    }
    var deg, dist;
    // if(player.type == c.typeObj.AIBOT){
    //     deg = player.deg;
    // }
    // else{
    var targetPos = player.target;
    if(targetPos.x == 0 && targetPos.y == 0){
        return;
    }
    if(targetPos.x > 0)
        player.direction = global.direct.RIGHT;
    else player.direction = global.direct.LEFT;
    dist = Math.sqrt(Math.pow(targetPos.y, 2) + Math.pow(targetPos.x, 2));
    deg = Math.atan2(targetPos.y, targetPos.x);
    // }
    var slowDown = 1;
    // if(player.speed <= 6.25) {
    //     slowDown =  initMassLog + 1;
    // }
    // if(player.target != undefined)
    //     slowDown = 1 + 1.0 / util.log(Math.max(10,util.getDistance(position, player.target)), 20);

    var deltaY = player.speed * (time/ global.timeServer) * Math.sin(deg)/ slowDown;
    var deltaX = player.speed * (time/ global.timeServer) * Math.cos(deg)/ slowDown;

    // if(player.speed > c.speedPlayer) {
    //     player.speed -= 0.5;
    // }
    if (dist < (50 + player.radius)) {
        deltaY *= dist / (50 + player.radius);
        deltaX *= dist / (50 + player.radius);
    }
    var temp = {x: player.x, y: player.y};
    if (!isNaN(deltaY)) {
        temp.y += deltaY;
    }
    if (!isNaN(deltaX)) {
        temp.x += deltaX;
    }
 
    var borderCalc = player.radius / 3;
    if (temp.x > global.gameWidth - borderCalc) {
        temp.x = global.gameWidth - borderCalc;
    }
    if (temp.y > global.gameHeight - borderCalc) {
        temp.y = global.gameHeight - borderCalc;
    }
    if (temp.x < borderCalc) {
        temp.x = borderCalc;
    }
    if (temp.y < borderCalc) {
        temp.y = borderCalc;
    }
    player.x = temp.x;
    player.y = temp.y;

    // console.log("NEW: ", player.x , " ", player.y);
}

// var d5 = new Date().getTime();
// var countDelay = 0;

function Update(deltaTime, lastTarget){

    if(predictedState == undefined){
        predictedState = Object.assign({}, player);
    }
    var newState = Object.assign({}, predictedState);
    // console.log(predictedState, newState);
    newState.target = Object.assign({}, lastTarget);
    movePlayer(newState, deltaTime);
    var frame = {
        DeltaPosition: {x: 0, y: 0},
        DeltaTime: deltaTime
    };
    frame.DeltaPosition.x = newState.x - predictedState.x;
    frame.DeltaPosition.y = newState.y - predictedState.y;
    // console.log(frame);
    // console.log("historyFrame : ", historyFrame);
    historyFrame.push(Object.assign({},frame));
    historyDuration += deltaTime;

    // var extrapolatedPosition = Object.assign({}, predictedState);
    // extrapolatedPosition.target = Object.assign({}, lastTarget);
    // if(latencyIndex  != 0){
    //     movePlayer(extrapolatedPosition, latency * 0.05);
    //     var t = deltaTime/ (latency *1.05);

    //     player.x = (extrapolatedPosition.x - player.x)* t;
    //     player.y = (extrapolatedPosition.y - player.y)* t;

    predictedState = newState;
    // }
    player.x = newState.x;
    player.y = newState.y;

}
Game.prototype.handleGraphics = function() {
  if (global.died) {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        graph.fillText('GAME OVER!', global.screenWidth / 2, global.screenHeight / 2);
        audioGameover.play();
        audioBubble.pause();
        setTimeout(function(){audioMain.play();},2000);
        document.getElementById('shadowCanvas').style.display = "none";
        document.getElementById('radar').style.display = "none";
        $('#gameAreaWrapper').fadeOut(2000);
        document.getElementById('baner-icon').style.display = "none";
        document.getElementById('skill-icon').style.display = "none";
        $('#startMenuWrapper').fadeIn(2000);
        $('#score').fadeIn(2000);
        $('#highScore').text(player.kill);

    }
    else if (!global.disconnected) {
        if (global.gameStart) {

            // var d6 = new Date().getTime();
            // var time = d6 - d5;
            // // console.log("Time3: ", d6 - d5);
            // d5 = d6;
            // console.log(lastPlayer.x, lastPlayer.y);
            console.log("pos: ", player.x, player.y);
            // // console.log("player: ", player.x, player.y);
            var targetHandle = {x: window.canvas.target.x, y: window.canvas.target.y, latencyIndex : latencyIndex};
            // var distance = getDistance(lastPlayer, player);
            // var cc = lastPlayer.x - player.x;
            // // console.log("distance: ", cc < 0 ? -distance : distance);
            // // console.log("player: ", player);

            // if(distance <= global.normalMaxMove && player.speed == 9.5 || distance <= global.speedMaxMove && player.speed > 9.5){
                
            //     if(distance == 0 && lastTarget != undefined){
            //         countDelay ++;
            //         // if(countDelay == 3){
            //             // console.log("type: ", 1);
            //             player.target = lastTarget;
            //             // for (var i = 0; i < users.length; i++) {
            //             //     // users[i]
            //             //     movePlayer(users[i], time);
            //             // }
            //             // movePlayer(player, time);
            //             // console.log("Distance prediction: ", getDistance(lastPlayer, player));
            //         // }
            //     }
            //     // else console.log("type: ", 0);
            // }
            // // else if(distance > global.normalMaxMove && player.speed == 9.5){
            // //     console.log("type: ", 2);
            // //     // player.x += (player.x - lastPlayer.x) * global.normalMaxMove /distance;
            // //     // player.y += (player.y - lastPlayer.y) * global.normalMaxMove /distance;
            // //     player.x = lastPlayer.x + (player.x - lastPlayer.x) * global.normalMaxMove /distance;
            // //     player.y = lastPlayer.y + (player.y - lastPlayer.y) * global.normalMaxMove /distance;

            // // }else if(distance > global.speedMaxMove && player.speed >= 9.5){
            // //     console.log("type: ", 3);
            // //     // player.x += (player.x - lastPlayer.x) * global.normalMaxMove /distance;
            // //     // player.y += (player.y - lastPlayer.y) * global.normalMaxMove /distance;
            // //     player.x = lastPlayer.x + (player.x - lastPlayer.x) * global.speedMaxMove /distance;
            // //     player.y = lastPlayer.y + (player.y - lastPlayer.y) * global.speedMaxMove /distance;
            // // }
            // lastPlayer.x = player.x;
            // lastPlayer.y = player.y;

            // users.forEach(function(u){
            //     if(u.id == undefined){
            //         // console.log("ZZZ");
            //         u.x = player.x;
            //         u.y = player.y;
            //     }
            // });

            var currentTime2 = new Date().getTime();
            deltaTime = currentTime2 - lastDeltaTime;
            global.timeDraw += deltaTime;
            lastDeltaTime = currentTime2;
            if(lastTarget == undefined){
                // lastTarget.x = player.target.x;
                // lastTarget.y = player.target.y;
                lastTarget = {x: targetHandle.x, y: targetHandle.y};
            }
            Update(deltaTime, lastTarget);

            start = {
                x: player.x - global.screenWidth/2,
                y: player.y - global.screenHeight/2
            };
            graph.fillStyle = global.backgroundColor;
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);
            drawgrid(graph);
            drawRadar(radarUser);
            fireFood.forEach(drawFireFood);
            
            for (var i = 0; i < lights.length; i++) {
                var item = lights[i];
                graph.drawImage(imageLight, item.x - start.x, item.y - start.y);
            }
            for (var i = 0; i < enemies.length; i++) {
                var item = enemies[i];
                drawSpriteObj(imageShark, global.enemy[0], item);

            }
            for (var i = 0; i < jellyFish.length; i++) {
                var item = jellyFish[i];
                drawSpriteObj(imageJellyFish, global.jellyFish[item.level], item);
            }
            
            for (var i = 0; i < foods.length; i++) {
                var item = foods[i];
                drawSpriteObj(imageFood[item.level], global.food[item.level], item);
            }

            itemBoom.forEach(drawItemBoom);
            booms.forEach(drawBoom);
            updateBubble();
            updateStateFish();
            users.forEach(drawPlayersNew);
            bots.forEach(drawPlayersNew);
            lastTarget = {x: targetHandle.x, y: targetHandle.y};
            socket.emit('0', targetHandle);
            latencyIndexTime.push({index: latencyIndex, time: new Date().getTime()});
            latencyIndex += 1;
            // console.log("latencyIndexUpdate: ", latencyIndex);

        } else {
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);
            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            graph.fillText('Game Over!', global.screenWidth / 2, global.screenHeight / 2);
            

        }
    } else {
        document.getElementById('shadowCanvas').style.display = "none";
        document.getElementById('radar').style.display = "none";
        document.getElementById('baner-icon').style.display = "none";
        document.getElementById('skill-icon').style.display = "none";
        document.getElementById('status').style.display = "none";
        document.getElementById('chatbox').style.display = "none";
        document.getElementById('info').style.display = "none";
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        
        graph.fillText('Disconnected!', global.screenWidth / 2, global.screenHeight / 2);
    }
}