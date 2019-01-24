const k = require("./keys");
const g = require("./grid");
const f = require("./food");
const s = require("./self");
const search = require("./search")

const INITIAL_FEEDING = 3;

const DEBUG = true;
const STATUS = true;
const LOG_ASTAR_GRID = false;

// scores for moves
const ASTAR_SUCCESS = 8.0; // DOWN from 10
const ASTAR_ALT = 2.0;
const BASE_KILL_ZONE = 2.1;
const BASE_FOOD = 0.5;
const BASE_TAIL = 7.9; // UP from 0.35
const BASE_SPACE = 0.3;
const BASE_WARNING = 0.2;
const BASE_DANGER = 0.1;
const BASE_ENEMY_HEAD = -2;
const BASE_BAD = -10.0;
const BASE_PREVIOUS = 0.1; // DOWN from 2

let previousMove = 0;


const hungry = (grid, data) => {
  let self = data.you;
  let tail = self.body[self.body.length - 1];
  let target;
  try {
    target = f.closestFood(grid, self.body[0]);
    if (!target) {
      target = tail;
    }
  } catch (e) {
    console.log("!!!!!!!! ex in hungry.closestFood " + e);
  }
  console.log("target in hungry: " + pairToString(target));

  let scores = [];
  try {
    scores = baseMoveScores(grid, self);
  } catch (e) {
    console.log("ex in hungry.baseMoveScores: " + e);
  }


  let move = null;
  try {
    move = astar(grid, data, target, k.FOOD);

  } catch (e) {
    console.log("ex in hungry.a*: " + e);
  }

  try {
    for (let m = 0; m < scores.length; m++) {
      scores[m] += fill(m, grid, self);
    }
  } catch (e) {
    console.log("ex in hungry.fill " + e);
  }

  let altMove = null;
  try {
    if (move) {
      if (validMove(move, self.body[0], grid)) {
        scores[move] += ASTAR_SUCCESS;
      } else {
        altMove = suggestMove(move, self.body[0], grid);
        if (altMove) scores[altMove] += ASTAR_ALT;
      }
    }
  } catch (e) {
    console.log("ex in hungry.move check: " + e);
  }

  if (previousMove != null) {
    scores[previousMove] += BASE_PREVIOUS;
  }
  if (STATUS) console.log("MOVE SCORES: " + scores);
  const bestMove = highestScoreMove(scores);
  previousMove = bestMove;
  // console.log("hungry move: " + k.DIRECTION[bestMove]);
  return bestMove;
};


const angry = (grid, data) => {
  return astar(grid, data, f.closestKillableEnemy(grid, data.you), k.KILL_ZONE);
};


// get highest score move
const highestScoreMove = scores => {
  let bestMove = 0;
  let bestScore = -9999;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestMove = i;
    }
  }
  return bestMove;
}


// get base score for each possible move
const baseMoveScores = (grid, self) => {
  const head = self.body[0];
  let scores = [0, 0, 0, 0];
  // get score for each direction
  scores[k.UP] += baseScoreForBoardPosition(head.x, head.y - 1, grid);
  scores[k.DOWN] += baseScoreForBoardPosition(head.x, head.y + 1, grid);
  scores[k.LEFT] += baseScoreForBoardPosition(head.x - 1, head.y, grid);
  scores[k.RIGHT] += baseScoreForBoardPosition(head.x + 1, head.y, grid);
  return scores;
};


// return a base score depending on what is currently in that position on the board
const baseScoreForBoardPosition = (x, y, grid) => {
  // if out of bounds
  if (outOfBounds({ x: x, y: y }, grid)) return -10.0;
  // types of spaces
  switch (grid[y][x]) {
    case k.SPACE:
      return BASE_SPACE;
    case k.TAIL:
      return BASE_TAIL;
    case k.FOOD:
      return BASE_FOOD;
    case k.KILL_ZONE:
      return BASE_KILL_ZONE;
    case k.WARNING:
      return BASE_WARNING;
    case k.DANGER:
      return BASE_DANGER;
    // default includes SNAKE_BODY and ENEMY_HEAD
    default:
      return BASE_BAD;
  }
};


