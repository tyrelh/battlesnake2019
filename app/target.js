var k = require("./keys");
var g = require("./grid");
var log = require("./logger");
var closestFood = function (grid, self) {
    return closestTarget(grid, self, k.FOOD);
};
var closestKillableEnemy = function (grid, self) {
    return closestTarget(grid, self, k.KILL_ZONE);
};
var closestEnemyHead = function (grid, self) {
    return closestTarget(grid, self, k.ENEMY_HEAD);
};
// simple search for closest target of a specified grid type
var closestTarget = function (grid, self, targetType) {
    try {
        var closestTarget_1 = null;
        var closestDistance = 9999;
        for (var i = 0; i < grid.length; i++) {
            for (var j = 0; j < grid[0].length; j++) {
                if (grid[i][j] === targetType) {
                    var target = { x: j, y: i };
                    var distance = g.getDistance(self, target);
                    if (distance < closestDistance) {
                        closestTarget_1 = target;
                        closestDistance = distance;
                    }
                }
            }
        }
        return closestTarget_1;
    }
    catch (e) {
        log.error("ex in target.closestTarget \" + " + e);
    }
    return null;
};
module.exports = {
    closestFood: closestFood,
    closestKillableEnemy: closestKillableEnemy,
    closestEnemyHead: closestEnemyHead
};
