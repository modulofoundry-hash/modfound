import { ABILITIES, ABILITY_LABELS } from "../schema/character";

export function AbilitiesInput({ abilities, onChange }) {
  function update(key, value) {
    onChange({ ...abilities, [key]: Number(value) });
  }

  return (
    <div className="abilities-grid">
      {ABILITIES.map((key) => (
        <label key={key} className="ability-field">
          {ABILITY_LABELS[key]}
          <input
            type="number"
            min="1"
            max="30"
            value={abilities[key]}
            onChange={(event) => update(key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
