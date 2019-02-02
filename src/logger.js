const fs = require("fs");
const p = require("./params");

let log = "";

const initGameLogs = () => {
  log = "";
}

// write logs for game to file and update the index of logs
const writeLogs = (data) => {
  const gameId = data.game.id;
  const path = `${__dirname}/../logs/${gameId}.txt`;
  // write log
  fs.writeFile(path, log, err => {
    if (err) return console.log(`There was an error saving the logs: ${err}`);
    console.log(`The log for game ${gameId} was saved.`);
    // update index of logs
    fs.readFile(`${__dirname}/../logs/index.html`, "utf8", (err, contents) => {
      // console.log(contents)
      const newEntry = `<a href="/logs/${gameId}.txt">GAME: ${gameId}</a><br />`;
      const newIndex = contents + "\n" + newEntry;
      fs.writeFile(`${__dirname}/../logs/index.html`, newIndex, err => {
        if (err) return console.log(`There was an error saving the new index.html: ${err}`);
        console.log("The logs index.html was updated");
      })
    });
  });
}

const error = message => {
  log += `ERROR: ${message}\n`
  if (p.CONSOLE_LOG) console.log(`ERROR: ${message}`);
}

const status = message => {
  log += `${message}\n`
  if (p.CONSOLE_LOG) console.log(`${message}`);
}

const debug = message => {
  log += `DEBUG: ${message}\n`
  if (p.CONSOLE_LOG) console.log(`DEBUG: ${message}`);
}

module.exports = {
  initGameLogs: initGameLogs,
  writeLogs: writeLogs,
  error: error,
  status: status,
  debug: debug
}