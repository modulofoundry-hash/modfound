import { useState } from "react";
import { ABILITIES, ABILITY_LABELS } from "../schema/character";

// Regra da mesa (não é opcional aqui, vale sempre): bônus de atributo é
// +2/+1 em duas habilidades OU +1/+1/+1 em três — o jogador pode usar a
// distribuição que o texto da raça/antecedente sugere (pré-marcada) ou
// trocar pra qualquer combinação de habilidades, contanto que still seja
// uma dessas duas formas.
const DISTRIBUTIONS = { "2/1": [2, 1], "1/1/1": [1, 1, 1] };

// abilityBonus vem do banco de conteúdo (`fixed`/`points`+`from` do
// 5etools) — tenta reconhecer a sugestão pra pré-marcar, sem travar o
// jogador nela.
function suggestedPicks(abilityBonus) {
  if (!abilityBonus) return null;
  const fixed = abilityBonus.fixed ?? {};
  const fixedEntries = Object.entries(fixed).sort((a, b) => b[1] - a[1]);
  if (fixedEntries.length === 2 && fixedEntries[0][1] === 2 && fixedEntries[1][1] === 1) {
    return { mode: "2/1", picks: { [fixedEntries[0][0]]: 2, [fixedEntries[1][0]]: 1 } };
  }
  if (fixedEntries.length === 3 && fixedEntries.every(([, v]) => v === 1)) {
    return { mode: "1/1/1", picks: Object.fromEntries(fixedEntries) };
  }
  if (abilityBonus.from?.length >= 3) {
    return { mode: "1/1/1", picks: Object.fromEntries(abilityBonus.from.slice(0, 3).map((a) => [a, 1])) };
  }
  return null;
}

// Converte { habilidade: quantidade } (sem ordem definida) num array por
// SLOT (índice = posição do <select> na tela), casando cada habilidade pelo
// valor de bônus que ela recebe no slot correspondente — necessário pra
// pré-marcar a sugestão sem cair no mesmo bug de índice que motivou essa
// função existir (ver setSlotAbility).
function picksToSlots(picks, slots) {
  const arr = Array(slots.length).fill("");
  const remaining = { ...picks };
  slots.forEach((amount, i) => {
    const match = Object.keys(remaining).find((ability) => remaining[ability] === amount);
    if (match) {
      arr[i] = match;
      delete remaining[match];
    }
  });
  return arr;
}

export function AbilityBonusPicker({ label, abilityBonus, onApply }) {
  const suggestion = suggestedPicks(abilityBonus);
  const [mode, setMode] = useState(suggestion?.mode ?? "2/1");
  // Guarda a habilidade escolhida por SLOT (posição do <select> na tela), não
  // por chave de objeto — reconstruir a posição a partir de `Object.keys(picks)`
  // (jeito antigo) misturava a ORDEM DE INSERÇÃO do objeto com a POSIÇÃO do
  // slot: escolher o slot "+1" antes do slot "+2" fazia a habilidade escolhida
  // aparecer no <select> errado (mostrando "+2" pra ela) e podia acabar
  // aplicando o bônus invertido sem nenhum aviso — achado revisando o projeto.
  const [slotAbilities, setSlotAbilities] = useState(
    () => suggestion && picksToSlots(suggestion.picks, DISTRIBUTIONS[suggestion.mode]),
  );

  if (!abilityBonus) return null;

  const slots = DISTRIBUTIONS[mode];
  const resolvedSlots = slotAbilities ?? Array(slots.length).fill("");

  function switchMode(nextMode) {
    setMode(nextMode);
    setSlotAbilities(Array(DISTRIBUTIONS[nextMode].length).fill(""));
  }

  function setSlotAbility(index, ability) {
    const next = [...resolvedSlots];
    next[index] = ability;
    setSlotAbilities(next);
  }

  const complete = resolvedSlots.filter(Boolean).length === slots.length;
  const picks = Object.fromEntries(
    slots.map((amount, i) => [resolvedSlots[i], amount]).filter(([ability]) => ability),
  );

  return (
    <div className="ability-bonus-picker">
      <p>{label}: escolha a distribuição do bônus de atributo (+2/+1 ou +1/+1/+1, em qualquer combinação).</p>
      <div className="ability-bonus-modes">
        <button type="button" className={mode === "2/1" ? "tool-active" : ""} onClick={() => switchMode("2/1")}>
          +2/+1
        </button>
        <button type="button" className={mode === "1/1/1" ? "tool-active" : ""} onClick={() => switchMode("1/1/1")}>
          +1/+1/+1
        </button>
      </div>
      <div className="ability-bonus-slots">
        {slots.map((amount, index) => (
          <label key={index}>
            +{amount}
            <select value={resolvedSlots[index] ?? ""} onChange={(e) => setSlotAbility(index, e.target.value)}>
              <option value="">—</option>
              {ABILITIES.map((id) => (
                <option key={id} value={id} disabled={resolvedSlots.includes(id) && resolvedSlots[index] !== id}>
                  {ABILITY_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button type="button" disabled={!complete} onClick={() => onApply(picks)}>
        Aplicar bônus nos Atributos
      </button>
    </div>
  );
}
