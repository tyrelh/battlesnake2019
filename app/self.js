const log = require("./logger");
const p = require("./params");

const location = ({ you }) => {
  try { return {x: you.body[0].x, y: you.body[0].y}; }
  catch (e) { log.error(`ex in self.location: ${e}`); }
  return {x: 0, y: 0};
}

const tailLocation = ({ you }) => {
  try {
    const i = you.body.length - 1;
    return {x: you.body[i].x, y: you.body[i].y}
  }
  catch (e) { log.error(`ex in self.tailLocation: ${e}`); }
  return {x: 0, y: 0};
}

// will return if you are the largest snake on the board
const biggestSnake = (data) => {
  try {
    const me = data.you.id;
    const myLength = data.you.body.length;
    for (let i = 0; i < data.board.snakes.length; i++) {
      let snake = data.board.snakes[i];
      if (snake.id === me) continue;
      // if (p.DEBUG) log.debug(`My length: ${myLength}. Enemy length: ${snake.body.length}`);
      if (snake.body.length >= myLength) return false;
    }
    return true;
  }
  catch (e) { log.error(`!!! ex in self.biggestSnake: ${e}`); }
  return false;
}

module.exports = {
  location: location,
  tailLocation: tailLocation,
  biggestSnake: biggestSnake
}