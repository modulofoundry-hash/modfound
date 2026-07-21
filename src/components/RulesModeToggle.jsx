import { RULES_MODES } from "../schema/character";

// Botões em vez de <select> — só 2 opções (2014/2024), então dá pra ver e trocar num clique só,
// sem abrir dropdown. Clicar no modo já ativo desmarca (volta pra "", mesmo estado neutro que o
// <select> tinha com a option vazia) — precisa continuar dando pra ficar sem escolher, já que
// personagem/NPC sem rulesMode mostra raça/classe sem filtrar por edição (ver CharacterForm.jsx).
export function RulesModeToggle({ value, onChange }) {
  return (
    <div className="rules-mode-toggle">
      {RULES_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={value === mode.id ? "active" : ""}
          onClick={() => onChange(value === mode.id ? "" : mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
