import { useState } from "react";
import { ABILITIES, ABILITY_LABELS } from "../schema/character";

// Bônus de atributo concedido por TALENTO -- semântica diferente do bônus de
// Raça/Antecedente (`AbilityBonusPicker.jsx`, sempre 3 pontos distribuídos em
// "+2/+1" OU "+1/+1/+1"). Achado na auditoria "talentos com escolha de
// atributo nunca resolvidos no wizard" (set/2026): existem 2 formas reais no
// banco, nenhuma das duas igual à de raça/antecedente --
// - `abilityBonus.choice: {count, amount, from}` -- escolhe `count`
//   habilidades DISTINTAS da lista `from`, cada uma ganha +`amount` (ex:
//   Resilient: 1 entre as 6, +1; Fey-Touched: 1 entre INT/SAB/CAR). Só existe
//   1 distribuição possível -- sem botão de troca de modo.
// - `abilityBonus.points` (sem `choice`, só o talento genérico "Ability
//   Score Improvement"): +2 numa habilidade OU +1/+1 em duas -- 2 modos.
function distributionsFor(abilityBonus) {
  if (abilityBonus.choice) {
    const { count, amount, from } = abilityBonus.choice;
    if (!count || !amount) return null;
    return { modes: { única: Array(count).fill(amount) }, from: from ?? [] };
  }
  if (typeof abilityBonus.points === "number" && abilityBonus.points > 0) {
    const modes =
      abilityBonus.points >= 2
        ? { "+2": [2], "+1/+1": [1, 1] }
        : { [`+${abilityBonus.points}`]: [abilityBonus.points] };
    return { modes, from: abilityBonus.from ?? [] };
  }
  return null;
}

export function FeatAbilityBonusPicker({ label, abilityBonus, onApply }) {
  const config = abilityBonus && distributionsFor(abilityBonus);
  const modeKeys = config ? Object.keys(config.modes) : [];
  const [mode, setMode] = useState(modeKeys[0]);
  const slots = config ? config.modes[mode] ?? config.modes[modeKeys[0]] : [];
  const [slotAbilities, setSlotAbilities] = useState(() => Array(slots.length).fill(""));

  if (!config) return null;

  const options = config.from.length ? config.from : ABILITIES;

  function switchMode(nextMode) {
    setMode(nextMode);
    setSlotAbilities(Array(config.modes[nextMode].length).fill(""));
  }

  function setSlotAbility(index, ability) {
    const next = [...slotAbilities];
    next[index] = ability;
    setSlotAbilities(next);
  }

  const complete = slotAbilities.filter(Boolean).length === slots.length;
  const picks = Object.fromEntries(
    slots.map((amount, i) => [slotAbilities[i], amount]).filter(([ability]) => ability),
  );

  return (
    <div className="ability-bonus-picker">
      <p>{label}: escolha {modeKeys.length > 1 ? "a distribuição do" : "a habilidade do"} bônus de atributo.</p>
      {modeKeys.length > 1 && (
        <div className="ability-bonus-modes">
          {modeKeys.map((key) => (
            <button key={key} type="button" className={mode === key ? "tool-active" : ""} onClick={() => switchMode(key)}>
              {key}
            </button>
          ))}
        </div>
      )}
      <div className="ability-bonus-slots">
        {slots.map((amount, index) => (
          <label key={index}>
            +{amount}
            <select value={slotAbilities[index] ?? ""} onChange={(e) => setSlotAbility(index, e.target.value)}>
              <option value="">—</option>
              {options.map((id) => (
                <option key={id} value={id} disabled={slotAbilities.includes(id) && slotAbilities[index] !== id}>
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
