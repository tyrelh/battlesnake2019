const k = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const p = require("./params");
const search = require("./search")
const log = require("./logger");

const DEBUG = true;
const STATUS = true;

let previousMove = 0;


// target closest reachable food
const eat = (grid, data) => {
  if (STATUS) log.status("EATING");
  let self = data.you;
  let target = null;
  let move = null;
  try {
    target = t.closestFood(grid, self.body[0]);
    move = search.astar(grid, data, target, k.FOOD);
    while (move === null) {
      grid[target.y][target.x] = k.SPACE;
      target = t.closestFood(grid, self.body[0]);
      if (DEBUG) log.debug(pairToString(target));
      if (target === null) {
        move = suggestMove(k.RIGHT, self.body[0], grid);
        break;
      }
      move = search.astar(grid, data, target, k.FOOD);
    }
  }
  catch (e) { log.error(`ex in move.eat: ${e}`); }
  if (DEBUG) log.debug(`target in eat: ${pairToString(target)}`);

  return buildMove(grid, data, move);
};


// track closest KILL_ZONE
const hunt = (grid, data) => {
  if (STATUS) log.status("HUNTING");
  let self = data.you;
  let target = null;
  let move = null;
  try {
    target = t.closestKillableEnemy(grid, self.body[0]);
    move = search.astar(grid, data, target, k.KILL_ZONE);
    while (move === null) {
      grid[target.y][target.x] = k.SPACE;
      target = t.closestKillableEnemy(grid, self.body[0]);
      if (DEBUG) log.debug(pairToString(target));
      if (target === null) {
        move = suggestMove(k.RIGHT, self.body[0], grid);
        break;
      }
      move = search.astar(grid, data, target, k.KILL_ZONE);
    }
  }
  catch (e) { log.error(`ex in move.hunt: ${e}`); }
  if (DEBUG) log.debug(`target in move.hunt: ${pairToString(target)}`);

  return buildMove(grid, data, move)
};


// track own tail
const killTime = (grid, data) => {
  if (STATUS) log.status("KILLING TIME");
  let move = k.UP;
  const self = data.you;
  let len = self.body.length
  try {
    let target = self.body[len - 1];
    move = search.astar(grid, data, target, k.TAIL);
    if (move === null) move = suggestMove(k.RIGHT, self.body[0], grid);
  }
  catch (e) { log.error(`ex in move.killTime: ${e}`); }
  return buildMove(grid, data, move);
}


const buildMove = (grid, data, move) => {
  const self = data.you;
  let scores = [];
  try { 
    scores = baseMoveScores(grid, self);
    scores[move] += p.ASTAR_SUCCESS;
   }
  catch (e) { log.error(`ex in buildMove.baseMoveScores: ${e}`); }
  
  try {
    for (let m = 0; m < scores.length; m++) {
      scores[m] += search.fill(m, grid, data);
    }
  }
  catch (e) { log.error(`ex in buildMove.fill: ${e}`); }

  if (previousMove != null) {
    scores[previousMove] += p.BASE_PREVIOUS;
  }
  if (STATUS) log.status(`Move scores: ${scoresToString(scores)}`);
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
  return scores;
};


// return a base score depending on what is currently in that position on the board
const baseScoreForBoardPosition = (x, y, grid) => {
  // if out of bounds
  if (search.outOfBounds({ x: x, y: y }, grid)) return p.BASE_BAD;
  // types of spaces
  switch (grid[y][x]) {
    case k.SPACE:
      return p.BASE_SPACE;
    case k.TAIL:
      return p.BASE_TAIL;
    case k.FOOD:
      return p.BASE_FOOD;
    case k.KILL_ZONE:
      return p.BASE_KILL_ZONE;
    case k.WARNING:
      return p.BASE_WARNING;
    case k.DANGER:
      return p.BASE_DANGER;
    // default includes SNAKE_BODY and ENEMY_HEAD
    default:
      return p.BASE_BAD;
  }
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
  hunt: hunt
};
