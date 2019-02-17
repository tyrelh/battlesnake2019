const fs = require("fs");
const p = require("./params");



let log = "";
let exLog = "############################# EXCEPTIONS\n";



const initGameLogs = () => {
  log = "";
  exLog = "############################# EXCEPTIONS\n";
}



// write logs for game to file and update the index of logs
const writeLogs = (data) => {
  if (p.CONSOLE_LOG) console.log(exLog);
  const gameId = data.game.id;
  const path = `${__dirname}/../logs/${gameId}.txt`;
  // append game exeptions to end of log for easy viewing
  log += "\n" + exLog;
  // write log
  fs.writeFile(
    path,
    log,
    err => {
      if (err) return console.log(`There was an error saving the logs: ${err}`);
      console.log(`The log for game ${gameId} was saved.`);
      // update index of logs
      // read current index
      fs.readFile(
        `${__dirname}/../logs/index.html`,
        "utf8",
        (err, contents) => {
          // append new entry
          const newEntry = `<a href="/logs/${gameId}.txt">GAME: ${gameId}</a><br />`;
          const newIndex = contents + "\n" + newEntry;
          // write updated index
          fs.writeFile(
            `${__dirname}/../logs/index.html`,
            newIndex,
            err => {
              if (err) return console.log(`There was an error saving the new index.html: ${err}`);
              console.log("The logs index.html was updated");
            }
          )
        }
      );
    }
  );
}



// debug levels
const error = (message, turn = null) => {
  log += `ERROR: ${message}\n`
  if (p.CONSOLE_LOG) console.log(`ERROR: ${message}`);
  exLog += `EX ON TURN ${turn != null ? turn : "none"}: ${message}\n`
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