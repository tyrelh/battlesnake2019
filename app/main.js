var k = require("./keys");
var g = require("./grid");
var m = require("./move");
var p = require("./params");
var s = require("./self");
var log = require("./logger");
var slowest = 0;
var slowestMove = 0;
// called for every move
var move = function (req, res) {
    var startTime;
    if (p.STATUS) {
        var date = new Date();
        startTime = date.getMilliseconds();
    }
    var data = req.body;
    var health = data.you.health;
    if (p.STATUS)
        log.status("\n\n############################### MOVE " + data.turn + "\n");
    var grid = [];
    try {
        grid = g.buildGrid(data);
    }
    catch (e) {
        log.error("ex in main.buildGrid: " + e);
    }
    var move = k.RIGHT;
    if (p.DEBUG)
        log.status("biggest snake ? " + s.biggestSnake(data));
    // if you are hungry or small you gotta eat
    if (health < p.SURVIVAL_MIN || !s.biggestSnake(data)) {
        try {
            move = m.eat(grid, data);
        }
        catch (e) {
            log.error("ex in main.eat: " + e);
        }
    }
    // if you are the biggest you can go on the hunt
    else if (s.biggestSnake(data)) {
        try {
            move = m.hunt(grid, data);
        }
        catch (e) {
            log.error("ex in main.hunt: " + e);
        }
    }
    // whateves, maybe will use at sometime in the future
    else {
        try {
            move = m.killTime(grid, data);
        }
        catch (e) {
            log.error("ex in main.killTime: " + e);
        }
    }
    if (p.STATUS) {
        var date2 = new Date();
        var endTime = date2.getMilliseconds();
        if (endTime - startTime > slowest) {
            slowest = endTime - startTime;
            slowestMove = data.turn;
        }
        log.status("Move " + data.turn + " took " + (endTime - startTime) + "ms.");
    }
    return res.json({ move: move ? k.DIRECTION[move] : k.DIRECTION[k.UP] });
};
// called once at beginning of game
var start = function (req, res) {
    // ensure previous game logs are cleared
    log.initGameLogs();
    if (p.STATUS) {
        log.status("############################### STARTING GAME " + req.body.game.id + "\n\n");
        log.status("My snake id is " + req.body.you.id);
        slowest = 0;
        slowestMove = 0;
    }
    var blue = "#3b94e3";
    var pink = "#cc4ff1";
    var green = "#2be384";
    return res.json({ color: green });
};
// called when you die, or end of game if you win
var end = function (req, res) {
    log.status("\nSlowest move " + slowestMove + " took " + slowest + "ms.");
    // write logs for this game to file
    log.writeLogs(req.body);
    return res.json({});
};
module.exports = {
    move: move,
    start: start,
    end: end
};
