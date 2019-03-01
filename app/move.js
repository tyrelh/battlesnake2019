const keys = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const params = require("./params");
const search = require("./search")
const log = require("./logger");



// target closest reachable food
const eat = (grid, data) => {
  const you = data.you;
  const myHead = s.location(data);
  const health = you.health;
  let urgencyScore = (110 - health);
  if (data.turn > params.INITIAL_FEEDING) {
    urgencyScore = Math.round(urgencyScore * params.FEEDING_URGENCY_MULTIPLIER);
  }
  if (params.STATUS) log.status(`EATING w/ urgency ${urgencyScore}`);
  let target = null;
  let move = null;
  const gridCopy = g.copyGrid(grid);
  try {
    target = t.closestFood(grid, myHead);
    if (target === null) {
      if (params.STATUS) log.status("No food was found on board.");
      return buildMove(grid, data, null, 0);
    }
    move = search.astar(grid, data, target, keys.FOOD);
    while (move === null && target != null) {
      gridCopy[target.y][target.x] = keys.DANGER;
      target = t.closestFood(gridCopy, myHead);
      if (target === null) break;
      move = search.astar(grid, data, target, keys.FOOD);
    }
  }
  catch (e) { log.error(`ex in move.eat: ${e}`, data.turn); }

  try {
    if (move != null) {
      if (params.DEBUG) {
        if (target != null) log.debug(`target in eat: ${pairToString(target)}`);
        log.debug(`Score for a* move: ${keys.DIRECTION[move]}: ${urgencyScore}`);
      }
      return buildMove(grid, data, move, urgencyScore);
    }
    // else {
    //   const fallbackMove = getFallbackMove(grid, data);
    //   if (fallbackMove.score != 0) {
    //     return buildMove(grid, data, fallbackMove.move, fallbackMove.score);
    //   }
    // }
  }
  catch (e) { log.error(`ex in move.eat.buildmove: ${e}`, data.turn); }
  return buildMove(grid, data, null, 0);
};

 

// track closest KILL_ZONE
const hunt = (grid, data) => {
  const you = data.you;
  let score = 0;
  let move = null;
  if (params.STATUS) log.status("HUNTING");

  try {
    move = search.closeAccessableKillZoneFarFromWall(grid, data);
    if (move != null) score = params.ASTAR_SUCCESS;
  }
  catch (e) { log.error(`ex in move.hunt: ${e}`, data.turn); }

  if (params.DEBUG && move != null) log.debug(`In hunt calulated score ${score} for move ${keys.DIRECTION[move]}`)
  else if (params.DEBUG && move === null) log.debug(`Move in hunt was NULL.`);
  return buildMove(grid, data, move, score);
};

const lateHunt = (grid, data) => {
  let score = 0;
  let move = null;
  if (params.STATUS) log.status("HUNTING, LATE GAME");

  try {
    move = search.closeAccessableFuture2FarFromWall(grid, data);
    if (move != null) score = params.ASTAR_SUCCESS;
  }
  catch (e) { log.error(`ex in move.lateHunt: ${e}`, data.turn); }

  if (params.DEBUG && move != null) log.debug(`In lateHunt calulated score ${score} for move ${keys.DIRECTION[move]}`)
  else if (params.DEBUG && move === null) log.debug(`Move in lateHunt was NULL.`);
  return buildMove(grid, data, move, score);
}



// track own tail
const killTime = (grid, data) => {
  if (params.STATUS) log.status("KILLING TIME");

  // const fallbackMove = getFallbackMove(grid, data);
  // let move = fallbackMove.move;
  // let score = fallbackMove.score;

  // if (params.DEBUG && move != null) log.debug(`Score for a* move: ${keys.DIRECTION[move]}: ${params.ASTAR_SUCCESS}`);
  return buildMove(grid, data, null, 0);
}