// fill an area
const fill = (direction, grid, self) => {
  // console.log(grid ? "grid is defined in fill" : "grid is UNDEFINED in fill");
  let closedGrid;
  let openGrid;
  closedGrid = g.initGrid(grid[0].length, grid.length, false);
  openGrid = g.initGrid(grid[0].length, grid.length, false);
  // console.log(closedGrid ? "closedGrid is defined in fill" : "closedGrid is UNDEFINED in fill");
  // console.log(openGrid ? "openGrid is defined in fill" : "openGrid is UNDEFINED in fill");
  let openStack = [];
  const inGrid = (pos, grd) => {
    // console.log("pair in inGrid");
    // console.log(pairToString(pos));
    try {
      return grd[pos.y][pos.x];
    } catch (e) {
      console.log("!!! ex in fill.inGrid " + e);
    }
  }
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
  let size = self.body.length;
  let current = self.body[0];
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
  score += area * BASE_SPACE;
  score += tails * BASE_TAIL;
  score += foods * BASE_FOOD;
  score += enemyHeads * BASE_ENEMY_HEAD;
  score += killZones * BASE_KILL_ZONE;
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
  if (data.turn < INITIAL_FEEDING) {
    destination = f.closestFood(grid, start);
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
      return calcDirection(start, tempCell, grid);
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
    return k.UP;
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
const calcDirection = (a, b, grid) => {
  const x = a.x - b.x;
  const y = a.y - b.y;
  let direction = k.UP;
  if (x < 0) direction = k.RIGHT;
  else if (x > 0) direction = k.LEFT;
  else if (y < 0) direction = k.DOWN;
  // ensure move is valid
  // let count = 0;
  // while (!validMove(direction, a, grid)) {
  //   if (count === 3) {
  //     if (STATUS) console.log("DEAD END. NO VALID MORE REMAINING!");
  //     return direction;
  //   }
  //   count += 1;
  //   direction += 1;
  //   if (direction === 4) direction = 0;
  // }
  return direction;
};


// check if move is not fatal
const validMove = (direction, pos, grid) => {
  if (outOfBounds(pos, grid)) return false;
  try {
    switch (direction) {
      case k.UP:
        return grid[pos.y - 1][pos.x] <= k.DANGER;
      case k.DOWN:
        return grid[pos.y + 1][pos.x] <= k.DANGER;
      case k.LEFT:
        return grid[pos.y][pos.x - 1] <= k.DANGER;
      case k.RIGHT:
        return grid[pos.y][pos.x + 1] <= k.DANGER;
    }
    return false;
  } catch (ex) {
    // catch any mistake null pointers
    if (STATUS || DEBUG)
      console.log(
        "*** EXCEPTION ***\nINVALID MOVE PASSED TO m.validMove()\n" + ex
      );
  }
};


// if move is no good, suggest a similar move that is valid
const suggestMove = (direction, pos, grid) => {
  try {
    switch (direction) {
      // if up, check right, left, down
      case k.UP:
        if (validMove(k.RIGHT, pos, grid)) return k.RIGHT;
        else if (validMove(k.LEFT, pos, grid)) return k.LEFT;
        else if (validMove(k.DOWN, pos, grid)) return k.DOWN;
        return null;
      // if down, check left, right, up
      case k.DOWN:
        if (validMove(k.LEFT, pos, grid)) return k.LEFT;
        else if (validMove(k.RIGHT, pos, grid)) return k.RIGHT;
        else if (validMove(k.UP, pos, grid)) return k.UP;
        return null;
      // if left, check up, down, right
      case k.LEFT:
        if (validMove(k.UP, pos, grid)) return k.UP;
        else if (validMove(k.DOWN, pos, grid)) return k.DOWN;
        else if (validMove(k.RIGHT, pos, grid)) return k.RIGHT;
        return null;
      // if right, check down, up, left
      case k.RIGHT:
        if (validMove(k.DOWN, pos, grid)) return k.DOWN;
        else if (validMove(k.UP, pos, grid)) return k.UP;
        else if (validMove(k.LEFT, pos, grid)) return k.LEFT;
        return null;
    }
  } catch(e) {
    console.log("!!! ex in suggestMove " + e);
  }
  return null;
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
    console.log("!!! ex in m.pairToString " + e);
  }
};


module.exports = {
  astar: astar,
  hungry: hungry,
  angry: angry
};
