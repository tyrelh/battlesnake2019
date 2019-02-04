const k = require("./keys");
const g = require("./grid");
const log = require("./logger")

const closestFood = (grid, pos) => {
  return closestTarget(grid, pos, k.FOOD);
};

const closestKillableEnemy = (grid, pos) => {
  return closestTarget(grid, pos, k.KILL_ZONE);
}

const closestEnemyHead = (grid, pos) => {
  return closestTarget(grid, pos, k.ENEMY_HEAD);
}

// simple search for closest target of a specified grid type
const closestTarget = (grid, pos, targetType) => {
  try {
    let closestTarget = null;
    let closestDistance = 9999;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        if (grid[i][j] === targetType) {
          const target = { x: j, y: i };
          const distance = g.getDistance(pos, target);
          if (distance < closestDistance) {
            closestTarget = target;
            closestDistance = distance;
          }
        }
      }
    }
    return closestTarget;
  }
  catch (e) { log.error(`ex in target.closestTarget " + ${e}`); }
  return null
}

module.exports = {
  closestFood: closestFood,
  closestKillableEnemy: closestKillableEnemy,
  closestEnemyHead: closestEnemyHead,
  closestTarget: closestTarget
};
