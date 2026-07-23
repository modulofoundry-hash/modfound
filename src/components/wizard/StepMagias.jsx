import { ListEditor } from "../ListEditor";
import { SpellBrowser } from "../SpellBrowser";
import { spellProgressionForCharacter, isCantripName } from "../../schema/spellProgression";
import spellsData from "../../data/content/spells.json";

// Extraído de CharacterCreationWizard.jsx (etapa "Magias") pra ser
// reaproveitado pelo wizard de Level-Up também -- mesma lógica de contagem
// (spellProgression.js), sem duplicar. `browserOpen`/`onToggleBrowser` ficam
// no componente pai (mesmo padrão de `spellBrowserOpen` já usado na criação),
// já que os dois wizards têm outras modais próprias e cada um decide se
// desmonta o estado ao trocar de etapa.
export function StepMagias({ character, classMatches, spells, onChangeSpells, browserOpen, onToggleBrowser }) {
  const spellCaps = spellProgressionForCharacter(character, classMatches);
  const cantripCount = spells.filter((s) => isCantripName(s.name, spellsData)).length;
  const knownCount = spells.length - cantripCount;
  const preparedCount = spells.filter((s) => s.prepared).length;

  // Só bloqueia quando a mudança AUMENTA o total de preparadas acima do teto
  // (marcar mais uma) -- remover magia ou desmarcar preparada nunca é
  // barrado, mesmo que o personagem já estivesse acima do teto antes.
  function handleChange(nextItems) {
    if (spellCaps.maxPrepared !== null) {
      const nextPrepared = nextItems.filter((s) => s.prepared).length;
      if (nextPrepared > spellCaps.maxPrepared && nextPrepared > preparedCount) return;
    }
    onChangeSpells(nextItems);
  }

  function handleAdd(name) {
    if (spells.some((s) => s.name === name)) return;
    onChangeSpells([...spells, { name, prepared: false }]);
  }

  return (
    <div className="wizard-step-magias">
      <p className="field-hint">
        Truques: {cantripCount}/{spellCaps.cantripsKnown}
        {spellCaps.spellsKnown !== null && ` · Magias conhecidas: ${knownCount}/${spellCaps.spellsKnown}`}
        {spellCaps.maxPrepared !== null && ` · Preparadas: ${preparedCount}/${spellCaps.maxPrepared}`}
      </p>
      <ListEditor
        items={spells}
        onChange={handleChange}
        addLabel="Adicionar magia"
        fields={[
          { key: "name", label: "Magia" },
          { key: "prepared", label: "Preparada", type: "checkbox", default: false },
        ]}
      />
      <button type="button" onClick={() => onToggleBrowser(true)}>
        Buscar magia
      </button>
      {browserOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onToggleBrowser(false);
          }}
        >
          <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Magias</h3>
              <button type="button" onClick={() => onToggleBrowser(false)}>
                Fechar
              </button>
            </div>
            <SpellBrowser
              spells={spellsData}
              rulesMode={character.rulesMode}
              onAdd={handleAdd}
              canAdd={(spell) =>
                spell.level === 0
                  ? cantripCount < spellCaps.cantripsKnown
                  : spellCaps.spellsKnown === null || knownCount < spellCaps.spellsKnown
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