const getFallbackMove = (grid, data) => {
  try {
    if (params.STATUS) log.status("Resorting to fallback move");
    // try finding a path to tail first
    let target = s.tailLocation(data);
    let move = search.astar(grid, data, target, keys.TAIL);
    let score = 0;
    // if no path to own tail, try searching for food
    const gridCopy = g.copyGrid(grid);
    while (move === null) {
      target = t.closestFood(gridCopy, s.location(data));
      if (target != null) {
        gridCopy[target.y][target.x] = keys.WARNING;
        move = search.astar(grid, data, target, keys.FOOD);
      }
      // if no more food to search for just quit
      else break;
    }
    if (move != null) {
      score = params.ASTAR_SUCCESS / 5;
      if (params.DEBUG) {
        log.debug(`getFallbackMove target: ${pairToString(target)}`);
        log.debug(`getFallbackMove move: ${keys.DIRECTION[move]}`);
        log.debug(`getFallbackMove score: ${score}`);
      }
      return { move: move, score: score };
    }
  }
  catch (e) { log.error(`ex in move.getFallbackMove: ${e}`, data.turn); }
  return { move: null, score: 0 };
}



const coil = (grid, data) => {
  if (params.STATUS) log.status("Trying to coil to save space");
  try {
    let tailLocation = s.tailLocation(data);
    let tailDistances = [0, 0, 0, 0];
    let largestDistance = 0;

    for (let m = 0; m < 4; m++) {
      const nextMove = search.applyMoveToPos(m, s.location(data));
      if (search.outOfBounds(nextMove, grid)) continue;
      if (grid[nextMove.y][nextMove.x] >= keys.SNAKE_BODY) continue;
      const currentDistance = g.getDistance(tailLocation, nextMove);
      log.debug(`Distance to tail for move ${keys.DIRECTION[m]} is ${currentDistance}`);
      if (tailDistances[m] < currentDistance) {
        tailDistances[m] = currentDistance;
        if (largestDistance < currentDistance) {
          largestDistance = currentDistance;
        }
      }
    }

    let coilScores = [0, 0, 0, 0];
    for (let m = 0; m < 4; m++) {
      if (tailDistances[m] === largestDistance) {
        coilScores[m] += params.COIL;
      }
    }
    if (params.DEBUG) log.debug(`Coil scores are ${coilScores}`);
    return coilScores
  }
  catch (e) { log.error(`ex in move.coil: ${e}`, data.turn); }
  return [];
}



