const keys = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const params = require("./params");
// const m = require("./move");
const log = require("./logger");



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
        if (inGrid(pos, grid) <= keys.DANGER) {
          for (let i = 0; i < constraints.length; i++) {
            // if very first cell you test is a killzone or future move, thats fine, dont return
            if (area === 0 && (inGrid(pos, grid) === keys.KILL_ZONE || inGrid(pos, grid) === keys.FUTURE_2)) break;
            if (inGrid(pos, grid) === constraints[i]) return;
          }
          openStack.push(pos);
          openGrid[pos.y][pos.x] = true;
        }
      }
    }
    catch (e) { log.error(`ex in search.fill.addToOpen: ${e}`, data.turn); }
    return false;
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
    return false;
  };

  const addToClosed = pos => {
    closedGrid[pos.y][pos.x] = true; 
  };

  let size = you.body.length;
  let current = you.body[0];
  let givenMovePos = {x: current.x, y: current.y};
  switch(direction) {
    case keys.UP:
      givenMovePos.y -= 1;
      break;
    case keys.DOWN:
      givenMovePos.y += 1;
      break;
    case keys.LEFT:
      givenMovePos.x -= 1;
      break;
    case keys.RIGHT:
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
      case keys.ENEMY_HEAD:
        enemyHeads++;
        break;
      case keys.TAIL:
        tails++;
        break;
      case keys.KILL_ZONE:
        killZones++;
        break;
      case keys.FOOD:
        foods++;
        break;
      case keys.WALL_NEAR:
        walls++;
        break;
      case keys.WARNING:
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
  score += area * params.BASE_SPACE;
  score += tails * params.BASE_TAIL;
  score += foods * params.BASE_FOOD;
  score += enemyHeads * params.BASE_ENEMY_HEAD;
  score += killZones * params.BASE_KILL_ZONE;
  score += warnings * params.BASE_WARNING;
  score += walls * (params.BASE_WALL_NEAR * params.WALL_NEAR_FILL_MULTIPLIER);

  const myLength = you.body.length;
  if (area < myLength && tails < 1) {
    score = Math.floor(score / 2);
  }

  if (params.DEBUG) log.debug(`Score in fill: ${score} for move ${keys.DIRECTION[direction]}. Area: ${area}`);
  return score;
}



// a* pathfinding algorithm that will find the shortest path from current head
// location to a given destination
const astar = (grid, data, destination, searchType = keys.FOOD, alternateStartPos = null) => {
  if (params.STATUS) log.status("Calculating path (astar)...");
  // init search fields
  const searchScores = buildAstarGrid(grid);
  let openSet = [];
  let closedSet = [];
  // start location for search is current head location

  const start = (alternateStartPos === null) ? s.location(data) : alternateStartPos;
  // on first few moves, point to closest food no matter what
  if (data.turn < params.INITIAL_FEEDING) {
    if (params.DEBUG) log.debug("Within initial feeding, overriding move with closest food.")
    destination = t.closestFood(grid, start);
    searchType = keys.FOOD;
  }
  if (destination == null) {
    log.debug("In search.astar, destination was null, trying to target tail.");
    destination = s.tailLocation(data);
    searchType = keys.TAIL;
  }
  if (params.DEBUG) log.debug(`astar destination: ${keys.TYPE[searchType]}, ${pairToString(destination)}`);
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
      if (params.STATUS) log.status("Found a path!");
      // if (p.DEBUG_MAPS) {
      //   log.debug("astar grid after search success:");
      //   printFScores(astarGrid);
      // }
      // re-trace path back to origin to find optimal next move
      let tempCell = lowestCell;
      if (params.DEBUG) log.debug(`astar start pos: ${pairToString(start)}`);
      while (
        searchScores[tempCell.y][tempCell.x].previous.x != start.x ||
        searchScores[tempCell.y][tempCell.x].previous.y != start.y
      ) {
        tempCell = searchScores[tempCell.y][tempCell.x].previous;
      }
      if (params.DEBUG) log.debug(`astar next move: ${pairToString(tempCell)}`);
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
        if (params.STATUS) log.status("Found a path (neighbor)");
        neighborCell.previous = current;
        // if (p.DEBUG_MAPS) {
        //   log.debug("astar grid after search success:");
        //   printFScores(searchScores);
        // }
        // re-trace path back to origin to find optimal next move
        let temp = neighbor;
        if (params.DEBUG) log.debug(`astar start pos: ${pairToString(start)}`);
        while (
          searchScores[temp.y][temp.x].previous.x != start.x ||
          searchScores[temp.y][temp.x].previous.y != start.y
        ) {
          temp = searchScores[temp.y][temp.x].previous;
        }
        if (params.DEBUG) log.debug(`astar next move: ${pairToString(temp)}`);
        return calcDirection(start, temp);
      }
      // check if neighbor can be moved to
      if (neighborCell.state < keys.SNAKE_BODY) {
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
    if (params.STATUS) log.status("COULD NOT FIND PATH!");
    // if (p.DEBUG_MAPS) {
    //   localStorage.debug("astar grid after search failure:");
    //   printFScores(searchScores);
    // }
    // TODO: some a* redundancy?
    return null;
  }
};



