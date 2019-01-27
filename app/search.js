const k = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const p = require("./params");

const DEBUG = false;
const STATUS = true;
const LOG_ASTAR_GRID = false;


// fill an area
const fill = (direction, grid, { you }) => {
  let closedGrid;
  let openGrid;
  closedGrid = g.initGrid(grid[0].length, grid.length, false);
  openGrid = g.initGrid(grid[0].length, grid.length, false);
  let openStack = [];

  const inGrid = (pos, grd) => {
    try {
      return grd[pos.y][pos.x];
    } catch (e) {
      console.log("!!! ex in fill.inGrid " + e);
    }
  };

  const addToOpen = pos => {
    try {
      if (!outOfBounds(pos, grid) && !inGrid(pos, closedGrid) && !inGrid(pos, openGrid)) {
        if (inGrid(pos, grid) <= k.DANGER) {
          openStack.push(pos);
          openGrid[pos.y][pos.x] = true;
        }
      }
    } catch (e) {
      console.log("!!! ex in fill.addToOpen " + e);
    }
  };

  const removeFromOpen = () => {
    let pos;
    try {
      pos = openStack.pop();
      if (!pos) return false;
      openGrid[pos.y][pos.x] = false;
      return pos;
      } catch (e) {
        console.log("!!! ex in fill.removeFromOpen " + e);
      }
  };

  const addToClosed = pos => {
    closedGrid[pos.y][pos.x] = true; 
  };

  let size = you.body.length;
  let current = you.body[0];
  let givenMovePos = {x: current.x, y: current.y};
  switch(direction) {
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
  let area = 0;
  let enemyHeads = 0;
  let killZones = 0;
  let tails = 0;
  let foods = 0;

  // iterate over all possible moves given current move
  while (openStack.length > 0) {
    const nextMove = removeFromOpen();
    addToClosed(nextMove);
    switch(inGrid(nextMove, grid)) {
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
      default:
    }
    area++;
    // check up
    const nUp = {x: nextMove.x, y: nextMove.y - 1};
    addToOpen(nUp);
    // check down
    const nDown = {x: nextMove.x, y: nextMove.y + 1};
    addToOpen(nDown);
    // check left
    const nLeft = {x: nextMove.x - 1, y: nextMove.y};
    addToOpen(nLeft);
    // check right
    const nRight = {x: nextMove.x + 1, y: nextMove.y};
    addToOpen(nRight);
  }

  let score = 0;
  score += area * p.BASE_SPACE;
  score += tails * p.BASE_TAIL;
  score += foods * p.BASE_FOOD;
  score += enemyHeads * p.BASE_ENEMY_HEAD;
  score += killZones * p.BASE_KILL_ZONE;
  if (DEBUG) console.log("score in fill: " + score + " for move " + k.DIRECTION[direction]);
  return score;
}


// a* pathfinding algorithm that will find the shortest path from current head
// location to a given destination
const astar = (grid, data, destination, mode = k.FOOD) => {
  if (STATUS) console.log("CALCULATING PATH...");
  // init search fields
  const searchScores = buildAstarGrid(grid);
  let openSet = [];
  let closedSet = [];
  // start location for search is current head location
  const start = s.location(data);
  // on first few moves, point to closest food no matter what
  if (data.turn < p.INITIAL_FEEDING) {
    destination = t.closestFood(grid, start);
    mode = k.FOOD;
  }
  if (DEBUG)
    console.log(
      "astar destination: " + k.TYPE[mode] + ", " + pairToString(destination)
    );
  openSet.push(start);
  // while the open set is not empty keep searching
  while (openSet.length) {
    let lowestCell = { x: 9999, y: 9999 };
    let lowestF = 9999;
    // find cell with lowest f score
    openSet.forEach(({ x, y }) => {
      if (searchScores[y][x].f < lowestF) {
        // 2018 NOTE: consider changing to <= and then also comparing g scores
        lowestF = searchScores[y][x].f;
        lowestCell = { x: x, y: y };
      }
    });
    // check if found destination
    if (sameCell(lowestCell, destination)) {
      if (STATUS) console.log("FOUND A PATH");
      if (LOG_ASTAR_GRID) {
        console.log("astar grid after search success:");
        printFScores(astarGrid);
      }
      // re-trace path back to origin to find optimal next move
      let tempCell = lowestCell;
      if (DEBUG) console.log("astar start pos: " + pairToString(start));
      while (
        searchScores[tempCell.y][tempCell.x].previous.x != start.x ||
        searchScores[tempCell.y][tempCell.x].previous.y != start.y
      ) {
        tempCell = searchScores[tempCell.y][tempCell.x].previous;
      }
      if (DEBUG) console.log("astar next move: " + pairToString(tempCell));
      return calcDirection(start, tempCell);
    }
    // else continue searching
    let current = lowestCell;
    currentCell = searchScores[current.y][current.x];
    // update sets
    openSet = openSet.filter(
      pair => !(pair.x === current.x && pair.y === current.y)
    );
    closedSet.push(current);
    // check every viable neighbor to current cell
    // searchScores[current.y][current.x].neighbors.forEach(neighbor => {
    const currentNeighbors = searchScores[current.y][current.x].neighbors;
    for (let n = 0; n < currentNeighbors.length; n++) {
      const neighbor = currentNeighbors[n];
      let neighborCell = searchScores[neighbor.y][neighbor.x];
      if (sameCell(neighbor, destination)) {
        if (STATUS) console.log("FOUND A PATH (neighbor)");
        neighborCell.previous = current;
        if (LOG_ASTAR_GRID) {
          console.log("astar grid after search success:");
          printFScores(searchScores);
        }
        // re-trace path back to origin to find optimal next move
        let temp = neighbor;
        if (DEBUG) console.log("astar start pos: " + pairToString(start));
        while (
          searchScores[temp.y][temp.x].previous.x != start.x ||
          searchScores[temp.y][temp.x].previous.y != start.y
        ) {
          temp = searchScores[temp.y][temp.x].previous;
        }
        if (DEBUG) console.log("astar next move: " + pairToString(temp));
        return calcDirection(start, temp);
      }
      // check if neighbor can be moved to
      if (neighborCell.state < k.SNAKE_BODY) {
        // check if neighbor has already been evaluated
        if (!arrayIncludesPair(closedSet, neighbor)) {
          const tempG = currentCell.g + 1;
          let shorter = true;
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
  }
  // if reach this point and open set is empty, no path
  if (!openSet.length) {
    if (STATUS) console.log("COULD NOT FIND PATH!");
    if (LOG_ASTAR_GRID) {
      console.log("astar grid after search failure:");
      printFScores(searchScores);
    }
    // TODO: some a* redundancy?
    return null;
  }
};

// test if cells are the same
const sameCell = (a, b) => a.x === b.x && a.y === b.y;


// check if array contains a given pair
const arrayIncludesPair = (arr, pair) => {
  for (let i = 0; i < arr.length; i++) {
    if (sameCell(arr[i], pair)) return true;
  }
  return false;
};


// calculate direction from a to b
const calcDirection = (a, b) => {
  const x = a.x - b.x;
  const y = a.y - b.y;
  let direction = k.UP;
  if (x < 0) direction = k.RIGHT;
  else if (x > 0) direction = k.LEFT;
  else if (y < 0) direction = k.DOWN;
  return direction;
};


// construct a parallel search grid to store a* scores
const buildAstarGrid = grid => {
  let astarGrid = new Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    astarGrid[i] = new Array(grid[0].length);
    for (let j = 0; j < grid[0].length; j++) {
      astarGrid[i][j] = new Cell(j, i, grid[0].length, grid.length, grid[i][j]);
    }
  }
  return astarGrid;
};


// print search grid f scores
const printFScores = astarGrid => {
  for (let i = 0; i < astarGrid.length; i++) {
    let row = "";
    for (let j = 0; j < astarGrid[0].length; j++) {
      row +=
        astarGrid[i][j].f < 10
          ? "  " + astarGrid[i][j].f
          : " " + astarGrid[i][j].f;
    }
    console.log(row);
  }
};


// cell of search grid to store a* scores
class Cell {
  constructor(x, y, width, height, state) {
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.x = x;
    this.y = y;
    this.state = state;
    this.neighbors = [];
    this.previous = { x: 9998, y: 9998 };
    if (this.x < width - 1) this.neighbors.push({ x: this.x + 1, y: this.y });
    if (this.x > 0) this.neighbors.push({ x: this.x - 1, y: this.y });
    if (this.y < height - 1) this.neighbors.push({ x: this.x, y: this.y + 1 });
    if (this.y > 0) this.neighbors.push({ x: this.x, y: this.y - 1 });
  }
}


// return pair as string
const pairToString = pair => {
  try {
    const s = ["{x: ", ", y: ", "}"];
    return s[0] + pair.x + s[1] + pair.y + s[2];
  } catch (e) {
    console.log("!!! ex in search.pairToString " + e);
  }
};


// check if space is out of bounds
const outOfBounds = ({ x, y }, grid) => {
  try {
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) {
      return true
    } else {
      return false
    }
  } catch (e) {
    console.log("!!! ex in outOfBounds " + e);
    return true
  }
};


module.exports = {
  outOfBounds: outOfBounds,
  astar: astar,
  fill: fill
}