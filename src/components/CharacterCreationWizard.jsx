import { useEffect, useMemo, useState } from "react";
import { createEmptyCharacter, deriveDarkvisionFeet } from "../schema/character";
import { RulesModeToggle } from "./RulesModeToggle";
import { StepRaca } from "./wizard/StepRaca";
import { StepAntecedente } from "./wizard/StepAntecedente";
import { ClassesInput } from "./ClassesInput";
import { StepAtributos } from "./wizard/StepAtributos";
import { StepMelhorias, CHIP_DEFS } from "./wizard/StepMelhorias";
import { StepPericias } from "./wizard/StepPericias";
import { StepIdiomas } from "./wizard/StepIdiomas";
import { StepEquipamento } from "./wizard/StepEquipamento";
import { StepIdentidade } from "./wizard/StepIdentidade";
import { FoundrySheetView } from "./FoundrySheetView";
import { FeatsInput } from "./FeatsInput";
import { ListEditor } from "./ListEditor";
import { SpellBrowser } from "./SpellBrowser";
import featsData from "../data/content/feats.json";
import spellsData from "../data/content/spells.json";
import { useCharacterAppliers } from "../hooks/useCharacterAppliers";
import { useCustomBackgrounds, useCustomClasses, useCustomRaces } from "../data/customContent";
import racesData from "../data/content/races.json";
import backgroundsData from "../data/content/backgrounds.json";
import classesData from "../data/content/classes.json";
import subclassesData from "../data/content/subclasses.json";

// Mesma lógica de tamanho de OriginPicker.jsx — array ["S","M"] (2024) ou
// string "M"/"S/M" (2014).
function sizeToLetters(size) {
  if (Array.isArray(size)) return size.filter(Boolean);
  if (typeof size === "string") return size.split("/").filter(Boolean);
  return [];
}

// Quantos talentos o personagem já tem no total, de QUALQUER fonte — raça de
// escolha livre (Human Variant/Custom Lineage) + antecedente 2024 (talento de
// origem, sempre 1, nome já resolvido) + slots de classe (Melhoria de
// Atributo) já trocados por talento (só conta quando o talento em si já foi
// escolhido — `choice === "feat"` sozinho, sem `feat` ainda, é um card no
// meio da escolha, não preenche a lista). Usado só pro contador "X/N" da
// etapa Feats, não pra decidir se ela aparece (ver openFeatChoiceSlots).
function totalFeatSlots(character, raceMatch, backgroundMatch) {
  const raceSlots = raceMatch?.originFeat?.count ?? 0;
  const backgroundSlots = backgroundMatch?.originFeat ? 1 : 0;
  const classSlots = character.abilityImprovements.filter((i) => i.choice === "feat" && i.feat).length;
  return raceSlots + backgroundSlots + classSlots;
}

// Quantos slots de talento ainda estão em ABERTO pra escolher via a busca da
// etapa Feats. No banco atual, só a RAÇA concede ESCOLHA livre de talento
// (Human Variant/Custom Lineage, `originFeat: {count}`) — antecedente 2024
// já vem com o NOME resolvido (não é escolha, é concessão fixa) e o talento
// trocado por ASI de classe é escolhido dentro do próprio card da etapa
// Melhorias (picker embutido lá, não usa a busca daqui). Por isso a etapa
// Feats (e a busca dentro dela) só existe pra essa escolha da raça — pedido
// explícito do usuário: "só aparece se algo conceder a ESCOLHA do talento",
// não simplesmente "algum item concedeu um talento".
function openFeatChoiceSlots(character, raceMatch, backgroundMatch) {
  const raceSlots = raceMatch?.originFeat?.count ?? 0;
  if (!raceSlots) return 0;
  const resolvedElsewhere = [
    backgroundMatch?.originFeat,
    ...character.abilityImprovements.filter((i) => i.choice === "feat" && i.feat).map((i) => i.feat),
  ].filter(Boolean);
  const chosenByRace = Math.max(0, character.feats.length - resolvedElsewhere.length);
  return Math.max(0, raceSlots - chosenByRace);
}

