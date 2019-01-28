const k = require("./keys");
const log = require("./logger");
const p = require("./params");


const buildGrid = data => {
  const board = data.board;
  const self = data.you;

  // initailize grid to SPACEs
  let grid = initGrid(board.width, board.height, k.SPACE);

  try {
    // mark edges WARNING
    for (let y = 1; y < board.height - 1; y++) {
      grid[y][0] = k.WARNING;
      grid[y][board.width - 1] = k.WARNING;
    }
    for (let x = 1; x < board.width - 1; x++) {
      grid[0][x] = k.WARNING;
      grid[board.height - 1][x] = k.WARNING;
    }
  }
  catch (e) { log.error(`ex in edges marking grid.buildGrid: ${e}`); }

  try {
    // mark corners DANGER
    grid[0][0] = k.DANGER;
    grid[0][board.width - 1] = k.DANGER;
    grid[board.height - 1][0] = k.DANGER;
    grid[board.height - 1][board.width - 1] = k.DANGER;
  }
  catch (e) { log.error(`ex in corners marking grid.buildGrid: ${e}`); }

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
        grid[y][x] = k.SNAKE_BODY;
      });

      // check if tail can be TAIL or SNAKE_BODY           // Just not working, keeps leading to deaths
      // if (body.length > 2) {
      //   const last = body[body.length - 1];
      //   const sLast = body[body.length - 2]
      //   if (health === 100 || sameCell(last, sLast)) {
      //     grid[last.y][last.x] = k.SNAKE_BODY;
      //   } else {
      //     grid[last.y][last.x] = k.TAIL;
      //   }
      // }

      // skip filling own head and DANGER
      if (id === self.id) return;

      // fill ENEMY_HEAD and DANGER locations
      const head = body[0];
      grid[head.y][head.x] = k.ENEMY_HEAD;

      // mark DANGER or KILL_ZONE around enemy head based on snake length
      let headZone = body.length < self.body.length ? k.KILL_ZONE : k.DANGER;
      // check down
      if (head.y + 1 < board.height && grid[head.y + 1][head.x] < k.DANGER) {
        grid[head.y + 1][head.x] = headZone;
      }
      // check up
      if (head.y - 1 >= 0 && grid[head.y - 1][head.x] < k.DANGER) {
        grid[head.y - 1][head.x] = headZone;
      }
      // check left
      if (head.x + 1 < board.width && grid[head.y][head.x + 1] < k.DANGER) {
        grid[head.y][head.x + 1] = headZone;
      }
      // check right
      if (head.x - 1 >= 0 && grid[head.y][head.x - 1] < k.DANGER) {
        grid[head.y][head.x - 1] = headZone;
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
  for (let i = 0; i < grid.length; i++) {
    let row = "";
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
  // KILL_ZONE: 0, SPACE: 1, TAIL: 2, FOOD: 3, WARNING: 4, DANGER: 5, SNAKE_BODY: 6, ENEMY_HEAD: 7
  const chars = ["!", " ", "T", "O", "x", "X", "S", "H", "@"]
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
