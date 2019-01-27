# Battlesnake 2019 AI
![Battlesnake 2019](https://static1.squarespace.com/static/583102acff7c504696a7009b/t/5c2a3b9cf950b760dd5bacb4/1546542614910/BATTLESNAKE+LOGO+2019.png?format=2500w)

This is my entry for this years [Battlesnake](https://www.battlesnake.io) programming competition in Victoria BC being held on March 2, 2019.

Forked from the [NodeJS starter snake](https://github.com/battlesnakeio/starter-snake-node) provided by the [Battlesnake community](https://github.com/battlesnakeio/community).

## Running the snake locally
Follow the directions given at the [original repo](https://github.com/battlesnakeio/starter-snake-node) for running the snake locally and for deploying to Heroku.

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Resources
* [Battlesnake Homepage](https://www.battlesnake.io/)
* [Battlesnake 2019 API](http://docs.battlesnake.io/snake-api.html)
* [Battlesnake Docs](http://docs.battlesnake.io)

## Changelog
* **Jan 27 v2.2.0:**
  * Built custom logging. Logs are accumulated throughout a game and then written to a file on /end. A directory of logs is available at the index of the server.
* **Jan 26 v2.1.0:**
  * Snake will now try to become the largest snake. When it is the largest, it will seek out the nearest smaller snake to try to kill them.
* **Jan 22 v2.0.2:**
  * Fill search working. Can now score moves based on the space available if taking each move and what is in that space (tails, enemies, foods, etc).
* **Jan 21 v2.0.1:**
  * Set up move scoring system so that I can rank each move based on a number of different inputs.
  * Also marked spaces near walls to try to avoid them.
* **Jan 20 v2.0.0:**
  * Inital port of algorithms from my [last year Python entry](https://github.com/tyrelh/battlesnake2018). Basic food finding using A* pathfinding. Is only seeking closest food rather than closest accessable food which leads to unnessesary deaths.

v1 of this AI is my [2018 entry](https://github.com/tyrelh/battlesnake2018) written in Python.