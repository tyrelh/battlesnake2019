var k = require("./keys");
var log = require("./logger");
var p = require("./params");
var buildGrid = function (data) {
    var board = data.board;
    var self = data.you;
    // initailize grid to SPACEs
    var grid = initGrid(board.width, board.height, k.SPACE);
    try {
        // mark edges WALL_NEAR
        for (var y = 0; y < board.height; y++) {
            grid[y][0] = k.WALL_NEAR;
            grid[y][board.width - 1] = k.WALL_NEAR;
        }
        for (var x = 0; x < board.width; x++) {
            grid[0][x] = k.WALL_NEAR;
            grid[board.height - 1][x] = k.WALL_NEAR;
        }
    }
    catch (e) {
        log.error("ex in edges marking grid.buildGrid: " + e);
    }
    // try {
    //   // mark corners DANGER
    //   grid[0][0] = k.DANGER;
    //   grid[0][board.width - 1] = k.DANGER;
    //   grid[board.height - 1][0] = k.DANGER;
    //   grid[board.height - 1][board.width - 1] = k.DANGER;
    // }
    // catch (e) { log.error(`ex in corners marking grid.buildGrid: ${e}`); }
    // fill FOOD locations
    try {
        board.food.forEach(function (_a) {
            var x = _a.x, y = _a.y;
            grid[y][x] = k.FOOD;
        });
    }
    catch (e) {
        log.error("ex in food marking grid.buildGrid: " + e);
    }
    try {
        // fill snake locations
        board.snakes.forEach(function (_a) {
            var id = _a.id, name = _a.name, health = _a.health, body = _a.body;
            // fill SNAKE_BODY locations
            body.forEach(function (_a) {
                var x = _a.x, y = _a.y;
                if (id === self.id)
                    grid[y][x] = k.YOUR_BODY;
                else
                    grid[y][x] = k.SNAKE_BODY;
            });
            // // skip filling own head and DANGER
            // if (id === self.id) return;
            // fill ENEMY_HEAD and DANGER locations
            var head = body[0];
            if (id != self.id)
                grid[head.y][head.x] = k.ENEMY_HEAD;
            // mark DANGER or KILL_ZONE around enemy head based on snake length
            // also check if tail can be TAIL or SNAKE_BODY
            var tailSpace = true;
            var headZone = body.length < self.body.length ? k.KILL_ZONE : k.DANGER;
            // TODO: these checks can be simplified?
            // check down
            if (head.y + 1 < board.height && grid[head.y + 1][head.x] < k.DANGER) {
                if (grid[head.y + 1][head.x] === k.FOOD)
                    tailSpace = false;
                // if (id != self.id) grid[head.y + 1][head.x] = headZone;
            }
            // check up
            if (head.y - 1 >= 0 && grid[head.y - 1][head.x] < k.DANGER) {
                if (grid[head.y - 1][head.x] === k.FOOD)
                    tailSpace = false;
                // if (id != self.id) grid[head.y - 1][head.x] = headZone;
            }
            // check left
            if (head.x + 1 < board.width && grid[head.y][head.x + 1] < k.DANGER) {
                if (grid[head.y][head.x + 1] === k.FOOD)
                    tailSpace = false;
                // if (id != self.id) grid[head.y][head.x + 1] = headZone;
            }
            // check right
            if (head.x - 1 >= 0 && grid[head.y][head.x - 1] < k.DANGER) {
                if (grid[head.y][head.x - 1] === k.FOOD)
                    tailSpace = false;
                // if (id != self.id) grid[head.y][head.x - 1] = headZone;
            }
            // check for tail
            if (tailSpace && data.turn > 3) {
                var tail = body[body.length - 1];
                grid[tail.y][tail.x] = k.TAIL;
            }
        });
        // fill DANGER or KILL_ZONE locations around each snake head
        board.snakes.forEach(function (_a) {
            var id = _a.id, name = _a.name, health = _a.health, body = _a.body;
            if (id == self.id)
                return;
            var head = body[0];
            var headZone = body.length < self.body.length ? k.KILL_ZONE : k.DANGER;
            // check up
            if (head.y + 1 < board.height && grid[head.y + 1][head.x] < k.DANGER) {
                grid[head.y + 1][head.x] = headZone;
            }
            // check down
            if (head.y - 1 >= 0 && grid[head.y - 1][head.x] < k.DANGER) {
                grid[head.y - 1][head.x] = headZone;
            }
            // check left
            if (head.x - 1 >= 0 && grid[head.y][head.x - 1] < k.DANGER) {
                grid[head.y][head.x - 1] = headZone;
            }
            // check right
            if (head.x + 1 < board.width && grid[head.y][head.x + 1] < k.DANGER) {
                grid[head.y][head.x + 1] = headZone;
            }
        });
    }
    catch (e) {
        log.error("ex in snakes marking grid.buildGrid: " + e);
    }
    if (p.DEBUG_MAPS)
        printGrid(grid);
    return grid;
};
// manhattan distance
var getDistance = function (a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};
// print grid to logs
var printGrid = function (grid) {
    for (var i = 0; i < grid.length; i++) {
        var row = "";
        for (var j = 0; j < grid[0].length; j++) {
            row += " " + mapGridSpaceToChar(grid[i][j]);
        }
        log.status(row);
    }
};
// create a grid filled with a given value
var initGrid = function (width, height, fillValue) {
    var grid;
    try {
        grid = new Array(height);
        for (var i = 0; i < height; i++) {
            grid[i] = new Array(width);
            for (var j = 0; j < width; j++) {
                grid[i][j] = fillValue;
            }
        }
    }
    catch (e) {
        log.error("ex in grid.initGrid: " + e);
    }
    return grid;
};
var mapGridSpaceToChar = function (space) {
    // KILL_ZONE: 0, SPACE: 1, TAIL: 2, FOOD: 3, WALL_NEAR: 4, WARNING: 5, DANGER: 6, SNAKE_BODY: 7, ENEMY_HEAD: 8
    var chars = ["!", " ", "T", "O", "'", "x", "X", "S", "Y", "H", "@"];
    return chars[space];
};
// test if cells are the same
var sameCell = function (a, b) { return a.x === b.x && a.y === b.y; };
module.exports = {
    getDistance: getDistance,
    buildGrid: buildGrid,
    printGrid: printGrid,
    initGrid: initGrid
};
