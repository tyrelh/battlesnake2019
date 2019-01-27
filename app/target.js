const k = require("./keys");
const g = require("./grid");

const closestFood = (grid, self) => {
  return closestTarget(grid, self, k.FOOD);
};

const closestKillableEnemy = (grid, self) => {
  return closestTarget(grid, self, k.KILL_ZONE);
}

// simple search for closest target of a specified grid type
const closestTarget = (grid, self, targetType) => {
  try {
    let closestTarget = null;
    let closestDistance = 9999;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[0].length; j++) {
        if (grid[i][j] === targetType) {
          const target = { x: j, y: i };
          const distance = g.getDistance(self, target);
          if (distance < closestDistance) {
            closestTarget = target;
            closestDistance = distance;
          }
        }
      }
    }
    return closestTarget;
  }
  catch (e) { console.log("!!! ex in f.closestTarget " + e); }
  return null
}

module.exports = {
  closestFood: closestFood,
  closestKillableEnemy: closestKillableEnemy
};
