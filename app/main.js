const k = require("./keys");
const g = require("./grid");
const m = require("./move");

module.exports = {
  // called for every move
  move: (req, res) => {
    const board = req.body.board;
    const self = req.body.you
    const grid = g.buildGrid(board, self);
    const move = m.hungry(grid, req.body);
    return res.json({ move: move ? k.DIRECTION[move] : k.DIRECTION[k.UP] });
  },

  // called once at beginning of game
  start: (req, res) => {
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
