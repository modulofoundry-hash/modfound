import { ListEditor } from "../ListEditor";
import { SpellBrowser } from "../SpellBrowser";
import { SpellChoicePicker } from "../SpellChoicePicker";
import { spellProgressionForCharacter, isCantripName } from "../../schema/spellProgression";
import { computeGrantedSpells, computeSubclassSpellChoices } from "../../schema/grantedSpells";
import { computeExpandedSpellPool } from "../../schema/expandedSpellPool";
import spellsData from "../../data/content/spells.json";
import featsData from "../../data/content/feats.json";
import optionalFeaturesData from "../../data/content/optionalfeatures.json";

// Extraído de CharacterCreationWizard.jsx (etapa "Magias") pra ser
// reaproveitado pelo wizard de Level-Up também -- mesma lógica de contagem
// (spellProgression.js), sem duplicar. `browserOpen`/`onToggleBrowser` ficam
// no componente pai (mesmo padrão de `spellBrowserOpen` já usado na criação),
// já que os dois wizards têm outras modais próprias e cada um decide se
// desmonta o estado ao trocar de etapa. `raceMatch` só existe de verdade na
// criação (level-up não troca raça) -- opcional de propósito.
export function StepMagias({ character, raceMatch, classMatches, spells, onChangeSpells, browserOpen, onToggleBrowser }) {
  const spellCaps = spellProgressionForCharacter(character, classMatches);
  const cantripCount = spells.filter((s) => isCantripName(s.name, spellsData)).length;
  const knownCount = spells.length - cantripCount;
  const preparedCount = spells.filter((s) => s.prepared).length;
  // Só aviso informativo (ver schema/grantedSpells.js) -- não conta nada
  // aqui, nem entra na lista `spells` acima: o Foundry concede essas magias
  // sozinho pela própria raça/subclasse/feat/escolha ao sincronizar.
  const granted = computeGrantedSpells({ character, raceMatch, classMatches, featsData, optionalFeaturesData });

  // Magias que uma classe/subclasse EXPANDE pra fora da lista normal (Warlock Patron,
  // Divine Soul, Eldritch Knight/Arcane Trickster, Bardo "Magical Secrets" 2024 -- ver
  // schema/expandedSpellPool.js, Lote 8). Diferente de `granted` acima: aqui a magia NÃO
  // é concedida sozinha, só passa a poder ser ESCOLHIDA (mesmo mecanismo de sempre,
  // `handleAdd`/`character.spells`) -- por isso alimenta o `SpellBrowser` também, não só
  // o aviso em texto.
  const expandedPool = computeExpandedSpellPool({ character, classMatches, spellsData });

  // Magia de escolha FIXA que a subclasse concede num nível específico (ex:
  // Black Magic do Pugilist/Hand of Dread "2 truques + 1 magia de nível 1 à
  // escolha", Additional Magical Secrets do Bardo/College of Lore) -- pool já
  // vem pronto do banco (`subclassData.spellChoices`), só falta a UI de
  // escolher dentro dele. Migrado de ClassesInput.jsx (existia só na etapa
  // Classe da criação, nunca no Level-Up). Função compartilhada
  // (`computeSubclassSpellChoices`) porque o `conditional` das etapas
  // "Magias" dos dois wizards TAMBÉM precisa dela -- ver comentário lá.
  const subclassSpellChoices = computeSubclassSpellChoices(character, classMatches);

  function handleAddMany(names) {
    const existing = new Set(spells.map((s) => s.name));
    const additions = names.filter((name) => !existing.has(name)).map((name) => ({ name, prepared: false }));
    if (additions.length) onChangeSpells([...spells, ...additions]);
  }
  const bonusEligibility = new Map();
  for (const entry of expandedPool) {
    if (!entry.unlocked) continue;
    if (!bonusEligibility.has(entry.className)) bonusEligibility.set(entry.className, new Set());
    bonusEligibility.get(entry.className).add(entry.name);
  }
  const expandedBySource = new Map();
  for (const entry of expandedPool) {
    if (!expandedBySource.has(entry.source)) expandedBySource.set(entry.source, []);
    expandedBySource.get(entry.source).push(entry);
  }

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
      {granted.length > 0 && (
        <p className="field-hint">
          Concedidas automaticamente (o Foundry adiciona sozinho, não precisa buscar aqui):{" "}
          {granted
            .map((g) => `${g.name}${g.unlocked ? "" : ` (nível ${g.level})`} — ${g.source}`)
            .join("; ")}
        </p>
      )}
      {[...expandedBySource.entries()].map(([source, entries]) => {
        // Listas nomeadas (Warlock Patron etc.) têm poucas entradas -- mostra tudo. Listas
        // por FILTRO (Eldritch Knight/Arcane Trickster/Bardo "Magical Secrets") podem
        // passar de 100 magias -- cortar em 12 e apontar pro buscador em vez de virar uma
        // parede de texto ilegível.
        const shown = entries.slice(0, 12);
        const rest = entries.length - shown.length;
        return (
          <p className="field-hint" key={source}>
            {source} expande sua lista de magias com:{" "}
            {shown.map((e) => `${e.name}${e.unlocked ? "" : ` (nível ${e.level})`}`).join("; ")}
            {rest > 0 && ` — e mais ${rest}, veja em "Buscar magia" filtrando por classe`}
          </p>
        );
      })}
      {subclassSpellChoices.map((choice) => (
        <SpellChoicePicker
          key={choice.key}
          title={`Magia (${choice.source})`}
          count={choice.count}
          pool={choice.pool}
          onAdd={handleAddMany}
        />
      ))}
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
              bonusEligibility={bonusEligibility}
            />
          </div>
        </div>
      )}
    </div>
  );
}
