const k = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const p = require("./params");
const search = require("./search")
const log = require("./logger");

let previousMove = 0;


// target closest reachable food
const eat = (grid, data) => {
  const self = data.you;
  const health = self.health;
  const urgency = 1.1 - (health / 100);
  if (p.STATUS) log.status(`EATING w/ urgency ${urgency}`);
  let target = null;
  let move = null;
  const gridCopy = g.copyGrid(grid);
  try {
    target = t.closestFood(grid, self.body[0]);
    move = search.astar(grid, data, target, k.FOOD);
    while (move === null) {
      gridCopy[target.y][target.x] = k.SPACE;
      target = t.closestFood(gridCopy, self.body[0]);
      if (target === null) {
        move = suggestMove(k.RIGHT, self.body[0], grid);
        break;
      }
      move = search.astar(grid, data, target, k.FOOD);
    }
  }
  catch (e) { log.error(`ex in move.eat: ${e}`, data.turn); }

  try {
    if (target && move) {
      const searchScore = p.ASTAR_SUCCESS * urgency;
      if (p.DEBUG) {
        log.debug(`target in eat: ${pairToString(target)}`);
        log.debug(`Score for a* move: ${k.DIRECTION[move]}: ${searchScore}`);
      }
      return buildMove(grid, data, move, searchScore);
    }
    else {
      return buildMove(grid, data, 0, 0);
    }
  }
  catch (e) {
    log.error(`ex in move.eat.buildmove: ${e}`, data.turn);
    return buildMove(grid, data, move, p.ASTAR_SUCCESS);
  }
};



// track closest KILL_ZONE
const hunt = (grid, data) => {
  const you = data.you;
  let score = 0;
  let move = null;
  if (p.STATUS) log.status("HUNTING");

  try {
    move = search.closeAccessableKillZoneFarFromWall(grid, data);
    if (move != null) {
      score = p.ASTAR_SUCCESS;
    } else {
      const fallbackMove = getFallbackMove(grid, data);
      move = fallbackMove.move;
      score = fallbackMove.score;
    }
  }
  catch (e) { log.error(`ex in move.hunt: ${e}`, data.turn); }

  if (p.DEBUG && move != null) log.debug(`In hunt calulated score ${score} for move ${k.DIRECTION[move]}`);
  return buildMove(grid, data, move, score)
};



// track own tail
const killTime = (grid, data) => {
  if (p.STATUS) log.status("KILLING TIME");

  const fallbackMove = getFallbackMove(grid, data);
  let move = fallbackMove.move;
  let score = fallbackMove.score;

  if (p.DEBUG && move != null) log.debug(`Score for a* move: ${k.DIRECTION[move]}: ${p.ASTAR_SUCCESS}`);
  return buildMove(grid, data, move, score);
}



const getFallbackMove = (grid, data) => {
  try {
    if (p.STATUS) log.status("Resorting to fallback move");
    // try finding a path to tail first
    let target = s.tailLocation(data);
    let move = search.astar(grid, data, target, k.TAIL);
    let score = 0;
    // if no path to own tail, try searching for food
    const gridCopy = g.copyGrid(grid);
    while (move === null) {
      target = t.closestFood(gridCopy, s.location(data));
      if (target != null) {
        gridCopy[target.y][target.x] = k.WARNING;
        move = search.astar(grid, data, target, k.FOOD);
      }
      // if no more food to search for just quit
      else break;
    }
    if (move != null) {
      score = p.ASTAR_SUCCESS / 5;
      if (p.DEBUG) {
        log.debug(`getFallbackMove target: ${pairToString(target)}`);
        log.debug(`getFallbackMove move: ${k.DIRECTION[move]}`);
        log.debug(`getFallbackMove score: ${score}`);
      }
      return { move: move, score: score };
    }
  }
  catch (e) { log.error(`ex in move.getFallbackMove: ${e}`, data.turn); }
  return { move: suggestMove(k.RIGHT, s.location(data), grid), score: 0 };
}



