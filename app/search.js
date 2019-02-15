const k = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const p = require("./params");
const m = require("./move");
const log = require("./logger");

const wallNearFillMultiplier = 0.3;




// fill an area
const fill = (direction, grid, data, constraints = []) => {
  const you = data.you;
  let area = 0;
  let closedGrid;
  let openGrid;
  closedGrid = g.initGrid(grid[0].length, grid.length, false);
  openGrid = g.initGrid(grid[0].length, grid.length, false);
  let openStack = [];

  const inGrid = (pos, grd) => {
    try { return grd[pos.y][pos.x]; }
    catch (e) { log.error(`ex in search.fill.inGrid: ${e}`, data.turn); }
  };

  const addToOpen = pos => {
    try {
      if (!outOfBounds(pos, grid) && !inGrid(pos, closedGrid) && !inGrid(pos, openGrid)) {
        if (inGrid(pos, grid) <= k.DANGER) {
          for (let i = 0; i < constraints.length; i++) {
            // if very first cell you test is a killzone or future move, thats fine, dont return
            if (area < 2 && (inGrid(pos, grid) === k.KILL_ZONE || inGrid(pos, grid) === k.FUTURE_2)) break;
            if (inGrid(pos, grid) === constraints[i]) return;
          }
          openStack.push(pos);
          openGrid[pos.y][pos.x] = true;
        }
      }
    }
    catch (e) { log.error(`ex in search.fill.addToOpen: ${e}`, data.turn); }
  };

  const removeFromOpen = () => {
    let pos;
    try {
      pos = openStack.pop();
      if (!pos) return false;
      openGrid[pos.y][pos.x] = false;
      return pos;
      }
      catch (e) { log.error(`ex in search.fill.removeFromOpen: ${e}`, data.turn); }
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
  let enemyHeads = 0;
  let killZones = 0;
  let tails = 0;
  let foods = 0;
  let warnings = 0;
  let walls = 0;

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
      case k.WALL_NEAR:
        walls++;
        break;
      case k.WARNING:
        warnings++;
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
  score += warnings * p.BASE_WARNING;
  score += walls * (p.BASE_WALL_NEAR * p.WALL_NEAR_FILL_MULTIPLIER);
  if (p.DEBUG) log.debug(`Score in fill: ${score} for move ${k.DIRECTION[direction]}. Area: ${area}`);
  return score;
}




// a* pathfinding algorithm that will find the shortest path from current head
// location to a given destination
const astar = (grid, data, destination, searchType = k.FOOD, alternateStartPos = null) => {
  if (p.STATUS) log.status("Calculating path (astar)...");
  // init search fields
  const searchScores = buildAstarGrid(grid);
  let openSet = [];
  let closedSet = [];
  // start location for search is current head location

  const start = (alternateStartPos === null) ? s.location(data) : alternateStartPos;
  // on first few moves, point to closest food no matter what
  if (data.turn < p.INITIAL_FEEDING) {
    destination = t.closestFood(grid, start);
    searchType = k.FOOD;
  }
  if (destination == null) {
    log.debug("In search.astar, destination was null, trying to target tail.");
    destination = s.tailLocation(data);
    searchType = k.TAIL;
  }
  if (p.DEBUG) log.debug(`astar destination: ${k.TYPE[searchType]}, ${pairToString(destination)}`);
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
      if (p.STATUS) log.status("Found a path!");
      // if (p.DEBUG_MAPS) {
      //   log.debug("astar grid after search success:");
      //   printFScores(astarGrid);
      // }
      // re-trace path back to origin to find optimal next move
      let tempCell = lowestCell;
      if (p.DEBUG) log.debug(`astar start pos: ${pairToString(start)}`);
      while (
        searchScores[tempCell.y][tempCell.x].previous.x != start.x ||
        searchScores[tempCell.y][tempCell.x].previous.y != start.y
      ) {
        tempCell = searchScores[tempCell.y][tempCell.x].previous;
      }
      if (p.DEBUG) log.debug(`astar next move: ${pairToString(tempCell)}`);
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
        if (p.STATUS) log.status("Found a path (neighbor)");
        neighborCell.previous = current;
        // if (p.DEBUG_MAPS) {
        //   log.debug("astar grid after search success:");
        //   printFScores(searchScores);
        // }
        // re-trace path back to origin to find optimal next move
        let temp = neighbor;
        if (p.DEBUG) log.debug(`astar start pos: ${pairToString(start)}`);
        while (
          searchScores[temp.y][temp.x].previous.x != start.x ||
          searchScores[temp.y][temp.x].previous.y != start.y
        ) {
          temp = searchScores[temp.y][temp.x].previous;
        }
        if (p.DEBUG) log.debug(`astar next move: ${pairToString(temp)}`);
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
    if (p.STATUS) log.status("COULD NOT FIND PATH!");
    // if (p.DEBUG_MAPS) {
    //   localStorage.debug("astar grid after search failure:");
    //   printFScores(searchScores);
    // }
    // TODO: some a* redundancy?
    return null;
  }
};



const closeAccessableKillZoneFarFromWall = (grid, data) => {
  try {
    const you = data.you;
    let target = null;
    let move = null;
    let foundMove = false;
    let gridCopy = g.copyGrid(grid);
    while (!foundMove) {
      target = t.closestTarget(gridCopy, you.body[0], k.SMALL_HEAD);
      if (target === null) {
        return null;
      }
      let killZones = getKillZonesInOrderOfDistanceFromWall(grid, target);
      console.log(`KILLZONES: ${killZones}`);
      if (killZones != null) {
        for (let killZone of killZones) {
          move = astar(grid, data, killZone, k.SMALL_HEAD)
          if (move != null) {
            return move;
          }
        }
      }
      gridCopy[target.y][target.x] = k.ENEMY_HEAD;
    }
  }
  catch (e) { log.error(`ex in search.closeAccessableKillZoneFarFromWall: ${e}`, data.turn); }
  return null;
}