// preprocess grid to find valuable cells
const preprocessGrid = (grid, data) => {
  try {
    if (params.STATUS) log.status("Preprocessing grid.");
    if (g.nearPerimeter(s.location(data), grid)) {
      if (params.DEBUG) log.debug(`I am near perimeter.`);
      const enemyLocations = getEnemyLocations(data);
      let gridCopy = g.copyGrid(grid);
      for (let enemy of enemyLocations) {
        if (g.onPerimeter(enemy, grid)) {
          if (params.DEBUG) log.debug(`Enemy at ${pairToString(enemy)} is on perimeter`);
          let result = edgeFillFromEnemyToYou(enemy, gridCopy, grid, data);
          gridCopy = result.grid;
          let move = null;
          
        }
      }
      return gridCopy;
    }
  }
  catch (e) { log.error(`ex in search.preprocess: ${e}`, data.turn); }
  return grid;
}



const edgeFillFromEnemyToYou = (enemy, gridCopy, grid, data) => {
  try {
    const yourHead = s.location(data);
    const enemyMoves = getEnemyMoveLocations(enemy, grid);
    for (let enemyMove of enemyMoves) {
      if (params.DEBUG) log.debug (`Doing enemy edge fill for move @ ${pairToString(enemyMove)}`);

      // begin fill search

      let closedGrid;
      let openGrid;
      closedGrid = g.initGrid(grid[0].length, grid.length, false);
      openGrid = g.initGrid(grid[0].length, grid.length, false);
      let openStack = [];

      const inGrid = (pos, grd) => {
        try { return grd[pos.y][pos.x]; }
        catch (e) { log.error(`ex in search.edgeFillFromEnemyToYou.inGrid: ${e}`, data.turn); }
        return false;
      };

      const addToOpen = pos => {
        try {
          if (!outOfBounds(pos, grid) && !inGrid(pos, closedGrid) && !inGrid(pos, openGrid)) {
            if (inGrid(pos, grid) <= keys.DANGER && g.onPerimeter(pos, grid)) {
              openStack.push(pos);
              openGrid[pos.y][pos.x] = true;
              return true;
            }
          }
        }
        catch (e) { log.error(`ex in search.fill.addToOpen: ${e}`, data.turn); }
        return false;
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
        return false;
      };
    
      const addToClosed = pos => {
        closedGrid[pos.y][pos.x] = true; 
      };

      addToOpen(enemyMove);
      let edgeSpaces = [];
      let foundMe = false;
      let fail = false;
      let nextMove = null;

      while (openStack.length > 0 && !foundMe && !fail) {
        nextMove = removeFromOpen();
        edgeSpaces.push(nextMove);
        addToClosed(nextMove);
        if (params.DEBUG) log.debug(`Next move in enemy fill search is ${pairToString(nextMove)}`);

        // check up
        const nextUp = {x: nextMove.x, y: nextMove.y - 1};
        if (!outOfBounds(nextUp, grid)) {
          if (sameCell(yourHead, nextUp)) {
            foundMe = true;
            break;
          }
          if (!g.onPerimeter(nextUp, grid)) {
            if (inGrid(nextUp, grid) < keys.SNAKE_BODY) {
              fail = true;
              break;
            }
          }
          addToOpen(nextUp);
        }
        // check down
        const nextDown = {x: nextMove.x, y: nextMove.y + 1};
        if (!outOfBounds(nextDown, grid)) {
          if (sameCell(yourHead, nextDown)) {
            foundMe = true;
            break;
          }
          if ( !g.onPerimeter(nextDown, grid)) {
            if (inGrid(nextDown, grid) < keys.SNAKE_BODY) {
              fail = true;
              break;
            }
          }
          addToOpen(nextDown);
        }
        // check left
        const nextLeft = {x: nextMove.x - 1, y: nextMove.y};
        if (!outOfBounds(nextLeft, grid)) {
          if (sameCell(yourHead, nextLeft)) {
            foundMe = true;
            break;
          }
          if ( !g.onPerimeter(nextLeft, grid)) {
            if (inGrid(nextLeft, grid) < keys.SNAKE_BODY) {
              fail = true;
              break;
            }
          }
          addToOpen(nextLeft);
        }
        // check right
        const nextRight = {x: nextMove.x + 1, y: nextMove.y};
        if (!outOfBounds(nextRight, grid)) {
          if (sameCell(yourHead, nextRight)) {
            foundMe = true;
            break;
          }
          if (!g.onPerimeter(nextRight, grid)) {
            if (inGrid(nextRight, grid) < keys.SNAKE_BODY) {
              fail = true;
              break;
            }
          }
          addToOpen(nextRight);
        }
      }

      if (fail) return { grid: gridCopy, move: null };

      if (foundMe) {
        if (params.STATUS) log.status(`Adding ${edgeSpaces.length} killzones for enemy near ${pairToString(enemy)}`);
        for (let space of edgeSpaces) {
          gridCopy[space.y][space.x] = keys.KILL_ZONE;
        }
      }

      if (params.DEBUG && params.DEBUG_MAPS) {
        log.debug("Grid after edge fill search:");
        g.printGrid(gridCopy);
      }

      if (foundMe) {
        return { grid: gridCopy, move: nextMove };
      }

    }
  }
  catch (e) { log.error(`ex in search.edgeFillFromEnemyToYou: ${e}`, data.turn); }
  return { grid: gridCopy, move: null };
}



