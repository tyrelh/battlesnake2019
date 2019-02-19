# Battlesnake 2019 AI
![Battlesnake 2019](https://static1.squarespace.com/static/583102acff7c504696a7009b/t/5c2a3b9cf950b760dd5bacb4/1546542614910/BATTLESNAKE+LOGO+2019.png?format=2500w)

This is my entry for this years [Battlesnake](https://www.battlesnake.io) programming competition in Victoria BC being held on March 2, 2019.

Forked from the [NodeJS starter snake](https://github.com/battlesnakeio/starter-snake-node) provided by the [Battlesnake community](https://github.com/battlesnakeio/community).

## Running the snake locally
Follow the directions given on the [Battlesnake Docs](http://docs.battlesnake.io/zero-to-snake-linux.html) in the Zero to Snake section for your operating system. When you get to the point where it tells you to clone the starter snake, you can clone this snake instead if you wish.
```shell
git clone git://github.com/tyrelh/battlesnake2019.git
```
You can also deploy this repo directly to Heroku by clicking this link. You will need a Heroku account to do this.

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Resources
* [Battlesnake Homepage](https://www.battlesnake.io/)
* [Battlesnake 2019 API](http://docs.battlesnake.io/snake-api.html)
* [Battlesnake Docs](http://docs.battlesnake.io)
* [Battlesnake NodeJS Starter Snake](https://github.com/battlesnakeio/starter-snake-node)
* [My 2018 Python Entry](https://github.com/tyrelh/battlesnake2018)

## Changelog
* **v2.4.1:**
  * Snake will now try to coil tighter to save space when trapped an space smaller than its body and no tails are present.
  * Scale fill score down when area less than body length and no tails are present.
* **v2.4:**
  * When enemy against wall, search for new possible kill opportunities.
* **v2.3.5:**
  * Add score bias for move bringing you closer to center of game.
* **v2.3.4:**
  * Rework hunting algorithm to favor side of smaller snake farther from the wall.
  * Some refactoring to DRY code
* **v2.3.3:**
  * Grid copy functionality to fix bug in secondary target searches.
  * Add target search redundancy to killTime for when tail is inaccessable.
* **v2.3.2:**
  * Add behaviour to kill time in the early game.
  * Add search score scaling to eating logic based on health level.
  * Mark self different than other snakes. Mostly for debugging.
  * Mark spaces near wall uniquely with their own score bais.
* **v2.3.1:**
  * Fix bug with marking own tail as a space when confident its ok.
  * Add small score bias to move moving me farther from closest dangerous snake head.
  * Add redundancy in astar for if destination is null
* **v2.3.0:**
  * Add second fill search to move scoring that will better count spaces based on the possible future moves of the snakes.
* **v2.2.1:**
  * Fix bug with kill zone marking, so snake can more accurately hunt prey.
  * Fix bug with tail marking so snake can more often use tail spaces as empty spaces.
* **v2.2.0:**
  * Built custom logging. Logs are accumulated throughout a game and then written to a file on /end. A directory of logs is available at the index of the server.
* **v2.1.0:**
  * Snake will now try to become the largest snake. When it is the largest, it will seek out the nearest smaller snake to try to kill them.
* **v2.0.2:**
  * Fill search working. Can now score moves based on the space available if taking each move and what is in that space (tails, enemies, foods, etc).
* **v2.0.1:**
  * Set up move scoring system so that I can rank each move based on a number of different inputs.
  * Also marked spaces near walls to try to avoid them.
* **v2.0.0:**
  * Inital port of algorithms from my [last year Python entry](https://github.com/tyrelh/battlesnake2018). Basic food finding using A* pathfinding. Is only seeking closest food rather than closest accessable food which leads to unnessesary deaths.
* v1 of this AI is my [2018 entry](https://github.com/tyrelh/battlesnake2018) written in Python.

_*The header image used in this readme is the property of [Battlesnake](https://www.battlesnake.io/)._