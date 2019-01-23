const k = require("./keys");
const g = require("./grid");
const m = require("./move");

const DEBUG = true;
const STATUS = true;

module.exports = {
  // called for every move
  move: (req, res) => {
    let date, startTime, endTime
    if (STATUS) {
      date = new Date();
      startTime = date.getMilliseconds();
    }

    const data = req.body;

    if (STATUS) console.log("\n\n##### MOVE " + data.turn + "\n");

    const grid = g.buildGrid(data);
    
    let move;
    try {
      move = m.hungry(grid, data);
    } catch (e) {
      console.log("ex in m.hungry: " + e);
    }

    if (STATUS) {
      let endTime = date.getMilliseconds();
      console.log("Move took " + (endTime - startTime) + "ms.");
    }
    return res.json({ move: move ? k.DIRECTION[move] : k.DIRECTION[k.UP] });
  },

  // called once at beginning of game
  start: (req, res) => {
    if (STATUS) console.log("\n\n\n\n##### STARTING GAME #####\n\n\n");
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
