
const location = ({ you }) => {
  return {x: you.body[0].x, y: you.body[0].y}
}

const tailLocation = ({ you }) => {
  const i = you.body.length - 1;
  return {x: you.body[i].x, y: you.body[i].y}
}

const biggestSnake = (data) => {
  const myLength = data.you.body.length;
  let biggest = true;
  data.board.snakes.forEach(({ id, name, health, body }) => {
    if (body.length >= myLength) biggest = false;
  })
  return biggest;
}

module.exports = {
  location: location,
  tailLocation: tailLocation,
  biggestSnake: biggestSnake
}