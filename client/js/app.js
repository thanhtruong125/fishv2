
var playerName;
var playerNameInput = document.getElementById('playerNameInput');

var socketServer;

var socket;

var localRoom;

var game = new Game();

function startGame(type) {
    playerName = playerNameInput.value.replace(/(<([^>]+)>)/ig, '');
    global.playerType = type;
    global.playerName = playerName;
    document.getElementById('shadowCanvas').style.display = "block";
    document.getElementById('radar').style.display = "block";
    $('#gameAreaWrapper').fadeIn(2000);
    document.getElementById('baner-icon').style.display = "block";
    document.getElementById('skill-icon').style.display = "block";
    $('#startMenuWrapper').fadeOut(2000);
    $('#score').fadeIn(2000);

    audioMain.pause();
    setTimeout(function(){audioBubble.play();},2000);
    if (!socket) {
        // socket = io({query:"type=" + type});
        socket = io({query:"type=" + type});
        SetupSocket(socket, socketServer, localRoom);
        window.chat.socket = socket;
        
        window.canvas.socket = socket;
        global.socket = socket;
    }
    if (!global.animLoopHandle)
        animloop();
    socket.emit('respawn');
    window.chat.socket = socket;
    window.canvas.socket = socket;
    global.socket = socket;
    

}

// check if nick is valid alphanumeric characters (and underscores)
function validNick() {
    var regex = /^\w*$/;
    console.log('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}
var valueProgress = 0;
var progressTime;

function appRule(){
    var rulesIndex = 1;
            var rules = ["Feed your fish to grow your school","Protect your fish!","Avoid of jellyfish!","Devour other player's Queen fish to growth!","Hold left mouse button to speed up your fish","Hold right mouse button to absorb fish and item", "Space key to create the boom!"];

            function rotateRules()
            {
                $("#rules").fadeOut("slow", function()
                {
                    $(this)
                        .text(rules[rulesIndex++ % rules.length])
                        .fadeIn("slow", function()
                        {
                            setTimeout(function()
                            {
                                rotateRules();
                            }, 3000);
                        });
                });
            }
            setTimeout(function()
            {
                rotateRules();
            }, 3000);
}
$(document).ready(function(){
    'use strict';
    $( "#startMenu" ).show();
    $( "#inputText" ).fadeIn(2000);
    $( "#shareApp" ).fadeIn(4000);
    audioMain.play();
    
    appRule();
    var btn = document.getElementById('startButton'),
        nickErrorText = document.querySelector('#startMenu .input-error');

    btn.onclick = function () {
        // check if the nick is valid
        if (validNick()) {
            // getServer();
            startGame('player');
            nickErrorText.style.opacity = 0;
            
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    playerNameInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            if (validNick()) {
                nickErrorText.style.opacity = 0;
                startGame('player');
            } else {
                nickErrorText.style.opacity = 1;
            }
        }
    });


});

function SetupSocket(socket, socketServer, room) {
  game.handleNetwork(socket, socketServer, room);
}

window.requestAnimFrame = (function(){
    
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
            };
})();

window.cancelAnimFrame = (function(handle) {
    return  window.cancelAnimationFrame     ||
            window.mozCancelAnimationFrame;
})();

// var d1 = new Date().getTime();
// var d2;
function animloop(){
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
    // d2 = new Date().getTime();
    // console.log("Time: ", d2 - d1);
    // d1 = d2;
}

// var d3 = new Date().getTime();
// var d4;
function gameLoop() {
  game.handleGraphics();
  // d4 = new Date().getTime();
    // console.log("Time2: ", d4 - d3);
    // d3 = d4;

}


window.addEventListener('resize', function() {
    console.log("resize");
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    c.width = screenWidth;
    c.height = screenHeight;
    document.body.width = player.screenWidth = shadowCanvas.width = c.width = global.screenWidth = window.innerWidth ;
    document.body.height = player.screenHeight = shadowCanvas.height = c.height = global.screenHeight = window.innerHeight;
    if (!socket) return;
    socket.emit('windowResized', { screenWidth: global.screenWidth, screenHeight: global.screenHeight });
}, true);