// Todo slot de Melhoria de Atributo disponível pro personagem: um por
// combinação classe+nível-de-ASI já alcançado (ASI é por nível de CADA
// classe, não nível total do personagem — multiclasse soma slots
// independentes). `classMatches[i].classData.asiLevels` vem do
// generate-site-content.mjs (extraído da feature "Ability Score Improvement").
function abilityImprovementSlots(character, classMatches) {
  const slots = [];
  character.classes.forEach((row, classIndex) => {
    const asiLevels = classMatches[classIndex]?.classData?.asiLevels ?? [];
    for (const level of asiLevels) {
      if (level <= (row.level ?? 1)) slots.push({ classIndex, level, className: row.name });
    }
  });
  return slots;
}

// Definição de cada etapa: `title`/`blurb` são o texto explicativo mostrado no
// topo da etapa (pedido do usuário: toda etapa avisa o que ela é).
// `conditional` (opcional) esconde a etapa quando a função retornar falso —
// hoje só "Magias" usa isso (só aparece se alguma classe escolhida é
// conjuradora).
const STEP_DEFS = [
  {
    key: "regras",
    label: "Regras",
    title: "Edição das regras",
    blurb:
      "Escolha se este personagem segue o Player's Handbook de 2014 (clássico) ou o de 2024 (revisado). " +
      "Isso decide se o bônus de atributo vem da Raça (2014) ou do Antecedente (2024), e filtra as opções de Classe.",
  },
  {
    key: "nivel",
    label: "Nível",
    title: "Nível do personagem",
    blurb:
      "Em que nível esse personagem começa? Não precisa ser nível 1 — dá pra criar já num nível mais alto. " +
      "Isso decide se a etapa de Classe já libera a escolha de subclasse (algumas classes só escolhem subclasse a partir de um nível maior que 1).",
  },
  {
    key: "raca",
    label: "Raça",
    title: "Raça / Espécie",
    blurb: "Escolha a raça (ou espécie, no termo do 2024) do personagem. Isso pode conceder perícias, ferramentas, idiomas, tamanho, sentidos e equipamento.",
  },
  {
    key: "antecedente",
    label: "Antecedente",
    title: "Antecedente",
    blurb: "O antecedente representa a vida do personagem antes de virar aventureiro. Concede perícias, ferramentas, idiomas e equipamento — e no 2024, também o bônus de atributo e um talento de origem.",
  },
  {
    key: "classes",
    label: "Classe",
    title: "Classe(s)",
    blurb: "Escolha a classe principal do personagem (e, se for multiclasse, as demais). A subclasse só aparece disponível se o nível já alcançou o mínimo dela.",
  },
  {
    key: "atributos",
    label: "Atributos",
    title: "Atributos",
    blurb: "Escolha como gerar os 6 atributos do personagem: Array Padrão, Compra por Pontos ou Rolagem — cada método tem um botão de informação explicando como funciona.",
  },
  {
    key: "melhorias",
    label: "Melhorias",
    title: "Melhoria de Atributo",
    blurb:
      "Em certos níveis, cada classe libera a escolha entre aumentar atributos (+2 em um, ou +1 em dois) ou pegar um talento. " +
      "Arraste o bônus pro atributo de destino, ou escolha um talento numa lista.",
    conditional: ({ character, classMatches }) => abilityImprovementSlots(character, classMatches).length > 0,
  },
  {
    key: "pericias",
    label: "Perícias",
    title: "Perícias, Ferramentas e Equipamento",
    blurb:
      "Escolha aqui tudo que Raça/Antecedente/Classe concederam — perícia, ferramenta e equipamento, discriminando de onde vem cada concessão e quantas dá pra escolher.",
  },
  {
    key: "idiomas",
    label: "Idiomas",
    title: "Idiomas",
    blurb:
      "Idiomas concedidos por Raça/Antecedente — fixos ou de escolha livre (discriminando quantos dá pra escolher) — " +
      "mais qualquer outro idioma que o personagem conheça.",
  },
  {
    key: "equipamento",
    label: "Equipamento",
    title: "Equipamento e Dinheiro",
    blurb:
      "Dinheiro (moedas) e qualquer item adicional do personagem. O equipamento de escolha concedido pela Raça/Antecedente/Classe já foi resolvido na etapa de Perícias — o que aparece aqui é só o resultado, mais espaço pra adicionar itens à mão.",
  },
  {
    key: "feats",
    label: "Feats",
    title: "Feats",
    blurb:
      "Só aparece quando a Raça concede uma escolha LIVRE de talento (ex: Human Variant). " +
      "Talento de origem do Antecedente e talento trocado por bônus de atributo na etapa Melhorias já vêm resolvidos sozinhos, sem precisar dessa busca.",
    conditional: ({ character, raceMatch, backgroundMatch }) => openFeatChoiceSlots(character, raceMatch, backgroundMatch) > 0,
  },
  {
    key: "magias",
    label: "Magias",
    title: "Magias",
    blurb: "Magias que o personagem conhece ou tem preparadas.",
    conditional: ({ classMatches }) =>
      classMatches.some((match) => match?.classData?.spellcasting && match.classData.spellcasting.progression !== "none"),
  },
  {
    key: "identidade",
    label: "Identidade",
    title: "Identidade e Aparência",
    blurb: "Nome, retrato, alinhamento, personalidade e aparência do personagem.",
  },
  {
    key: "confirmacao",
    label: "Confirmação",
    title: "Confirmação",
    blurb: "Revise tudo antes de salvar o personagem.",
  },
];

