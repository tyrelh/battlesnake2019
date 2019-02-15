const keys = require("./keys");
const log = require("./logger");
const p = require("./params");




const buildGrid = data => {
  const board = data.board;
  const self = data.you;

  // initailize grid to SPACEs
  let grid = initGrid(board.width, board.height, keys.SPACE);

  try {
    // mark edges WALL_NEAR
    for (let y = 0; y < board.height; y++) {
      grid[y][0] = keys.WALL_NEAR;
      grid[y][board.width - 1] = keys.WALL_NEAR;
    }
    for (let x = 0; x < board.width; x++) {
      grid[0][x] = keys.WALL_NEAR;
      grid[board.height - 1][x] = keys.WALL_NEAR;
    }
  }
  catch (e) { log.error(`ex in edges marking grid.buildGrid: ${e}`, data.turn); }

  // fill FOOD locations
  try {
    board.food.forEach(({ x, y }) => {
      grid[y][x] = keys.FOOD;
    });
  }
  catch (e) { log.error(`ex in food marking grid.buildGrid: ${e}`, data.turn); }

  try {
    // fill snake locations
    board.snakes.forEach(({ id, name, health, body }) => {
      // fill SNAKE_BODY locations
      body.forEach(({ x, y }) => {
        if (id === self.id) grid[y][x] = keys.YOUR_BODY;
        else grid[y][x] = keys.SNAKE_BODY;
      });

      // fill ENEMY_HEAD and DANGER locations
      const head = body[0];
      const dangerSnake = body.length >= self.body.length
      if (id != self.id) {
        if (dangerSnake) {
          grid[head.y][head.x] = keys.ENEMY_HEAD;
        }
        else {
          grid[head.y][head.x] = keys.SMALL_HEAD;
        }
        
      }

      // check if tail can be TAIL or SNAKE_BODY
      let tailSpace = true;
      // TODO: these checks can be simplified?
      // check down
      if (head.y + 1 < board.height && grid[head.y + 1][head.x] < keys.DANGER) {
        if (grid[head.y + 1][head.x] === keys.FOOD) tailSpace = false;
      }
      // check up
      if (head.y - 1 >= 0 && grid[head.y - 1][head.x] < keys.DANGER) {
        if (grid[head.y - 1][head.x] === keys.FOOD) tailSpace = false;
      }
      // check left
      if (head.x + 1 < board.width && grid[head.y][head.x + 1] < keys.DANGER) {
        if (grid[head.y][head.x + 1] === keys.FOOD) tailSpace = false;
      }
      // check right
      if (head.x - 1 >= 0 && grid[head.y][head.x - 1] < keys.DANGER) {
        if (grid[head.y][head.x - 1] === keys.FOOD) tailSpace = false;
      }
      // check for tail
      if (tailSpace && data.turn > 3) {
        let tail = body[body.length - 1]
        grid[tail.y][tail.x] = keys.TAIL;
      }
    });

    // fill DANGER or KILL_ZONE locations around each snake head
    // also fill FUTURE_2 locations
    board.snakes.forEach(({ id, name, health, body }) => {
      if (id == self.id) return;
      const imBigger = self.body.length > body.length;
      let pos = { x: 0, y: 0 };
      const head = body[0];
      const headZone = imBigger ? keys.KILL_ZONE : keys.DANGER;

      // check up, down, left, righ
      let offsets = [
        {x: 0, y: -1}, // up
        {x: 0, y: 1},  // down
        {x: -1, y: 0}, // left
        {x: 1, y: 0},  // right
      ]
      for (const offset of offsets) {
        pos.x = head.x - offset.x;
        pos.y = head.y - offset.y;
        if (!outOfBounds(pos, grid) && grid[pos.y][pos.x] < keys.DANGER) {
          grid[pos.y][pos.x] = headZone;
        }
      }

      // check positions snake could be in 2 moves
      offsets = [
        {x: -1, y: -1},
        {x: -2, y: 0},
        {x: -1, y: 1},
        {x: 0, y: 2},
        {x: 1, y: 1},
        {x: 2, y: 0},
        {x: 1, y: -1},
        {x: 0, y: -2}
      ];
      for (const offset of offsets) {
        pos.x = head.x - offset.x;
        pos.y = head.y - offset.y;
        if (!outOfBounds(pos, grid) && grid[pos.y][pos.x] < keys.FOOD) {
          grid[pos.y][pos.x] = keys.FUTURE_2;
        }
      }
    });
  }
  catch (e) { log.error(`ex in snakes marking grid.buildGrid: ${e}`, data.turn); }

  if (p.DEBUG_MAPS) printGrid(grid);
  return grid;
};




// manhattan distance
const getDistance = (a, b) => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};




// print grid to logs
const printGrid = grid => {
  let xAxis = "  ";
  for (let x = 0; x < grid[0].length; x++) {
    xAxis += ` ${x % 10}`
  }
  log.status(`${xAxis}\n`);
  for (let i = 0; i < grid.length; i++) {
    let row = `${i % 10} `;
    for (let j = 0; j < grid[0].length; j++) {
      row += ` ${keys.MAP[grid[i][j]]}`;
    }
    log.status(row);
  }
};




// create a grid filled with a given value
const initGrid = (width, height, fillValue) => {
  let grid;
  try {
    grid = new Array(height);
    for (let i = 0; i < height; i++) {
      grid[i] = new Array(width);
      for (let j = 0; j < width; j++) {
        grid[i][j] = fillValue;
      }
    }
  }
  catch (e) { log.error(`ex in grid.initGrid: ${e}`, data.turn); }
  return grid;
}




// return a deep copy of game grid
const copyGrid = (grid) => {
  let gridCopy;
  gridCopy = new Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    gridCopy[i] = new Array(grid[0].length);
    for (let j = 0 ;j< grid[0].length; j++) {
      gridCopy[i][j] = grid[i][j]
    }
  }
  return gridCopy;
}




// test if cells are the same
const sameCell = (a, b) => a.x === b.x && a.y === b.y;




// check if space is out of bounds
const outOfBounds = (pos, grid) => {
  const x = pos.x;
  const y = pos.y;
  try {
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) return true
      else return false
  } catch (e) {
    log.error(`ex in search.outOfBounds: ${e}`);
    return true
  }
};
module.exports = {
  getDistance: getDistance,
  buildGrid: buildGrid,
  printGrid: printGrid,
  initGrid: initGrid,
  copyGrid: copyGrid
};
