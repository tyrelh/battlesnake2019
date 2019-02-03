const SURVIVAL_MIN = 30 // started @ 50   --
module.exports = {
  // logging
  DEBUG: true,
  STATUS: true,
  DEBUG_MAPS: true,
  CONSOLE_LOG: true,
  // basic game params
  INITIAL_FEEDING: 5,
  SURVIVAL_MIN: SURVIVAL_MIN,
  INITIAL_TIME_KILL: 100 - SURVIVAL_MIN,
  // scores for moves
  ASTAR_SUCCESS: 9.0,   // started @ 10   -+
  ENEMY_DISTANCE: 1.5,
  BASE_KILL_ZONE: 2.1,
  BASE_FOOD: 0.9,
  BASE_TAIL: 7.9,       // started @  0.4 +
  BASE_SPACE: 0.2,      // started @  0.1 -
  BASE_WALL_NEAR: -0.9, // started @ -0.1 ----
  BASE_WARNING: -2.6,   // started @  0.2 -+-
  BASE_DANGER: -8.9,    // started @  0.1 --
  BASE_ENEMY_HEAD: -11, // started @ -2   -
  BASE_BAD: -10.0,
  BASE_PREVIOUS: 0.09,   // started @  2   -
  FORGET_ABOUT_IT: -100
}