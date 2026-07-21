// Chaves em texto — o módulo resolve para os enums reais do Foundry
// (CONST.WALL_SENSE_TYPES, CONST.WALL_DIRECTIONS, CONST.WALL_DOOR_TYPES, CONST.WALL_DOOR_STATES)
// em tempo de execução, então esse schema não depende dos valores numéricos exatos de cada versão.

export const SENSE_TYPES = [
  { id: "none", label: "Nenhuma" },
  { id: "limited", label: "Limitada" },
  { id: "normal", label: "Normal" },
  { id: "proximity", label: "Proximidade" },
  { id: "distance", label: "Proximidade Reversa" },
];

// Diferente de light/sight/sound (5 níveis via SENSE_TYPES), o Foundry só tem
// CONST.WALL_MOVEMENT_TYPES.NONE/NORMAL pra movimento — sem "limitada"/"proximidade"
// (ver module/scripts/scenes/buildScene.js#buildWallData). Usar SENSE_TYPES aqui
// oferecia opções que não existem de verdade: qualquer coisa != "none" virava
// "normal" (bloqueia) silenciosamente ao sincronizar, sem avisar o usuário.
export const MOVEMENT_TYPES = [
  { id: "none", label: "Nenhuma (não bloqueia)" },
  { id: "normal", label: "Normal (bloqueia)" },
];

export const DOOR_TYPES = [
  { id: "none", label: "Não é porta" },
  { id: "door", label: "Porta" },
  { id: "secret", label: "Porta Secreta" },
];

export const DOOR_STATES = [
  { id: "closed", label: "Fechada" },
  { id: "open", label: "Aberta" },
  { id: "locked", label: "Trancada" },
];

export const DIRECTIONS = [
  { id: "both", label: "Os dois lados" },
  { id: "left", label: "Só um lado (esquerda)" },
  { id: "right", label: "Só um lado (direita)" },
];

export function createWall(c) {
  return {
    c,
    light: "normal",
    sight: "normal",
    sound: "normal",
    move: "normal",
    dir: "both",
    door: "none",
    ds: "closed",
    threshold: { light: null, sight: null, sound: null, attenuation: false },
  };
}
