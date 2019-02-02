module.exports = {
  // logging
  DEBUG: true,
  STATUS: true,
  DEBUG_MAPS: true,
  CONSOLE_LOG: true,
  // basic game params
  INITIAL_FEEDING: 3,
  SURVIVAL_MIN: 30,     // down from 50   --
  // scores for moves
  ASTAR_SUCCESS: 8.0,   // down from 10   -
  ENEMY_DISTANCE: 1.5,
  BASE_KILL_ZONE: 2.1,
  BASE_FOOD: 0.9,
  BASE_TAIL: 7.9,       // up from    0.4 +
  BASE_SPACE: 0.2,      // down from  0.1 -
  BASE_WALL_NEAR: -0.7, // down from -0.1 ---
  BASE_WARNING: -2.5,   // down from  0.2 -+
  BASE_DANGER: -8.9,    // down from  0.1 --
  BASE_ENEMY_HEAD: -11, // down from -2   -
  BASE_BAD: -10.0,
  BASE_PREVIOUS: 0.09   // down from  2   -
}