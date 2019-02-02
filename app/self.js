var log = require("./logger");
var p = require("./params");
var location = function (_a) {
    var you = _a.you;
    try {
        return { x: you.body[0].x, y: you.body[0].y };
    }
    catch (e) {
        log.error("ex in self.location: " + e);
    }
    return { x: 0, y: 0 };
};
var tailLocation = function (_a) {
    var you = _a.you;
    try {
        var i = you.body.length - 1;
        return { x: you.body[i].x, y: you.body[i].y };
    }
    catch (e) {
        log.error("ex in self.tailLocation: " + e);
    }
    return { x: 0, y: 0 };
};
// will return if you are the largest snake on the board
var biggestSnake = function (data) {
    try {
        var me = data.you.id;
        var myLength = data.you.body.length;
        for (var i = 0; i < data.board.snakes.length; i++) {
            var snake = data.board.snakes[i];
            if (snake.id === me)
                continue;
            // if (p.DEBUG) log.debug(`My length: ${myLength}. Enemy length: ${snake.body.length}`);
            if (snake.body.length >= myLength)
                return false;
        }
        return true;
    }
    catch (e) {
        log.error("!!! ex in self.biggestSnake: " + e);
    }
    return false;
};
module.exports = {
    location: location,
    tailLocation: tailLocation,
    biggestSnake: biggestSnake
};