// get a list of all enemy heads
const getEnemyLocations = data => {
  try {
    const you = data.you;
    let locations = [];
    for (let snake of data.board.snakes) {
      if (snake.id === you.id) continue;
      locations.push(snake.body[0]);
    }
    return locations;
  }
  catch (e) { log.error(`ex in search.getEnemyLocations: ${e}`, data.turn); }
  return [];
}



const getEnemyMoveLocations = (pos, grid) => {
  try {
    let positions = [];
    for (let m = 0; m < 4; m++) {
      if (validMove(m, pos, grid)) {
        positions.push(applyMoveToPos(m, pos));
      }
    }
    return positions;
  }
  catch (e) { log.error(`ex in search.getEnemyMoveLocations: ${e}`); }
  return [];
}



// distance from pos to center of board
const distanceToCenter = (direction, startPos, grid, data) => {
  try {
    if (validMove(direction, startPos, grid)) {
      return distanceFromWall(applyMoveToPos(direction, startPos), grid);
    }
  }
  catch (e) { log.error(`ex in search.distanceToCenter: ${e}`, data.turn); }
  return 0;
}



const closeAccessableFuture2FarFromWall = (grid, data) => {
  try {
    const you = data.you;
    let target = null;
    let move = null;
    let foundMove = false;
    let gridCopy = g.copyGrid(grid);
    while (!foundMove) {
      target = t.closestTarget(gridCopy, you.body[0], keys.SMALL_HEAD);
      if (target === null) {
        target = t.closestTarget(gridCopy, you.body[0], keys.ENEMY_HEAD);
      }
      if (target === null) {
        return null;
      }
      let future2s = getFuture2InOrderOfDistanceFromWall(grid, target);
      if (future2s != null) {
        for (let future2 of future2s) {
          move = astar(grid, data, future2, keys.FUTURE_2);
          if (move != null) {
            return move;
          }
        }
      }
      gridCopy[target.y][target.x] = keys.SNAKE_BODY;
    }
  }
  catch (e) { log.error(`ex in search.closeAccessableFuture2FarFromWall: ${e}`, data.turn); }
  return null;
}



const closeAccessableKillZoneFarFromWall = (grid, data) => {
  try {
    const you = data.you;
    let target = null;
    let move = null;
    let foundMove = false;
    let gridCopy = g.copyGrid(grid);
    while (!foundMove) {
      target = t.closestTarget(gridCopy, you.body[0], keys.SMALL_HEAD);
      if (target === null) {
        return null;
      }
      let killZones = getKillZonesInOrderOfDistanceFromWall(grid, target);
      if (killZones != null) {
        for (let killZone of killZones) {
          move = astar(grid, data, killZone, keys.KILL_ZONE);
          if (move != null) {
            return move;
          }
        }
      }
      gridCopy[target.y][target.x] = keys.ENEMY_HEAD;
    }
  }
  catch (e) { log.error(`ex in search.closeAccessableKillZoneFarFromWall: ${e}`, data.turn); }
  return null;
}



