var express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis');
var c  = require('./config.json');

var port = process.env.PORT || c.port,
    num_processes = 1;

if (cluster.isMaster) {
    // This stores our workers. We need to keep them to be able to reference
    // them based on source IP address. It's also useful for auto-restart,
    // for example.
    var workers = [];

    // Helper function for spawning worker at index 'i'.
    var spawn = function(i) {
        workers[i] = cluster.fork();

        // Optional: Restart worker on exit
        workers[i].on('exit', function(code, signal) {
            console.log('respawning worker', i);
            spawn(i);
        });
    };

    // Spawn workers.
    for (var i = 0; i < num_processes; i++) {
        spawn(i);
    }

    // Helper function for getting a worker index based on IP address.
    // This is a hot path so it should be really fast. The way it works
    // is by converting the IP address to a number by removing non numeric
  // characters, then compressing it to the number of slots we have.
    //
    // Compared against "real" hashing (from the sticky-session code) and
    // "real" IP number conversion, this function is on par in terms of
    // worker index distribution only much faster.
    var worker_index = function(ip, len) {
        var s = '';
        for (var i = 0, _len = ip.length; i < _len; i++) {
            if (!isNaN(ip[i])) {
                s += ip[i];
            }
        }

        return Number(s) % len;
    };

    // Create the outside facing server listening on our port.

    var server = net.createServer({ pauseOnConnect: true }, function(connection) {
        // We received a connection and need to pass it to the appropriate
        // worker. Get the worker for this connection's source IP and pass
        // it the connection.
        connection.on('end', () => {
            console.log('client disconnected');
        });

        var worker = workers[worker_index(connection.remoteAddress, num_processes)];
        worker.send('sticky-session:connection', connection);
    }).listen(port);
} else {
    var app = new express();

    // Here you might use middleware, attach routes, etc.

    // Don't expose our internal server to the outside.
    var server = app.listen(0, 'localhost'),
        io = sio(server);

    // Tell Socket.IO to use the redis adapter. By default, the redis
    // server is assumed to be on localhost:6379. You don't have to
    // specify them explicitly unless you want to change them.
    io.adapter(sio_redis({ host: 'redis-18452.c1.asia-northeast1-1.gce.cloud.redislabs.com', port: 18452 }));

    // Here you might use Socket.IO middleware for authorization etc.

    // Listen to messages sent from the master. Ignore everything else.
    process.on('message', function(message, connection) {
        if (message !== 'sticky-session:connection') {
            return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        server.emit('connection', connection);

        connection.resume();
    });

//============================================

// var express = require('express');
// var app     = express();
// var http    = require('http').Server(app);
// var io      = require('socket.io')(http);
var fishNames = require('fish-names');
var util    = require('./util.js');

var Boid = require('./Boid.js');
var SAT = require('sat');
var V = SAT.Vector;
var C = SAT.Circle;
// var port = process.env.PORT || c.port;
app.use(express.static(__dirname + '/../client'));

var users = [];
var massFood = [];
var light = [];
var enemies = [];
var airBubbles = [];
var booms = [];
var jellyFishs = [];
var itemBoom = [];
var food = [];
var boids = [];
var sockets = {};
var bots = [];
var leaderboard = [];
var leaderboardChanged = false;

var initMassLog = util.log(c.defaultPlayerMass, c.slowBase);

function addAIBot(toAdd){

    var radius = c.fishType["0"].radius;
    var massTotal = 0;
   while (toAdd--){
    var position = {
        x : util.randomInRange(0, c.gameWidth),
        y : util.randomInRange(0, c.gameHeight),
    };
    bots.push({
        id: ((new Date()).getTime() + '' + bots.length) >>> 0,
        deg: 0,
        name: fishNames.random(),
        x: position.x,
        y: position.y,
        numberBoom: {
            number: 0,
            status: true,
            time: 0
        },
        radius: radius,
        speed: c.speedPlayer,
        speedAnimation: 0,
        frameAnimation: 0,
        width: c.fishType["0"].width,
        height: c.fishType["0"].height,
        column: c.fishType["0"].column,
        row: c.fishType["0"].row,
        massTotal: massTotal,
        hue: Math.round(Math.random() * 360),
        type: c.typeObj.AIBOT,
        lastHeartbeat: new Date().getTime(),
        target: {
            x: 0,
            y: 0
        },
        isHut: false,
        direction: c.direct.LEFT,
        timeAcceleration: {status: true, timeClick: 0},
        timeSpeed: {status: true, timeClick: 0},
        jellyCollision: {
                status: false,
                time: 0
        },
        levelUp: {
            status: true,
            time: new Date().getTime(),
            level: 0,
            targetMass: c.fishType[0].maxMass,
            minMass : 0
        },
        strategy:{
            status: c.BOT.SAVE,
            bot: {
                lstSave: [],
                lstWarn: [],
                lstDanger:[],
                lstAttack:[]
            },
            user: {
                lstSave: [],
                lstWarn: [],
                lstDanger:[],
                lstAttack:[]
            }
        },
        living: {
            status: true,
            time: 0
        },
        kill: 0,
        light: {
            radius: 0
        },
        eatting: {
            status: false,
            time: 0
        }
    });
   } 
}
function findEnemyToEat(bot){
    bot.strategy.bot.lstDanger = [];
    bot.strategy.bot.lstWarn = [];
    bot.strategy.bot.lstSave = [];
    bot.strategy.bot.lstAttack = [];
    bot.strategy.user.lstAttack = [];
    bot.strategy.user.lstDanger = [];
    bot.strategy.user.lstWarn = [];
    bot.strategy.user.lstSave = [];
    var ereaDanger = new SAT.Circle(new SAT.Vector(bot.x, bot.y), 150);
    var ereaWarn = new SAT.Circle(new SAT.Vector(bot.x, bot.y), 300);

    var point ;
    for (var i = 0; i < users.length; i++) {
        if(!users[i].living && !users[i].levelUp && !bot.levelUp && users[i].living.status == false)
            continue;
        point = new SAT.Vector(users[i].x, users[i].y);
        if(SAT.pointInCircle(point, ereaDanger)){
            if( bot.levelUp.level < users[i].levelUp.level)
                bot.strategy.user.lstDanger.push(users[i].id);
            else if(bot.levelUp.level > users[i].levelUp.level)
                bot.strategy.user.lstAttack.push(users[i].id);
        }

        if(SAT.pointInCircle(point, ereaWarn)){
            if(bot.levelUp.level <= users[i].levelUp.level)
                bot.strategy.user.lstWarn.push(users[i].id);
            else if(bot.levelUp.level > users[i].levelUp.level)
                bot.strategy.user.lstSave.push(users[i].id);
        }
    }

    for (var i = 0; i < bots.length; i++) {
        if(bot.id == bots[i].id || bots[i].living.status == false)
            continue;
        point = new SAT.Vector(bots[i].x, bots[i].y);
        if(SAT.pointInCircle(point, ereaDanger)){
            if(bot.levelUp.level < bots[i].levelUp.level)
                bot.strategy.bot.lstDanger.push(bots[i].id);
            else if(bot.levelUp.level > bots[i].levelUp.level)
                bot.strategy.bot.lstAttack.push(bots[i].id);
        }

        if(SAT.pointInCircle(point, ereaWarn)){
            if(bot.levelUp.level <= bots[i].levelUp.level)
                bot.strategy.bot.lstWarn.push(bots[i].id);
            else if(bot.levelUp.level > bots[i].levelUp.level)
                bot.strategy.bot.lstSave.push(bots[i].id);
        }
    }

    if(bot.strategy.bot.lstDanger.length  + bot.strategy.user.lstDanger.length > 0){
        bot.strategy.status = c.BOT.DANGER;
    }else if(bot.strategy.bot.lstAttack.length  + bot.strategy.user.lstAttack.length > 0){
        bot.strategy.status = c.BOT.ATTACK;
    }else if(bot.strategy.bot.lstWarn.length  + bot.strategy.user.lstWarn.length > 0){
        bot.strategy.status = c.BOT.WARN;
    }else
        bot.strategy.status = c.BOT.SAVE;
}

function FindBestDirection(pos, lsEnemy){    
    var lstDeg = [];
    for (var i = 0; i < lsEnemy.length; i++) {
        var degTemp = Math.atan2(lsEnemy[i].y - pos.y, lsEnemy[i].x - pos.x);
        lstDeg.push(degTemp);
    }
    if(pos.x < 50){
        lstDeg.push(Math.PI);
    }
    if(pos.y < 50){
        lstDeg.push(Math.PI/2);
    }
    if(pos.x > c.gameWidth - 50){
        lstDeg.push(0);
    }
    if(pos.y > c.gameHeight - 50){
        lstDeg.push(-Math.PI/2);
    }
    
    lstDeg.sort( function(a, b) { return a - b; });
    var degMax = Math.PI * 2 + lstDeg[0] - lstDeg[lstDeg.length -1];
    var index = 0;

    for (var i = 1; i < lstDeg.length; i++) {
        var subDeg = lstDeg[i] - lstDeg[i-1];
        if(degMax < subDeg){
            degMax = subDeg;
            index = i;
        }
    }
    var deg = lstDeg[(index -1 + lstDeg.length) %lstDeg.length] + degMax/2;
    return deg;
}
function GetLst(bot, name){
    var lstEnemy = [];
    for (var i = 0; i < bot.strategy.user[name].length; i++) {
        var index = util.findIndex(users, bot.strategy.user[name][i]);
        if( index != -1){
            lstEnemy.push({
                x: users[index].x,
                y: users[index].y
            });
        }
    }

    for (var i = 0; i < bot.strategy.bot[name].length; i++) {
        if(bot.strategy.bot[name].id == bot.id)
            continue;
        var index = util.findIndex(bots, bot.strategy.bot[name][i]);
        if( index != -1){
            lstEnemy.push({
                x: bots[index].x,
                y: bots[index].y
            });
        }
    }
    return lstEnemy;
}
function FindDirectionForBot(bot){
    if(bot.strategy.status == c.BOT.DANGER){
        var lstEnemy = GetLst(bot, "lstDanger");
        // console.log("lstDanger");
        bot.deg = FindBestDirection(bot, lstEnemy);
        bot.direction = (Math.abs(bot.deg) > Math.PI/2)? c.direct.LEFT: c.direct.RIGHT;
        mouseLeft(bot);
        if(bot.numberBoom.number > 0){
            console.log("BOOM");
            addBoom(bot);
        }
    }else if(bot.strategy.status == c.BOT.ATTACK){
        //chay
        var lstAttack = GetLst(bot, "lstAttack");
         point = util.getMinPoint(bot, lstAttack);
        // console.log("lstAttack",lstAttack);
        bot.deg = Math.atan2(point.y - bot.y, point.x - bot.x);
        bot.direction = (Math.abs(bot.deg) > Math.PI/2)? c.direct.LEFT: c.direct.RIGHT;
        mouseRight(bot);
        mouseLeft(bot);
    }else if(bot.strategy.status == c.BOT.WARN){
        //chay
        // console.log("lstWarn");
        var lstWarn = GetLst(bot, "lstWarn");
        bot.deg = FindBestDirection(bot, lstWarn);
        bot.direction = (Math.abs(bot.deg) > Math.PI/2)? c.direct.LEFT: c.direct.RIGHT;
        // mouseLeft(bot);
    }else {
        //find target to attack
        
        var lstSave = GetLst(bot, "lstSave" );
        // console.log("lstSave", lstSave.length );
        if(lstSave.length != 0){
            var point = util.getMinPoint(bot, lstSave);
            bot.deg = Math.atan2(point.y - bot.y, point.x - bot.x);
            bot.direction = (Math.abs(bot.deg) > Math.PI/2)? c.direct.LEFT: c.direct.RIGHT;
        }else{
            var dataVirus = [];
            for (var i = 0; i < itemBoom.length; i++) {
                if(itemBoom[i].y > 100)
                    dataVirus.push(itemBoom[i]);
            }
            var point = util.getMinPoint(bot, dataVirus);
            if(util.getDistance(bot, point) < 200){
                bot.deg = Math.atan2(point.y - bot.y, point.x - bot.x);
                bot.direction = (Math.abs(bot.deg) > Math.PI/2)? c.direct.LEFT: c.direct.RIGHT;
            }else{
                // console.log("FOOD");
                point = util.getMinPoint(bot, food);
                if(point == undefined)
                    return;
                bot.deg = Math.atan2(point.y - bot.y, point.x - bot.x); 
                bot.direction = (Math.abs(bot.deg) > Math.PI/2)? c.direct.LEFT: c.direct.RIGHT;
            }
        } 
    }
}

function addJellyFish(toAdd) {
    var i = util.randomInRange(0, c.jellyFish.typeMax);
    while (toAdd--) {
        jellyFishs.push({
            // Make IDs unique.
            id: ((new Date()).getTime() + '' + jellyFishs.length) >>> 0,
            x: util.randomInRange(0, c.gameWidth),
            y: c.gameHeight + util.randomInRange(0, c.gameWidth)* 0.2,
            width: c.jellyFish.width,
            height: c.jellyFish.height,
            target: {
                x : 0,
                y : 0,
            },
            speedAnimation: 0,
            frameAnimation: 0,
            column: c.jellyFish.column,
            row: c.jellyFish.row,
            isHut: false,
            type: c.typeObj.JELLY,
            level: i
        });
    }
}

function addLight(toAdd) {
    while (toAdd--) {
        light.push({
            // Make IDs unique.
            id: ((new Date()).getTime() + '' + light.length) >>> 0,
            x: util.randomInRange(0, c.gameWidth),
            y: c.gameHeight + util.randomInRange(0, c.gameWidth)* 0.2,
            target: {
                x : 0,
                y : 0
            },
            isHut: false,
            radius: c.light.radius,
            type: c.typeObj.LIGHT,
            level: 0
        });
    }
}

function addFood(toAdd) {
    var size = c.food.level.length;

    while (toAdd--) {
        var i = util.randomLevelFood(size);
        var radius = c.food.level[i].radius;
        var minFood =new Boid.create(c.food.level[i].speed, 0.02);
      
        minFood.position.x = Math.random() * c.gameWidth;
        minFood.position.y = Math.random() * c.gameHeight;
        minFood.velocity.x = Math.random() * 2 - 1;
        minFood.velocity.y = Math.random() * 2 - 1;
        minFood.setAvoidWalls( true );
        minFood.setWorldSize( c.gameWidth, c.gameHeight, 200 );
        boids.push(minFood);
        food.push({
            // Make IDs unique.
            id: ((new Date()).getTime() + '' + food.length) >>> 0,
            x: minFood.position.x + c.gameWidth/2,
            y: minFood.position.y + c.gameHeight/2,
            direction: c.direct.LEFT,
            target: {
                x: 0,
                y: 0
            },
            radius: c.food.level[i].radius,
            mass: c.food.level[i].foodMass,
            speedAnimation: 0,
            frameAnimation: 0,
            column: c.food.level[i].column,
            width: c.food.level[i].width,
            height: c.food.level[i].height,
            row: c.food.level[i].row,
            isHut: false,
            type: c.typeObj.FOOD,
            level: i,
            jellyCollision: {
                status: false,
                time: 0
            }
        });
    }
}

function addBoom(player) {
    if(!player.numberBoom.status)
        return;
    player.numberBoom.number --;
    player.numberBoom.status = false;
    player.numberBoom.time = new Date().getTime();
    var radius = c.boom.radius;
    booms.push({
        id: ((new Date()).getTime() + '' + booms.length) >>> 0,
        playerId: player.id,
        time: (new Date()).getTime(),
        x: player.x,
        y: player.y,
        radius: radius,
        speedAnimation: 0,
        frameAnimation: 0,
        column: c.boom.column,
        row: c.boom.row,
        type: c.typeObj.BOOM,
        status: c.itemBoom.status.LIVE,
        frameEnd: 0
    });
}

function addEnemy(toAdd) {
     while (toAdd--) {
        var i = util.randomInRange(0, users.length - 1);
        enemies.push({
            id: ((new Date()).getTime() + '' + enemies.length) >>> 0,
            idTarget: i == -1? 0 : users[i].id,
            typeTarget: "player",
            time: (new Date()).getTime(),
            x: util.randomInRange(0, c.gameWidth),
            y: c.gameHeight + util.randomInRange(0, c.gameWidth)* 0.2,
            target :{
                x: 0,
                y: 0
            },
            height: c.sharkFish.level[0].height,
            width: c.sharkFish.level[0].width,
            speed: c.sharkFish.level[0].speed,
            radius: c.sharkFish.level[0].radius,
            column: c.sharkFish.level[0].column,
            row: c.sharkFish.level[0].row,
            direction: c.direct.RIGHT,
            isHut: false,
            speedAnimation: 0,
            frameAnimation: 0,
            type: c.typeObj.ENEMY,
            jellyCollision: {
                status: false,
                time: 0
            },
            eatFish:{
                status: false,
                time: 0
            }
        });
    }
}

function addItemBoom(toAdd) {
    while (toAdd--) {
        var radius = c.itemBoom.radius;
        var position = c.virusUniformDisposition ? util.uniformPosition(itemBoom, radius) : util.randomPosition(radius);
        itemBoom.push({
            id: ((new Date()).getTime() + '' + itemBoom.length) >>> 0,
            x: position.x,
            y: c.gameHeight +  util.randomInRange(50, 50 + c.gameWidth/10),
            target :{
                x: position.x,
                y: 0
            },
            radius: radius,
            speedAnimation: 0,
            frameAnimation: 0,
            type: c.typeObj.ITEMBOOM,
            status: c.itemBoom.status.LIVE
        });
    }
}

function getTypeFish(mass){
    for (var i = 0; i < c.fishType.length; i++) {
        if(c.fishType[i].maxMass > mass)
            return i;
    }
    return c.fishType.length - 1;
}



function movePlayer(player, time) {
   
    var position ={
        x: player.x,
        y: player.y
    };
    if(player.isHut == true){
        var deg = Math.atan2(player.target.y, player.target.x);

        var slowDown = 1;
        // if(player.speed <= 6.25) {
        //    slowDown = util.log(20, c.slowBase) + initMassLog;
        // }
        // if(player.target != undefined)
        //     slowDown = 1 + 1.0 / util.log(Math.max(10,util.getDistance(position, player.target)), 20);

       deltaY = player.speedAbsorb * (time/ c.timeServer) * Math.sin(deg)/slowDown;
       deltaX = player.speedAbsorb * (time/ c.timeServer) * Math.cos(deg)/slowDown;
        
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
    if(player.type == c.typeObj.AIBOT){
        deg = player.deg;
    }
    else{
    var target = player.target;
    if(target.x == 0 && target.y == 0){
        return;
    }
    dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
    deg = Math.atan2(target.y, target.x);
    }
    var slowDown = 1;
    // if(player.speed <= 6.25) {
    //     slowDown =  initMassLog + 1;
    // }
    // if(player.target != undefined)
    //     slowDown = 1 + 1.0 / util.log(Math.max(10,util.getDistance(position, player.target)), 20);

    var deltaY = player.speed * (time/ c.timeServer) * Math.sin(deg)/ slowDown;
    var deltaX = player.speed * (time/ c.timeServer) * Math.cos(deg)/ slowDown;

    if(player.speed > c.speedPlayer) {
        player.speed -= 0.5;
    }
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
    if (temp.x > c.gameWidth - borderCalc) {
        temp.x = c.gameWidth - borderCalc;
    }
    if (temp.y > c.gameHeight - borderCalc) {
        temp.y = c.gameHeight - borderCalc;
    }
    if (temp.x < borderCalc) {
        temp.x = borderCalc;
    }
    if (temp.y < borderCalc) {
        temp.y = borderCalc;
    }
    player.x = temp.x;
    player.y = temp.y;
    // if (!isNaN(deltaY)) {
    //     player.y += deltaY;
    // }
    // if (!isNaN(deltaX)) {
    //     player.x += deltaX;
    // }
 
    // var borderCalc = player.radius / 3;
    // if (player.x > c.gameWidth - borderCalc) {
    //     player.x = c.gameWidth - borderCalc;
    // }
    // if (player.y > c.gameHeight - borderCalc) {
    //     player.y = c.gameHeight - borderCalc;
    // }
    // if (player.x < borderCalc) {
    //     player.x = borderCalc;
    // }
    // if (player.y < borderCalc) {
    //     player.y = borderCalc;
    // }
}
// di chuyển các đối thủ khác.
function moveObj(mass) {
    if(mass.target == undefined ){
        return;
    }
    var position = {
        x: mass.x,
        y: mass.y
    };
    var deltaY = 0;
    var deltaX = 0;
    var slowDown = 1;
    if(mass.target != undefined)
     slowDown = 1 + 1.0 / util.log(Math.max(10,util.getDistance(position, mass.target)), 20);
    if(mass.isHut == true){
        var deg = Math.atan2(mass.target.y, mass.target.x);
       deltaY = mass.speedAbsorb * Math.sin(deg)/slowDown;
       deltaX = mass.speedAbsorb * Math.cos(deg)/slowDown;
        
        mass.y += deltaY;
        mass.x += deltaX;
        mass.speedAbsorb -= 0.5;
        if(mass.speedAbsorb < 0) {
            mass.isHut = false;
        }
        return;
    }
    if((mass.type == c.typeObj.FOOD || mass.type == c.typeObj.ENEMY ) && mass.jellyCollision.status == true)
        return;
    var deg = Math.atan2(mass.target.y - mass.y, mass.target.x - mass.x);

    if(mass.type == c.typeObj.LIGHT){
        deltaY = -3;
        deltaX = 0;
    }else if(mass.type == c.typeObj.FOOD){
        if(mass.stand != undefined && mass.stand == true)
            return;
        deltaY = c.food.level[mass.level].speed * Math.sin(deg)/slowDown;
        deltaX = c.food.level[mass.level].speed * Math.cos(deg)/slowDown;
    }else if(mass.type == c.typeObj.AIBOT){
        if(mass.stand != undefined && mass.stand == true)
            return;
        deltaY = 6 * Math.sin(deg)/slowDown;
        deltaX = 6 * Math.cos(deg)/slowDown;

    }
    else if(mass.type == c.typeObj.ENEMY ){
        if(mass.stand != undefined && mass.stand == true)
            return;
        deltaY = mass.speed * Math.sin(deg)/slowDown;
        deltaX = mass.speed * Math.cos(deg)/slowDown;
    }
    else if(mass.type == c.typeObj.MASS){
        deltaY = mass.speed * Math.sin(deg)/slowDown;
        deltaX = mass.speed * Math.cos(deg)/slowDown;
        mass.speed -= 0.5;
        if(mass.speed < 0){
            mass.speed = 0;
        }
    }
    if(!isNaN(deltaX)  && !isNaN(deltaY)){
        mass.y += deltaY;
        mass.x += deltaX;
    }
    
    var borderCalc = mass.radius / 2;
    if (mass.x > c.gameWidth - borderCalc) {
        mass.x = c.gameWidth - borderCalc;
    }
    if (mass.y > c.gameHeight - borderCalc) {
        mass.y = c.gameHeight - borderCalc;
    }
    if (mass.x < borderCalc) {
        mass.x = borderCalc;
    }
    if (mass.y < borderCalc) {
        mass.y = borderCalc;
    }
}

function balanceMass() {  
    var addItem = Math.min(c.food.maxFood - food.length, (bots.length + users.length)* 5);
    if (addItem > 0) {
        // console.log('[DEBUG] Adding ' + addItem + ' food to level!');
        addFood(addItem);
    }
    addItem = Math.min(c.itemBoom.maxItem - itemBoom.length, (bots.length + users.length)* 2);
    if (addItem > 0) {
        addItemBoom(addItem);
    }
    addItem = Math.min(c.light.maxLight - light.length, (bots.length + users.length)* 2);
    if(addItem > 0){
        addLight(addItem);
    }
    addItem = Math.min(c.jellyFish.maxJellyFish > jellyFishs.length, (bots.length + users.length)* 2);
    if(addItem > 0){
        addJellyFish(addItem);
    }
    addItem = Math.min(c.sharkFish.maxSharkFish - enemies.length, Math.round((bots.length + users.length) /5));
    if(addItem > 0){
        addEnemy(addItem);
    }
    addItem = Math.min(c.numberBot - bots.length, users.length);
    if(c.numberBot > bots.length){
        addAIBot(c.numberBot - bots.length);
    }
}

io.on('connection', function (socket) {
    console.log('A user connected!', socket.handshake.query.type);

    var type = socket.handshake.query.type;
    var radius = c.fishType["0"].radius;
    var position = c.newPlayerInitialPosition == 'farthest' ? util.uniformPosition(users, radius) : util.randomPosition(radius);
    var massTotal = 0;
    var currentPlayer = {
        id: socket.id,
        x: position.x,
        y: position.y,
        speed: c.speedPlayer, 
        speedAbsorb: 0, 
        latencyIndex: 0, 
        targetLatencyIndex: 0
    };
    // var currentPlayer = {
    //     id: socket.id,
    //     x: position.x,
    //     y: position.y,
    //     numberBoom: 0,
    //     radius: radius,
    //     speed: c.speedPlayer,
    //     speedAnimation: 0,
    //     frameAnimation: 0,
    //     width: c.fishType["0"].width,
    //     height: c.fishType["0"].height,
    //     column: c.fishType["0"].column,
    //     row: c.fishType["0"].row,
    //     massTotal: massTotal,
    //     kill: 0,
    //     type: type,
    //     lastHeartbeat: new Date().getTime(),
    //     target: {
    //         x: 0,
    //         y: 0
    //     },
    //     isHut: false,
    //     direction: c.direct.LEFT,
    //     timeAcceleration: {status: true, timeClick: 0},
    //     timeSpeed: {status: true, timeClick: 0},
    //     jellyCollision: {
    //             status: false,
    //             time: 0
    //     },
    //     levelUp: {
    //         status: true,
    //         time: new Date().getTime(),
    //         level: 0,
    //         targetMass : c.fishType[0].maxMass,
    //         minMass : 0
    //     },
    //     living: {
    //         status: true,
    //         time: 0
    //     },
    //     light: {
    //         radius: c.light.defaultRadiusLight
    //     },
    //     eatting: {
    //         status: false,
    //         time: 0
    //     },
    //     rank: 0
    // };
    socket.on('addBoom',function(){
        console.log("addBoom");
        if(currentPlayer.living && currentPlayer.living.status == true && currentPlayer.numberBoom.number > 0){
            addBoom(currentPlayer);
        }
    });
    socket.on('mouseRight',function(){
        if(currentPlayer.living && currentPlayer.living.status == true)
            mouseRight(currentPlayer);
    });
    socket.on('mouseLeft',function(){
        if(currentPlayer.living && currentPlayer.living.status == true)
            mouseLeft(currentPlayer);
    });
    socket.on('gotit', function (player) {
        if (util.findIndex(users, player.id) > -1) {
            console.log('[INFO] Player ID is already connected, kicking.');
            socket.disconnect();
        } else if (!util.validNick(player.name)) {
            socket.emit('kick', 'Invalid username.');
            socket.disconnect();
        } else {
            console.log('[INFO] Player ' + player.name + ' connected!');
            sockets[player.id] = socket;
            var radius = c.fishType["0"].radius;
           // var position = c.newPlayerInitialPosition == 'farthest' ? util.uniformPosition(users, radius) : util.randomPosition(radius);
            currentPlayer = {
                id: socket.id,
                x: player.x,
                y: player.y,
                numberBoom: {
                    number: 0,
                    status: true,
                    time: 0
                },
                radius: radius,
                speed: c.speedPlayer,
                speedAnimation: 0,
                frameAnimation: 0,
                width: c.fishType["0"].width,
                height: c.fishType["0"].height,
                column: c.fishType["0"].column,
                row: c.fishType["0"].row,
                massTotal: massTotal,
                kill: 0,
                hue: Math.round(Math.random() * 360),
                type: type,
                lastHeartbeat: new Date().getTime(),
                target: {
                    x: player.target.x,
                    y: player.target.y
                },
                name: player.name,
                screenWidth: player.screenWidth,
                screenHeight: player.screenHeight,
                isHut: false,
                direction: c.direct.LEFT,
                timeAcceleration: {status: true, timeClick: 0},
                timeSpeed: {status: true, timeClick: 0},
                jellyCollision: {
                        status: false,
                        time: 0
                },
                levelUp: {
                    status: true,
                    time: new Date().getTime(),
                    level: 0,
                    targetMass : c.fishType[0].maxMass,
                    minMass : 0
                },
                living: {
                    status: true,
                    time: 0
                },
                light: {
                    radius: c.light.defaultRadiusLight
                },
                eatting: {
                    status: false,
                    time: 0
                },
                rank: 0,
                latencyIndex: 0,
                targetLatencyIndex: 0,
                dataPosition: []
            };
            users.push(currentPlayer);

            var sizeMap = {
                gameWidth: c.gameWidth,
                gameHeight: c.gameHeight
            }
            socket.emit('gameSetup', sizeMap);
            console.log('Total players: ' + users.length);
        }

    });

    socket.on('windowResized', function (data) {
        console.log('windowResized', data);
        currentPlayer.screenWidth = data.screenWidth;
        currentPlayer.screenHeight = data.screenHeight;
    });

    socket.on('respawn', function () {
        console.log('respawn');
        if (util.findIndex(users, currentPlayer.id) > -1){
            users[util.findIndex(users, currentPlayer.id)] = {};
            users.splice(util.findIndex(users, currentPlayer.id), 1);
        }
        socket.emit('welcome', currentPlayer);
    });

    socket.on('disconnect', function () {
        if (util.findIndex(users, currentPlayer.id) > -1){
            var userIndex = util.findIndex(users, currentPlayer.id);
            users[userIndex] = {};
            users.splice(userIndex, 1);
        }
        console.log('[INFO1] User ' + currentPlayer.name + ' disconnected!');

        socket.broadcast.emit('playerDisconnect', { name: currentPlayer.name });
    });
    socket.on('playerChat', function(data) {
        var _sender = data.sender.replace(/(<([^>]+)>)/ig, '');
        var _message = data.message.replace(/(<([^>]+)>)/ig, '');
        if (c.logChat === 1) {
            console.log('[CHAT] [' + (new Date()).getHours() + ':' + (new Date()).getMinutes() + '] ' + _sender + ': ' + _message);
        }
        socket.broadcast.emit('serverSendPlayerChat', {sender: _sender, message: _message.substring(0,35)});
    });
    // Heartbeat function, update everytime.
    socket.on('0', function(target) {
        currentPlayer.lastHeartbeat = new Date().getTime();
        // console.log("targetLatencyIndex: ", target.latencyIndex);
        currentPlayer.targetLatencyIndex = target.latencyIndex;
        if(currentPlayer.isHut)
            return;
        if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
            currentPlayer.target = target;
            if(target.x > 0)
                currentPlayer.direction = c.direct.RIGHT;
            else if(target.x < 0) currentPlayer.direction = c.direct.LEFT;
        }
    });
});
function mouseLeft(currentPlayer){
    if(!currentPlayer.timeSpeed.status){
            return;
        }
        currentPlayer.timeSpeed.status = false;
        currentPlayer.timeSpeed.timeClick = new Date().getTime();
        currentPlayer.speed = 20;
}
function mouseRight(currentPlayer){
    function AbsorbObject(obj){ 
            if(obj == undefined || obj.id == currentPlayer.id)
                return;
            var distance = util.getDistance(currentPlayer, obj);
            var deg1 = Math.atan2(obj.y, obj.x);
            var deg2 = Math.atan2(currentPlayer.y, currentPlayer.x);
            var sub = deg2 - deg1;

            var deg = Math.atan2(currentPlayer.target.y, currentPlayer.target.x);
            var slowDown = 1;
            deltaY = currentPlayer.speed * Math.sin(deg)/slowDown;
            deltaX = currentPlayer.speed * Math.cos(deg)/slowDown;
            var direction2 = (currentPlayer.x < obj.x) ? 1: -1;
            if(distance < c.radiusAbsorb  && (Math.abs(sub) < Math.PI/4) && !(direction2 ^ direction)){
                obj.target = {x: currentPlayer.x + deltaX -obj.x, y :currentPlayer.y + deltaY -obj.y};
                obj.speedAbsorb = 10;
                obj.isHut = true;
            }
        
        }
        if(currentPlayer.timeAcceleration.status){
            currentPlayer.timeAcceleration.status = false;
            currentPlayer.timeAcceleration.timeClick = new Date().getTime();
        }
        
        var direction = (currentPlayer.target.x > 0) ? 1: -1;
        
        food.forEach(AbsorbObject);
        massFood.forEach(AbsorbObject);
        users.forEach(AbsorbObject);
        bots.forEach(AbsorbObject);
        jellyFishs.forEach(AbsorbObject);
        itemBoom.forEach(AbsorbObject);
        enemies.forEach(AbsorbObject);
        light.forEach(AbsorbObject);
}

function checkFishEatCircle(fish, circle){ 
    if(fish == undefined)
        return false;
    var directionObject = fish.direction == c.direct.RIGHT? 1 : -2;  
    
    var box = new SAT.Box(new SAT.Vector(fish.x + directionObject * fish.width/4,fish.y), fish.width/4, fish.height/4).toPolygon();

    var v = new SAT.Circle(new SAT.Vector(circle.x, circle.y), circle.radius);
    return SAT.testCirclePolygon(v,box);
}

function checkFishInCircle(fish, circle){ 
    if(fish == undefined)
        return false;
    var box = new SAT.Box(new SAT.Vector(fish.x - fish.width/2,fish.y - fish.height/2), fish.width, fish.height).toPolygon();
    var c = new SAT.Circle(new SAT.Vector(circle.x, circle.y), circle.radius);
    return SAT.testCirclePolygon(c,box);
}

function checkFishEatFish(fish1, fish2) {
        if(fish1 != undefined && fish2 != undefined && fish1.id != fish2.id) {
            var directionObject = fish1.direction == c.direct.RIGHT? 1 : -2;  
    
            var box = new SAT.Box(new SAT.Vector(fish1.x + directionObject * fish1.width/4,fish1.y), fish1.width/4, fish1.height/4).toPolygon();
            var box2 = new SAT.Box(new SAT.Vector(fish2.x - fish2.width/2,fish2.y - fish2.height/2), fish2.width, fish2.height).toPolygon();
                
            return SAT.testPolygonPolygon(box, box2);
        }
         return false;
    }
function tickPlayer(currentPlayer, time) {

    if(currentPlayer.eatting.status && currentPlayer.eatting.time < new Date().getTime() - c.timeLevelUp){
        currentPlayer.eatting.status = false;
        currentPlayer.eatting.time = 0;
    }
    if(!currentPlayer.timeAcceleration.status){
        if(currentPlayer.timeAcceleration.timeClick < new Date().getTime() - 1000)
                mouseRight(currentPlayer);
        if(currentPlayer.timeAcceleration.timeClick < new Date().getTime() - c.timeWait){
            currentPlayer.timeAcceleration.timeClick  = 0;
            currentPlayer.timeAcceleration.status = true;
        }
    }
    
    if(!currentPlayer.timeSpeed.status){
        if(currentPlayer.timeSpeed.timeClick < new Date().getTime() - c.timeWait){
            currentPlayer.timeSpeed.timeClick  = 0;
            currentPlayer.timeSpeed.status = true;
        }
    }

    if(!currentPlayer.numberBoom.status){
        if(currentPlayer.numberBoom.time < new Date().getTime() - c.timeWait){
            currentPlayer.numberBoom.time  = 0;
            currentPlayer.numberBoom.status = true;
        }
    }

    if(currentPlayer.levelUp.status){
        if(currentPlayer.levelUp.time < new Date().getTime() - c.timeLevelUp){
            currentPlayer.levelUp.time  = 0;
            currentPlayer.levelUp.status = false;
        }
    }
    movePlayer(currentPlayer, time);

    if(currentPlayer.latencyIndex != undefined){
        currentPlayer.latencyIndex = currentPlayer.targetLatencyIndex;
    }
    function updateRadius(currentPlayer){
        var level = getTypeFish(currentPlayer.massTotal);
        if(currentPlayer.levelUp.level < level) {
            currentPlayer.levelUp.level = level;
            currentPlayer.levelUp.status = true;
            currentPlayer.levelUp.targetMass = c.fishType[level].maxMass;
            currentPlayer.levelUp.minMass = level > 0 ? c.fishType[level-1].maxMass: 0;
            currentPlayer.levelUp.time = new Date().getTime();
            currentPlayer.radius = c.fishType[level].radius;
            currentPlayer.width = c.fishType[level].width;
            currentPlayer.height = c.fishType[level].height;
            currentPlayer.column = c.fishType[level].column;
            currentPlayer.row = c.fishType[level].row;
        }
    }
    
    for (var i = 0; i < light.length; i++) {
        if(checkFishEatCircle(currentPlayer, light[i])){
            if(currentPlayer.light.radius + 20 < c.light.defaultRadiusLight * 3)
                currentPlayer.light.radius += 50;
            light[i] = {};
            light.splice(i, 1);            
            i--;
        }
    }

    for (var i = 0; i < food.length; i++) {
        if(checkFishEatCircle(currentPlayer, food[i])){
            currentPlayer.massTotal += food[i].mass;
            currentPlayer.kill ++;
            currentPlayer.eatting.status = true;
            currentPlayer.eatting.time = new Date().getTime();
            food[i] = {};
            food.splice(i, 1);
            boids[i] = {};
            boids.splice(i,1);
            i--;
            
        }
    }
    updateRadius(currentPlayer);
    for (var i = 0; i < massFood.length; i++) {
        if(checkFishEatCircle(currentPlayer, massFood[i])){
            currentPlayer.massTotal += massFood[i].masa;
            massFood[i] = {};
            massFood.splice(i, 1);
        }
    }
    updateRadius(currentPlayer);

    for (var i = 0; i < itemBoom.length; i++) {
        if(checkFishEatCircle(currentPlayer, itemBoom[i])){
            if(currentPlayer.numberBoom.number < 3)
                currentPlayer.numberBoom.number += 1;
            itemBoom[i] = {};
            itemBoom.splice(i, 1);        
        }
    }
    for (var i = 0; i < booms.length; i++) {
        if(booms[i].status != c.itemBoom.status.DIED &&checkFishInCircle(currentPlayer, booms[i])){
            if(currentPlayer.id == booms[i].playerId)
                return;
            currentPlayer.living.status = false;
            currentPlayer.living.time = new Date().getTime();
            booms[i].status = c.itemBoom.status.DIED;
            var count = 5;
            var masa = Math.min(c.maxMass,currentPlayer.massTotal/count);
            var radius = util.massToRadius(masa);
            for (var i = 0; i < count; i++) {
                massFood.push({
                    id: ((new Date()).getTime() + '' + massFood.length) >>> 0,
                    num: i,
                    masa: masa,
                    hue: currentPlayer.hue,
                    target: {
                        x: currentPlayer.x + Math.cos(2*i *Math.PI/ count) *5000,
                        y: currentPlayer.y + Math.sin(2*i *Math.PI/ count) *5000
                    },
                    x: currentPlayer.x,
                    y: currentPlayer.y,
                    radius: radius,
                    type: c.typeObj.MASS,
                    speed: 25
                });
            }     
        }
    }

    for (var k = 0; k < bots.length; k++) {
        if(getTypeFish(currentPlayer.massTotal) > getTypeFish(bots[k].massTotal) &&checkFishEatFish(currentPlayer, bots[k])){
            currentPlayer.massTotal += bots[k].massTotal;
            currentPlayer.kill ++;
            currentPlayer.eatting.status = true;
            currentPlayer.eatting.time = new Date().getTime();
            bots[k].living.status = false;
            bots[k].living.time = new Date().getTime();
        }
    }
    updateRadius(currentPlayer);

    for (var k = 0; k < users.length; k++) {
        if(getTypeFish(currentPlayer.massTotal) > getTypeFish(users[k].massTotal) && checkFishEatFish(currentPlayer, users[k])){
            currentPlayer.massTotal += users[k].massTotal;
            currentPlayer.kill ++;
            currentPlayer.eatting.status = true;
            currentPlayer.eatting.time = new Date().getTime();
            users[k].living.status = false;
            users[k].living.time = new Date().getTime();
        }
    }

    for (var k = 0; k < enemies.length; k++) {
        if(checkFishEatFish(enemies[i], currentPlayer)){
            enemies[i].eatFish.status = true;
            enemies[i].eatFish.time = new Date().getTime();
            currentPlayer.living.status = false;
            currentPlayer.living.time = new Date().getTime();
        }
    }
}
function UpdateSpeedAnimation(obj){
    if(obj == undefined){
        console.log(obj);
    }
    obj.speedAnimation = obj.speedAnimation + 1;
    if(obj.speedAnimation >= c.speedAnimation){
            obj.speedAnimation = 0;
            obj.frameAnimation += 1;
            if(obj.frameAnimation >= obj.column * obj.row){
                obj.frameAnimation = 0;
            }
    }
}
function jellyFishCollision(f){
    if(f.jellyCollision && f.jellyCollision.status == true){
            if(f.jellyCollision.time + c.jellyFish.time < new Date().getTime())
                f.jellyCollision.status = false;
            return;
    }
    var v1 =  new SAT.Vector(f.x - f.width/2,f.y );
    var v2 = new SAT.Vector(f.x ,f.y + f.height/2);
    var v3 = new SAT.Vector(f.x + f.width/2,f.y );
    var v4 = new SAT.Vector(f.x ,f.y - f.height/2);

    for (var i = 0; i < jellyFishs.length; i++) {
        var temp = jellyFishs[i];
        
        var box = new SAT.Box(new V(temp.x, temp.y), temp.width, temp.height).toPolygon();
        var p2 = new SAT.Polygon(new SAT.Vector(), [
                new SAT.Vector(f.x - f.width/2,f.y),
                new SAT.Vector(f.x ,f.y - f.height/2),
                new SAT.Vector(f.x + f.width/2,f.y ),
                new SAT.Vector(f.x ,f.y + f.height/2)
            ]);
        
        if(f.jellyCollision && SAT.testPolygonPolygon(box, p2)){
            f.jellyCollision.status = true;
            f.jellyCollision.time = (new Date()).getTime();
            return;
        }
    }    
    return;
}
function UpdateJellyCollion(){  
    for (var i = 0; i < users.length; i++) {
        jellyFishCollision(users[i]);
    }
    
    for (var i = 0; i < bots.length; i++) {
        jellyFishCollision(bots[i]); 
    }
    for (var i = 0; i < enemies.length; i++) {
        jellyFishCollision(enemies[i]);
    }
}
var d1 = new Date().getTime();
function moveloop() {
    var d2 = new Date().getTime();
    // console.log("Move loop time: ", d2 - d1);
    var time = d2 - d1;
    d1 = d2;

    for (var i = 0; i < users.length; i++) {
        UpdateSpeedAnimation(users[i]);
        if(users[i].living && users[i].living.status)
            tickPlayer(users[i], time);
        if(users[i].living && users[i].living.status == false  && users[i].living.time + 1500 < new Date().getTime()){
            sockets[users[i].id].emit('RIP');
            users[i] = {};
            users.splice(i, 1);
            i--;
        }
    }
    for (var i = 0; i < bots.length; i++) {
        if(bots[i].living && bots[i].living.status)
            tickPlayer(bots[i]);
        if(bots[i].living && bots[i].living.status == false){
            bots[i] = {};
            bots.splice(i, 1);
            i--;
        }
    }    

    for (i=0; i < itemBoom.length; i++) {
        if(itemBoom[i].isHut)
            moveObj(itemBoom[i]);
        else{
        itemBoom[i].y -= 3;
            if(itemBoom[i].y < 0){
                itemBoom[i] = {};
                itemBoom.splice(i,1);
                i --;
            }
        }
    }

    var currentTime = new Date().getTime();
    for (i=0; i < booms.length; i++) {
        UpdateSpeedAnimation(booms[i]);
        if(booms[i].status == c.itemBoom.status.LIVE){
            if(currentTime > booms[i].time + c.defaultTime){
                booms[i].status = c.itemBoom.status.DIED;
            }
        }
        if(booms[i].status == c.itemBoom.status.DIED)
        {
            booms[i].frameEnd ++;
            if(booms[i].frameEnd > 120){
                booms[i] = {};
                booms.splice(i,1);
                i--;
            }
        }
    }

    for (i=0; i < massFood.length; i++) {
        if(massFood[i].speed > 0 || massFood[i].isHut) moveObj(massFood[i]);
    }

    for (i=0; i < food.length; i++) {
        if(food[i] != undefined){
            if(food[i].isHut){
                moveObj(food[i]);
                continue;
            }
            Boid.run(boids[ i ], boids );
            if(boids[i].position.x + c.gameWidth/2 < food[i].x)
                food[i].direction = c.direct.LEFT;
            else food[i].direction = c.direct.RIGHT;
            food[i].x = boids[i].position.x + c.gameWidth/2;
            food[i].y = boids[i].position.y + c.gameHeight/2;
        }
    }
    

    for (var i = 0; i < light.length; i++) {
        if(light[i].isHut)
            moveObj(light[i]);
        else {
            light[i].y -= 3;
            if(light[i].y < 0){
                light[i] = {};
                light.splice(i,1);
                i--;
            }
        }
    }

    for (var i = 0; i < jellyFishs.length; i++) {
            UpdateSpeedAnimation(jellyFishs[i]);
            if(jellyFishs[i].isHut)
                moveObj(jellyFishs[i]);
            else{
                jellyFishs[i].y -= 1;
                if(jellyFishs[i].y < 0){
                    jellyFishs[i] = {};
                    jellyFishs.splice(i,1);
                    i--;
                }
            }
    }
    
    for (var i = 0; i < enemies.length; i++) {
        if(enemies[i].eatFish.status){
            UpdateSpeedAnimation(enemies[i]);
            if(enemies[i].eatFish.time + 1000 < new Date().getTime()){
                enemies[i].eatFish.status = false;
                enemies[i].eatFish.time = 0;
                enemies[i].frameAnimation = 0;
            }
        }
        moveObj(enemies[i]);     
    }
}


function gameloop() {
    if (users.length > 0) {
        users.sort( function(a, b) { return b.kill - a.kill; });

        var topUsers = [];

        for (var i = 0; i < users.length; i++) {
            users[i].rank = i + 1;
        }
        for (var i = 0; i < Math.min(10, users.length); i++) {
                topUsers.push({
                    id: users[i].id,
                    name: users[i].name,
                    kill: users[i].kill
                });
        }
        if (isNaN(leaderboard) || leaderboard.length !== topUsers.length) {
            leaderboard = topUsers;
            leaderboardChanged = true;
        }
        else {
            for (i = 0; i < leaderboard.length; i++) {
                if (leaderboard[i].id !== topUsers[i].id) {
                    leaderboard = topUsers;
                    leaderboardChanged = true;
                    break;
                }
            }
        }
        
    }
    balanceMass();
    UpdateJellyCollion();
}

function sendItem() {
    // users.forEach(function(u){
    //     if(u.dataPosition.length < 2){
    //         u.dataPosition.push({x: u.x, y: u.y});
    //         u.dataPosition.push({x: u.x, y: u.y});
    //     }else {
    //         u.dataPosition[0] = {};
    //         u.dataPosition.splice(0,1);
    //         u.dataPosition.push({x: u.x, y: u.y});
    //         console.log("dataPosition: ",u.dataPosition);
    //     }
    // });

    users.forEach( function(u) {
        // center the view if x/y is undefined, this will happen for spectators
        // console.log("pos: ", u.x, " , ", u.y );
        u.x = u.x || c.gameWidth / 2;
        u.y = u.y || c.gameHeight / 2;

        var visibleFood  = food
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - 20 &&
                    f.x < u.x + u.screenWidth/2 + 20 &&
                    f.y > u.y - u.screenHeight/2 - 20 &&
                    f.y < u.y + u.screenHeight/2 + 20) {
                    return f;
                }
            })
            .filter(function(f) { return f; });

        var visibleJellyFish = jellyFishs
        .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - 20 &&
                    f.x < u.x + u.screenWidth/2 + 20 &&
                    f.y > u.y - u.screenHeight/2 - 20 &&
                    f.y < u.y + u.screenHeight/2 + 20) {
                    return f;
                }
            })
            .filter(function(f) { return f; });

        var visibleLight  = light
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - 20 &&
                    f.x < u.x + u.screenWidth/2 + 20 &&
                    f.y > u.y - u.screenHeight/2 - 20 &&
                    f.y < u.y + u.screenHeight/2 + 20) {
                    return {
                        x: f.x,
                        y: f.y,
                        level: f.level
                    };
                }
            })
            .filter(function(f) { return f; });

        var visibleMass = massFood
            .map(function(f) {
                if ( f.x+f.radius > u.x - u.screenWidth/2 - 20 &&
                    f.x-f.radius < u.x + u.screenWidth/2 + 20 &&
                    f.y+f.radius > u.y - u.screenHeight/2 - 20 &&
                    f.y-f.radius < u.y + u.screenHeight/2 + 20) {
                    return {
                        x: f.x,
                        y: f.y,
                        radius: f.radius,
                        hue: f.hue
                    }; 
                }
            })
            .filter(function(f) { return f; });

        var visibleItemBoom  = itemBoom
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - f.radius &&
                    f.x < u.x + u.screenWidth/2 + f.radius &&
                    f.y > u.y - u.screenHeight/2 - f.radius &&
                    f.y < u.y + u.screenHeight/2 + f.radius) {
                    return { 
                        x: f.x,
                        y: f.y,
                        radius: f.radius,
                        frameAnimation: f.frameAnimation
                    }; 
                }
            })
            .filter(function(f) { return f; });


        var visibleBoom  = booms
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - f.radius &&
                    f.x < u.x + u.screenWidth/2 + f.radius &&
                    f.y > u.y - u.screenHeight/2 - f.radius &&
                    f.y < u.y + u.screenHeight/2 + f.radius) {
                    return {
                        x: f.x,
                        y: f.y,
                        radius: f.radius,
                        frameAnimation: f.frameAnimation,
                        status: f.status
                    };
                }
            })
            .filter(function(f) { return f; });

        var visibleEnemy  = enemies
            .map(function(f) {
                if ( f.x > u.x - u.screenWidth/2 - f.radius &&
                    f.x < u.x + u.screenWidth/2 + f.radius &&
                    f.y > u.y - u.screenHeight/2 - f.radius &&
                    f.y < u.y + u.screenHeight/2 + f.radius) {

                    return {
                        x: f.x,
                        y: f.y,
                        jellyCollision: f.jellyCollision,
                        direction: f.direction,
                        frameAnimation: f.frameAnimation,
                        width: f.width,
                        height: f.height,
                    }; 
                }
            })
            .filter(function(f) { return f; });

            var botVisible  = bots
            .map(function(f) {
                if ( f.x+f.radius > u.x - u.screenWidth/2 - 20 &&
                    f.x-f.radius < u.x + u.screenWidth/2 + 20 &&
                    f.y+f.radius > u.y - u.screenHeight/2 - 20 &&
                    f.y-f.radius < u.y + u.screenHeight/2 + 20) {
                        return {
                            id: f.id,
                            x: f.x,
                            y: f.y,
                            numberBoom: f.numberBoom,
                            target: f.target,
                            radius: f.radius,
                            direction: f.direction,
                            frameAnimation: f.frameAnimation,
                            massTotal: Math.round(f.massTotal),
                            hue: f.hue,
                            name: f.name,
                            timeAcceleration: f.timeAcceleration,
                            timeSpeed: f.timeSpeed,
                            width: f.width,
                            height: f.height,
                            levelUp: f.levelUp,
                            jellyCollision: f.jellyCollision,
                            status: f.strategy.status,
                            living: f.living,
                            isHut: f.isHut,
                            speed: f.speed
                        };
                }
            })
            .filter(function(f) { return f; });

        if(sockets[u.id]){
            sockets[u.id].emit('serverTellItemMove', visibleFood, visibleItemBoom, visibleMass, visibleLight, visibleJellyFish, visibleBoom,visibleEnemy, botVisible);
        }
    });
}

