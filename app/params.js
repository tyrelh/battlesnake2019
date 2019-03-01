module.exports = {
  // logging
  DEBUG: true,
  STATUS: true,
  DEBUG_MAPS: true,
  CONSOLE_LOG: true,

  // basic game params
  INITIAL_FEEDING: 10,  // started @  5   +++++++-
  SURVIVAL_MIN: 47,     // started @ 50   --+++++
  LONG_GAME_ENDURANCE: 80, // started @ 80
  INITIAL_TIME_KILL: 0, // started @ 70   ---------------
  WALL_NEAR_BASE_MOVE_MULTIPLIER: 12, // started @ 1.6 +++++++++++++
  WALL_NEAR_FILL_MULTIPLIER: 0.05,     // started @ 0.4 ---
  KILL_ZONE_BASE_MOVE_MULTIPLIER: 3.5,  // started @ 3 +
  FEEDING_URGENCY_MULTIPLIER: 0.32,   // started @ 0.4 --

  // scores for moves
  ASTAR_SUCCESS: 9.3,    // started @ 10   -++
  SUGGEST_MOVE: 0.2,
  ENEMY_DISTANCE: 1.9,   // started @ 0.99 +-+++-
  WALL_DISTANCE: 2.1,    // started @ 2    +
  BASE_KILL_ZONE: 2,   // started @ 2.1  --+
  BASE_FOOD: 0.8,        // started @ 0.8  -
  BASE_TAIL: 8.2,        // started @  0.4 +++
  BASE_SPACE: 0.36,      // started @  0.2 -+++--+
  BASE_WALL_NEAR: -1.1,  // started @ -0.1 ------
  BASE_WARNING: -2.6,    // started @  0.2 -+-
  BASE_SMALL_DANGER: -7.0,// started @ -5 -+
  BASE_DANGER: -10.0,    // started @  0.1 ----
  BASE_ENEMY_HEAD: -11,  // started @ -2   -
  BASE_BAD: -10.0,
  BASE_PREVIOUS: 0.09,   // started @  2   -
  FORGET_ABOUT_IT: -100,
  COIL: 5               // started @ 10   +
}