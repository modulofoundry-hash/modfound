import { ABILITIES, ABILITY_LABELS } from "../schema/character";

export function SavingThrowsInput({ proficiencies, onChange }) {
  function toggle(id) {
    const has = proficiencies.includes(id);
    onChange(has ? proficiencies.filter((s) => s !== id) : [...proficiencies, id]);
  }

  return (
    <div className="saving-throws-grid">
      {ABILITIES.map((id) => (
        <label key={id}>
          <input type="checkbox" checked={proficiencies.includes(id)} onChange={() => toggle(id)} />
          {ABILITY_LABELS[id]}
        </label>
      ))}
    </div>
  );
}
