import { useEffect, useMemo, useState } from "react";
import { createEmptyCharacter, deriveDarkvisionFeet } from "../schema/character";
import { RulesModeToggle } from "./RulesModeToggle";
import { StepRaca } from "./wizard/StepRaca";
import { StepAntecedente } from "./wizard/StepAntecedente";
import { ClassesInput } from "./ClassesInput";
import { StepAtributos } from "./wizard/StepAtributos";
import { StepMelhorias } from "./wizard/StepMelhorias";
import { StepEscolhasDeClasse } from "./wizard/StepEscolhasDeClasse";
import { StepMagias } from "./wizard/StepMagias";
import { StepPericias } from "./wizard/StepPericias";
import { StepIdiomas } from "./wizard/StepIdiomas";
import { StepEquipamento } from "./wizard/StepEquipamento";
import { StepIdentidade } from "./wizard/StepIdentidade";
import { FoundrySheetView } from "./FoundrySheetView";
import { FeatsInput } from "./FeatsInput";
import featsData from "../data/content/feats.json";
import optionalFeaturesData from "../data/content/optionalfeatures.json";
import { useCharacterAppliers } from "../hooks/useCharacterAppliers";
import { useAbilityImprovements } from "../hooks/useAbilityImprovements";
import { useClassChoices } from "../hooks/useClassChoices";
import { useCustomBackgrounds, useCustomClasses, useCustomRaces } from "../data/customContent";
import { resolveClassMatches } from "../schema/resolveClassMatches";
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

