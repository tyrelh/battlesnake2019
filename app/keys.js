module.exports = {
  // board spaces
  KILL_ZONE: 0,
  SPACE: 1,
  TAIL: 2,
  FOOD: 3,
  FUTURE_2: 4,
  WALL_NEAR: 5,
  WARNING: 6,
  SMALL_DANGER: 7,
  DANGER: 8,
  SNAKE_BODY: 9,
  YOUR_BODY: 10,
  SMALL_HEAD: 11,
  ENEMY_HEAD: 12,
  TYPE: [
    "KILL_ZONE",
    "SPACE",
    "TAIL",
    "FOOD",
    "FUTURE_2",
    "WALL_NEAR",
    "WARNING",
    "SMALL_DANGER",
    "DANGER",
    "SNAKE_BODY",
    "YOUR_BODY",
    "SMALL_HEAD",
    "ENEMY_HEAD"
  ],
  MAP: ["!", " ", "T", "o", ".", "*", "w", "x", "X", "s", "Y", "S", "E", "@"],

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
