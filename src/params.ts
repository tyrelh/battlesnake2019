module.exports = {
  // logging
  DEBUG: true,
  STATUS: true,
  DEBUG_MAPS: true,
  CONSOLE_LOG: true,
  // basic game params
  INITIAL_FEEDING: 3,
  SURVIVAL_MIN: 40,     // DOWN from 50 -
  // scores for moves
  ASTAR_SUCCESS: 8.0,   // DOWN from 10 -
  ENEMY_DISTANCE: 1.5,
  BASE_KILL_ZONE: 2.1,
  BASE_FOOD: 0.9,
  BASE_TAIL: 7.9,       // UP from 0.35 +
  BASE_SPACE: 0.3,
  BASE_WALL_NEAR: -0.1,
  BASE_WARNING: -2.5,   // DOWN from 0.2 -+
  BASE_DANGER: -8.9,    // DOWN from 0.1 --
  BASE_ENEMY_HEAD: -11, // DOWN from -2 -
  BASE_BAD: -10.0,
  BASE_PREVIOUS: 0.09   // DOWN from 2 -
}