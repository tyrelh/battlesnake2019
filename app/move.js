const k = require("./keys");
const g = require("./grid");
const f = require("./food");
const s = require("./self");

const INITIAL_FEEDING = 3;
const DEBUG = true;
const STATUS = true;

const hungry = (grid, data) => {
  const target = f.closestFood(grid, data.you.body[0]);
  console.log("target in hungry: " + target);
  let move = null
  try {
    move = astar(grid, data, target, k.FOOD);
  } catch (e) {
    console.log("error in a*: " + e);
  }
  console.log("hungry move: " + k.DIRECTION[move]);
  return move;
}

const angry = (grid, data) => {
  return astar(grid, data, f.closestKillableEnemy(grid, data.you), k.KILL_ZONE);
}

// a* pathfinding algorithm that will find the shortest path from current head
// location to a given destination
const astar = (grid, data, destination, mode = k.FOOD) => {
  if (STATUS) console.log("CALCULATING PATH FOR TURN " + data.turn + "...");
  // init search fields
  const searchScores = buildAstarGrid(grid);
  let openSet = [];
  let closedSet = []
  // start location for search is current head location
  const start = s.location(data);
  // on first few moves, point to closest food no matter what
  if (data.turn < INITIAL_FEEDING) {
    destination = f.closestFood(grid, start);
    mode = k.FOOD;
  }
  console.log("------GOT HERE");
  if (DEBUG) console.log("astar destination: " + k.TYPE[mode] + ", " + pairToString(destination));
  openSet.push(start);
  // while the open set is not empty keep searching
  while (openSet.length) {
    let lowestCell = { x: 9999, y: 9999};
    let lowestF = 9999;
    // find cell with lowest f score
    openSet.forEach(({ x, y }) => {
      if (searchScores[y][x].f < lowestF) {  // 2018 NOTE: consider changing to <= and then also comparing g scores
        lowestF = searchScores[y][x].f;
        lowestCell = { x: x, y: y };
      }
    });
    // check if found destination
    if (sameCell(lowestCell, destination)) {
      // TODO: HAVENT HIT THIS PATH IN DEBUGGING
      if (STATUS) console.log("FOUND A PATH");
      if (DEBUG) {
        console.log("astar grid after search success:")
        printFScores(astarGrid);
      }
      // re-trace path back to origin to find optimal next move
      let tempCell = lowestCell;
      if (DEBUG) console.log("astar start pos: " + pairToString(start));
      while (searchScores[tempCell.y][tempCell.x].previous.x != start.x || searchScores[tempCell.y][tempCell.x].previous.y != start.y) {
        tempCell = searchScores[tempCell.y][tempCell.x].previous;
      }
      if (DEBUG) console.log("astar next move: " + pairToString(tempCell));
      return calcDirection(start, tempCell, grid)
    }
    // else continue searching
    let current = lowestCell;
    currentCell = searchScores[current.y][current.x];
    // update sets
    openSet = openSet.filter(pair => !(pair.x === current.x && pair.y === current.y));
    closedSet.push(current);
    // check every viable neighbor to current cell
    // TODO: CURRENTLY HERE IN DEBUGGING
    // searchScores[current.y][current.x].neighbors.forEach(neighbor => {
    const currentNeighbors = searchScores[current.y][current.x].neighbors;
    for (let n = 0; n < currentNeighbors.length; n++) {
      const neighbor = currentNeighbors[n];
      let neighborCell = searchScores[neighbor.y][neighbor.x];
      if (sameCell(neighbor, destination)) {
        if (STATUS) console.log("FOUND A PATH (neighbor)");
        neighborCell.previous = current;
        if (DEBUG) {
          console.log("astar grid after search success:");
          printFScores(searchScores);
        }
        // re-trace path back to origin to find optimal next move
        let temp = neighbor;
        if (DEBUG) console.log("astar start pos: " + pairToString(start));
        while (searchScores[temp.y][temp.x].previous.x != start.x || searchScores[temp.y][temp.x].previous.y != start.y) {
          temp = searchScores[temp.y][temp.x].previous;
        }
        if (DEBUG) console.log("astar next move: " + pairToString(temp));
        return calcDirection(start, temp, grid);
      }
      // check if neighbor can be moved to
      if (neighborCell.state < k.SNAKE_BODY) {
        // check if neighbor has already been evaluated
        if (!arrayIncludesPair(closedSet, neighbor)) {
          const tempG = currentCell.g + 1;
          let shorter = true;
          // check if already evaluated with lower g score
          if (arrayIncludesPair(openSet, neighbor)) {
            if (tempG > neighborCell.g) { // 2018 NOTE: change to >= ?
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
    if (DEBUG) {
      console.log("astar grid after search failure:");
      printFScores(searchScores);
    }
    // TODO: some a* redundancy?
    return null;
  }
};

// test if cells are the same
const sameCell = (a, b) => (a.x === b.x && a.y === b.y);

// check if array contains a given pair
const arrayIncludesPair = (arr, pair) => {
  for (let i = 0; i < arr.length; i++) {
    if (sameCell(arr[i], pair)) return true;
  }
  return false;
} 

// calculate direction from a to b
const calcDirection = (a, b, grid) => {
  const x = a.x - b.x;
  const y = a.y - b.y;
  let direction = k.UP;
  if (x < 0) direction = k.RIGHT;
  else if (x > 0) direction = k.LEFT;
  else if (y < 0) direction = k.DOWN;
  // ensure move is valid
  let count = 0;
  while (!validMove(direction, grid)) {
    if (count === 3) {
      if (STATUS) console.log("DEAD END. NO VALID MORE REMAINING!");
      return direction;
    }
    count += 1;
    direction += 1;
    if (direction === 4) direction = 0;
  }
  return direction;
}

// return true if move is not fatal
const validMove = (direction, grid, data) => {
  // TODO: build validMove()
  return true;
}

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
    let row = ""
    for (let j = 0; j < astarGrid[0].length; j++) {
      row += astarGrid[i][j].f < 10 ? "  " + astarGrid[i][j].f : " " + astarGrid[i][j].f;
    }
    console.log(row);
  }
}

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
  const s = ["{x: ", ", y: ", "}"]
  return (s[0] + pair.x + s[1] + pair.y + s[2]);
}

module.exports = {
  astar: astar,
  hungry: hungry,
  angry: angry
};
