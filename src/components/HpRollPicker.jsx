// Escolha de "Média" ou "Rolar" pro PV de UM nível específico de uma entrada
// de classe — aparece quando o personagem sobe de nível (ou já é criado acima
// do nível 1). "Rolar" não decide o número aqui: só marca "pending" — o dado
// de vida de verdade é rolado dentro do Foundry na hora de sincronizar (ver
// buildCharacter.js/advancement.js no módulo), e o resultado volta pra cá
// depois (mesmo `value` vira o número resolvido). "Média" resolve na hora,
// sem dado nenhum — o Foundry já sabe calcular a média sozinho.
export function HpRollPicker({ level, value, onChange }) {
  const isAvg = value === "avg";
  const isRollPath = value === "pending" || typeof value === "number";

  return (
    <div className="hp-roll-row">
      <span>PV nível {level}:</span>
      <div className="rules-mode-toggle">
        <button type="button" className={isAvg ? "active" : ""} onClick={() => onChange("avg")}>
          Média
        </button>
        <button type="button" className={isRollPath ? "active" : ""} onClick={() => onChange("pending")}>
          Rolar
        </button>
      </div>
      {typeof value === "number" && <span className="hp-roll-status">rolado: {value}</span>}
      {value === "pending" && <span className="hp-roll-status">aguardando o Foundry sincronizar</span>}
    </div>
  );
}
