export function createEmptyScene() {
  return {
    name: "",
    backgroundUrl: "",
    width: 4000,
    height: 3000,
    gridSize: 100,
    gridDistance: 5,
    gridUnits: "ft",
    tokenVision: true,
    globalLight: false,
    fogExploration: true,
    walls: [],
    lights: [],
  };
}
