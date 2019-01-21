const k = require("./keys");

const buildGrid = (board, self) => {
  // initailize grid to SPACEs
  let grid = new Array(board.height);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = new Array(board.width).fill(k.SPACE);
  }
  // fill FOOD locations
  board.food.forEach(({ x, y }) => {
    grid[y][x] = k.FOOD;
  });
  // fill snake locations
  board.snakes.forEach(({ id, name, health, body }) => {
    // fill SNAKE_BODY locations
    body.forEach(({ x, y }) => {
      grid[y][x] = k.SNAKE_BODY;
    });
    // check if tail can be TAIL or SNAKE_BODY
    // TODO: figure out new way to check tail, head is being added on eat, not tail
    // const tail = body[body.length - 1];
    // const bodySeg = body[body.length - 2];
    // if (tail.x != bodySeg.x || tail.y != bodySeg.y) {
    //   grid[tail.y][tail.x] = k.TAIL;
    // }
    // skip filling own head and DANGER
    if (id === self.id) return;
    // fill ENEMY_HEAD and DANGER locations
    const head = body[0];
    grid[head.y][head.y] = k.ENEMY_HEAD;
    // mark DANGER or KILL_ZONE around enemy head based on snake length
    let headZone = (body.length < self.body.length) ? k.KILL_ZONE : k.DANGER;
    // check down
    if (head.y + 1 < board.height && grid[head.y + 1][head.x] < headZone) {
      grid[head.y + 1][head.x] = headZone
    } 
    // check up
    if (head.y - 1 >= 0 && grid[head.y - 1][head.x] < headZone) {
      grid[head.y - 1][head.x] = headZone
    }
    // check left
    if (head.x + 1 < board.width && grid[head.y][head.x + 1] < headZone) {
      grid[head.y][head.x + 1] = headZone
    }
    // check right
    if (head.x - 1 >= 0 && grid[head.y][head.x - 1] < headZone) {
      grid[head.y][head.x - 1] = headZone
    }
  });
  return grid;
};

// manhattan distance
const getDistance = (a, b) => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

// print grid to console for debugging / logging
const printGrid = grid => {
  for (let i = 0; i < grid.length; i++) {
    let row = "";
    for (let j = 0; j < grid[0].length; j++) {
      row += " " + (grid[i][j] === 0 ? "." : grid[i][j]);
    }
    console.log(row);
  }
};

module.exports = {
  getDistance: getDistance,
  buildGrid: buildGrid,
  printGrid: printGrid
};
