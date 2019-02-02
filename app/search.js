var k = require("./keys");
var g = require("./grid");
var t = require("./target");
var s = require("./self");
var p = require("./params");
var m = require("./move");
var log = require("./logger");
// fill an area
var fill = function (direction, grid, _a, constraints) {
    var you = _a.you;
    if (constraints === void 0) { constraints = []; }
    var closedGrid;
    var openGrid;
    closedGrid = g.initGrid(grid[0].length, grid.length, false);
    openGrid = g.initGrid(grid[0].length, grid.length, false);
    var openStack = [];
    var inGrid = function (pos, grd) {
        try {
            return grd[pos.y][pos.x];
        }
        catch (e) {
            log.error("ex in search.fill.inGrid: " + e);
        }
    };
    var addToOpen = function (pos) {
        try {
            if (!outOfBounds(pos, grid) && !inGrid(pos, closedGrid) && !inGrid(pos, openGrid)) {
                if (inGrid(pos, grid) <= k.DANGER) {
                    for (var i = 0; i < constraints.length; i++) {
                        if (inGrid(pos, grid) === constraints[i])
                            return;
                    }
                    openStack.push(pos);
                    openGrid[pos.y][pos.x] = true;
                }
            }
        }
        catch (e) {
            log.error("ex in search.fill.addToOpen: " + e);
        }
    };
    var removeFromOpen = function () {
        var pos;
        try {
            pos = openStack.pop();
            if (!pos)
                return false;
            openGrid[pos.y][pos.x] = false;
            return pos;
        }
        catch (e) {
            log.error("ex in search.fill.removeFromOpen: " + e);
        }
    };
    var addToClosed = function (pos) {
        closedGrid[pos.y][pos.x] = true;
    };
    var size = you.body.length;
    var current = you.body[0];
    var givenMovePos = { x: current.x, y: current.y };
    switch (direction) {
        case k.UP:
            givenMovePos.y -= 1;
            break;
        case k.DOWN:
            givenMovePos.y += 1;
            break;
        case k.LEFT:
            givenMovePos.x -= 1;
            break;
        case k.RIGHT:
            givenMovePos.x += 1;
    }
    addToOpen(givenMovePos);
    addToClosed(current);
    // things to track for this move
    var area = 0;
    var enemyHeads = 0;
    var killZones = 0;
    var tails = 0;
    var foods = 0;
    var warnings = 0;
    var walls = 0;
    // iterate over all possible moves given current move
    while (openStack.length > 0) {
        var nextMove = removeFromOpen();
        addToClosed(nextMove);
        switch (inGrid(nextMove, grid)) {
            case k.ENEMY_HEAD:
                enemyHeads++;
                break;
            case k.TAIL:
                tails++;
                break;
            case k.KILL_ZONE:
                killZones++;
                break;
            case k.FOOD:
                foods++;
                break;
            case k.WALL_NEAR:
                walls++;
                break;
            case k.WARNING:
                warnings++;
                break;
            default:
        }
        area++;
        // check up
        var nUp = { x: nextMove.x, y: nextMove.y - 1 };
        addToOpen(nUp);
        // check down
        var nDown = { x: nextMove.x, y: nextMove.y + 1 };
        addToOpen(nDown);
        // check left
        var nLeft = { x: nextMove.x - 1, y: nextMove.y };
        addToOpen(nLeft);
        // check right
        var nRight = { x: nextMove.x + 1, y: nextMove.y };
        addToOpen(nRight);
    }
    var score = 0;
    score += area * p.BASE_SPACE;
    score += tails * p.BASE_TAIL;
    score += foods * p.BASE_FOOD;
    score += enemyHeads * p.BASE_ENEMY_HEAD;
    score += killZones * p.BASE_KILL_ZONE;
    score += warnings * p.BASE_WARNING;
    score += walls * p.BASE_WALL_NEAR;
    if (p.DEBUG)
        log.debug("Score in fill: " + score + " for move " + k.DIRECTION[direction]);
    return score;
};
// a* pathfinding algorithm that will find the shortest path from current head
// location to a given destination
var astar = function (grid, data, destination, mode) {
    if (mode === void 0) { mode = k.FOOD; }
    if (p.STATUS)
        log.status("Calculating path (astar)...");
    // init search fields
    var searchScores = buildAstarGrid(grid);
    var openSet = [];
    var closedSet = [];
    // start location for search is current head location
    var start = s.location(data);
    // on first few moves, point to closest food no matter what
    if (data.turn < p.INITIAL_FEEDING) {
        destination = t.closestFood(grid, start);
        mode = k.FOOD;
    }
    if (destination == null) {
        log.debug("In search.astar, destination was null, trying to target tail.");
        destination = s.tailLocation(data);
        mode = k.TAIL;
    }
    if (p.DEBUG)
        log.debug("astar destination: " + k.TYPE[mode] + ", " + pairToString(destination));
    openSet.push(start);
    var _loop_1 = function () {
        var lowestCell = { x: 9999, y: 9999 };
        var lowestF = 9999;
        // find cell with lowest f score
        openSet.forEach(function (_a) {
            var x = _a.x, y = _a.y;
            if (searchScores[y][x].f < lowestF) {
                // 2018 NOTE: consider changing to <= and then also comparing g scores
                lowestF = searchScores[y][x].f;
                lowestCell = { x: x, y: y };
            }
        });
        // check if found destination
        if (sameCell(lowestCell, destination)) {
            if (p.STATUS)
                log.status("Found a path!");
            // if (p.DEBUG_MAPS) {
            //   log.debug("astar grid after search success:");
            //   printFScores(astarGrid);
            // }
            // re-trace path back to origin to find optimal next move
            var tempCell = lowestCell;
            if (p.DEBUG)
                log.debug("astar start pos: " + pairToString(start));
            while (searchScores[tempCell.y][tempCell.x].previous.x != start.x ||
                searchScores[tempCell.y][tempCell.x].previous.y != start.y) {
                tempCell = searchScores[tempCell.y][tempCell.x].previous;
            }
            if (p.DEBUG)
                log.debug("astar next move: " + pairToString(tempCell));
            return { value: calcDirection(start, tempCell) };
        }
        // else continue searching
        var current = lowestCell;
        currentCell = searchScores[current.y][current.x];
        // update sets
        openSet = openSet.filter(function (pair) { return !(pair.x === current.x && pair.y === current.y); });
        closedSet.push(current);
        // check every viable neighbor to current cell
        // searchScores[current.y][current.x].neighbors.forEach(neighbor => {
        var currentNeighbors = searchScores[current.y][current.x].neighbors;
        for (var n = 0; n < currentNeighbors.length; n++) {
            var neighbor = currentNeighbors[n];
            var neighborCell = searchScores[neighbor.y][neighbor.x];
            if (sameCell(neighbor, destination)) {
                if (p.STATUS)
                    log.status("Found a path (neighbor)");
                neighborCell.previous = current;
                // if (p.DEBUG_MAPS) {
                //   log.debug("astar grid after search success:");
                //   printFScores(searchScores);
                // }
                // re-trace path back to origin to find optimal next move
                var temp = neighbor;
                if (p.DEBUG)
                    log.debug("astar start pos: " + pairToString(start));
                while (searchScores[temp.y][temp.x].previous.x != start.x ||
                    searchScores[temp.y][temp.x].previous.y != start.y) {
                    temp = searchScores[temp.y][temp.x].previous;
                }
                if (p.DEBUG)
                    log.debug("astar next move: " + pairToString(temp));
                return { value: calcDirection(start, temp) };
            }
            // check if neighbor can be moved to
            if (neighborCell.state < k.SNAKE_BODY) {
                // check if neighbor has already been evaluated
                if (!arrayIncludesPair(closedSet, neighbor)) {
                    var tempG = currentCell.g + 1;
                    var shorter = true;
                    // check if already evaluated with lower g score
                    if (arrayIncludesPair(openSet, neighbor)) {
                        if (tempG > neighborCell.g) {
                            // 2018 NOTE: change to >= ?
                            shorter = false;
                        }
                    }
                    // if not in either set, add to open set
                    else {
                        openSet.push(neighbor);
                    }
                    // this is the current best path, record it
                    if (shorter) {
                        neighborCell.g = tempG;
                        neighborCell.h = g.getDistance(neighbor, destination);
                        neighborCell.f = neighborCell.g + neighborCell.h;
                        neighborCell.previous = current;
                    }
                }
            }
        }
    };
    // while the open set is not empty keep searching
    while (openSet.length) {
        var state_1 = _loop_1();
        if (typeof state_1 === "object")
            return state_1.value;
    }
    // if reach this point and open set is empty, no path
    if (!openSet.length) {
        if (p.STATUS)
            log.status("COULD NOT FIND PATH!");
        // if (p.DEBUG_MAPS) {
        //   localStorage.debug("astar grid after search failure:");
        //   printFScores(searchScores);
        // }
        // TODO: some a* redundancy?
        return null;
    }
};
var distanceToEnemy = function (direction, grid, data) {
    try {
        var you = data.you;
        // console.log(k);
        if (validMove(direction, you.body[0], grid)) {
            var closestEnemyHead = t.closestEnemyHead(grid, you);
            if (closestEnemyHead === null)
                return 0;
            return g.getDistance(closestEnemyHead, you.body[0]);
        }
    }
    catch (e) {
        log.error("ex in search.distanceToEnemy: " + e);
    }
    return 0;
};
// test if cells are the same
var sameCell = function (a, b) { return a.x === b.x && a.y === b.y; };
// check if array contains a given pair
var arrayIncludesPair = function (arr, pair) {
    for (var i = 0; i < arr.length; i++) {
        if (sameCell(arr[i], pair))
            return true;
    }
    return false;
};
// calculate direction from a to b
var calcDirection = function (a, b) {
    var x = a.x - b.x;
    var y = a.y - b.y;
    var direction = k.UP;
    if (x < 0)
        direction = k.RIGHT;
    else if (x > 0)
        direction = k.LEFT;
    else if (y < 0)
        direction = k.DOWN;
    return direction;
};
// construct a parallel search grid to store a* scores
var buildAstarGrid = function (grid) {
    var astarGrid = new Array(grid.length);
    for (var i = 0; i < grid.length; i++) {
        astarGrid[i] = new Array(grid[0].length);
        for (var j = 0; j < grid[0].length; j++) {
            astarGrid[i][j] = new Cell(j, i, grid[0].length, grid.length, grid[i][j]);
        }
    }
    return astarGrid;
};
// print search grid f scores
var printFScores = function (astarGrid) {
    for (var i = 0; i < astarGrid.length; i++) {
        var row = "";
        for (var j = 0; j < astarGrid[0].length; j++) {
            row +=
                astarGrid[i][j].f < 10
                    ? "  " + astarGrid[i][j].f
                    : " " + astarGrid[i][j].f;
        }
        log.status(row);
    }
};
// cell of search grid to store a* scores
var Cell = /** @class */ (function () {
    function Cell(x, y, width, height, state) {
        this.f = 0;
        this.g = 0;
        this.h = 0;
        this.x = x;
        this.y = y;
        this.state = state;
        this.neighbors = [];
        this.previous = { x: 9998, y: 9998 };
        if (this.x < width - 1)
            this.neighbors.push({ x: this.x + 1, y: this.y });
        if (this.x > 0)
            this.neighbors.push({ x: this.x - 1, y: this.y });
        if (this.y < height - 1)
            this.neighbors.push({ x: this.x, y: this.y + 1 });
        if (this.y > 0)
            this.neighbors.push({ x: this.x, y: this.y - 1 });
    }
    return Cell;
}());
// return pair as string
var pairToString = function (pair) {
    try {
        return "{x: " + pair.x + ", y: " + pair.y + "}";
    }
    catch (e) {
        log.error("ex in search.pairToString: " + e);
        return "there was an error caught in search.pairToString";
    }
};
// check if space is out of bounds
var outOfBounds = function (_a, grid) {
    var x = _a.x, y = _a.y;
    try {
        if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length)
            return true;
        else
            return false;
    }
    catch (e) {
        log.error("ex in search.outOfBounds: " + e);
        return true;
    }
};
// check if move is not fatal
var validMove = function (direction, pos, grid) {
    try {
        var newPos = applyMoveToPos(direction, pos);
        if (outOfBounds(newPos, grid))
            return false;
        return grid[newPos.y][newPos.x] < -k.DANGER;
    }
    catch (e) {
        log.error("ex in search.validMove: " + e + "\n{direction: " + direction + ", pos: " + pairToString(pos) + ", grid: " + grid + "}");
        return false;
    }
};
var applyMoveToPos = function (move, pos) {
    switch (move) {
        case k.UP:
            return { x: pos.x, y: pos.y - 1 };
        case k.DOWN:
            return { x: pos.x, y: pos.y + 1 };
        case k.LEFT:
            return { x: pos.x - 1, y: pos.y };
        case k.RIGHT:
            return { x: pos.x + 1, y: pos.y };
    }
    return { x: 0, y: 0 };
};
module.exports = {
    outOfBounds: outOfBounds,
    astar: astar,
    fill: fill,
    distanceToEnemy: distanceToEnemy
};
