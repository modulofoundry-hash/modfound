import { useState } from "react";
import { ABILITIES, ABILITY_LABELS } from "../../schema/character";
import { AbilitiesInput } from "../AbilitiesInput";

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUY_BUDGET = 27;

const METHODS = [
  {
    key: "array",
    label: "Array Padrão",
    info: "Você recebe os 6 valores fixos 15, 14, 13, 12, 10 e 8 — só decide qual atributo recebe qual valor.",
  },
  {
    key: "pointbuy",
    label: "Compra por Pontos",
    info:
      "Todo atributo começa em 8 e você tem 27 pontos pra gastar aumentando-os até no máximo 15 (antes de bônus de raça/antecedente). " +
      "Custo por valor: 9→1 ponto, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9.",
  },
  {
    key: "roll",
    label: "Rolagem",
    info: "Role 4d6 e descarte o menor dado, somando os 3 restantes — repita pra gerar 6 números, depois distribua entre os atributos.",
  },
  {
    key: "manual",
    label: "Manual",
    info: "Digite os valores finais direto, sem seguir nenhum método específico.",
  },
];

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-tooltip-wrap">
      <button
        type="button"
        className="info-tooltip-btn"
        aria-label="Mais informações"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
      >
        ⓘ
      </button>
      {open && <div className="info-tooltip-box">{text}</div>}
    </span>
  );
}

function MethodPicker({ method, onChange }) {
  return (
    <div className="ability-method-picker">
      {METHODS.map((m) => (
        <div key={m.key} className={`ability-method-option${method === m.key ? " ability-method-option-selected" : ""}`}>
          <button type="button" onClick={() => onChange(m.key)}>
            {m.label}
          </button>
          <InfoTooltip text={m.info} />
        </div>
      ))}
    </div>
  );
}

