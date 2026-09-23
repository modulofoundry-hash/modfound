// `race.speed` vem ora como número simples (30), ora como objeto de vários tipos de
// deslocamento (`{walk:25, burrow:20}`, `{walk:30, fly:true}` -- `true` = mesma
// velocidade do andar). Renderizar o objeto direto como filho JSX quebra o React
// (erro #31, "Objects are not valid as a React child") -- sempre formatar em texto
// antes de exibir.
const MOVE_LABELS = { fly: "Voo", climb: "Escalada", swim: "Natação", burrow: "Escavação" };

export function formatSpeed(speed) {
  if (speed == null) return null;
  if (typeof speed === "number") return `${speed} pés`;
  const walk = speed.walk ?? 30;
  const extras = Object.entries(speed)
    .filter(([key]) => key !== "walk")
    .map(([key, value]) => `${MOVE_LABELS[key] ?? key} ${value === true ? walk : value}`);
  return extras.length ? `${walk} pés (${extras.join(", ")})` : `${walk} pés`;
}
