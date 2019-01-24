const k = require("./keys");
const g = require("./grid");
const m = require("./move");

const DEBUG = true;
const STATUS = true;

let slowest = 0;
let slowestMove = 0;

module.exports = {
  // called for every move
  move: (req, res) => {
    let startTime;
    if (STATUS) {
      let date = new Date();
      startTime = date.getMilliseconds();
    }

    const data = req.body;

    if (STATUS) console.log("\n######################################### MOVE " + data.turn + "\n");

    const grid = g.buildGrid(data);

    let move;
    try {
      move = m.hungry(grid, data);
    } catch (e) {
      console.log("ex in m.hungry: " + e);
    }

    if (STATUS) {
      let date2 = new Date();
      let endTime = date2.getMilliseconds();
      if (endTime - startTime > slowest) {
        slowest = endTime - startTime;
        slowestMove = data.turn;
      }
      console.log("MOVE " + data.turn + " TOOK " + (endTime - startTime) + "ms.");
      console.log("SLOWEST MOVE " + slowestMove + " TOOK " + slowest + "ms.");
    }
    return res.json({ move: move ? k.DIRECTION[move] : k.DIRECTION[k.UP] });
  },

  // called once at beginning of game
  start: (req, res) => {
    if (STATUS) console.log("\n\n\n\n##### STARTING GAME #####\n\n\n");
    slowest = 0;
    slowestMove = 0;
    // const data = req.body;
    // let grid = g.buildGrid(data.board);
    // g.printGrid(grid);
    return res.json({ color: "#008FDE" });
  },

  // called when you die, or end of game if you win
  end: (req, res) => {
    return res.json({});
  }
};
