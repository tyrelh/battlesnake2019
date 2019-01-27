const k = require("./keys");
const g = require("./grid");
const t = require("./target");
const s = require("./self");
const p = require("./params");
const search = require("./search")

const DEBUG = true;
const STATUS = true;

let previousMove = 0;


const eat = (grid, data) => {
  let self = data.you;
  let target = null;
  let move = null;
  try {
    target = t.closestFood(grid, self.body[0]);
    move = search.astar(grid, data, target, k.FOOD);
    while (move === null) {
      grid[target.y][target.x] = k.SPACE;
      target = t.closestFood(grid, self.body[0]);
      if (DEBUG) console.log(pairToString(target));
      if (target === null) {
        move = k.UP;
        break;
      }
      move = search.astar(grid, data, target, k.FOOD);
    }
  }
  catch (e) { console.log(`!!! ex in move.eat: ${e}`); }
  if (DEBUG) console.log(`target in eat: ${pairToString(target)}`);

  return buildMove(grid, data, move);
};


// track closest KILL_ZONE
const hunt = (grid, data) => {
  let self = data.you;
  let target = null;
  let move = null;
  try {
    target = t.closestKillableEnemy(grid, self.body[0]);
    move = search.astar(grid, data, target, k.KILL_ZONE);
    while (move === null) {
      grid[target.y][target.x] = k.SPACE;
      target = t.closestKillableEnemy(grid, self.body[0]);
      if (DEBUG) console.log(pairToString(target));
      if (target === null) {
        move = k.UP;
        break;
      }
      move = search.astar(grid, data, target, k.KILL_ZONE);
    }
  }
  catch (e) { console.log(`!!! ex in move.hunt: ${e}`); }
  if (DEBUG) console.log(`target in move.hunt: ${pairToString(target)}`);

  return buildMove(grid, data, move)
};


// track own tail
const killTime = (grid, data) => {
  let move = k.UP;
  const self = data.you;
  let len = self.body.length
  try {
    let target = self.body[len - 1];
    move = search.astar(grid, data, target, k.TAIL);
    if (move === null) move = suggestMove(k.RIGHT, self.body[0], grid);
  }
  catch (e) { console.log(`!!! ex in move.killTime: ${e}`); }
  return buildMove(grid, data, move);
}


const buildMove = (grid, data, move) => {
  const self = data.you;
  let scores = [];
  try { 
    scores = baseMoveScores(grid, self);
    scores[move] += p.ASTAR_SUCCESS;
   }
  catch (e) { console.log(`!!! ex in buildMove.baseMoveScores: ${e}`); }
  
  try {
    for (let m = 0; m < scores.length; m++) {
      scores[m] += search.fill(m, grid, data);
    }
  }
  catch (e) { console.log(`!!! ex in buildMove.fill: ${e}`); }

  if (previousMove != null) {
    scores[previousMove] += p.BASE_PREVIOUS;
  }
  if (STATUS) console.log(`MOVE SCORES: ${scores}`);
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
  if (search.outOfBounds({ x: x, y: y }, grid)) return -10.0;
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
  if (search.outOfBounds(pos, grid)) return false;
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
  eat: eat,
  killTime: killTime,
  hunt: hunt
};
