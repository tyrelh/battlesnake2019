
const location = ({ you }) => {
  return {x: you.body[0].x, y: you.body[0].y}
}

const tailLocation = ({ you }) => {
  const i = you.body.length - 1;
  return {x: you.body[i].x, y: you.body[i].y}
}

module.exports = {
  location: location,
  tailLocation: tailLocation
}