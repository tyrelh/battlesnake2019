const k = require("./keys");
const g = require("./grid");
const m = require("./move");
const p = require("./params");
const s = require("./self");
const log = require("./logger");

const DEBUG = true;
const STATUS = true;

let slowest = 0;
let slowestMove = 0;


// called for every move
const move = (req, res) => {
  let startTime;
  if (STATUS) {
    let date = new Date();
    startTime = date.getMilliseconds();
  }

  const data = req.body;
  const health = data.you.health;

  if (STATUS) log.status(`\n\n############################### MOVE ${data.turn}\n`);

  let grid = [];
  try{ grid = g.buildGrid(data); }
  catch (e) { log.error(`ex in main.buildGrid: ${e}`); }
  

  let move = k.RIGHT;
  if (DEBUG) log.status(`biggest snake ? ${s.biggestSnake(data)}`);
  // if you are hungry or small you gotta eat
  if (health < p.SURVIVAL_MIN || !s.biggestSnake(data)) {
    try { move = m.eat(grid, data); }
    catch (e) { log.error(`ex in main.eat: ${e}`); }
  }
  // if you are the biggest you can go on the hunt
  else if (s.biggestSnake(data)) {
    try { move = m.hunt(grid, data); }
    catch (e) { log.error(`ex in main.hunt: ${e}`)}
  }
  // whateves, maybe will use at sometime in the future
  else {
    try { move = m.killTime(grid, data); }
    catch (e) { log.error(`ex in main.killTime: ${e}`)}
  }
  

  if (STATUS) {
    let date2 = new Date();
    let endTime = date2.getMilliseconds();
    if (endTime - startTime > slowest) {
      slowest = endTime - startTime;
      slowestMove = data.turn;
    }
    log.status(`Move ${data.turn} took ${endTime - startTime}ms.`);
  }
  return res.json({ move: move ? k.DIRECTION[move] : k.DIRECTION[k.UP] });
};


// called once at beginning of game
const start = (req, res) => {
  // ensure previous game logs are cleared
  log.initGameLogs();
  if (STATUS) {
    log.status(`############################### STARTING GAME ${req.body.game.id}\n\n`);
    slowest = 0;
    slowestMove = 0;
  }
  const blue = "#3b94e3";
  const pink = "#cc4ff1"
  const green = "#2be384"
  return res.json({ color: green });
};


// called when you die, or end of game if you win
const end = (req, res) => {
  log.status(`Slowest move ${slowestMove} took ${slowest}ms.`);
  // write logs for this game to file
  log.writeLogs(req.body);
  return res.json({});
};


module.exports = {
  move: move,
  start: start,
  end: end
};