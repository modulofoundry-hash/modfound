// Checklist da lista INTEIRA de magias que uma classe "sabe a lista toda"
// (Clérigo/Druida/Paladino/Patrulheiro 2014/Artífice, ver schema/
// spellProgression.js `isFullListCaster`) já tem acesso -- diferente do
// SpellBrowser (busca + adiciona uma de cada vez), aqui a lista inteira já
// aparece de uma vez, cada entrada com uma checkbox simples de "preparada".
// Usado no wizard (StepMagias.jsx) e na ficha editável (FoundrySheetView.jsx).
export function PreparedSpellChecklist({ pool, activeNames, atCap, onToggle }) {
  if (!pool.length) return null;

  const byLevel = new Map();
  for (const spell of pool) {
    if (!byLevel.has(spell.level)) byLevel.set(spell.level, []);
    byLevel.get(spell.level).push(spell);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="prepared-spell-checklist">
      {levels.map((level) => (
        <div className="prepared-spell-checklist-level" key={level}>
          <h5>Nível {level}</h5>
          <ul>
            {byLevel
              .get(level)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((spell) => {
                const checked = activeNames.has(spell.name);
                return (
                  <li key={spell.name}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && atCap}
                        onChange={(event) => onToggle(spell.name, event.target.checked)}
                      />
                      {spell.name}
                    </label>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
