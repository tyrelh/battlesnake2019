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

// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Handle POST request to '/start'
app.post("/start", (req, res) => {
  return main.start(req, res);
});

// Handle POST request to '/move'
app.post("/move", (req, res) => {
  // NOTE: Do something here to generate your move
  return main.move(req, res);
});

app.post("/end", (req, res) => {
  // NOTE: Any cleanup when a game is complete.
  return main.end(req, res);
});

app.post("/ping", (_, res) => {
  // Used for checking if this snake is still alive.
  return res.json({});
});

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use("*", fallbackHandler);
app.use(notFoundHandler);
app.use(genericErrorHandler);

app.listen(app.get("port"), () => {
  console.log("Server listening on port %s", app.get("port"));
});