// Mesma ideia de resolveClassMatches (schema/resolveClassMatches.js), mas pra
// Raça/Antecedente: dado o nome + edição já gravados no personagem, acha o
// item correspondente no banco -- usado só no modo de EDIÇÃO, pra popular
// `raceMatch`/`backgroundMatch` no primeiro render (sem isso, etapas
// condicionais como "Feats", que dependem de `raceMatch?.originFeat`, ficam
// escondidas até o usuário reabrir a etapa Raça/Antecedente à toa).
function resolveSimpleMatch(items, name, rules) {
  if (!name) return null;
  return items.find((i) => i.name === name && rules && i.rules === rules) ?? items.find((i) => i.name === name) ?? null;
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
export function abilityImprovementSlots(character, classMatches) {
  const slots = [];
  character.classes.forEach((row, classIndex) => {
    const asiLevels = classMatches[classIndex]?.classData?.asiLevels ?? [];
    for (const level of asiLevels) {
      if (level <= (row.level ?? 1)) slots.push({ classIndex, level, className: row.name });
    }
  });
  return slots;
}

// Quantas escolhas de cada categoria (Fighting Style/Metamagic/Invocations/
// Maneuvers/Infusions) a classe (+ subclasse, se der alguma também — ex:
// Battle Master "Maneuvers", Champion "Additional Fighting Style") já libera
// no nível atual. `optionalFeatureChoices[].progression` é CUMULATIVO
// (`{"3":2,"10":3,"17":4}` = "no nível 10 você TEM 3", não "+3") — por isso
// pega só o maior nível já alcançado, não soma todos os degraus. Duas fontes
// da MESMA categoria (classe + subclasse) somam entre si (Fighter base + Champion
// são pools independentes que se somam num total maior).
function categoryCountsForClass(classData, subclassData, level) {
  const pools = [...(classData?.optionalFeatureChoices ?? []), ...(subclassData?.optionalFeatureChoices ?? [])];
  const counts = new Map();
  for (const pool of pools) {
    const reached = Object.keys(pool.progression ?? {})
      .map(Number)
      .filter((lvl) => lvl <= level);
    if (!reached.length) continue;
    const count = pool.progression[Math.max(...reached)];
    if (!count) continue;
    const prev = counts.get(pool.category) ?? { count: 0, source: pool.source ?? "optionalFeature" };
    prev.count += count;
    counts.set(pool.category, prev);
  }
  return counts;
}

// Um "slot" aqui é um CARD inteiro (classe+categoria), não uma escolha
// individual -- cada card carrega `count` picks (ver StepEscolhasDeClasse).
export function classChoiceSlots(character, classMatches) {
  const slots = [];
  character.classes.forEach((row, classIndex) => {
    const counts = categoryCountsForClass(classMatches[classIndex]?.classData, classMatches[classIndex]?.subclassData, row.level ?? 1);
    for (const [category, info] of counts) {
      slots.push({ classIndex, className: row.name, category, count: info.count, source: info.source });
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
    key: "escolhas",
    label: "Escolhas",
    title: "Escolhas de Classe",
    blurb:
      "Algumas classes concedem um pool de opções que cresce com o nível — Estilo de Luta, Metamagia, Invocações Místicas, " +
      "Manobras (Battle Master) ou Infusões (Artífice). Escolha aqui cada uma; conforme o personagem sobe de nível, novos slots aparecem.",
    conditional: ({ character, classMatches }) => classChoiceSlots(character, classMatches).length > 0,
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
    ["Escolhas de Classe", character.classChoices?.length ? character.classChoices.map((c) => c.name).join(", ") : null],
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

// `initialValue` só chega preenchido no modo de EDIÇÃO (editar um personagem
// já existente) — criação de personagem novo nunca passa essa prop. Nesse
// modo o wizard vira um menu de abas de livre navegação (sem Voltar/Pular/
// Próximo sequencial, ver render mais abaixo) e precisa ter `raceMatch`/
// `backgroundMatch`/`classesMatches` resolvidos já no PRIMEIRO render — do
// contrário etapas condicionais (Feats, Melhorias, Escolhas, Magias) ficam
// escondidas até o usuário visitar Raça/Antecedente/Classe à toa, mesmo já
// tendo dado tudo que precisavam pra aparecer.
export function CharacterCreationWizard({ initialValue, onSubmit, onCancel }) {
  const editMode = Boolean(initialValue);

  const customRaces = useCustomRaces();
  const customBackgrounds = useCustomBackgrounds();
  const customClasses = useCustomClasses();
  // Raça/Antecedente mostram as duas edições juntas (com tag) — só Classe é
  // filtrada de verdade pelo modo, mesma regra de CharacterForm.jsx.
  const allRaces = [...racesData, ...customRaces];
  const allBackgrounds = [...backgroundsData, ...customBackgrounds];

  // Mescla com os padrões em vez de usar `initialValue` cru — uma ficha salva
  // ANTES de um campo novo existir no schema (ex: `senses`, `isOriginal`) não
  // tem essa chave no Firestore, e acessar `character.senses.algo` direto
  // quebra a tela inteira ao abrir pra editar (mesma proteção que
  // CharacterForm.jsx já usava).
  const [character, setCharacter] = useState(() => ({ ...createEmptyCharacter(), ...initialValue }));
  const [targetLevel, setTargetLevel] = useState(() => initialValue?.classes?.[0]?.level ?? 1);
  const [raceMatch, setRaceMatch] = useState(() =>
    initialValue ? resolveSimpleMatch(allRaces, initialValue.race, initialValue.raceRules) : null,
  );
  const [backgroundMatch, setBackgroundMatch] = useState(() =>
    initialValue ? resolveSimpleMatch(allBackgrounds, initialValue.background, initialValue.backgroundRules) : null,
  );
  // Guardado aqui (no wizard, que nunca desmonta durante a navegação entre
  // etapas) em vez de dentro do `ClassesInput` — achado revisando o projeto:
  // `useState` local no `ClassesInput` resetava sozinho toda vez que o
  // wizard saía da etapa Classe e voltava (React desmonta o componente ao
  // trocar de etapa), corrompendo silenciosamente `classMatches` na próxima
  // escolha/remoção. `classMatches` (array) é só a forma derivada que o
  // resto do wizard já espera (StepPericias, abilityImprovementSlots).
  const [classesMatches, setClassesMatches] = useState(() => (initialValue ? resolveClassMatches(initialValue.classes) : {}));
  const classMatches = Object.values(classesMatches);
  const [stepKey, setStepKey] = useState(STEP_DEFS[0].key);
  // Achado ao vivo (sync real quebrando): o wizard deixava "Concluir" sem
  // nome nenhum -- Firestore aceita `name: ""` de boa, mas `Actor.create` do
  // Foundry rejeita (falha silenciosa, vira "1 falhou" sem detalhe nenhum pro
  // usuário do lado de lá). Só mostra o aviso DEPOIS de uma tentativa real de
  // concluir sem nome (não aparece logo de cara, incomodaria à toa em toda
  // etapa final) -- some sozinho assim que o campo Nome deixa de ficar vazio.
  const [nameRequiredError, setNameRequiredError] = useState(false);
  const [spellBrowserOpen, setSpellBrowserOpen] = useState(false);

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
  const { findImprovement, revertImprovement, setImprovementChoice, moveImprovementChip, unassignImprovementChip, pickImprovementFeat } =
    useAbilityImprovements(character, setCharacter, appliers.applyAbilityBonus);
  const { setClassChoice, clearClassChoice } = useClassChoices(setCharacter);

  function pickRace(item) {
    set("race", item.name);
    setRaceMatch(item);
    set("raceRules", item?.rules ?? "");
    const options = sizeToLetters(item?.size);
    appliers.applySize(options.length === 1 ? options[0] : "");
    appliers.applySenses({ darkvision: deriveDarkvisionFeet(item?.traits) });
    // Idioma FIXO da raça (ex: "comum, anão") entra sozinho, mesmo espírito de
    // applySize/applySenses logo acima -- não é uma escolha do jogador, é
    // concessão garantida, então não faz sentido depender de um clique em
    // "Adicionar" que o jogador pode esquecer (pedido do usuário: idioma
    // concedido por Raça/Antecedente tem que entrar sozinho). Escolha LIVRE de
    // idioma (`languageChoice`) continua manual, via ChoicePicker em
    // StepIdiomas -- essa sim precisa de decisão do jogador.
    if (item?.languages) appliers.applyLanguages(item.languages);
  }

  function pickBackground(item) {
    set("background", item.name);
    setBackgroundMatch(item);
    set("backgroundRules", item?.rules ?? "");
    // Mesmo automatismo de pickRace acima -- idioma fixo do antecedente entra
    // sozinho, sem depender do clique em "Adicionar".
    if (item?.languages) appliers.applyLanguages(item.languages);
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

    // Mesma ideia de `revertImprovement`, mas pra Escolhas de Classe: a classe
    // removida pode ter sido a única fonte de alguma categoria (ex: remover o
    // Warlock deixaria Invocações escolhidas "penduradas" sem slot nenhum que
    // as justifique) -- corta o excesso do FIM da lista daquela categoria pro
    // tanto que a classe removida contribuía (`classChoices` não guarda
    // classIndex, então não dá pra saber COM CERTEZA qual escolha era "dela";
    // cortar do fim é uma aproximação razoável, mesmo espírito do resto do
    // wizard que já assume ordem estável dos cards).
    const removedCounts = categoryCountsForClass(
      classMatches[removedIndex]?.classData,
      classMatches[removedIndex]?.subclassData,
      character.classes[removedIndex]?.level ?? 1,
    );

    setCharacter((prev) => {
      let classChoices = prev.classChoices;
      for (const [category, info] of removedCounts) {
        const kept = classChoices.filter((c) => c.category !== category);
        const forCategory = classChoices.filter((c) => c.category === category);
        classChoices = [...kept, ...forCategory.slice(0, Math.max(0, forCategory.length - info.count))];
      }
      return {
        ...prev,
        classChoices,
        abilityImprovements: prev.abilityImprovements
          .filter((i) => i.classIndex !== removedIndex)
          .map((i) => (i.classIndex > removedIndex ? { ...i, classIndex: i.classIndex - 1 } : i)),
      };
    });
  }

  // Trocar Regras (2014<->2024) DEPOIS de já ter escolhido classe rebindava
  // silenciosamente pro item de MESMO NOME na edição nova (achado na revisão
  // completa do projeto): `allClasses` filtra por `character.rulesMode`, mas
  // `character.classes[].name` não era limpo -- o próximo render simplesmente
  // re-resolvia "Fighter" pro Fighter da OUTRA edição, sem avisar, deixando
  // `abilityImprovements`/`classChoices` já preenchidos descrevendo slots que
  // podem nem existir mais na edição nova. Em vez de deixar isso acontecer
  // invisível, zera a escolha de classe (e tudo que dependia dela) sempre que
  // a edição muda com alguma classe já escolhida -- mesmo espírito de
  // "reverte o efeito antes de trocar" já usado no resto do wizard (ver
  // revertImprovement/handleRemoveClass).
  function handleRulesModeChange(value) {
    if (value === character.rulesMode) return;
    if (!character.classes.some((c) => c.name)) {
      set("rulesMode", value);
      return;
    }
    for (const improvement of character.abilityImprovements) revertImprovement(improvement);
    setClassesMatches({});
    setCharacter((prev) => ({
      ...prev,
      rulesMode: value,
      classes: [{ name: "", rules: "", subclass: "", subclassRules: "", level: prev.classes[0]?.level ?? 1, hpRolls: [] }],
      abilityImprovements: [],
      classChoices: [],
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

  // Compartilhado entre "Concluir" (última etapa, modo criação) e "Salvar"
  // (sempre visível, modo edição) — mesma validação nos dois casos.
  function trySubmit() {
    if (!character.name?.trim()) {
      setNameRequiredError(true);
      goTo(visibleSteps.findIndex((s) => s.key === "identidade"));
      return;
    }
    onSubmit(character);
  }

  function goNext() {
    if (isLast) {
      trySubmit();
      return;
    }
    goTo(stepIndex + 1);
  }

  function renderStepBody() {
    switch (step.key) {
      case "regras":
        return <StepRegras rulesMode={character.rulesMode} onChange={handleRulesModeChange} />;
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
      case "escolhas":
        return (
          <StepEscolhasDeClasse
            slots={classChoiceSlots(character, classMatches)}
            classChoices={character.classChoices}
            rulesMode={character.rulesMode}
            optionalFeaturesData={optionalFeaturesData}
            featsData={featsData}
            onPick={setClassChoice}
            onClear={clearClassChoice}
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
          <StepMagias
            character={character}
            classMatches={classMatches}
            spells={character.spells}
            onChangeSpells={(spells) => set("spells", spells)}
            browserOpen={spellBrowserOpen}
            onToggleBrowser={setSpellBrowserOpen}
          />
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
        {/* Modo edição: menu de abas de livre navegação, sem noção de "já
            passou por aqui" (não existe uma ordem obrigatória a seguir) --
            só a etapa atual se destaca. Modo criação mantém o rastro
            visual de progresso (feito/atual/futuro), pedido original do
            wizard de criação. */}
        <ol className={`wizard-progress${editMode ? " wizard-progress-tabs" : ""}`}>
          {visibleSteps.map((s, index) => (
            <li
              key={s.key}
              className={
                index === stepIndex
                  ? "wizard-progress-current"
                  : !editMode && index < stepIndex
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
        {step.key === "identidade" && nameRequiredError && !character.name?.trim() && (
          <p className="error">Dê um nome ao personagem antes de concluir — sem nome, a ficha não sincroniza com o Foundry.</p>
        )}

        <div className="wizard-step-body">{renderStepBody()}</div>

        <div className="wizard-nav">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          {editMode ? (
            // Edição não tem "última etapa" que conclui -- o menu acima já
            // deixa toda etapa acessível a qualquer momento, então "Salvar"
            // fica sempre disponível, não só depois de percorrer tudo.
            <div className="wizard-nav-right">
              <button type="button" onClick={trySubmit}>
                Salvar
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
