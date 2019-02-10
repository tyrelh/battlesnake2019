module.exports = {
  // board spaces
  KILL_ZONE: 0,
  SPACE: 1,
  TAIL: 2,
  FOOD: 3,
  FUTURE_2: 4,
  WALL_NEAR: 5,
  WARNING: 6,
  DANGER: 7,
  SNAKE_BODY: 8,
  YOUR_BODY: 9,
  SMALL_HEAD: 10,
  ENEMY_HEAD: 11,
  TYPE: [
    "KILL_ZONE",
    "SPACE",
    "TAIL",
    "FOOD",
    "FUTURE_2",
    "WALL_NEAR",
    "WARNING",
    "DANGER",
    "SNAKE_BODY",
    "YOUR_BODY",
    "SMALL_HEAD",
    "ENEMY_HEAD"
  ],
  MAP: ["!", " ", "T", "o", ".", "*", "x", "X", "s", "Y", "S", "E", "@"],

  // directions
  DIRECTION: [
    "up",
    "down",
    "left",
    "right"
  ],
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3
};
