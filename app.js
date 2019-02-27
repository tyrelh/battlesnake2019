const bodyParser = require("body-parser");
const express = require("express");
const logger = require("morgan");
const app = express();
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require("./handlers.js");
const main = require("./app/main");

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set("port", process.env.PORT || 9001);

app.enable("verbose errors");

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(poweredByHandler);
// serve static log files at /logs
app.use("/logs", express.static(__dirname + '/logs'));

// Used for checking if this snake is still alive.
app.post("/ping", (_, res) => {
  return res.json({});
});

// Signals start of a new game
app.post("/start", (req, res) => {
  return main.start(req, res);
});

// Each move request
app.post("/move", (req, res) => {
  return main.move(req, res);
});

// Signals death or win. End of game for you
app.post("/end", (req, res) => {
  return main.end(req, res);
});

app.use("*", fallbackHandler);
app.use(notFoundHandler);
app.use(genericErrorHandler);

app.listen(app.get("port"), () => {
  console.log("Server listening on port %s", app.get("port"));
});