// build up move scores and return best move
const buildMove = (grid, data, move, moveScore = 0) => {
  const you = data.you;
  let scores = baseMoveScores(grid, you);
  try {

    // if move is null, try to find fallback move
    if (move === null) {
      const fallbackMove = getFallbackMove(grid, data);
      move = fallbackMove.move;
      // if no fallback move, try to coil on self to save space
      if (move != null) {
        scores[move] += fallbackMove.score;
      } else {
        const coilScores = coil(grid, data);
        for (let m = 0; m < coilScores.length; m++) {
          scores[m] += coilScores[m];
        }
      }
    } else {
      // get base next move scores
      if (params.STATUS) log.status(`Adding moveScore ${moveScore} to move ${keys.DIRECTION[move]}`);
      scores[move] += moveScore;
      if (params.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);
    }
   }
  catch (e) { log.error(`ex in move.buildMove.baseMoveScores: ${e}`, data.turn); }
  
  // get flood fill scores for each move
  try {
    if (params.STATUS) log.status("Performing flood fill searches");
    for (let m = 0; m < 4; m++) {
      let gridCopy = g.copyGrid(grid)
      scores[m] += search.fill(m, grid, data);
      gridCopy = g.moveTails(1, grid, data);
      if (params.DEBUG_MAPS) {
        log.debug("Map for fill search 1 move in advance");
        g.printGrid(gridCopy);
      }
      scores[m] += search.fill(m, gridCopy, data, [keys.KILL_ZONE, keys.DANGER, keys.WARNING]);
      gridCopy = g.moveTails(2, grid, data);
      if (params.DEBUG_MAPS) {
        log.debug("Map for fill search 2 moves in advance");
        g.printGrid(gridCopy);
      }
      scores[m] += search.fill(m, gridCopy, data, [keys.KILL_ZONE, keys.DANGER, keys.WARNING, keys.FUTURE_2]);
    }
  }
  catch (e) { log.error(`ex in move.buildMove.fill: ${e}`, data.turn); }
  if (params.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);

  // see if a particular move will bring you farther from dangerous snake
  try {
    let enemyDistances = [0, 0, 0, 0];
    let largestDistance = 0;
    let largestDistanceMove = 0;
    let uniqueLargestDistanceMove = false;
    for (let m = 0; m < 4; m++) {
      const currentDistance = search.distanceToEnemy(m, grid, data, keys.ENEMY_HEAD);
      log.debug(`Distance to closest dangerous snake for move ${keys.DIRECTION[m]} is ${currentDistance}`);
      if (enemyDistances[m] < currentDistance) {
        enemyDistances[m] = currentDistance;
        if (largestDistance === currentDistance) uniqueLargestDistanceMove = false;
        else if (largestDistance < currentDistance) {
          largestDistance = currentDistance;
          largestDistanceMove = m;
          uniqueLargestDistanceMove = true;
        }
      }
    }
    if (uniqueLargestDistanceMove){
      log.debug(`Add ENEMY_DISTANCE ${params.ENEMY_DISTANCE} to move ${keys.DIRECTION[largestDistanceMove]} for farther ENEMY_HEAD`);
      scores[largestDistanceMove] += params.ENEMY_DISTANCE;
    }
  }
  catch (e) { log.error(`ex in move.buildMove.closestEnemyHead: ${e}`, data.turn); }
  if (params.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);

  // see if a particular move will bring you closer to a killable snake
  try {
    let enemyDistances = [9999, 9999, 9999, 9999];
    let smallestDistance = 9999;
    let smallestDistanceMove = 0;
    let uniqueSmallestDistanceMove = false;
    for (let m = 0; m < 4; m++) {
      const currentDistance = search.distanceToEnemy(m, grid, data, keys.KILL_ZONE);
      log.debug(`Distance to closest killable snake for move ${keys.DIRECTION[m]} is ${currentDistance}`);
      if (currentDistance === 0) continue;
      if (enemyDistances[m] > currentDistance) {
        enemyDistances[m] = currentDistance;
        if (smallestDistance === currentDistance) uniqueSmallestDistanceMove = false;
        else if (smallestDistance > currentDistance) {
          smallestDistance = currentDistance;
          smallestDistanceMove = m;
          uniqueSmallestDistanceMove = true;
        }
      }
    }
    if (uniqueSmallestDistanceMove){
      log.debug(`Add ENEMY_DISTANCE ${params.ENEMY_DISTANCE} to move ${keys.DIRECTION[smallestDistanceMove]} for closer KILL_ZONE`);
      scores[smallestDistanceMove] += params.ENEMY_DISTANCE;
    }
  }
  catch (e) { log.error(`ex in move.buildMove.closestEnemyHead: ${e}`, data.turn); }
  if (params.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);

  // see if a particular move will bring you farther from wall
  try {
    let centerDistances = [0, 0, 0, 0];
    let largestDistance = 0;
    let largestDistanceMove = 0;
    let uniqueLargestDistanceMove = false;
    for (let m = 0; m < 4; m++) {
      const currentDistance = search.distanceToCenter(m, s.location(data), grid, data);
      log.debug(`Distance from wall for move ${keys.DIRECTION[m]} is ${currentDistance}`);
      // if (currentDistance === 0) continue;
      if (centerDistances[m] < currentDistance) {
        centerDistances[m] = currentDistance;
        if (largestDistance === currentDistance) uniqueLargestDistanceMove = false;
        else if (largestDistance < currentDistance) {
          largestDistance = currentDistance;
          largestDistanceMove = m;
          uniqueLargestDistanceMove = true;
        }
      }
    }
    if (uniqueLargestDistanceMove){
      log.debug(`Add ${params.WALL_DISTANCE} to move ${keys.DIRECTION[largestDistanceMove]} for farther from wall`);
      scores[largestDistanceMove] += params.WALL_DISTANCE;
    }
  }
  catch (e) { log.error(`ex in move.buildMove.fartherFromWall: ${e}`, data.turn); }
  if (params.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);

  const bestMove = highestScoreMove(scores);
  previousMove = bestMove;
  return bestMove
}



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
  scores[keys.UP] += baseScoreForBoardPosition(head.x, head.y - 1, grid);
  scores[keys.DOWN] += baseScoreForBoardPosition(head.x, head.y + 1, grid);
  scores[keys.LEFT] += baseScoreForBoardPosition(head.x - 1, head.y, grid);
  scores[keys.RIGHT] += baseScoreForBoardPosition(head.x + 1, head.y, grid);
  if (params.DEBUG) log.debug(`Base move scores: {up: ${scores[keys.UP]}, down: ${scores[keys.DOWN]}, left: ${scores[keys.LEFT]}, right: ${scores[keys.RIGHT]}}`)
  return scores;
};



