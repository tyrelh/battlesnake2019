module.exports = {
  // logging
  DEBUG: true,
  STATUS: true,
  DEBUG_MAPS: true,
  CONSOLE_LOG: true,

  // basic game params
  INITIAL_FEEDING: 16,    // started @  5   +++++++
  SURVIVAL_MIN: 47,      // started @ 50   --+++++
  INITIAL_TIME_KILL: 24, // started @ 70   --------------
  WALL_NEAR_BASE_MOVE_MULTIPLIER: 12, // started @ 1.6 +++++++++++++
  WALL_NEAR_FILL_MULTIPLIER: 0.2, // started @ 0.4 --

  // scores for moves
  ASTAR_SUCCESS: 9.2,    // started @ 10   -++
  SUGGEST_MOVE: 0.2,
  ENEMY_DISTANCE: 1.9,   // started @ 0.99 +-+++-
  WALL_DISTANCE: 2.1,    // started @ 2    +
  BASE_KILL_ZONE: 2,     // started @ 2.1  -
  BASE_FOOD: 0.8,        // started @ 0.8  -
  BASE_TAIL: 7.9,        // started @  0.4 +
  BASE_SPACE: 0.40,       // started @  0.2 -+++-
  BASE_WALL_NEAR: -1.1,  // started @ -0.1 ------
  BASE_WARNING: -2.6,    // started @  0.2 -+-
  BASE_DANGER: -10.0,     // started @  0.1 ----
  BASE_ENEMY_HEAD: -11,  // started @ -2   -
  BASE_BAD: -10.0,
  BASE_PREVIOUS: 0.09,   // started @  2   -
  FORGET_ABOUT_IT: -100
}