function sendUpdates() {
    users.forEach(function(u){
        if(u.dataPosition.length < 2){
            u.dataPosition.push({x: u.x, y: u.y});
            u.dataPosition.push({x: u.x, y: u.y});
        }else {
            u.dataPosition[0] = {};
            u.dataPosition.splice(0,1);
            u.dataPosition.push({x: u.x, y: u.y});
            console.log("dataPosition: ",u.dataPosition);
        }
    });

    users.forEach( function(u) {
        // center the view if x/y is undefined, this will happen for spectators
        // console.log("pos: ", u.x, " , ", u.y );
        u.x = u.x || c.gameWidth / 2;
        u.y = u.y || c.gameHeight / 2;

        var visibleCells  = users
            .map(function(f) {
                if ( f.x+f.radius > u.x - u.screenWidth/2 - 20 &&
                    f.x-f.radius < u.x + u.screenWidth/2 + 20 &&
                    f.y+f.radius > u.y - u.screenHeight/2 - 20 &&
                    f.y-f.radius < u.y + u.screenHeight/2 + 20) {
                    if(f.id !== u.id) {
                        return {
                            id: f.id,
                            x: f.x,
                            y: f.y,
                            numberBoom: f.numberBoom,
                            target: f.target,
                            direction: f.direction,
                            frameAnimation: f.frameAnimation,
                            massTotal: Math.round(f.massTotal),
                            kill: f.kill,
                            name: f.name,
                            timeAcceleration: f.timeAcceleration,
                            timeSpeed: f.timeSpeed,
                            width: f.width,
                            height: f.height,
                            levelUp: f.levelUp,
                            jellyCollision: f.jellyCollision,
                            living: f.living,
                            rank: f.rank,
                            speed: f.speed,
                            isHut: f.isHut,
                            radius: f.radius,
                            dataPosition: f.dataPosition
                        };
                    } else {
                        // console.log(f.name, f.timeAcceleration, f.timeSpeed);
                        return {
                            x: f.x,
                            y: f.y,
                            numberBoom: f.numberBoom,
                            target: f.target,
                            radius: f.radius,
                            name: f.name,
                            direction: f.direction,
                            frameAnimation: f.frameAnimation,
                            massTotal: Math.round(f.massTotal),
                            kill: f.kill,
                            timeAcceleration: f.timeAcceleration,
                            timeSpeed: f.timeSpeed,
                            width: f.width,
                            height: f.height,
                            levelUp: f.levelUp,
                            jellyCollision: f.jellyCollision,
                            living: f.living,
                            light: f.light,
                            eatting: f.eatting,
                            rank: f.rank,
                            speed: f.speed,
                            isHut: f.isHut,
                            radius: f.radius,
                            latencyIndex: f.latencyIndex,
                            dataPosition: f.dataPosition
                        };
                    }
                }
             
            })
            .filter(function(f) { return f; });

            var userRadar = [];
            
            users.forEach(function(f){
                if(f.id != u.id){
                    userRadar.push({
                        x : f.x,
                        y : f.y
                    });
                }
            });
            bots.forEach(function(f){
                userRadar.push({
                    x : f.x,
                    y : f.y
                });
            });
        if(sockets[u.id]){
            sockets[u.id].emit('serverTellPlayerMove', visibleCells, userRadar, users.length);

            if (leaderboardChanged) {
                sockets[u.id].emit('leaderboard', {
                    players: users.length,
                    leaderboard: leaderboard
                });
            }
        }
    });
    leaderboardChanged = false;
}

