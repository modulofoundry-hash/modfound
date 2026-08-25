import { ListEditor } from "../ListEditor";
import { SpellBrowser } from "../SpellBrowser";
import { SpellChoicePicker } from "../SpellChoicePicker";
import { spellProgressionForCharacter, isCantripName } from "../../schema/spellProgression";
import { computeGrantedSpells, computeSubclassSpellChoices, computeFeatSpellChoices } from "../../schema/grantedSpells";
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

  // Mesma ideia acima, mas pra talento com pool de escolha (Magic Initiate,
  // Fey Touched, Ritual Caster...) -- ver comentário em
  // schema/grantedSpells.js (computeFeatSpellChoices) pro porquê disso não dar
  // pra resolver dentro de FeatsInput.jsx sozinho.
  const featSpellChoices = computeFeatSpellChoices(character, featsData);

  // Magia escolhida num pool de subclasse/talento (`SpellChoicePicker` acima)
  // é um bônus À PARTE do teto normal da classe -- Magic Initiate "você
  // sempre tem essa magia preparada" não consome vaga de preparo do Clérigo/
  // Patrulheiro/etc, mesmo espírito de Additional Magical Secrets do Bardo.
  // `item.bonus` (gravado por `handleAddMany` só quando vem de um desses
  // pickers, ver abaixo) marca isso -- excluir por NOME batendo no pool inteiro
  // não dava: o pool do Magic Initiate inclui a lista de magia de Clérigo
  // completa (é "qualquer cantrip/magia de Clérigo/Druida/Mago"), então
  // qualquer magia normal do Clérigo que também aparecesse no pool sumia do
  // total por engano (achado ao vivo: "Cure Wounds"/"Bless" da Mira, que ela
  // JÁ tinha como magia normal de Clérigo, evaporavam do contador só por
  // coincidirem com o pool do talento). Sem isso, o contador
  // "Truques"/"Preparadas" somava o bônus junto com a lista normal da classe
  // e comparava com o teto da classe sozinho -- um Patrulheiro com Magic
  // Initiate mostrava "Truques: 2/0" (sem sentido, Patrulheiro não tem
  // truque nenhum próprio) e um Clérigo "Truques: 6/4" em vez de "4/4 + 2 de
  // talento". Achado ao vivo no playtest.
  const classSpells = spells.filter((s) => !s.bonus);
  const cantripCount = classSpells.filter((s) => isCantripName(s.name, spellsData)).length;
  const knownCount = classSpells.length - cantripCount;
  const preparedCount = classSpells.filter((s) => s.prepared).length;

  function handleAddMany(names, bonus) {
    const existing = new Set(spells.map((s) => s.name));
    const additions = names
      .filter((name) => !existing.has(name))
      .map((name) => ({ name, prepared: false, ...(bonus ? { bonus: true } : {}) }));
    if (additions.length) onChangeSpells([...spells, ...additions]);
  }
  const bonusEligibility = new Map();
  for (const entry of expandedPool) {
    if (!entry.unlocked) continue;
    if (!bonusEligibility.has(entry.className)) bonusEligibility.set(entry.className, new Set());
    bonusEligibility.get(entry.className).add(entry.name);
  }

  // Nomes de magia que o personagem pode escolher de verdade -- união da lista
  // normal de cada classe (`character.classes[].name` batendo em `spell.classes`)
  // com tudo que `bonusEligibility` já libera fora da lista (Warlock Patron, Divine
  // Soul, Eldritch Knight/Arcane Trickster, Bardo Magical Secrets). Trava o
  // SpellBrowser pra nunca mostrar/deixar adicionar magia de fora -- antes disso, o
  // filtro de classe era só uma conveniência opcional, sem bloquear nada de verdade
  // (achado revisando o fluxo completo a pedido do usuário).
  const characterClassNames = (character.classes ?? []).map((c) => c.name).filter(Boolean);
  const allowedSpellNames = new Set();
  for (const spell of spellsData) {
    if (spell.rules !== character.rulesMode) continue;
    if (spell.classes.some((c) => characterClassNames.includes(c))) allowedSpellNames.add(spell.name);
  }
  for (const names of bonusEligibility.values()) for (const name of names) allowedSpellNames.add(name);
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
      // Mesma exclusão de `classSpells` acima -- uma magia sempre-preparada
      // de talento/subclasse marcada "Preparada" na lista (redundante, mas o
      // jogador pode clicar) não deve contar pro teto da classe.
      const nextPrepared = nextItems.filter((s) => s.prepared && !s.bonus).length;
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
          onAdd={(names) => handleAddMany(names, true)}
        />
      ))}
      {featSpellChoices.map((choice) => (
        <SpellChoicePicker
          key={choice.key}
          title={`Magia (${choice.source})`}
          count={choice.count}
          pool={choice.pool}
          onAdd={(names) => handleAddMany(names, true)}
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
        allowAdd={false}
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
              allowedNames={allowedSpellNames}
            />
          </div>
        </div>
      )}
    </div>
  );
}
