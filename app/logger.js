var fs = require("fs");
var p = require("./params");
var log = "";
var initGameLogs = function () {
    log = "";
};
// write logs for game to file and update the index of logs
var writeLogs = function (data) {
    var gameId = data.game.id;
    var path = __dirname + "/../logs/" + gameId + ".txt";
    // write log
    fs.writeFile(path, log, function (err) {
        if (err)
            return console.log("There was an error saving the logs: " + err);
        console.log("The log for game " + gameId + " was saved.");
        // update index of logs
        fs.readFile(__dirname + "/../logs/index.html", "utf8", function (err, contents) {
            // console.log(contents)
            var newEntry = "<a href=\"/logs/" + gameId + ".txt\">GAME: " + gameId + "</a><br />";
            var newIndex = contents + "\n" + newEntry;
            fs.writeFile(__dirname + "/../logs/index.html", newIndex, function (err) {
                if (err)
                    return console.log("There was an error saving the new index.html: " + err);
                console.log("The logs index.html was updated");
            });
        });
    });
};
var error = function (message) {
    log += "ERROR: " + message + "\n";
    if (p.CONSOLE_LOG)
        console.log("ERROR: " + message);
};
var status = function (message) {
    log += message + "\n";
    if (p.CONSOLE_LOG)
        console.log("" + message);
};
var debug = function (message) {
    log += "DEBUG: " + message + "\n";
    if (p.CONSOLE_LOG)
        console.log("DEBUG: " + message);
};
module.exports = {
    initGameLogs: initGameLogs,
    writeLogs: writeLogs,
    error: error,
    status: status,
    debug: debug
};