// return a base score depending on what is currently in that position on the board
const baseScoreForBoardPosition = (x, y, grid) => {
  try {
    // if out of bounds
    if (search.outOfBounds({ x: x, y: y }, grid)) return params.FORGET_ABOUT_IT;
    // types of spaces
    switch (grid[y][x]) {
      case keys.SPACE:
      case keys.TAIL:
      case keys.FUTURE_2:
        return params.BASE_SPACE;
      case keys.FOOD:
        return params.BASE_FOOD;
      case keys.KILL_ZONE:
        return params.BASE_KILL_ZONE * params.KILL_ZONE_BASE_MOVE_MULTIPLIER;
      case keys.WALL_NEAR:
        return params.BASE_WALL_NEAR * params.WALL_NEAR_BASE_MOVE_MULTIPLIER;
      case keys.WARNING:
        return params.BASE_WARNING;
      case keys.SMALL_DANGER:
        return params.BASE_SMALL_DANGER;
      case keys.DANGER:
        return params.BASE_DANGER;
      // default includes SNAKE_BODY, ENEMY_HEAD and YOUR_BODY
      default:
        return params.FORGET_ABOUT_IT;
    }
  }
  catch (e) { log.error(`ex in move.baseScoreForBoardPosition: ${e}`); }
};



// check if move is not fatal
const validMove = (direction, pos, grid) => {
  try {
    if (search.outOfBounds(pos, grid)) return false;
    switch (direction) {
      case keys.UP:
        return grid[pos.y - 1][pos.x] <= keys.DANGER;
      case keys.DOWN:
        return grid[pos.y + 1][pos.x] <= keys.DANGER;
      case keys.LEFT:
        return grid[pos.y][pos.x - 1] <= keys.DANGER;
      case keys.RIGHT:
        return grid[pos.y][pos.x + 1] <= keys.DANGER;
    }
    return false;
  }
  catch (e) { log.error(`ex in move.validMove: ${e}`); }
};



// if move is no good, suggest a similar move that is valid
const suggestMove = (direction, pos, grid) => {
  try {
    switch (direction) {
      // if up, check right, left, down
      case keys.UP:
        if (validMove(keys.RIGHT, pos, grid)) return keys.RIGHT;
        else if (validMove(keys.LEFT, pos, grid)) return keys.LEFT;
        else if (validMove(keys.DOWN, pos, grid)) return keys.DOWN;
        return direction;
      // if down, check left, right, up
      case keys.DOWN:
        if (validMove(keys.LEFT, pos, grid)) return keys.LEFT;
        else if (validMove(keys.RIGHT, pos, grid)) return keys.RIGHT;
        else if (validMove(keys.UP, pos, grid)) return keys.UP;
        return direction;
      // if left, check up, down, right
      case keys.LEFT:
        if (validMove(keys.UP, pos, grid)) return keys.UP;
        else if (validMove(keys.DOWN, pos, grid)) return keys.DOWN;
        else if (validMove(keys.RIGHT, pos, grid)) return keys.RIGHT;
        return direction;
      // if right, check down, up, left
      case keys.RIGHT:
        if (validMove(keys.DOWN, pos, grid)) return keys.DOWN;
        else if (validMove(keys.UP, pos, grid)) return keys.UP;
        else if (validMove(keys.LEFT, pos, grid)) return keys.LEFT;
        return direction;
    }
  }
  catch(e) { log.error(`ex in move.suggestMove: ${e}`); }
  return direction;
};



// return pair as string
const pairToString = pair => {
  try { return `{x: ${pair.x}, y: ${pair.y}}`; }
  catch (e) { log.error(`ex in move.pairToString: ${e}`); }
};



// return scores array in a human readable string
const scoresToString = scores => {
  try {
    return `{up: ${scores[0]}, down: ${scores[1]}, left: ${scores[2]}, right: ${scores[3]}}`
  }
  catch (e) { log.error(`ex in move.scoresToString: ${e}`); }
}



module.exports = {
  eat: eat,
  killTime: killTime,
  hunt: hunt,
  lateHunt: lateHunt,
  validMove: validMove
};
