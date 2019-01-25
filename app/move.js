const k = require("./keys");
const g = require("./grid");
const f = require("./food");
const s = require("./self");
const p = require("./params");
const search = require("./search")

const DEBUG = true;
const STATUS = true;

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
  }
  catch (e) { console.log("!!! ex in hungry.closestFood " + e); }
  if (DEBUG) console.log("target in hungry: " + pairToString(target));

  let scores = [];
  try { scores = baseMoveScores(grid, self); }
  catch (e) { console.log("!!! ex in hungry.baseMoveScores: " + e); }

  let move = null;
  try { move = search.astar(grid, data, target, k.FOOD); }
  catch (e) { console.log("!!! ex in hungry.a*: " + e); }

  try {
    for (let m = 0; m < scores.length; m++) {
      scores[m] += search.fill(m, grid, self);
    }
  }
  catch (e) { console.log("!!! ex in hungry.fill " + e); }

  let altMove = null;
  try {
    if (move) {
      if (validMove(move, self.body[0], grid)) {
        scores[move] += p.ASTAR_SUCCESS;
      } else {
        altMove = suggestMove(move, self.body[0], grid);
        if (altMove) scores[altMove] += p.ASTAR_ALT;
      }
    }
  }
  catch (e) { console.log("!!! ex in hungry.move check: " + e); }

  if (previousMove != null) {
    scores[previousMove] += p.BASE_PREVIOUS;
  }
  if (STATUS) console.log("MOVE SCORES: " + scores);
  const bestMove = highestScoreMove(scores);
  previousMove = bestMove;
  return bestMove;
};


const angry = (grid, data) => {
  let move = k.UP;
  try { move = search.astar(grid, data, f.closestKillableEnemy(grid, data.you), k.KILL_ZONE); }
  catch (e) { console.log("!!! ex in m.angry " + e); }
  return move
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
  hungry: hungry,
  angry: angry
};