// build up move scores and return best move
const buildMove = (grid, data, move = k.RIGHT, moveScore = 0) => {
  const self = data.you;
  // grid = search.enemySearchForFood(grid, data);
  let scores = [];
  // get base next move scores
  try { 
    scores = baseMoveScores(grid, self);
    if (p.STATUS) log.status(`Adding moveScore ${moveScore} to move ${k.DIRECTION[move]}`);
    scores[move] += moveScore;
    if (p.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);
   }
  catch (e) { log.error(`ex in move.buildMove.baseMoveScores: ${e}`, data.turn); }
  
  // get flood fill scores for each move
  try {
    for (let m = 0; m < 4; m++) {
      scores[m] += search.fill(m, grid, data);
      scores[m] += search.fill(m, grid, data, [k.KILL_ZONE, k.DANGER, k.WARNING]);
    }
  }
  catch (e) { log.error(`ex in move.buildMove.fill: ${e}`, data.turn); }
  if (p.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);

  // see if a particular move will bring you farther from dangerous snake
  try {
    let enemyDistances = [0, 0, 0, 0];
    let largestDistance = 0;
    let largestDistanceMove = 0;
    let uniqueLargestDistanceMove = false;
    for (let m = 0; m < 4; m++) {
      const currentDistance = search.distanceToEnemy(m, grid, data, k.ENEMY_HEAD);
      log.debug(`Distance to closest dangerous snake for move ${k.DIRECTION[m]} is ${currentDistance}`);
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
      log.debug(`Add ENEMY_DISTANCE ${p.ENEMY_DISTANCE} to move ${k.DIRECTION[largestDistanceMove]} for farther ENEMY_HEAD`);
      scores[largestDistanceMove] += p.ENEMY_DISTANCE;
    }
  }
  catch (e) { log.error(`ex in move.buildMove.closestEnemyHead: ${e}`, data.turn); }
  if (p.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);

  // see if a particular move will bring you closer to a killable snake
  try {
    let enemyDistances = [9999, 9999, 9999, 9999];
    let smallestDistance = 9999;
    let smallestDistanceMove = 0;
    let uniqueSmallestDistanceMove = false;
    for (let m = 0; m < 4; m++) {
      const currentDistance = search.distanceToEnemy(m, grid, data, k.KILL_ZONE);
      log.debug(`Distance to closest killable snake for move ${k.DIRECTION[m]} is ${currentDistance}`);
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
      log.debug(`Add ENEMY_DISTANCE ${p.ENEMY_DISTANCE} to move ${k.DIRECTION[smallestDistanceMove]} for closer KILL_ZONE`);
      scores[smallestDistanceMove] += p.ENEMY_DISTANCE;
    }
  }
  catch (e) { log.error(`ex in move.buildMove.closestEnemyHead: ${e}`, data.turn); }

  if (p.STATUS) log.status(`Move scores: ${scoresToString(scores)}`);
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
  scores[k.UP] += baseScoreForBoardPosition(head.x, head.y - 1, grid);
  scores[k.DOWN] += baseScoreForBoardPosition(head.x, head.y + 1, grid);
  scores[k.LEFT] += baseScoreForBoardPosition(head.x - 1, head.y, grid);
  scores[k.RIGHT] += baseScoreForBoardPosition(head.x + 1, head.y, grid);
  if (p.DEBUG) log.debug(`Base move scores: {up: ${scores[k.UP]}, down: ${scores[k.DOWN]}, left: ${scores[k.LEFT]}, right: ${scores[k.RIGHT]}}`)
  return scores;
};



// return a base score depending on what is currently in that position on the board
const baseScoreForBoardPosition = (x, y, grid) => {
  try {
    // if out of bounds
    if (search.outOfBounds({ x: x, y: y }, grid)) return p.BASE_BAD;
    // types of spaces
    switch (grid[y][x]) {
      case k.SPACE:
      case k.TAIL:
        return p.BASE_SPACE;
      case k.FOOD:
        return p.BASE_FOOD;
      case k.KILL_ZONE:
        return p.BASE_KILL_ZONE;
      case k.WALL_NEAR:
        return p.BASE_WALL_NEAR * p.WALL_NEAR_BASE_MOVE_MULTIPLIER;
      case k.WARNING:
        return p.BASE_WARNING;
      case k.DANGER:
        return p.BASE_DANGER;
      // default includes SNAKE_BODY, ENEMY_HEAD and YOUR_BODY
      default:
        return p.FORGET_ABOUT_IT;
    }
  }
  catch (e) { log.error(`ex in move.baseScoreForBoardPosition: ${e}`); }
};



// check if move is not fatal
const validMove = (direction, pos, grid) => {
  try {
    if (search.outOfBounds(pos, grid)) return false;
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
  }
  catch (e) { log.error(`ex in move.validMove: ${e}`); }
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
        return direction;
      // if down, check left, right, up
      case k.DOWN:
        if (validMove(k.LEFT, pos, grid)) return k.LEFT;
        else if (validMove(k.RIGHT, pos, grid)) return k.RIGHT;
        else if (validMove(k.UP, pos, grid)) return k.UP;
        return direction;
      // if left, check up, down, right
      case k.LEFT:
        if (validMove(k.UP, pos, grid)) return k.UP;
        else if (validMove(k.DOWN, pos, grid)) return k.DOWN;
        else if (validMove(k.RIGHT, pos, grid)) return k.RIGHT;
        return direction;
      // if right, check down, up, left
      case k.RIGHT:
        if (validMove(k.DOWN, pos, grid)) return k.DOWN;
        else if (validMove(k.UP, pos, grid)) return k.UP;
        else if (validMove(k.LEFT, pos, grid)) return k.LEFT;
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
  validMove: validMove
};