const getFuture2InOrderOfDistanceFromWall = (grid, target) => {
  try {
    let spots = [];
    let spot = {};
    let distance = 0;
    const possibleFuture2Offsets = [
      { x: 0, y: -2 },
      { x: 1, y: -1 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: -1, y: 1 },
      { x: -2, y: 0 },
      { x: -1, y: -1 },
    ];
    for (let offset of possibleFuture2Offsets) {
      spot = { x: target.x + offset.x, y: target.y + offset.y };
      if (!outOfBounds(spot, grid) && grid[spot.y][spot.y] === keys.FUTURE_2) {
        distance = distanceFromWall(spot, grid);
        spots.push({ pos: spot, distance: distance });
      }
    }

    spots.sort(
      (a, b) => (a.distance < b.distance) ? 1 : ((b.distance < a.distance) ? -1 : 0)
    );

    let future2sSorted = []
    for (spot of spots) {
      future2sSorted.push(spot.pos);
    }
    if (future2sSorted.length < 1) return null;
    return future2sSorted;
  }
  catch (e) { log.error(`ex in search.getFuture2InOrderOfDistanceFromWall: ${e}`); }
  return null;
}



const getKillZonesInOrderOfDistanceFromWall = (grid, target) => {
  try {
    let spots = [];
    let spot = {};
    let distance = 0;
    // check up
    spot = { x: target.x, y: target.y - 1 };
    if (!outOfBounds(spot, grid) && validMove(keys.UP, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }
    // check down
    spot = { x: target.x, y: target.y + 1 };
    if (!outOfBounds(spot, grid) && validMove(keys.DOWN, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }
    // check left
    spot = { x: target.x - 1, y: target.y };
    if (!outOfBounds(spot, grid) && validMove(keys.LEFT, target, grid)) {
      distance = distanceFromWall(spot, grid);
      spots.push({ pos: spot, distance: distance });
    }
    // check right
    spot = { x: target.x + 1, y: target.y };
    if (!outOfBounds(spot, grid) && validMove(keys.RIGHT, target, grid)) {
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
    return Math.max(xDistance, yDistance);
  }
  catch (e) { log.error(`ex in search.distanceFromWall: ${e}`) };
  return 0;
}



// TODO: this is broken?
// const enemySearchForFood = (grid, data) => {
//   const you = data.you;

//   try {
//     data.board.snakes.forEach(({ id, name, health, body }) => {
//       if (id === you.id) return;

//       const head = body[0];
//       let gridCopy = g.copyGrid(grid);
//       let target = t.closestFood(grid, head);
//       let move = astar(grid, data, target, k.FOOD, body[0]);
//       while (move === null) {
//         if (target === null) {
//           target = t.closestTarget(grid, head, k.TAIL);
//           move = astar(gridCopy, data, target, k.TAIL, body[0]);
//           break; 
//         }
//         gridCopy[target.y][target.x] = k.WARNING;
//         target = t.closestFood(grid, head);
//         move = astar(gridCopy, data, target, k.FOOD, body[0]);

//       }

//       if (move != null) {
//         grid[move.y][move.x] = k.DANGER;
//       }

//     });
//   }
//   catch (e) { log.error(`ex in search.enemySearchForFood: ${e}`, data.turn); }
//   return grid;
// }



const distanceToEnemy = (direction, grid, data, type = keys.ENEMY_HEAD) => {
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
  let direction = keys.UP;
  if (x < 0) direction = keys.RIGHT;
  else if (x > 0) direction = keys.LEFT;
  else if (y < 0) direction = keys.DOWN;
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
    return grid[newPos.y][newPos.x] <= keys.DANGER;
  }
  catch (e) {
    log.error(`ex in search.validMove: ${e}\n{direction: ${direction}, pos: ${pairToString(pos)}, grid: ${grid}}`);
    return false;
  }
};



const applyMoveToPos = (move, pos) => {
  switch (move) {
    case keys.UP:
      return {x: pos.x, y: pos.y - 1};
    case keys.DOWN:
      return {x: pos.x, y: pos.y + 1};
    case keys.LEFT:
      return {x: pos.x - 1, y: pos.y};
    case keys.RIGHT:
      return {x: pos.x + 1, y: pos.y};
  }
  return {x: 0, y: 0};
}



module.exports = {
  outOfBounds: outOfBounds,
  astar: astar,
  fill: fill,
  distanceToEnemy: distanceToEnemy,
  applyMoveToPos: applyMoveToPos,
  closeAccessableKillZoneFarFromWall: closeAccessableKillZoneFarFromWall,
  distanceToCenter: distanceToCenter,
  closeAccessableFuture2FarFromWall: closeAccessableFuture2FarFromWall,
  preprocessGrid: preprocessGrid
}