function StepPlaceholder({ stepKey }) {
  return <p className="wizard-placeholder">Etapa "{stepKey}" ainda em construção.</p>;
}

function StepRegras({ rulesMode, onChange }) {
  return (
    <div className="wizard-step-regras">
      <RulesModeToggle value={rulesMode} onChange={onChange} />
    </div>
  );
}

function StepNivel({ targetLevel, onChange }) {
  return (
    <label className="wizard-nivel-field">
      Nível inicial
      <input
        type="number"
        min="1"
        max="20"
        value={targetLevel}
        onChange={(event) => onChange(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
      />
    </label>
  );
}

// Linhas do resumo — usadas tanto no painel lateral fixo (visível em toda
// etapa) quanto numa versão maior na etapa final de Confirmação, sem
// duplicar a lógica.
function summaryRows(character, targetLevel) {
  const classSummary = (character.classes ?? [])
    .filter((c) => c.name)
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ""} ${c.level}`)
    .join(" / ");

  return [
    ["Regras", character.rulesMode ? (character.rulesMode === "2014" ? "2014" : "2024") : null],
    ["Nível", targetLevel || null],
    ["Raça", character.race || null],
    ["Antecedente", character.background || null],
    ["Classe", classSummary || null],
    [
      "Atributos",
      Object.values(character.abilities ?? {}).some((v) => v !== 10)
        ? Object.entries(character.abilities)
            .map(([k, v]) => `${k.toUpperCase()} ${v}`)
            .join(" ")
        : null,
    ],
    ["Perícias", character.skillProficiencies?.length ? character.skillProficiencies.join(", ") : null],
    ["Idiomas", character.languages?.length ? character.languages.join(", ") : null],
    ["Equipamento", character.equipment?.length ? `${character.equipment.length} item(ns)` : null],
    ["Feats", character.feats?.length ? character.feats.join(", ") : null],
    ["Magias", character.spells?.length ? `${character.spells.length} magia(s)` : null],
    ["Nome", character.name || null],
    ["Alinhamento", character.alignment || null],
  ];
}

// Resumo ao vivo mostrado na lateral em toda etapa (pedido do usuário: as
// escolhas já feitas devem ficar visíveis o tempo todo, não só na
// confirmação final).
function WizardSummary({ character, targetLevel }) {
  const rows = summaryRows(character, targetLevel);
  return (
    <aside className="wizard-summary">
      <h3>Resumo</h3>
      <dl className="wizard-summary-list">
        {rows.map(([label, value]) => (
          <div key={label} className={`wizard-summary-row${value ? "" : " wizard-summary-row-empty"}`}>
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

// Etapa de Confirmação — visual estilo ficha do Foundry (cabeçalho escuro,
// retrato, atributos em destaque), combinado com o usuário como fase seguinte
// do wizard.
function StepConfirmacao({ character, targetLevel }) {
  return <FoundrySheetView character={character} />;
}

export function CharacterCreationWizard({ initialValue, onSubmit, onCancel }) {
  const [character, setCharacter] = useState(() => initialValue ?? createEmptyCharacter());
  const [targetLevel, setTargetLevel] = useState(1);
  const [raceMatch, setRaceMatch] = useState(null);
  const [backgroundMatch, setBackgroundMatch] = useState(null);
  // Guardado aqui (no wizard, que nunca desmonta durante a navegação entre
  // etapas) em vez de dentro do `ClassesInput` — achado revisando o projeto:
  // `useState` local no `ClassesInput` resetava sozinho toda vez que o
  // wizard saía da etapa Classe e voltava (React desmonta o componente ao
  // trocar de etapa), corrompendo silenciosamente `classMatches` na próxima
  // escolha/remoção. `classMatches` (array) é só a forma derivada que o
  // resto do wizard já espera (StepPericias, abilityImprovementSlots).
  const [classesMatches, setClassesMatches] = useState({});
  const classMatches = Object.values(classesMatches);
  const [stepKey, setStepKey] = useState(STEP_DEFS[0].key);
  const [spellBrowserOpen, setSpellBrowserOpen] = useState(false);

  const customRaces = useCustomRaces();
  const customBackgrounds = useCustomBackgrounds();
  const customClasses = useCustomClasses();
  // Raça/Antecedente mostram as duas edições juntas (com tag) — só Classe é
  // filtrada de verdade pelo modo, mesma regra de CharacterForm.jsx.
  const allRaces = [...racesData, ...customRaces];
  const allBackgrounds = [...backgroundsData, ...customBackgrounds];
  // Classe é a única coisa filtrada de verdade por edição — inclui
  // customClasses também no filtro (achado real: entradas customizadas SEM
  // `rules` marcado apareciam nas duas edições ao mesmo tempo, mesmo sendo
  // sobra de teste duplicando classe oficial — ver memória do projeto).
  const allClasses = character.rulesMode
    ? [
        ...classesData.filter((c) => c.rules === character.rulesMode),
        ...customClasses.filter((c) => c.rules === character.rulesMode),
      ]
    : [...classesData, ...customClasses];

  const appliers = useCharacterAppliers(setCharacter);

  function pickRace(item) {
    set("race", item.name);
    setRaceMatch(item);
    set("raceRules", item?.rules ?? "");
    const options = sizeToLetters(item?.size);
    appliers.applySize(options.length === 1 ? options[0] : "");
    appliers.applySenses({ darkvision: deriveDarkvisionFeet(item?.traits) });
  }

  function pickBackground(item) {
    set("background", item.name);
    setBackgroundMatch(item);
    set("backgroundRules", item?.rules ?? "");
    // Talento de Origem (só existe em antecedente 2024) entra sozinho na
    // lista de feats — troca de antecedente no meio do caminho remove o
    // talento do antecedente ANTERIOR antes de adicionar o novo, pra não
    // deixar sobra de um antecedente que o jogador não escolheu mais.
    setCharacter((prev) => {
      const previousOriginFeat = backgroundMatch?.originFeat;
      let feats = prev.feats;
      if (previousOriginFeat) feats = feats.filter((f) => f !== previousOriginFeat);
      if (item.originFeat && !feats.includes(item.originFeat)) feats = [...feats, item.originFeat];
      return { ...prev, feats };
    });
  }

  function findImprovement(classIndex, level) {
    return character.abilityImprovements.find((i) => i.classIndex === classIndex && i.level === level);
  }

  // Desfaz o efeito já aplicado de um slot (bônus de atributo somado ou
  // talento adicionado) — chamado sempre ANTES de trocar a escolha daquele
  // slot, mesmo padrão já usado pro talento de origem do Antecedente (troca
  // sempre reverte o efeito anterior primeiro, pra não deixar sobra).
  function revertImprovement(improvement) {
    if (!improvement) return;
    if (improvement.feat) {
      setCharacter((prev) => ({ ...prev, feats: prev.feats.filter((f) => f !== improvement.feat) }));
    }
    const chips = CHIP_DEFS[improvement.choice] ?? [];
    const negated = {};
    for (const chip of chips) {
      const abilityKey = improvement.assignments?.[chip.id];
      if (abilityKey) negated[abilityKey] = (negated[abilityKey] ?? 0) - chip.amount;
    }
    if (Object.keys(negated).length) appliers.applyAbilityBonus(negated);
  }

  function replaceImprovement(classIndex, level, patch) {
    setCharacter((prev) => ({
      ...prev,
      abilityImprovements: [
        ...prev.abilityImprovements.filter((i) => !(i.classIndex === classIndex && i.level === level)),
        { classIndex, level, choice: null, assignments: {}, feat: null, featRules: null, ...patch },
      ],
    }));
  }

  function setImprovementChoice(classIndex, level, choice) {
    revertImprovement(findImprovement(classIndex, level));
    replaceImprovement(classIndex, level, { choice });
  }

  // Arrasta um chip de bônus (+2 ou +1) pra um atributo — troca de destino
  // reverte o chip da posição antiga antes de aplicar na nova (mesmo chip não
  // pode valer em dois atributos ao mesmo tempo).
  function moveImprovementChip(classIndex, level, chipId, chipAmount, abilityKey) {
    const improvement = findImprovement(classIndex, level) ?? { classIndex, level, choice: null, assignments: {}, feat: null };
    const oldAbilityKey = improvement.assignments[chipId];
    if (oldAbilityKey === abilityKey) return;
    // As duas metades do "+1 em dois atributos" não podem cair no mesmo atributo.
    if (Object.entries(improvement.assignments).some(([id, key]) => id !== chipId && key === abilityKey)) return;
    if ((character.abilities[abilityKey] ?? 10) + chipAmount > 20) return;
    const patch = { [abilityKey]: chipAmount };
    if (oldAbilityKey) patch[oldAbilityKey] = (patch[oldAbilityKey] ?? 0) - chipAmount;
    appliers.applyAbilityBonus(patch);
    replaceImprovement(classIndex, level, {
      choice: improvement.choice,
      feat: improvement.feat,
      assignments: { ...improvement.assignments, [chipId]: abilityKey },
    });
  }

  function unassignImprovementChip(classIndex, level, chipId, chipAmount) {
    const improvement = findImprovement(classIndex, level);
    const abilityKey = improvement?.assignments?.[chipId];
    if (!abilityKey) return;
    appliers.applyAbilityBonus({ [abilityKey]: -chipAmount });
    const assignments = { ...improvement.assignments };
    delete assignments[chipId];
    replaceImprovement(classIndex, level, { choice: improvement.choice, feat: improvement.feat, assignments });
  }

  function pickImprovementFeat(classIndex, level, item) {
    const improvement = findImprovement(classIndex, level) ?? { classIndex, level, choice: "feat", assignments: {}, feat: null };
    if (improvement.feat === item.name) return;
    setCharacter((prev) => {
      let feats = prev.feats;
      if (improvement.feat) feats = feats.filter((f) => f !== improvement.feat);
      if (!feats.includes(item.name)) feats = [...feats, item.name];
      return { ...prev, feats };
    });
    replaceImprovement(classIndex, level, {
      choice: "feat",
      assignments: improvement.assignments,
      feat: item.name,
      featRules: item.rules ?? "",
    });
  }

  // Slot de Melhoria de Atributo é identificado por `classIndex` (posição no
  // array `character.classes`, não um id estável — nenhuma lista deste
  // projeto usa id próprio, ver convenção geral). Remover uma classe ANTES
  // de outra na lista desloca o índice das que ficam depois — sem
  // reindexar aqui, uma escolha já feita numa classe de multiclasse podia
  // ficar presa num índice que passa a apontar pra OUTRA classe depois da
  // remoção (achado revisando o projeto a pedido do usuário). `onRemoveClass`
  // (ClassesInput.jsx) avisa qual índice sumiu antes do `onChange` normal:
  // reverte o efeito de qualquer slot QUE ERA daquela classe (não faz
  // sentido preservar escolha de uma classe que não existe mais) e desloca
  // pra baixo os índices de slot das classes que vinham depois dela.
  function handleRemoveClass(removedIndex) {
    const toRevert = character.abilityImprovements.filter((i) => i.classIndex === removedIndex);
    for (const improvement of toRevert) revertImprovement(improvement);
    setCharacter((prev) => ({
      ...prev,
      abilityImprovements: prev.abilityImprovements
        .filter((i) => i.classIndex !== removedIndex)
        .map((i) => (i.classIndex > removedIndex ? { ...i, classIndex: i.classIndex - 1 } : i)),
    }));
  }

  const visibleSteps = useMemo(
    () =>
      STEP_DEFS.filter(
        (step) => !step.conditional || step.conditional({ character, classMatches, raceMatch, backgroundMatch }),
      ),
    [character, classMatches, raceMatch, backgroundMatch],
  );

  // Uma etapa condicional pode sumir enquanto é a etapa ATUAL (ex: preencher
  // o último talento de escolha livre da Raça faz a etapa Feats deixar de
  // valer a condição na hora). Sem isso, `findIndex` não achava mais a chave
  // e caía no fallback `0` — o wizard voltava pro INÍCIO (Regras) do nada,
  // achado ao vivo testando o corte da etapa Feats. Em vez de voltar,
  // avança pra próxima etapa que ainda existe na mesma posição ou depois de
  // onde a que sumiu estava (mantém a sensação de progresso pra frente).
  useEffect(() => {
    if (visibleSteps.some((step) => step.key === stepKey)) return;
    const originalIndex = STEP_DEFS.findIndex((step) => step.key === stepKey);
    const next = visibleSteps.find((step) => STEP_DEFS.indexOf(step) >= originalIndex) ?? visibleSteps[visibleSteps.length - 1];
    if (next) setStepKey(next.key);
  }, [visibleSteps, stepKey]);

  const stepIndex = Math.max(
    0,
    visibleSteps.findIndex((step) => step.key === stepKey),
  );
  const step = visibleSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === visibleSteps.length - 1;

  function set(key, value) {
    setCharacter((prev) => ({ ...prev, [key]: value }));
  }

  function setNested(group, key, value) {
    setCharacter((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  }

  // O nível-alvo escolhido na etapa 2 vira o nível da classe inicial (primeira
  // da lista) — se o jogador já tiver adicionado outras classes (multiclasse),
  // essas continuam com o nível próprio delas, ajustável na etapa de Classe.
  function updateTargetLevel(level) {
    setTargetLevel(level);
    setCharacter((prev) => ({
      ...prev,
      classes: prev.classes.map((row, index) => (index === 0 ? { ...row, level } : row)),
    }));
  }

  function goTo(index) {
    const clamped = Math.min(Math.max(index, 0), visibleSteps.length - 1);
    setStepKey(visibleSteps[clamped].key);
  }

  function goBack() {
    goTo(stepIndex - 1);
  }

  function goNext() {
    if (isLast) {
      onSubmit(character);
      return;
    }
    goTo(stepIndex + 1);
  }

  function renderStepBody() {
    switch (step.key) {
      case "regras":
        return <StepRegras rulesMode={character.rulesMode} onChange={(value) => set("rulesMode", value)} />;
      case "nivel":
        return <StepNivel targetLevel={targetLevel} onChange={updateTargetLevel} />;
      case "raca":
        return (
          <StepRaca
            items={allRaces}
            value={character.race}
            selectedRules={character.raceRules}
            rulesMode={character.rulesMode}
            matched={raceMatch}
            onPick={pickRace}
            sizeValue={character.size}
            senses={character.senses}
            onChangeSenses={(senses) => set("senses", senses)}
            appliers={appliers}
          />
        );
      case "antecedente":
        return (
          <StepAntecedente
            items={allBackgrounds}
            value={character.background}
            selectedRules={character.backgroundRules}
            rulesMode={character.rulesMode}
            matched={backgroundMatch}
            onPick={pickBackground}
            appliers={appliers}
          />
        );
      case "classes":
        return (
          <ClassesInput
            variant="grid"
            classes={character.classes}
            classesData={allClasses}
            subclassesData={subclassesData}
            onChange={(items) => set("classes", items)}
            onApplyEquipment={appliers.applyEquipmentGrants}
            onApplySkills={appliers.applySkills}
            onApplySpells={appliers.applySpellChoices}
            matches={classesMatches}
            onMatchesChange={setClassesMatches}
            onRemoveClass={handleRemoveClass}
          />
        );
      case "atributos":
        return <StepAtributos abilities={character.abilities} onChange={(abilities) => set("abilities", abilities)} />;
      case "melhorias":
        return (
          <StepMelhorias
            slots={abilityImprovementSlots(character, classMatches)}
            abilities={character.abilities}
            abilityImprovements={character.abilityImprovements}
            featsData={featsData}
            onSetChoice={setImprovementChoice}
            onMoveChip={moveImprovementChip}
            onUnassignChip={unassignImprovementChip}
            onPickFeat={pickImprovementFeat}
          />
        );
      case "pericias":
        return (
          <StepPericias
            skillProficiencies={character.skillProficiencies}
            skillExpertise={character.skillExpertise}
            onChangeSkills={(proficiencies, expertise) => {
              set("skillProficiencies", proficiencies);
              set("skillExpertise", expertise);
            }}
            toolProficiencies={character.toolProficiencies}
            onChangeTools={(tools) => set("toolProficiencies", tools)}
            raceMatch={raceMatch}
            backgroundMatch={backgroundMatch}
            classMatches={classMatches}
            appliers={appliers}
          />
        );
      case "idiomas":
        return (
          <StepIdiomas
            languages={character.languages}
            onChange={(languages) => set("languages", languages)}
            raceMatch={raceMatch}
            backgroundMatch={backgroundMatch}
            appliers={appliers}
          />
        );
      case "equipamento":
        return (
          <StepEquipamento
            currency={character.currency}
            onChangeCurrency={(currency) => set("currency", currency)}
            equipment={character.equipment}
            onChangeEquipment={(equipment) => set("equipment", equipment)}
          />
        );
      case "feats":
        return (
          <FeatsInput
            items={featsData}
            feats={character.feats}
            onChange={(feats) => set("feats", feats)}
            onApplySpells={appliers.applySpellChoices}
            maxFeats={totalFeatSlots(character, raceMatch, backgroundMatch)}
            searchSlots={openFeatChoiceSlots(character, raceMatch, backgroundMatch)}
          />
        );
      case "magias":
        return (
          <div className="wizard-step-magias">
            <ListEditor
              items={character.spells}
              onChange={(items) => set("spells", items)}
              addLabel="Adicionar magia"
              fields={[
                { key: "name", label: "Magia" },
                { key: "prepared", label: "Preparada", type: "checkbox", default: false },
              ]}
            />
            <button type="button" onClick={() => setSpellBrowserOpen(true)}>
              Buscar magia
            </button>
            {spellBrowserOpen && (
              <div
                className="modal-backdrop"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setSpellBrowserOpen(false);
                }}
              >
                <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Magias</h3>
                    <button type="button" onClick={() => setSpellBrowserOpen(false)}>
                      Fechar
                    </button>
                  </div>
                  <SpellBrowser
                    spells={spellsData}
                    rulesMode={character.rulesMode}
                    onAdd={(name) => appliers.applySpellChoices([name])}
                  />
                </div>
              </div>
            )}
          </div>
        );
      case "identidade":
        return <StepIdentidade character={character} set={set} setNested={setNested} />;
      case "confirmacao":
        return <StepConfirmacao character={character} targetLevel={targetLevel} />;
      default:
        // As demais etapas entram uma por uma nas próximas partes do plano.
        return <StepPlaceholder stepKey={step.key} />;
    }
  }

  return (
    <div className="wizard">
      <WizardSummary character={character} targetLevel={targetLevel} />
      <div className="wizard-main">
        <ol className="wizard-progress">
          {visibleSteps.map((s, index) => (
            <li
              key={s.key}
              className={
                index === stepIndex
                  ? "wizard-progress-current"
                  : index < stepIndex
                    ? "wizard-progress-done"
                    : ""
              }
            >
              <button type="button" onClick={() => goTo(index)}>
                {s.label}
              </button>
            </li>
          ))}
        </ol>

        <h2>{step.title}</h2>
        <p className="wizard-blurb">{step.blurb}</p>

        <div className="wizard-step-body">{renderStepBody()}</div>

        <div className="wizard-nav">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <div className="wizard-nav-right">
            <button type="button" onClick={goBack} disabled={isFirst}>
              Voltar
            </button>
            {!isLast && (
              <button type="button" className="wizard-skip" onClick={goNext}>
                Pular
              </button>
            )}
            <button type="button" onClick={goNext}>
              {isLast ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
