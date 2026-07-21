// Mesmas chaves de CONST.FOG_EXPLORATION_MODES do Foundry — não é boolean porque o
// Foundry tem 3 modos, não 2 (ver módulo scenes/buildScene.js).
export const FOG_EXPLORATION_MODES = [
  { key: "DISABLED", label: "Nenhum" },
  { key: "INDIVIDUAL", label: "Individual" },
  { key: "SHARED", label: "Compartilhado" },
];

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
    fogExploration: "INDIVIDUAL",
    walls: [],
    lights: [],
  };
}
