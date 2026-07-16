import { ABILITY_LABELS, SKILLS } from "../schema/character";

export function SkillsInput({ proficiencies, expertise, onChange }) {
  function toggleProficiency(id) {
    const has = proficiencies.includes(id);
    onChange({
      proficiencies: has ? proficiencies.filter((s) => s !== id) : [...proficiencies, id],
      expertise: has ? expertise.filter((s) => s !== id) : expertise,
    });
  }

  function toggleExpertise(id) {
    if (!proficiencies.includes(id)) return;
    const has = expertise.includes(id);
    onChange({
      proficiencies,
      expertise: has ? expertise.filter((s) => s !== id) : [...expertise, id],
    });
  }

  return (
    <div className="skills-grid">
      {SKILLS.map((skill) => (
        <div className="skills-row" key={skill.id}>
          <label>
            <input
              type="checkbox"
              checked={proficiencies.includes(skill.id)}
              onChange={() => toggleProficiency(skill.id)}
            />
            {skill.label} <span className="skill-ability">({ABILITY_LABELS[skill.ability]})</span>
          </label>
          <label className="skill-expertise">
            <input
              type="checkbox"
              checked={expertise.includes(skill.id)}
              disabled={!proficiencies.includes(skill.id)}
              onChange={() => toggleExpertise(skill.id)}
            />
            Expertise
          </label>
        </div>
      ))}
    </div>
  );
}