setInterval(moveloop, 1000 / 60);
setInterval(gameloop, 1000);
setInterval(sendUpdates, 1000 / c.networkUpdateFactor);
setInterval(sendItem, 1000 / 40);

function EnemyStrategy(){
    var pos = 0;
    var dataUsers = [];
    for (var i = 0; i < users.length; i++) {
        if(users[i].living && users[i].living.status){
            dataUsers.push(users[i]);
        }
    }
    for (var i = 0; i < enemies.length; i++) {
        if(enemies[i].isHut)
            continue;
        if(enemies[i].eatFish.status && enemies[i].eatFish.time + 1000 < new Date().getTime()){
            enemies[i].eatFish.status = false;
            enemies[i].eatFish.time = 0;
        }

        if(enemies[i].typeTarget == "player"){
            pos = util.findIndex(dataUsers, enemies[i].idTarget);
        }else if(enemies[i].typeTarget == "bot"){
            pos = util.findIndex(bots, enemies[i].idTarget);
        }

        if(pos != -1){
            if(enemies[i].typeTarget == "player"){
                enemies[i].target.x = users[pos].x;
                enemies[i].target.y = users[pos].y;
            }else {
                enemies[i].target.x = bots[pos].x;
                enemies[i].target.y = bots[pos].y;
            }
        }else {
            var eatUser = dataUsers.length == 0? 0 : Math.round(Math.random());
            if(bots.length > 0){
                var lstPos = [], indexPos, hasChoose = false;
                bots.forEach(function(d, i){lstPos.push(i);});
                for (var k = 0; k < bots.length; k++) {
                    hasChoose = false;
                    indexPos = util.randomInRange(0, lstPos.length);
                    pos = lstPos[indexPos];
                    for(var j = 0; j < i; j ++){
                        if(enemies[j].typeTarget == "bot" && bots[pos].id == enemies[j].idTarget){
                            hasChoose = true;
                            break;
                        }
                    }
                    if(hasChoose){
                        lstPos.splice(indexPos, 1);
                        continue;
                    }
                    enemies[i].target.x = bots[pos].x;
                    enemies[i].target.y = bots[pos].y;
                    enemies[i].idTarget = bots[pos].id;
                    enemies[i].typeTarget = "bot";
                    break;
                }
                //pos = util.randomInRange(0, bots.length - 1);
                
            }
            if(eatUser == 1 && dataUsers.length > 0){
                var lstPos = [], indexPos, hasChoose = false;
                dataUsers.forEach(function(d, i){lstPos.push(i);});
                for (var k = 0; k < dataUsers.length; k++) {
                    hasChoose = false;
                    indexPos = util.randomInRange(0, lstPos.length);
                    pos = lstPos[indexPos];
                    for(var j = 0; j < i; j ++){
                        if(enemies[j].typeTarget == "player" && dataUsers[pos].id == enemies[j].idTarget){
                            hasChoose = true;
                            break;
                        }
                    }
                    if(hasChoose){
                        lstPos.splice(indexPos, 1);
                        continue;
                    }
                    enemies[i].target.x = dataUsers[pos].x;
                    enemies[i].target.y = dataUsers[pos].y;
                    enemies[i].idTarget = dataUsers[pos].id;
                    enemies[i].typeTarget = "player";
                    break;
                }
            }
        }
        if(enemies[i].x < enemies[i].target.x){
            enemies[i].direction = c.direct.RIGHT;
        }else {
            enemies[i].direction = c.direct.LEFT;
        }

        for (var j = 0; j < booms.length; j++) {
           if(checkFishInCircle(enemies[i], booms[j])){
                enemies[i] = {};
                enemies.splice(i, 1);
                i--;
                booms[j].status = c.itemBoom.status.DIED;
           }
        }
    }
}
setInterval(function(){
    for (var i = 0; i < bots.length; i++) {
        findEnemyToEat(bots[i]);
        FindDirectionForBot(bots[i]);
    }
    EnemyStrategy();
},1000);

setInterval(function(){
    for (var i = 0; i < users.length; i++) {
        if(!users[i].light)
            continue;
        if(users[i].light.radius - 20 > c.light.defaultRadiusLight)
            users[i].light.radius -= 20;
        else users[i].light.radius = c.light.defaultRadiusLight;
    }
},3000);

// var serverPort = process.env.PORT || port;
// http.listen(serverPort, function() {
//   console.log("Server is listening on port " + serverPort);
//   // console.log("App contain:", app);
// });



    

}



