import { useState } from "react";
import { ListEditor } from "../ListEditor";
import { SpellBrowser } from "../SpellBrowser";
import { SpellChoicePicker } from "../SpellChoicePicker";
import { PreparedSpellChecklist } from "../PreparedSpellChecklist";
import { spellProgressionForCharacter, isCantripName, fullListSpellPool } from "../../schema/spellProgression";
import { computeGrantedSpells, computeSubclassSpellChoices, computeFeatSpellChoices, computeOptionalFeatureSpellChoices } from "../../schema/grantedSpells";
import { InfoTooltip } from "../InfoTooltip";
import { computeExpandedSpellPool, computeAllowedSpellNames } from "../../schema/expandedSpellPool";
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
  // Sessão do buscador COMPARTILHADO restrita a um pool específico (escolha de subclasse/
  // talento, ver SpellChoicePicker.jsx) -- estado LOCAL desta etapa (não sobe pro wizard
  // pai) porque é um detalhe de implementação só daqui; `browserOpen`/`onToggleBrowser`
  // (prop do pai) continuam controlando só o modo "principal" (lista inteira da classe).
  const [scopedPicker, setScopedPicker] = useState(null);
  // Só aviso informativo (ver schema/grantedSpells.js) -- não conta nada
  // aqui, nem entra na lista `spells` acima: o Foundry concede essas magias
  // sozinho pela própria raça/subclasse/feat/escolha ao sincronizar.
  const granted = computeGrantedSpells({ character, raceMatch, classMatches, featsData, optionalFeaturesData });
  // Agrupado por `source` só pra exibição -- `note` (ver schema/grantedSpells.js) é
  // igual em toda entrada da mesma fonte, então o ícone "ⓘ" aparece uma vez por grupo,
  // não repetido por magia (ex: Rimekin concede 3 magias, mas só 1 ícone de Cold Fire
  // Magic ao lado do nome da raça).
  const grantedBySource = new Map();
  for (const entry of granted) {
    if (!grantedBySource.has(entry.source)) grantedBySource.set(entry.source, { entries: [], note: entry.note ?? null });
    grantedBySource.get(entry.source).entries.push(entry);
  }

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

  // Mesma ideia acima, mas pra Escolha de Classe com pool próprio (Book of
  // Ancient Secrets, Pact of the Tome) -- ver comentário em
  // computeOptionalFeatureSpellChoices (schema/grantedSpells.js).
  const classChoiceSpellChoices = computeOptionalFeatureSpellChoices(character, optionalFeaturesData);

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
  // Truque nunca conta preparo (a tabela `maxPrepared` do livro é só pra magia de 1º nível
  // ou mais) -- antes disso não importava porque nenhuma magia era adicionada já preparada,
  // mas agora que `handleAdd` marca `prepared:true` direto (ver abaixo), sem esse filtro um
  // truque contaria contra o teto de preparo por engano.
  const preparedCount = classSpells.filter((s) => s.prepared && !isCantripName(s.name, spellsData)).length;

  // Único caso com DUAS etapas de verdade (aprender no grimório, depois escolher o que
  // preparar) -- ver `spellProgression.js`. Toda outra classe (sabe a lista toda OU
  // conhece fixo) usa a mesma etapa única: adicionar já marca ativa, sem checkbox
  // "Preparada" (não existe essa distinção na regra real pra elas). Simplificação aceita
  // em multiclasse Mago+outra classe: TODAS as magias passam pelo fluxo de duas etapas
  // nesse caso (mais manual do que o estritamente necessário pra parte não-Mago, mas nunca
  // errado -- mesmo espírito de outras simplificações já aceitas neste arquivo).
  const isTwoStep = spellCaps.hasWizard;
  // Teto único de "magia ativa" pra quem usa a etapa única -- some `spellsKnown` (conhece
  // fixo) com `maxPrepared` (sabe a lista toda) porque, nesse fluxo, as duas coisas viram o
  // mesmo conceito (adicionou = ativa); cobre multiclasse misturando as duas categorias
  // (ex: Bardo + Clérigo) sem precisar rastrear de qual classe cada magia veio.
  const combinedActiveCap = (spellCaps.spellsKnown ?? 0) + (spellCaps.maxPrepared ?? 0);

  // Classes "sabe a lista toda" (Clérigo/Druida/Paladino/Patrulheiro 2014/Artífice) não
  // "adicionam" magia nenhuma -- já têm acesso à lista inteira (até o círculo que já
  // conjuram), só marcam quais preparar (ver spellProgression.js `fullListSpellPool`).
  // `checklistSpells`/`otherSpells` separam essas entradas do resto do array `spells`
  // (que continua guardando truques + magia de classe "conhece fixo" + grimório do Mago,
  // intocados por essa mudança).
  const fullPool = fullListSpellPool(character, classMatches, spellsData, spellCaps);
  const fullPoolNames = new Set(fullPool.map((s) => s.name));
  const checklistSpells = spells.filter((s) => fullPoolNames.has(s.name));
  const otherSpells = spells.filter((s) => !fullPoolNames.has(s.name));

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

  // Nomes de magia que o personagem pode BUSCAR e adicionar (truque de qualquer classe,
  // grimório do Mago, magia de classe "conhece fixo") -- união da lista normal de cada
  // classe com tudo que `bonusEligibility` já libera fora da lista (Warlock Patron, Divine
  // Soul, Eldritch Knight/Arcane Trickster, Bardo Magical Secrets). As magias de nível 1+ de
  // classe "sabe a lista toda" saem daqui de propósito -- já aparecem direto no checklist
  // abaixo, sem precisar buscar (`fullPoolNames`, calculado acima).
  const allowedSpellNames = computeAllowedSpellNames({ character, classMatches, spellsData });
  for (const name of fullPoolNames) allowedSpellNames.delete(name);
  const expandedBySource = new Map();
  for (const entry of expandedPool) {
    if (!expandedBySource.has(entry.source)) expandedBySource.set(entry.source, []);
    expandedBySource.get(entry.source).push(entry);
  }

  // Só bloqueia quando a mudança AUMENTA o total de preparadas acima do teto
  // (marcar mais uma) -- remover magia ou desmarcar preparada nunca é
  // barrado, mesmo que o personagem já estivesse acima do teto antes.
  // Opera só sobre `otherSpells` (o que o ListEditor mostra) e devolve o array
  // completo pro pai, recolando `checklistSpells` por cima -- o checklist
  // "sabe a lista toda" é controlado à parte, por `handleToggleFullList`.
  function handleChange(nextOtherItems) {
    const nextItems = [...nextOtherItems, ...checklistSpells];
    if (spellCaps.maxPrepared !== null) {
      // Mesma exclusão de `classSpells`/truque acima -- uma magia sempre-preparada
      // de talento/subclasse marcada "Preparada" na lista (redundante, mas o
      // jogador pode clicar) não deve contar pro teto da classe, nem truque.
      const nextPrepared = nextItems.filter((s) => s.prepared && !s.bonus && !isCantripName(s.name, spellsData)).length;
      if (nextPrepared > spellCaps.maxPrepared && nextPrepared > preparedCount) return;
    }
    onChangeSpells(nextItems);
  }

  // Fora do Mago (`isTwoStep`), adicionar já marca ativa direto -- não existe uma etapa
  // separada de "escolher pra lista" seguida de "marcar preparada" na regra real pra quem
  // conhece fixo, só o Mago tem essas duas etapas de verdade (grimório, depois o que
  // preparar). Cantrip nunca é "preparado" em nenhuma edição/classe -- sempre `false` (o
  // checkbox nem aparece pra elas, ver ListEditor abaixo, mas o valor guardado continua
  // consistente). Só usado pelo buscador (`allowedSpellNames` já exclui as magias "sabe a
  // lista toda", que passam por `handleToggleFullList` em vez desta função).
  function handleAdd(name) {
    if (spells.some((s) => s.name === name)) return;
    const active = !isTwoStep && !isCantripName(name, spellsData);
    onChangeSpells([...spells, { name, prepared: active }]);
  }

  // Marca/desmarca uma magia do checklist "sabe a lista toda" -- sempre vira
  // `prepared:true` direto ao marcar (nunca existe grimório pra essas classes),
  // mesmo teto combinado (`combinedActiveCap`) que o resto do fluxo de etapa
  // única já usa pro buscador.
  function handleToggleFullList(name, checked) {
    if (checked) {
      if (spells.some((s) => s.name === name) || knownCount >= combinedActiveCap) return;
      onChangeSpells([...spells, { name, prepared: true }]);
    } else {
      onChangeSpells(spells.filter((s) => s.name !== name));
    }
  }

  return (
    <div className="wizard-step-magias">
      {granted.length > 0 && (
        <p className="field-hint">
          Concedidas automaticamente (o Foundry adiciona sozinho, não precisa buscar aqui):{" "}
          {[...grantedBySource.entries()].map(([source, { entries, note }], index) => (
            <span key={source}>
              {index > 0 && "; "}
              {entries.map((g) => `${g.name}${g.unlocked ? "" : ` (nível ${g.level})`}`).join("; ")} — {source}
              {note && <InfoTooltip text={note} />}
            </span>
          ))}
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
          pickerKey={choice.key}
          title={`Magia (${choice.source})`}
          count={choice.count}
          pool={choice.pool}
          spells={spells}
          onAdd={(names) => handleAddMany(names, true)}
          onOpenBrowser={setScopedPicker}
        />
      ))}
      {featSpellChoices.map((choice) => (
        <SpellChoicePicker
          key={choice.key}
          pickerKey={choice.key}
          title={`Magia (${choice.source})`}
          count={choice.count}
          pool={choice.pool}
          spells={spells}
          onAdd={(names) => handleAddMany(names, true)}
          onOpenBrowser={setScopedPicker}
        />
      ))}
      {classChoiceSpellChoices.map((choice) => (
        <SpellChoicePicker
          key={choice.key}
          pickerKey={choice.key}
          title={`Magia (${choice.source})`}
          count={choice.count}
          pool={choice.pool}
          spells={spells}
          onAdd={(names) => handleAddMany(names, true)}
          onOpenBrowser={setScopedPicker}
        />
      ))}
      <p className="field-hint">
        Truques: {cantripCount}/{spellCaps.cantripsKnown}
        {isTwoStep
          ? <>
              {` · Magias no grimório: ${knownCount}/${spellCaps.spellbookSize}`}
              {` · Preparadas: ${preparedCount}/${spellCaps.maxPrepared}`}
            </>
          : ` · Magias: ${knownCount}/${combinedActiveCap}`}
      </p>
      {fullPool.length > 0 && (
        <PreparedSpellChecklist
          pool={fullPool}
          activeNames={new Set(checklistSpells.map((s) => s.name))}
          atCap={knownCount >= combinedActiveCap}
          onToggle={handleToggleFullList}
        />
      )}
      <ListEditor
        items={otherSpells}
        onChange={handleChange}
        addLabel="Adicionar magia"
        allowAdd={false}
        fields={
          isTwoStep
            ? [
                { key: "name", label: "Magia" },
                { key: "prepared", label: "Preparada", type: "checkbox", default: false },
              ]
            : [{ key: "name", label: "Magia" }]
        }
      />
      <button type="button" onClick={() => onToggleBrowser(true)}>
        Buscar magia
      </button>
      {(() => {
        // Um ÚNICO modal, driblado por QUAL busca está ativa -- "principal" (lista
        // inteira das classes, `browserOpen` controlado pelo wizard pai) ou "restrita"
        // (`scopedPicker`, aberta por um card de escolha de subclasse/talento acima).
        // Nunca os dois ao mesmo tempo (abrir um fecha o outro, ver os `onClick` dos
        // botões "Buscar magia" -- o principal não mexe em `scopedPicker`, mas os cards
        // de escolha só abrem quando `!browserOpen` de qualquer forma, já que o próprio
        // card e o botão principal não competem na mesma tela).
        if (!scopedPicker && !browserOpen) return null;
        const scoped = scopedPicker;
        const chosenForScoped = scoped ? spells.filter((s) => s.bonus && scoped.pool.includes(s.name)).length : 0;

        function close() {
          setScopedPicker(null);
          onToggleBrowser(false);
        }

        return (
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h3>{scoped ? `Magias — ${scoped.title}` : "Magias"}</h3>
                <button type="button" onClick={close}>
                  Fechar
                </button>
              </div>
              <SpellBrowser
                spells={spellsData}
                rulesMode={character.rulesMode}
                onAdd={scoped ? (name) => scoped.onAdd([name]) : handleAdd}
                canAdd={
                  scoped
                    ? () => chosenForScoped < scoped.count
                    : (spell) =>
                        spell.level > spellCaps.maxSpellLevel
                          ? false
                          : spell.level === 0
                            ? cantripCount < spellCaps.cantripsKnown
                            : knownCount < (isTwoStep ? spellCaps.spellbookSize : combinedActiveCap)
                }
                bonusEligibility={scoped ? undefined : bonusEligibility}
                allowedNames={scoped ? new Set(scoped.pool) : allowedSpellNames}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
