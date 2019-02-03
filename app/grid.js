const k = require("./keys");
const log = require("./logger");
const p = require("./params");


const buildGrid = data => {
  const board = data.board;
  const self = data.you;

  // initailize grid to SPACEs
  let grid = initGrid(board.width, board.height, k.SPACE);

  try {
    // mark edges WALL_NEAR
    for (let y = 0; y < board.height; y++) {
      grid[y][0] = k.WALL_NEAR;
      grid[y][board.width - 1] = k.WALL_NEAR;
    }
    for (let x = 0; x < board.width; x++) {
      grid[0][x] = k.WALL_NEAR;
      grid[board.height - 1][x] = k.WALL_NEAR;
    }
  }
  catch (e) { log.error(`ex in edges marking grid.buildGrid: ${e}`); }

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
    board.food.forEach(({ x, y }) => {
      grid[y][x] = k.FOOD;
    });
  }
  catch (e) { log.error(`ex in food marking grid.buildGrid: ${e}`); }

  try {
    // fill snake locations
    board.snakes.forEach(({ id, name, health, body }) => {
      // fill SNAKE_BODY locations
      body.forEach(({ x, y }) => {
        if (id === self.id) grid[y][x] = k.YOUR_BODY;
        else grid[y][x] = k.SNAKE_BODY;
      });

      // // skip filling own head and DANGER
      // if (id === self.id) return;

      // fill ENEMY_HEAD and DANGER locations
      const head = body[0];
      if (id != self.id) grid[head.y][head.x] = k.ENEMY_HEAD;

      // mark DANGER or KILL_ZONE around enemy head based on snake length
      // also check if tail can be TAIL or SNAKE_BODY
      let tailSpace = true;
      let headZone = body.length < self.body.length ? k.KILL_ZONE : k.DANGER;
      // TODO: these checks can be simplified?
      // check down
      if (head.y + 1 < board.height && grid[head.y + 1][head.x] < k.DANGER) {
        if (grid[head.y + 1][head.x] === k.FOOD) tailSpace = false;
        // if (id != self.id) grid[head.y + 1][head.x] = headZone;
      }
      // check up
      if (head.y - 1 >= 0 && grid[head.y - 1][head.x] < k.DANGER) {
        if (grid[head.y - 1][head.x] === k.FOOD) tailSpace = false;
        // if (id != self.id) grid[head.y - 1][head.x] = headZone;
      }
      // check left
      if (head.x + 1 < board.width && grid[head.y][head.x + 1] < k.DANGER) {
        if (grid[head.y][head.x + 1] === k.FOOD) tailSpace = false;
        // if (id != self.id) grid[head.y][head.x + 1] = headZone;
      }
      // check right
      if (head.x - 1 >= 0 && grid[head.y][head.x - 1] < k.DANGER) {
        if (grid[head.y][head.x - 1] === k.FOOD) tailSpace = false;
        // if (id != self.id) grid[head.y][head.x - 1] = headZone;
      }
      // check for tail
      if (tailSpace && data.turn > 3) {
        let tail = body[body.length - 1]
        grid[tail.y][tail.x] = k.TAIL;
      }
    });

    // fill DANGER or KILL_ZONE locations around each snake head
    board.snakes.forEach(({ id, name, health, body }) => {
      if (id == self.id) return;
      const head = body[0];
      let headZone = body.length < self.body.length ? k.KILL_ZONE : k.DANGER;
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
  catch (e) { log.error(`ex in snakes marking grid.buildGrid: ${e}`); }

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
      row += ` ${mapGridSpaceToChar(grid[i][j])}`;
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
  catch (e) { log.error(`ex in grid.initGrid: ${e}`); }
  return grid;
}

const mapGridSpaceToChar = space => {
  // KILL_ZONE: 0, SPACE: 1, TAIL: 2, FOOD: 3, WALL_NEAR: 4, WARNING: 5, DANGER: 6, SNAKE_BODY: 7, ENEMY_HEAD: 8
  const chars = ["!", " ", "T", "O", "'", "x", "X", "s", "Y", "S", "@"]
  return chars[space]
}

// test if cells are the same
const sameCell = (a, b) => a.x === b.x && a.y === b.y;

module.exports = {
  getDistance: getDistance,
  buildGrid: buildGrid,
  printGrid: printGrid,
  initGrid: initGrid
};