// Reaproveitado pra Array Padrão E pra rolagem (depois de rolar os 6 dados) —
// as duas são "arraste estes N valores fixos pros atributos" (pedido
// explícito do usuário, trocando o <select> de antes). `pool` é uma lista de
// { id, value } — usa id em vez do valor puro pra distinguir entradas
// repetidas (a rolagem pode empatar dois dados no mesmo número).
function AssignPool({ pool, slotFor, onAssign, onUnassign }) {
  const usedIds = new Set(Object.values(slotFor).filter((id) => id != null));

  function handleDrop(key, event) {
    event.preventDefault();
    event.stopPropagation();
    const poolId = event.dataTransfer.getData("text/plain");
    const item = pool.find((p) => String(p.id) === poolId);
    if (item) onAssign(key, item.id);
  }

  const assignedCount = ABILITIES.filter((k) => slotFor[k] != null).length;

  return (
    <div className="ability-assign-pool">
      <p className="field-hint">
        {assignedCount}/{ABILITIES.length} atributos preenchidos — arraste um valor pro atributo de destino
      </p>
      <div className="ability-pool-values">
        {pool
          .filter((p) => !usedIds.has(p.id))
          .map((p) => (
            <div
              key={p.id}
              className="ability-pool-chip"
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData("text/plain", String(p.id));
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              {p.value}
            </div>
          ))}
        {pool.every((p) => usedIds.has(p.id)) && <p className="ability-pool-empty">Todos os valores já foram distribuídos.</p>}
      </div>
      <div className="abilities-grid">
        {ABILITIES.map((key) => {
          const item = pool.find((p) => p.id === slotFor[key]);
          return (
            <div
              key={key}
              className={`ability-drop-zone${item ? " ability-drop-zone-filled" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onDrop={(event) => handleDrop(key, event)}
            >
              <span className="ability-drop-zone-label">{ABILITY_LABELS[key]}</span>
              <span className="ability-drop-zone-value">{item ? item.value : "—"}</span>
              {item && (
                <button
                  type="button"
                  className="ability-drop-zone-clear"
                  aria-label={`Remover valor de ${ABILITY_LABELS[key]}`}
                  onClick={() => onUnassign(key)}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PointBuyView({ abilities, onChange }) {
  const totalUsed = ABILITIES.reduce((sum, key) => sum + (POINT_BUY_COST[abilities[key]] ?? 0), 0);

  function adjust(key, delta) {
    const current = abilities[key];
    const next = current + delta;
    if (next < 8 || next > 15) return;
    const cost = (POINT_BUY_COST[next] ?? 0) - (POINT_BUY_COST[current] ?? 0);
    if (totalUsed + cost > POINT_BUY_BUDGET) return;
    onChange({ ...abilities, [key]: next });
  }

  return (
    <div className="ability-point-buy">
      <p className={`field-hint${totalUsed > POINT_BUY_BUDGET ? " field-hint-warn" : ""}`}>
        {totalUsed}/{POINT_BUY_BUDGET} pontos usados
      </p>
      <div className="abilities-grid">
        {ABILITIES.map((key) => (
          <div key={key} className="ability-field ability-point-buy-field">
            {ABILITY_LABELS[key]}
            <div className="ability-point-buy-controls">
              <button type="button" onClick={() => adjust(key, -1)} disabled={abilities[key] <= 8}>
                −
              </button>
              <span>{abilities[key]}</span>
              <button
                type="button"
                onClick={() => adjust(key, 1)}
                disabled={abilities[key] >= 15 || totalUsed + ((POINT_BUY_COST[abilities[key] + 1] ?? 99) - (POINT_BUY_COST[abilities[key]] ?? 0)) > POINT_BUY_BUDGET}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function rollHighest3of4d6() {
  const rolls = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

// Clica no dado -> a caixa embaixo entra numa animação de números mudando
// rápido até parar no valor de verdade (soma dos 3 maiores de 4d6) — pedido
// explícito do usuário.
function DieSlot({ index, value, onRolled }) {
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState(value);

  function roll() {
    if (rolling) return;
    setRolling(true);
    const final = rollHighest3of4d6();
    let ticks = 0;
    const maxTicks = 14;
    const interval = setInterval(() => {
      ticks += 1;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setDisplay(final);
        setRolling(false);
        onRolled(index, final);
      } else {
        setDisplay(3 + Math.floor(Math.random() * 16));
      }
    }, 60);
  }

  return (
    <div className="dice-slot">
      <button type="button" className="dice-slot-die" onClick={roll} disabled={rolling} aria-label="Rolar 4d6">
        🎲
      </button>
      <div className={`dice-slot-box${rolling ? " dice-slot-box-rolling" : ""}`}>{value != null ? display : "—"}</div>
    </div>
  );
}

function RollView({ rolledValues, onRoll, pool, slotFor, onAssign, onUnassign }) {
  const allRolled = rolledValues.every((v) => v != null);
  return (
    <div className="ability-roll-view">
      <div className="dice-slots">
        {rolledValues.map((value, index) => (
          <DieSlot key={index} index={index} value={value} onRolled={onRoll} />
        ))}
      </div>
      {allRolled ? (
        <AssignPool pool={pool} slotFor={slotFor} onAssign={onAssign} onUnassign={onUnassign} />
      ) : (
        <p className="field-hint">Clique em cada dado pra rolar os 6 valores antes de distribuir entre os atributos.</p>
      )}
    </div>
  );
}

export function StepAtributos({ abilities, onChange }) {
  const [method, setMethod] = useState("manual");
  const [rolledValues, setRolledValues] = useState([null, null, null, null, null, null]);
  // Qual valor do conjunto (por id, não por número — a rolagem pode empatar
  // dois dados) está em cada atributo. Compartilhado entre Array e Rolagem,
  // já que as duas são "arraste o valor pro atributo".
  const [slotFor, setSlotFor] = useState({});

  const standardPool = STANDARD_ARRAY.map((v, i) => ({ id: `arr-${i}`, value: v }));
  const rollPool = rolledValues.map((v, i) => ({ id: `roll-${i}`, value: v })).filter((p) => p.value != null);

  function computeAbilitiesFromSlots(pool, nextSlotFor) {
    const next = { ...abilities };
    for (const key of ABILITIES) {
      const item = pool.find((p) => p.id === nextSlotFor[key]);
      if (item) next[key] = item.value;
    }
    return next;
  }

  // Não usa a forma funcional de setState aqui de propósito — chamar
  // `onChange` (que atualiza estado do componente PAI) de dentro de um
  // updater de `setSlotFor` viola a regra de updater puro do React (achado
  // ao vivo: aviso "Cannot update a component while rendering a different
  // component"). `slotFor` já está disponível direto no escopo, não precisa
  // do `prev` do updater.
  function assignSlot(pool, key, poolId) {
    const next = { ...slotFor };
    // se esse valor já estava em outro atributo, tira de lá — não dá pra
    // um mesmo valor do conjunto ocupar dois atributos ao mesmo tempo.
    for (const k of Object.keys(next)) {
      if (next[k] === poolId) delete next[k];
    }
    next[key] = poolId;
    setSlotFor(next);
    onChange(computeAbilitiesFromSlots(pool, next));
  }

  function unassignSlot(key) {
    setSlotFor((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Troca de método reseta os atributos (e as posições arrastadas) pro ponto
  // de partida daquele método — sem isso, valor deixado por um método
  // anterior podia bater "por acaso" com um valor do novo conjunto e contar
  // como já atribuído, confundindo o contador de progresso.
  function selectMethod(key) {
    setMethod(key);
    setSlotFor({});
    if (key === "pointbuy") {
      onChange(Object.fromEntries(ABILITIES.map((a) => [a, 8])));
    } else if (key === "array") {
      onChange(Object.fromEntries(ABILITIES.map((a) => [a, 10])));
    } else if (key === "roll") {
      setRolledValues([null, null, null, null, null, null]);
      onChange(Object.fromEntries(ABILITIES.map((a) => [a, 10])));
    }
  }

  function handleRoll(index, value) {
    setRolledValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  return (
    <div className="wizard-step-atributos">
      <MethodPicker method={method} onChange={selectMethod} />
      {method === "array" && (
        <AssignPool
          pool={standardPool}
          slotFor={slotFor}
          onAssign={(key, id) => assignSlot(standardPool, key, id)}
          onUnassign={unassignSlot}
        />
      )}
      {method === "pointbuy" && <PointBuyView abilities={abilities} onChange={onChange} />}
      {method === "roll" && (
        <RollView
          rolledValues={rolledValues}
          onRoll={handleRoll}
          pool={rollPool}
          slotFor={slotFor}
          onAssign={(key, id) => assignSlot(rollPool, key, id)}
          onUnassign={unassignSlot}
        />
      )}
      {method === "manual" && <AbilitiesInput abilities={abilities} onChange={onChange} />}
    </div>
  );
}
