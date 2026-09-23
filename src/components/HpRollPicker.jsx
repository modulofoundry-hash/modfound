// Escolha de "Média"/"Rolar no Foundry"/"Rolar aqui" pro PV de UM nível específico
// de uma entrada de classe — aparece quando o personagem sobe de nível (ou já é
// criado acima do nível 1). "Rolar no Foundry" não decide o número aqui: só marca
// "pending" — o dado de vida de verdade é rolado dentro do Foundry na hora de
// sincronizar (ver buildCharacter.js/advancement.js no módulo), e o resultado volta
// pra cá depois (mesmo `value` vira o número resolvido). "Média" resolve na hora,
// sem dado nenhum — o Foundry já sabe calcular a média sozinho. "Rolar aqui" (novo)
// rola o dado NO NAVEGADOR (`Math.random()`) e já grava o número resolvido direto —
// mesmo formato que um valor "já resolvido" (rolado antes, ou lido de volta do
// Foundry), então flui pro Foundry sem precisar de nenhuma mudança no módulo (ver
// `resolveHpLevelValue` em advancement.js: número já pronto passa direto).
function rollHitDie(hitDie) {
  const faces = Number(String(hitDie ?? "d6").replace(/\D/g, "")) || 6;
  return Math.floor(Math.random() * faces) + 1;
}

export function HpRollPicker({ level, hitDie, value, onChange }) {
  const isAvg = value === "avg";
  const isFoundryRollPath = value === "pending";
  const isResolvedNumber = typeof value === "number";

  return (
    <div className="hp-roll-row">
      <span>PV nível {level}:</span>
      <div className="rules-mode-toggle">
        <button type="button" className={isAvg ? "active" : ""} onClick={() => onChange("avg")}>
          Média
        </button>
        <button type="button" className={isResolvedNumber ? "active" : ""} onClick={() => onChange(rollHitDie(hitDie))}>
          Rolar aqui
        </button>
        <button type="button" className={isFoundryRollPath ? "active" : ""} onClick={() => onChange("pending")}>
          Rolar no Foundry
        </button>
      </div>
      {isResolvedNumber && <span className="hp-roll-status">rolado: {value}</span>}
      {isFoundryRollPath && <span className="hp-roll-status">aguardando o Foundry sincronizar</span>}
    </div>
  );
}