const getKillZonesInOrderOfDistanceFromWall = (grid, target) => {
  try {
    let spots = [];
    let spot = {};
    let distance = 0;
    // check up
    spot = { x: target.x, y: target.y - 1 };
    if (!outOfBounds(spot, grid) && validMove(k.UP, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }
    // check down
    spot = { x: target.x, y: target.y + 1 };
    if (!outOfBounds(spot, grid) && validMove(k.DOWN, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }
    // check left
    spot = { x: target.x - 1, y: target.y };
    if (!outOfBounds(spot, grid) && validMove(k.LEFT, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }
    // check right
    spot = { x: target.x + 1, y: target.y };
    if (!outOfBounds(spot, grid) && validMove(k.RIGHT, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }

    spots.sort(
      (a, b) => (a.distance < b.distance) ? 1 : ((b.distance < a.distance) ? -1 : 0)
    );

    let killZones = []
    for (let spot of spots) {
      killZones.push(spot.pos);
    }
    if (killZones.length < 1) return null;
    return killZones;
  }
  catch (e) { log.error(`ex in search.getKillZonesInOrderOfDistanceFromWall: ${e}`); }
  return null;
}



// calculate the distance a position is from walls
const distanceFromWall = (pos, grid) => {
  try {
    let yUp = pos.y;
    let yDown = (grid.length - 1) - pos.y;
    let xLeft = pos.x;
    let xRight = (grid[0].length - 1) - pos.x;
    let xDistance = Math.min(xLeft, xRight);
    let yDistance = Math.min(yUp, yDown);
    return xDistance + yDistance
  }
  catch (e) { log.error(`ex in search.distanceFromWall: ${e}`) };
  return 0;
}




// TODO: this is broken?
const enemySearchForFood = (grid, data) => {
  const you = data.you;

  try {
    data.board.snakes.forEach(({ id, name, health, body }) => {
      if (id === you.id) return;

      const head = body[0];
      let gridCopy = g.copyGrid(grid);
      let target = t.closestFood(grid, head);
      let move = astar(grid, data, target, k.FOOD, body[0]);
      while (move === null) {
        if (target === null) {
          target = t.closestTarget(grid, head, k.TAIL);
          move = astar(gridCopy, data, target, k.TAIL, body[0]);
          break; 
        }
        gridCopy[target.y][target.x] = k.WARNING;
        target = t.closestFood(grid, head);
        move = astar(gridCopy, data, target, k.FOOD, body[0]);

      }

      if (move != null) {
        grid[move.y][move.x] = k.DANGER;
      }

    });
  }
  catch (e) { log.error(`ex in search.enemySearchForFood: ${e}`, data.turn); }
  return grid;
}


const distanceToEnemy = (direction, grid, data, type = k.ENEMY_HEAD) => {
  try {
    const you = data.you;
    if (validMove(direction, you.body[0], grid)) {
      const closestEnemyHead = t.closestTarget(grid, you.body[0], type);
      // if (p.DEBUG && closestEnemyHead != null) log.debug(`Closest enemy for move ${k.DIRECTION[direction]} is ${pairToString(closestEnemyHead)}`);
      if (closestEnemyHead === null) return 0;
      return g.getDistance(closestEnemyHead, applyMoveToPos(direction, you.body[0]));
    }
  }
  catch (e) { log.error(`ex in search.distanceToEnemy: ${e}`, data.turn); }
  return 0;
}


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
    log.status(row);
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
  try { return `{x: ${pair.x}, y: ${pair.y}}`; }
  catch (e) {
    log.error(`ex in search.pairToString: ${e}`);
    return "there was an error caught in search.pairToString";
  }
};


// check if space is out of bounds
const outOfBounds = ({ x, y }, grid) => {
  try {
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) return true
      else return false
  } catch (e) {
    log.error(`ex in search.outOfBounds: ${e}`);
    return true
  }
};


// check if move is not fatal
const validMove = (direction, pos, grid) => {
  try {
    const newPos = applyMoveToPos(direction, pos);
    if (outOfBounds(newPos, grid)) return false;
    return grid[newPos.y][newPos.x] <= k.DANGER;
  }
  catch (e) {
    log.error(`ex in search.validMove: ${e}\n{direction: ${direction}, pos: ${pairToString(pos)}, grid: ${grid}}`);
    return false;
  }
};


const applyMoveToPos = (move, pos) => {
  switch (move) {
    case k.UP:
      return {x: pos.x, y: pos.y - 1};
    case k.DOWN:
      return {x: pos.x, y: pos.y + 1};
    case k.LEFT:
      return {x: pos.x - 1, y: pos.y};
    case k.RIGHT:
      return {x: pos.x + 1, y: pos.y};
  }
  return {x: 0, y: 0};
}


module.exports = {
  outOfBounds: outOfBounds,
  astar: astar,
  fill: fill,
  distanceToEnemy: distanceToEnemy,
  enemySearchForFood: enemySearchForFood,
  closeAccessableKillZoneFarFromWall: closeAccessableKillZoneFarFromWall
}