import { useEffect, useMemo, useRef, useState } from "react";
import { ABILITIES, ABILITY_LABELS, ALIGNMENTS, LANGUAGES, SKILLS, featName, featRules, resolveCharacterResistances } from "../schema/character";
import { resolveClassMatches } from "../schema/resolveClassMatches";
import { computeGrantedSpells } from "../schema/grantedSpells";
import { computeAllowedSpellNames, computeExpandedSpellPool } from "../schema/expandedSpellPool";
import { spellProgressionForCharacter, fullListSpellPool } from "../schema/spellProgression";
import { AbilitiesInput } from "./AbilitiesInput";
import { SensesInput } from "./SensesInput";
import { TagListInput } from "./TagListInput";
import { ListEditor } from "./ListEditor";
import { SpellBrowser } from "./SpellBrowser";
import { PreparedSpellChecklist } from "./PreparedSpellChecklist";
import { FeatBrowser } from "./FeatBrowser";
import { FeatGrants } from "./FeatsInput";
import { useCharacterAppliers } from "../hooks/useCharacterAppliers";
import { EquipmentBrowser } from "./EquipmentBrowser";
import { InfoTooltip } from "./InfoTooltip";
import racesData from "../data/content/races.json";
import classesData from "../data/content/classes.json";
import featsData from "../data/content/feats.json";
import optionalFeaturesData from "../data/content/optionalfeatures.json";
import spellsData from "../data/content/spells.json";
import equipmentData from "../data/content/equipment.json";
import { computeArmorClass, computeArmorClassBreakdown } from "../utils/computeArmorClass";
import { computeHitPoints } from "../utils/computeHitPoints";
import { formatSpeed } from "../utils/formatSpeed";
import { spellAttackMod, spellDamageFormula, spellSaveDC, spellHealFormula } from "../schema/spellMechanics";
import { rollFormula } from "../utils/rollDice";
import { WEAPON_MASTERY_TABLE } from "../utils/weaponMastery";
import { CLASS_CHOICE_CATEGORY_LABELS } from "../utils/classChoiceLabels";
import { sendRollRequest, sendLocalRoll } from "../data/chatMessages";
import {
  rollD20,
  rollAttack,
  resolveUnarmedStrikeDie,
  unarmedStrikeAbilityMod,
  resolveSneakAttackDice,
  resolveWeaponAttack,
  rollDeathSaveD20,
  isRangedWeapon,
  resolveRaceMeleeBonusDamage,
  canPowerAttack,
  ADV_MODE,
} from "../schema/localRolls";

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function fmtMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// `rollD20`/`rollAttack` (schema/localRolls.js) devolvem `rolls` (array de
// resultados crus do dado) -- aqui só extrai o formato que o chat espera
// (`isCritical`/`isFumble` a partir do d20 natural, nunca do total com mod).
function toChatD20Result(roll) {
  return { formula: roll.formula, total: roll.total, isCritical: roll.rolls[0] === 20, isFumble: roll.rolls[0] === 1 };
}

// Ataque local (sem Foundry) pro chat geral -- usado tanto pelas Ações
// (Ataque Desarmado/arma equipada) quanto pelo botão "⚔ Atacar" do
// Inventário, pra não duplicar a lógica em dois componentes. `itemName`
// continua "Unarmed Strike" (inglês) mesmo na Ação em português -- é o MESMO
// nome mandado pro pedido pendente do Foundry (sendRollRequest, acima), que
// precisa bater com o nome real do item lá (ou, na falta de um, pelo menos
// ficar consistente/previsível). Devolve `null` se não for nem Unarmed
// Strike nem um item real do catálogo (ex: homebrew digitado à mão, sem
// dado de arma pra calcular).
// `extraDamage` (dano extra de traço de raça, ex: Quills) sai separado do
// `damage` principal -- tipos de dano diferentes (ex: contundente do
// desarmado + perfurante do Quills), o chat mostra como 2 linhas. Devolve
// `null`, NUNCA `undefined` -- `addDoc`/`setDoc` do Firestore rejeitam
// campo `undefined` (erro só na escrita, quebra o roll inteiro em silêncio
// pra QUALQUER personagem sem esse traço -- achado ao vivo testando isto).
// Tipo de dano não tem tradução estabelecida em lugar nenhum do projeto
// (até o chat de rolagem mostra "Dano (bludgeoning)" em inglês, sem
// tradução) -- capitaliza a chave em vez de inventar vocabulário PT-BR novo
// sem precedente.
function capitalizeDamageType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function buildExtraDamage(raceMatch, isRanged) {
  const extra = resolveRaceMeleeBonusDamage(raceMatch, isRanged);
  return extra ? { formula: extra.formula, total: extra.total, type: extra.type, label: extra.label } : null;
}

function computeLocalAttackResult(character, totalLevel, originalClassMatch, classMatches, itemName, mode = ADV_MODE.NORMAL, raceMatch = null, powerAttack = false) {
  if (itemName === "Unarmed Strike") {
    const unarmedDie = resolveUnarmedStrikeDie(character.classes, classMatches, character.feats);
    const abilityScoreMod = unarmedStrikeAbilityMod(character, unarmedDie?.className ?? null);
    const prof = proficiencyBonus(totalLevel);
    const { attack, damage } = rollAttack({
      attackMod: abilityScoreMod + prof, // Ataque Desarmado é sempre proficiente
      damageDice: unarmedDie ? `${unarmedDie.number}d${unarmedDie.faces}` : "1d1",
      damageMod: abilityScoreMod,
      damageType: "bludgeoning",
      mode,
    });
    return {
      ...toChatD20Result(attack),
      damage: { formula: damage.formula, total: damage.total, type: damage.type },
      extraDamage: buildExtraDamage(raceMatch, false), // desarmado é sempre corpo-a-corpo
    };
  }
  const equipmentEntry = equipmentData.find((e) => e.name === itemName);
  if (!equipmentEntry) return null;
  const { attack, damage } = resolveWeaponAttack(character, totalLevel, originalClassMatch, equipmentEntry, mode, powerAttack);
  return {
    ...toChatD20Result(attack),
    damage: { formula: damage.formula, total: damage.total, type: damage.type },
    extraDamage: buildExtraDamage(raceMatch, isRangedWeapon(equipmentEntry)),
  };
}

// Mesma fórmula usada em todo o resto do projeto (nível total → bônus de
// proficiência).
function proficiencyBonus(totalLevel) {
  return 2 + Math.floor(Math.max(totalLevel - 1, 0) / 4);
}

function stripHtml(html) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function excerpt(text, max = 150) {
  const clean = stripHtml(text);
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

// Achado numa auditoria de CA (set/2026): o botão "⚔ Atacar" do Inventário aparecia em
// TODA linha (armadura, escudo, poção...), decisão antiga de quando `character.equipment`
// era só nome+qtd livre, sem tipo nenhum pra cruzar. Hoje `equipmentData` (catálogo
// unificado) já tem `foundryType` real -- `weapon`/`armorModelWeapon`/item `raw` tipo
// arma SEMPRE ganham uma Activity de ataque de verdade no Foundry (buildEquipmentItem.js),
// então esses três continuam liberando o botão por `foundryType` mesmo.
// Item mágico (`foundryType:"magicItem"`) é DIFERENTE: só ganha Activity de ataque quando
// `entry.mechanical.activities` foi autorado à mão (achado numa auditoria de ataque, set/
// 2026: `category:"weapon"` sozinho NÃO bastava -- "+1/+2 Weapon", o encantamento genérico
// aplicado a OUTRA arma, é `category:"weapon"` mas nunca tem Activity própria; e itens como
// Rod of Lordly Might/Wand of Orcus funcionam como arma de verdade no texto oficial mas são
// `category:"rod"`/`"wand"`, não "weapon"). `hasAttackActivity` (flatten-equipment-entry.mjs)
// é o sinal real -- reflete exatamente se o Item que o módulo monta vai ter Activity
// `type:"attack"` ou não, nunca mais depende de qual categoria de item mágico é.
// Nome que não bate com NADA do catálogo (homebrew digitado à mão) continua mostrando o
// botão -- mesmo comportamento permissivo de sempre, só os itens catalogados E claramente
// não-arma (armadura/ferramenta/consumível/etc.) é que somem.
const KNOWN_EQUIPMENT_NAMES = new Set(equipmentData.map((e) => e.name));
const WEAPON_EQUIPMENT_NAMES = new Set(
  equipmentData
    .filter((e) => e.foundryType === "weapon" || e.foundryType === "armorModelWeapon" || (e.foundryType === "magicItem" && e.hasAttackActivity))
    .map((e) => e.name),
);
function looksAttackable(itemName) {
  return !KNOWN_EQUIPMENT_NAMES.has(itemName) || WEAPON_EQUIPMENT_NAMES.has(itemName);
}

// Mesmo modal usado em StepMagias.jsx (criação/level-up) -- reaproveitado aqui
// pra Talento/Magia/Equipamento na ficha editável, trocando o antigo campo de
// texto livre por busca+lista clicável, mesmo padrão nos 3 campos.
function BrowserModal({ title, onClose, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-panel modal-panel-wide" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Raça/Antecedente podem ter a mesma edição errada de propósito (não são
// filtradas por rulesMode, ver feature_rulesmode_2014_2024) — por isso o
// personagem guarda a edição do item CLICADO (`raceRules`/`backgroundRules`)
// pra desempatar duas entradas com o mesmo nome. Classe É filtrada de
// verdade por `rulesMode`, então usa isso direto.
function findRaceMatch(character) {
  if (!character.race) return null;
  return (
    racesData.find((r) => r.name === character.race && r.rules === character.raceRules) ??
    racesData.find((r) => r.name === character.race) ??
    null
  );
}

function findClassMatch(row, rulesMode) {
  if (!row?.name) return null;
  return (
    classesData.find((c) => c.name === row.name && c.rules === rulesMode) ??
    classesData.find((c) => c.name === row.name) ??
    null
  );
}

// Recebe a entrada de `character.feats` inteira (nov/2026: `{name, rules}`,
// antes só o nome) -- prefere a EDIÇÃO exata que o personagem tem, cai pro
// nome sozinho só pra entrada antiga (string solta, sem `rules` guardado).
function findFeatMatch(entry) {
  const name = featName(entry);
  const rules = featRules(entry);
  return (rules && featsData.find((f) => f.name === name && f.rules === rules)) || featsData.find((f) => f.name === name) || null;
}

function findSpellMatch(name, rulesMode) {
  return (
    spellsData.find((s) => s.name === name && s.rules === rulesMode) ??
    spellsData.find((s) => s.name === name) ??
    null
  );
}

// `character.classChoices` (Estilo de Luta/Metamagia/Invocação/Manobra/Infusão/etc.)
// pode vir de `optionalfeatures.json` (category) OU de `feats.json` (subtype "fightingStyle"
// na edição 2024, ver StepEscolhasDeClasse.jsx) -- mesma busca em cascata do resto do
// arquivo, tentando a edição exata da escolha antes de cair pro nome sozinho.
function findClassChoiceMatch(choice) {
  return (
    optionalFeaturesData.find((f) => f.name === choice.name && f.category === choice.category && f.rules === choice.rules) ??
    optionalFeaturesData.find((f) => f.name === choice.name && f.category === choice.category) ??
    featsData.find((f) => f.name === choice.name && f.subtype === choice.category && f.rules === choice.rules) ??
    featsData.find((f) => f.name === choice.name && f.subtype === choice.category) ??
    null
  );
}

// Aprimoramento Animal (Simic Hybrid) vive em `optionalfeatures.json` sem `category`
// (não é um "classChoice" genérico, ver animalEnhancement.js) -- busca só pelo nome.
function findAnimalEnhancementMatch(name) {
  return optionalFeaturesData.find((f) => f.name === name) ?? null;
}

// Chave de arma (Foundry, ex: "longsword") -> nome de exibição. `WEAPON_MASTERY_TABLE`
// só cobre armas que TÊM mastery na 2024 (não inclui "net", só usado em proficiência
// aberta 2014) -- por isso o fallback capitaliza a chave crua em vez de assumir presença.
function weaponLabel(key) {
  const found = WEAPON_MASTERY_TABLE[key]?.label;
  if (found) return found;
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : key;
}

const ARMOR_LABELS = { light: "Leve", medium: "Média", heavy: "Pesada", shields: "Escudos" };
const WEAPON_LABELS = { simple: "Simples", martial: "Marcial" };
const SCHOOL_ABBR = {
  Abjuration: "Abj",
  Conjuration: "Conj",
  Divination: "Div",
  Enchantment: "Enc",
  Evocation: "Evo",
  Illusion: "Ilu",
  Necromancy: "Necro",
  Transmutation: "Transm",
};

const TABS = [
  { key: "details", label: "Detalhes" },
  { key: "inventory", label: "Inventário" },
  { key: "feats", label: "Talentos" },
  { key: "spells", label: "Magias" },
  { key: "biography", label: "Biografia" },
];

function EmptyRow({ children = "—" }) {
  return <p className="foundry-sheet-empty">{children}</p>;
}

function renderTabContent(key, props) {
  switch (key) {
    case "details":
      return <DetailsTab {...props} />;
    case "inventory":
      return <InventoryTab {...props} />;
    case "feats":
      return <FeatsTab {...props} />;
    case "spells":
      return <SpellsTab {...props} />;
    case "biography":
      return <BiographyTab {...props} />;
    default:
      return null;
  }
}

function downloadCharacterJSON(character) {
  const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(character.name || "personagem").trim().replace(/[^\w\-]+/g, "_") || "personagem"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function DetailsTab({
  character,
  editable,
  onChange,
  originalClassMatch,
  totalLevel,
  raceMatch,
  classMatches,
  profileId,
  advantageMode,
  visibility,
}) {
  const prof = proficiencyBonus(totalLevel);
  const damageResistances = resolveCharacterResistances(character, raceMatch, featsData);

  // Clique em perícia/resistência/ataque faz DUAS coisas em paralelo, pedido
  // do usuário (nov/2026): manda o pedido pendente de sempre pro Foundry
  // (`sendRollRequest` -- só aparece no chat da FICHA, ChatPanel, e só
  // resolve se o Foundry estiver aberto, NUNCA usa vantagem/sussurro daqui,
  // o Foundry tem o próprio jeito de pedir isso quando resolver de verdade)
  // E calcula + manda uma rolagem já pronta, 100% local
  // (`sendLocalRoll`/schema/localRolls.js), que só aparece no chat GERAL
  // (GlobalChatPanel) -- esse nunca fica esperando ninguém, e é o único que
  // respeita os toggles da caixa vermelha. As duas escritas são
  // independentes, nenhuma espera a outra.
  function rollRequest(request) {
    sendRollRequest(profileId, { sourceId: character.id, authorName: character.name, request });
    const result = computeLocalCheckResult(request);
    if (result) {
      sendLocalRoll(profileId, { sourceId: character.id, authorName: character.name, request, result, visibility });
    }
  }

  function computeLocalCheckResult(request) {
    if (request.type === "save") {
      const proficient = savingThrowProfs.has(request.key);
      const mod = abilityMod(character.abilities?.[request.key] ?? 10) + (proficient ? prof : 0);
      return toChatD20Result(rollD20(mod, advantageMode));
    }
    if (request.type === "skill") {
      const skill = SKILLS.find((s) => s.id === request.key);
      if (!skill) return null;
      const bonus = (proficientSkills.has(request.key) ? prof : 0) + (expertiseSkills.has(request.key) ? prof : 0);
      const mod = abilityMod(character.abilities?.[skill.ability] ?? 10) + bonus;
      return toChatD20Result(rollD20(mod, advantageMode));
    }
    if (request.type === "attack") {
      return computeLocalAttackResult(character, totalLevel, originalClassMatch, classMatches, request.itemName, advantageMode, raceMatch);
    }
    return null;
  }

  // Só dano (sem acerto próprio -- Ataque Furtivo soma na rolagem de OUTRO
  // ataque, nunca tem uma de verdade só dele; pedido do usuário foi uma
  // ação própria na seção Ações mesmo assim, só com a rolagem de dano).
  // Vantagem/desvantagem não se aplica -- é rolagem de DANO, não de d20.
  function sneakAttackRoll() {
    const sneak = resolveSneakAttackDice(character.classes, classMatches);
    if (!sneak) return;
    const r = rollFormula(`${sneak.number}d${sneak.faces}`);
    sendLocalRoll(profileId, {
      sourceId: character.id,
      authorName: character.name,
      request: { type: "sneakAttack" },
      result: { formula: r.formula, total: r.total, isCritical: false, isFumble: false },
      visibility,
    });
  }
  const expertiseSkills = new Set(character.skillExpertise ?? []);
  const proficientSkills = new Set(character.skillProficiencies ?? []);
  const savingThrowProfs = new Set(originalClassMatch?.savingThrows ?? []);
  // Concedidas por Raça/Feat/Subclasse/Escolha de Classe -- morava na aba
  // Magias até o usuário pedir pra mover pra cá (set/2026): a aba Magias é
  // pra magia que o JOGADOR escolhe/prepara, não pra automação de fundo. Só
  // exibição, ver schema/grantedSpells.js pro porquê de nunca entrar em
  // `character.spells`.
  const grantedSpells = computeGrantedSpells({ character, raceMatch, classMatches, featsData, optionalFeaturesData });

  function toggleSkillProf(id, checked) {
    const set = new Set(character.skillProficiencies ?? []);
    if (checked) set.add(id);
    else {
      set.delete(id);
      // Sem proficiência não faz sentido continuar com perícia (expertise).
      const exp = new Set(character.skillExpertise ?? []);
      exp.delete(id);
      onChange({ skillProficiencies: [...set], skillExpertise: [...exp] });
      return;
    }
    onChange({ skillProficiencies: [...set] });
  }

  function toggleSkillExpertise(id, checked) {
    const set = new Set(character.skillExpertise ?? []);
    if (checked) set.add(id);
    else set.delete(id);
    onChange({ skillExpertise: [...set] });
  }

  const senseEntries = [
    ["darkvision", "Visão no Escuro"],
    ["blindsight", "Cegueira"],
    ["tremorsense", "Tremorsentido"],
    ["truesight", "Visão Verdadeira"],
  ]
    .map(([key, label]) => ({ key, label, value: character.senses?.[key] }))
    .filter((s) => s.value > 0);
  const specialSense = character.senses?.special?.trim();

  return (
    <div className="foundry-details-tab">
      <div className="foundry-details-col">
        <div className="foundry-box">
          <h4>Perícias</h4>
          <ul className="foundry-skill-list">
            {SKILLS.map((skill) => {
              const proficient = proficientSkills.has(skill.id);
              const expertise = expertiseSkills.has(skill.id);
              const bonus = (proficient ? prof : 0) + (expertise ? prof : 0);
              const mod = abilityMod(character.abilities?.[skill.ability] ?? 10) + bonus;
              return (
                <li key={skill.id} className={expertise ? "is-expertise" : proficient ? "is-proficient" : ""}>
                  {editable ? (
                    <span className="foundry-skill-toggles">
                      <input
                        type="checkbox"
                        title="Proficiente"
                        checked={proficient}
                        onChange={(e) => toggleSkillProf(skill.id, e.target.checked)}
                      />
                      <input
                        type="checkbox"
                        title="Perícia (dobro)"
                        checked={expertise}
                        disabled={!proficient}
                        onChange={(e) => toggleSkillExpertise(skill.id, e.target.checked)}
                      />
                    </span>
                  ) : (
                    <span className="foundry-skill-dot" aria-hidden="true" />
                  )}
                  <span className="foundry-skill-ability">{skill.ability.toUpperCase()}</span>
                  <button
                    type="button"
                    className="foundry-skill-label foundry-rollable"
                    onClick={() => rollRequest({ type: "skill", key: skill.id })}
                    title={`Rolar ${skill.label}`}
                  >
                    {skill.label}
                  </button>
                  <span className="foundry-skill-mod">{fmtMod(mod)}</span>
                  <span className="foundry-skill-passive">{10 + mod}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="foundry-box">
          <h4>Ferramentas</h4>
          {editable ? (
            <TagListInput
              items={character.toolProficiencies ?? []}
              onChange={(items) => onChange({ toolProficiencies: items })}
              placeholder="Ex: Ferramentas de Ladrão"
              addLabel="Adicionar ferramenta"
            />
          ) : character.toolProficiencies?.length > 0 ? (
            <ul className="foundry-skill-list">
              {character.toolProficiencies.map((tool) => (
                <li key={tool} className="is-proficient">
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-skill-label">{tool}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow />
          )}
        </div>
      </div>

      <div className="foundry-details-col">
        <div className="foundry-box">
          <h4>Testes de Resistência</h4>
          <div className="foundry-saves-grid">
            {ABILITIES.map((key) => {
              const proficient = savingThrowProfs.has(key);
              const mod = abilityMod(character.abilities?.[key] ?? 10) + (proficient ? prof : 0);
              return (
                <div key={key} className={`foundry-save-row ${proficient ? "is-proficient" : ""}`}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <button
                    type="button"
                    className="foundry-skill-ability foundry-rollable"
                    onClick={() => rollRequest({ type: "save", key })}
                    title={`Rolar resistência de ${ABILITY_LABELS[key]}`}
                  >
                    {ABILITY_LABELS[key]}
                  </button>
                  <span className="foundry-skill-mod">{fmtMod(mod)}</span>
                </div>
              );
            })}
          </div>
          <p className="field-hint">Proficiência de resistência vem da classe original, não é editável aqui.</p>
        </div>

        <div className="foundry-box">
          <h4>Resistência a Dano</h4>
          {damageResistances.length > 0 ? (
            <ul className="foundry-item-list">
              {damageResistances.map((type) => (
                <li key={type}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-item-name">{capitalizeDamageType(type)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow />
          )}
          <p className="field-hint">
            Concedida por Raça/Talento (fixa ou escolhida nas respectivas etapas) — não é editável aqui.
          </p>
        </div>

        <div className="foundry-box">
          <h4>Ações</h4>
          <ul className="foundry-item-list">
            <li>
              <span className="foundry-skill-dot" aria-hidden="true" />
              <button
                type="button"
                className="foundry-item-name foundry-rollable"
                onClick={() => rollRequest({ type: "attack", itemName: "Unarmed Strike" })}
              >
                Ataque Desarmado
              </button>
            </li>
            {resolveSneakAttackDice(character.classes, classMatches) && (
              <li>
                <span className="foundry-skill-dot" aria-hidden="true" />
                <button type="button" className="foundry-item-name foundry-rollable" onClick={sneakAttackRoll}>
                  Ataque Furtivo
                </button>
              </li>
            )}
            {(character.equipment ?? [])
              .filter((item) => item.equipped && looksAttackable(item.name))
              .map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <button
                    type="button"
                    className="foundry-item-name foundry-rollable"
                    onClick={() => rollRequest({ type: "attack", itemName: item.name })}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
          </ul>
          {!(character.equipment ?? []).some((item) => item.equipped && looksAttackable(item.name)) && (
            <p className="field-hint">Equipe uma arma no Inventário pra ela aparecer aqui.</p>
          )}
        </div>

        {originalClassMatch?.armor?.length > 0 && (
          <div className="foundry-box">
            <h4>Armaduras</h4>
            <div className="foundry-tag-row">
              {originalClassMatch.armor.map((a) => (
                <span key={a} className="foundry-tag">
                  {ARMOR_LABELS[a] ?? a}
                </span>
              ))}
            </div>
          </div>
        )}

        {originalClassMatch?.weapons?.length > 0 && (
          <div className="foundry-box">
            <h4>Armas</h4>
            <div className="foundry-tag-row">
              {originalClassMatch.weapons.map((w) => (
                <span key={w} className="foundry-tag">
                  {WEAPON_LABELS[w] ?? w}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="foundry-box">
          <h4>Sentidos</h4>
          {editable ? (
            <SensesInput senses={character.senses} onChange={(senses) => onChange({ senses })} />
          ) : senseEntries.length > 0 || specialSense ? (
            <div className="foundry-tag-row">
              {senseEntries.map((s) => (
                <span key={s.key} className="foundry-tag">
                  {s.label} {s.value} {character.senses?.units ?? "ft"}
                </span>
              ))}
              {specialSense && <span className="foundry-tag">{specialSense}</span>}
            </div>
          ) : (
            <EmptyRow />
          )}
        </div>

        <div className="foundry-box">
          <h4>Idiomas</h4>
          {editable ? (
            <TagListInput
              items={character.languages ?? []}
              onChange={(items) => onChange({ languages: items })}
              placeholder="Ex: Élfico"
              addLabel="Adicionar idioma"
            />
          ) : character.languages?.length > 0 ? (
            <div className="foundry-tag-row">
              {character.languages.map((lang) => (
                <span key={lang} className="foundry-tag">
                  {lang}
                </span>
              ))}
            </div>
          ) : (
            <EmptyRow />
          )}
        </div>
      </div>

      <div className="foundry-details-col foundry-details-traits">
        {/* Mostra o nome salvo direto (não depende de achar o match no banco
            oficial) — raça/antecedente é sempre uma escolha de verdade do
            jogador e merece card, mesmo se o nome não bater com nada. Trocar
            raça/classe/antecedente é estrutural (mexe em bônus de atributo,
            proficiências concedidas etc.) — fica só no Assistente completo,
            não editável direto aqui. */}
        {character.race && (
          <div className="foundry-trait-card">
            <strong>{character.race}</strong>
            <span>Raça · {character.size ? "Tamanho " + character.size : "—"}</span>
          </div>
        )}
        {character.background && (
          <div className="foundry-trait-card">
            <strong>{character.background}</strong>
            <span>Antecedente</span>
          </div>
        )}
        {(character.classes ?? [])
          .filter((c) => c.name)
          .map((c, index) => (
            <div className="foundry-trait-card" key={index}>
              <strong>
                {c.name}
                {c.subclass ? ` (${c.subclass})` : ""}
              </strong>
              <span>Classe · Nível {c.level}</span>
            </div>
          ))}
        {!character.race && !character.background && character.classes?.every((c) => !c.name) && <EmptyRow />}
        {grantedSpells.length > 0 && (
          <div className="foundry-box">
            <div className="foundry-box-header-row">
              <h4>Magias Concedidas Automaticamente</h4>
            </div>
            <ul className="foundry-item-list foundry-spell-list">
              {(() => {
                // Ícone "ⓘ" (ver schema/grantedSpells.js `note`) só na PRIMEIRA entrada de
                // cada fonte -- Rimekin concede 3 magias com a mesma nota de Cold Fire
                // Magic, não precisa repetir o ícone 3x.
                const shownNoteSources = new Set();
                return grantedSpells.map((entry, index) => {
                  const showNote = !!entry.note && !shownNoteSources.has(entry.source);
                  if (showNote) shownNoteSources.add(entry.source);
                  return (
                    <li key={index}>
                      <span className="foundry-skill-dot" aria-hidden="true" />
                      <span className="foundry-item-name">{entry.name}</span>
                      <span className="foundry-spell-meta">
                        {entry.source}
                        {!entry.unlocked && ` · a partir do nível ${entry.level}`}
                      </span>
                      {showNote && <InfoTooltip text={entry.note} />}
                    </li>
                  );
                });
              })()}
            </ul>
            <p className="field-hint">
              O Foundry adiciona essas magias sozinho ao sincronizar — não aparecem na aba Magias.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryTab({
  character,
  editable,
  onChange,
  profileId,
  onSave,
  originalClassMatch,
  totalLevel,
  classMatches,
  raceMatch,
  advantageMode,
  visibility,
}) {
  const currency = character.currency ?? {};
  const [browserOpen, setBrowserOpen] = useState(false);
  // Ataque Poderoso (-5/+10, GWM/Sharpshooter 2014) é opcional POR ATAQUE --
  // toggle local por nome de item, só mostrado na linha quando `canPowerAttack`
  // confirma que o personagem tem o talento certo pro tipo da arma.
  const [powerAttackSelections, setPowerAttackSelections] = useState(() => new Set());
  function togglePowerAttack(itemName) {
    setPowerAttackSelections((prev) => {
      const next = new Set(prev);
      if (next.has(itemName)) next.delete(itemName);
      else next.add(itemName);
      return next;
    });
  }

  function addEquipment(item) {
    onChange({ equipment: [...(character.equipment ?? []), { name: item.name, quantity: 1 }] });
    setBrowserOpen(false);
  }

  // Equipar/sintonizar é uma ação leve e frequente (igual marcar dano de PV) --
  // não faz sentido obrigar "Editar ficha" -> achar o item -> "Salvar" só pra
  // isso. Grava direto (`onSave`, o MESMO usado pelo toggle "Editar ficha",
  // ignora completamente o estado local `editing`/`draft`) -- só existe fora
  // do modo de edição (`!editable`), onde `character` já é o estado
  // persistido de verdade (não um rascunho não salvo).
  function quickToggleEquipmentField(index, key, value) {
    const next = (character.equipment ?? []).map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onSave?.({ equipment: next });
  }

  // Sem distinção "isso é arma" nos dados do site (equipment é só nome+qtd
  // livre) -- em vez de adivinhar por heurística de nome, manda o pedido de
  // ataque pra QUALQUER item; a ponte do Foundry já valida de verdade se o
  // item existe na ficha E tem uma ação de ataque (liveRollBridge.js), e
  // devolve erro claro no chat quando não tem (ex: poção, corda...).
  function attackWith(itemName) {
    const request = { type: "attack", itemName };
    sendRollRequest(profileId, { sourceId: character.id, authorName: character.name, request });
    const result = computeLocalAttackResult(
      character,
      totalLevel,
      originalClassMatch,
      classMatches,
      itemName,
      advantageMode,
      raceMatch,
      powerAttackSelections.has(itemName),
    );
    if (result) {
      sendLocalRoll(profileId, { sourceId: character.id, authorName: character.name, request, result, visibility });
    }
  }
  return (
    <div className="foundry-inventory-tab">
      <div className="foundry-currency-row">
        {["pp", "gp", "ep", "sp", "cp"].map((key) =>
          editable ? (
            <label key={key} className="foundry-currency-chip foundry-currency-editable">
              <span className="foundry-currency-label">{key.toUpperCase()}</span>
              <input
                type="number"
                value={currency[key] ?? 0}
                onChange={(e) => onChange({ currency: { ...currency, [key]: Number(e.target.value) } })}
              />
            </label>
          ) : (
            <div key={key} className="foundry-currency-chip">
              <span className="foundry-currency-label">{key.toUpperCase()}</span>
              <span className="foundry-currency-value">{currency[key] ?? 0}</span>
            </div>
          ),
        )}
      </div>

      <div className="foundry-box">
        <div className="foundry-box-header-row">
          <h4>Equipamento</h4>
          {!editable && <span>Quantidade</span>}
        </div>
        {editable ? (
          <>
            <ListEditor
              items={character.equipment ?? []}
              onChange={(items) => onChange({ equipment: items })}
              allowAdd={false}
              fields={[
                { key: "name", label: "Nome" },
                { key: "quantity", label: "Qtd.", type: "number", default: 1 },
                { key: "equipped", label: "Equipado", type: "checkbox", default: false },
                { key: "attuned", label: "Sintonizado", type: "checkbox", default: false },
              ]}
            />
            <button type="button" onClick={() => setBrowserOpen(true)}>
              Adicionar item
            </button>
            {browserOpen && (
              <BrowserModal title="Equipamento" onClose={() => setBrowserOpen(false)}>
                <EquipmentBrowser items={equipmentData} onAdd={addEquipment} />
              </BrowserModal>
            )}
          </>
        ) : character.equipment?.length ? (
          <ul className="foundry-item-list">
            {character.equipment.map((item, index) => (
              <li key={index}>
                <span className="foundry-skill-dot" aria-hidden="true" />
                <span className="foundry-item-name">{item.name}</span>
                <span className="foundry-item-qty">{item.quantity > 1 ? `${item.quantity}x` : "1x"}</span>
                {onSave && (
                  <span className="foundry-item-toggles">
                    <label className="foundry-item-toggle">
                      <input
                        type="checkbox"
                        checked={!!item.equipped}
                        onChange={(e) => quickToggleEquipmentField(index, "equipped", e.target.checked)}
                      />
                      Equipado
                    </label>
                    <label className="foundry-item-toggle">
                      <input
                        type="checkbox"
                        checked={!!item.attuned}
                        onChange={(e) => quickToggleEquipmentField(index, "attuned", e.target.checked)}
                      />
                      Sintonizado
                    </label>
                  </span>
                )}
                {looksAttackable(item.name) &&
                  (() => {
                    const equipmentEntry = equipmentData.find((e) => e.name === item.name);
                    const eligible = equipmentEntry && canPowerAttack(character, equipmentEntry);
                    return (
                      <>
                        {eligible && (
                          <label className="foundry-item-toggle" title="Ataque Poderoso (-5 no ataque, +10 no dano)">
                            <input
                              type="checkbox"
                              checked={powerAttackSelections.has(item.name)}
                              onChange={() => togglePowerAttack(item.name)}
                            />
                            Ataque Poderoso (-5/+10)
                          </label>
                        )}
                        <button type="button" className="foundry-item-attack" onClick={() => attackWith(item.name)}>
                          ⚔ Atacar
                        </button>
                      </>
                    );
                  })()}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow />
        )}
      </div>
    </div>
  );
}

// Traços de Classe/Subclasse -- `classesData`/`subclassesData` já têm um campo `features`
// curado (`[{level, name, description}]`, mesmo texto oficial usado no resto do projeto),
// só nunca era lido aqui. Filtrado até o nível ATUAL de cada classe (não mostra feature de
// nível futuro que o personagem ainda não tem).
function classFeatureGroups(character, classMatches) {
  return (character.classes ?? [])
    .map((row, index) => {
      if (!row.name) return null;
      const match = classMatches?.[index];
      const level = Number(row.level) || 0;
      const features = [...(match?.classData?.features ?? []), ...(match?.subclassData?.features ?? [])]
        .filter((f) => (f.level ?? 0) <= level)
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
      if (!features.length) return null;
      return { key: index, label: `${row.name}${row.subclass ? ` (${row.subclass})` : ""}`, features };
    })
    .filter(Boolean);
}

function FeatsTab({
  character,
  editable,
  onChange,
  raceMatch,
  classMatches,
  onApplySkills,
  onApplyTools,
  onApplyAbilityBonus,
  onApplyResistance,
  onRevertGrants,
}) {
  const featureGroups = classFeatureGroups(character, classMatches);
  const classChoiceEntries = (character.classChoices ?? []).map((c) => ({ ...c, match: findClassChoiceMatch(c) }));
  const masteryEntries = (character.weaponMasteryChoices ?? []).map((c) => c.weaponKey).filter(Boolean).map(weaponLabel);
  const proficiencyEntries = (character.weaponProficiencies ?? []).map((c) => weaponLabel(c.weaponKey));
  const enhancementEntries = (character.animalEnhancementChoices ?? []).map((c) => ({
    ...c,
    match: findAnimalEnhancementMatch(c.name),
  }));
  const [browserOpen, setBrowserOpen] = useState(false);

  function addFeat(item) {
    if (!(character.feats ?? []).some((f) => featName(f) === item.name)) {
      onChange({ feats: [...(character.feats ?? []), { name: item.name, rules: item.rules }] });
    }
    setBrowserOpen(false);
  }

  // Mesmo fix já aplicado no assistente de criação (FeatsInput.jsx) --
  // remover o talento sem desfazer o que ele concedeu (perícia/ferramenta/
  // bônus de atributo/resistência) deixava a concessão grudada pra sempre.
  function removeFeat(entry) {
    onChange({ feats: character.feats.filter((f) => featName(f) !== featName(entry)) });
    onRevertGrants?.(featName(entry));
  }

  return (
    <div className="foundry-feats-tab">
      <div className="foundry-box">
        <h4>Talentos</h4>
        {editable ? (
          <>
            <ul className="foundry-feature-list">
              {(character.feats ?? []).map((entry, index) => (
                <li key={index}>
                  <div className="feats-list-item-row">
                    <strong>{featName(entry)}</strong>
                    <button type="button" onClick={() => removeFeat(entry)}>
                      Remover
                    </button>
                  </div>
                  <FeatGrants
                    found={findFeatMatch(entry)}
                    skillProficiencies={character.skillProficiencies}
                    toolProficiencies={character.toolProficiencies}
                    onApplySkills={onApplySkills}
                    onApplyTools={onApplyTools}
                    onApplyAbilityBonus={onApplyAbilityBonus}
                    onApplyResistance={onApplyResistance}
                  />
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setBrowserOpen(true)}>
              Adicionar talento
            </button>
            {browserOpen && (
              <BrowserModal title="Talentos" onClose={() => setBrowserOpen(false)}>
                <FeatBrowser
                  items={featsData}
                  excludeNames={new Set((character.feats ?? []).map(featName))}
                  onAdd={addFeat}
                />
              </BrowserModal>
            )}
          </>
        ) : character.feats?.length ? (
          <ul className="foundry-feature-list">
            {character.feats.map((entry, index) => {
              const match = findFeatMatch(entry);
              return (
                <li key={index}>
                  <strong>{featName(entry)}</strong>
                  {match?.description && <p>{excerpt(match.description)}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyRow />
        )}
      </div>

      <div className="foundry-box">
        <h4>Traços da Raça</h4>
        {raceMatch?.traits?.length ? (
          <ul className="foundry-feature-list">
            {raceMatch.traits.map((trait, index) => (
              <li key={index}>
                <strong>{trait.name}</strong>
                {trait.description && <p>{excerpt(trait.description)}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow />
        )}
      </div>

      {featureGroups.map((group) => (
        <div className="foundry-box" key={group.key}>
          <h4>Traços de Classe · {group.label}</h4>
          <ul className="foundry-feature-list">
            {group.features.map((f, index) => (
              <li key={index}>
                <strong>
                  {f.name} <span className="field-hint">(nível {f.level})</span>
                </strong>
                {f.description && <p>{excerpt(f.description)}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {classChoiceEntries.length > 0 && (
        <div className="foundry-box">
          <h4>Escolhas de Classe</h4>
          <ul className="foundry-feature-list">
            {classChoiceEntries.map((entry, index) => (
              <li key={index}>
                <strong>
                  {entry.name}{" "}
                  <span className="field-hint">({CLASS_CHOICE_CATEGORY_LABELS[entry.category] ?? entry.category})</span>
                </strong>
                {entry.match?.description && <p>{excerpt(entry.match.description)}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enhancementEntries.length > 0 && (
        <div className="foundry-box">
          <h4>Aprimoramento Animal</h4>
          <ul className="foundry-feature-list">
            {enhancementEntries.map((entry, index) => (
              <li key={index}>
                <strong>{entry.name}</strong>
                {entry.match?.description && <p>{excerpt(entry.match.description)}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(masteryEntries.length > 0 || proficiencyEntries.length > 0) && (
        <div className="foundry-box">
          <h4>Armas — Maestria e Proficiência Concedida</h4>
          {masteryEntries.length > 0 && (
            <>
              <p className="field-hint">Maestria de Arma</p>
              <div className="foundry-tag-row">
                {masteryEntries.map((label, index) => (
                  <span key={index} className="foundry-tag">
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
          {proficiencyEntries.length > 0 && (
            <>
              <p className="field-hint">Proficiência de Arma (escolha aberta)</p>
              <div className="foundry-tag-row">
                {proficiencyEntries.map((label, index) => (
                  <span key={index} className="foundry-tag">
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Componentes V/S/M formatados igual 5etools ("V, S, M (a tiny ball of bat
// guano and sulfur)") -- `spell.components`, campo novo de `spells.json`
// (Fase A do plano "Tela de Magias").
function formatComponents(components) {
  if (!components) return "—";
  const letters = [];
  if (components.vocal) letters.push("V");
  if (components.somatic) letters.push("S");
  if (components.material) letters.push("M");
  if (!letters.length) return "—";
  let text = letters.join(", ");
  if (components.material && components.materialText) text += ` (${components.materialText})`;
  return text;
}

// Modal de detalhe da magia no formato 5etools (pedido do usuário, set/2026)
// -- ícone "ⓘ" ao lado do nome abre isso. `spell` é a entrada JÁ achatada de
// `spells.json` (campos novos: descriptionHtml/components/durationText/
// sourceBook/grantors, ver generate-spells-catalog.mjs).
function SpellInfoModal({ spell, onClose }) {
  const grantors = spell.grantors ?? {};
  return (
    <BrowserModal title={spell.name} onClose={onClose}>
      <div className="spell-info-modal">
        <p className="spell-info-subtitle">
          {spell.level === 0 ? "Truque" : `Nível ${spell.level}`} — {spell.school}
        </p>
        <div className="spell-info-meta-grid">
          <div>
            <strong>Tempo de Conjuração</strong>
            <span>{spell.time}</span>
          </div>
          <div>
            <strong>Alcance</strong>
            <span>{spell.range}</span>
          </div>
          <div>
            <strong>Componentes</strong>
            <span>{formatComponents(spell.components)}</span>
          </div>
          <div>
            <strong>Duração</strong>
            <span>
              {spell.durationText}
              {spell.concentration ? " (Concentração)" : ""}
            </span>
          </div>
        </div>
        {spell.descriptionHtml && (
          <div className="spell-info-description" dangerouslySetInnerHTML={{ __html: spell.descriptionHtml }} />
        )}
        {spell.classes?.length > 0 && (
          <p className="spell-info-grantors">
            <strong>Classes:</strong> {spell.classes.join(", ")}
          </p>
        )}
        {grantors.subclasses?.length > 0 && (
          <p className="spell-info-grantors">
            <strong>Subclasses:</strong> {grantors.subclasses.join(", ")}
          </p>
        )}
        {grantors.optionalVariantClasses?.length > 0 && (
          <p className="spell-info-grantors">
            <strong>Classes Opcionais/Variante:</strong> {grantors.optionalVariantClasses.join(", ")}
          </p>
        )}
        {grantors.feats?.length > 0 && (
          <p className="spell-info-grantors">
            <strong>Talentos:</strong> {grantors.feats.join(", ")}
          </p>
        )}
        {spell.sourceBook && (
          <p className="spell-info-source">
            Fonte: {spell.sourceBook}
            {spell.rules ? ` (${spell.rules})` : ""}
          </p>
        )}
      </div>
    </BrowserModal>
  );
}

// Ícone "ⓘ" que abre o SpellInfoModal -- `spell` pode ser `null` (magia sem
// correspondência no banco, ex: nome digitado errado à mão) e nesse caso o
// ícone nem aparece, não tem o que mostrar.
function SpellInfoButton({ spell }) {
  const [open, setOpen] = useState(false);
  if (!spell) return null;
  return (
    <>
      <button type="button" className="spell-info-icon" onClick={() => setOpen(true)} aria-label={`Detalhes de ${spell.name}`}>
        ⓘ
      </button>
      {open && <SpellInfoModal spell={spell} onClose={() => setOpen(false)} />}
    </>
  );
}

// Ataque/dano/cura/CD de magia -- porta o mesmo componente já validado ao
// vivo no app (`SpellRollActions`, `app/src/components/character/
// SpellsTab.js`), só que rolando LOCAL no navegador em vez de `onRollD20`/
// `roll` (RN) -- ver `utils/rollDice.js` pro porquê. Só aparece quando a
// magia tem mecânica REAL extraída (`spell.match.activities[0]`); sem isso,
// nenhum botão (não inventa).
function SpellRollActions({ spell, character, totalLevel }) {
  const [result, setResult] = useState(null);
  const activity = spell.match?.activities?.[0];
  if (!activity) return null;

  function doRoll(label, formula) {
    setResult(formula ? { label, ...rollFormula(formula) } : null);
  }

  const buttons = [];
  if (activity.type === "attack") {
    const atkMod = spellAttackMod(character, totalLevel, { equipmentData });
    if (atkMod != null) {
      buttons.push(
        <button key="atk" type="button" className="foundry-item-attack" onClick={() => doRoll(`${spell.name} (ataque)`, `1d20${atkMod >= 0 ? "+" : ""}${atkMod}`)}>
          ⚔ Ataque
        </button>,
      );
    }
    const dmg = spellDamageFormula(activity, character, totalLevel);
    if (dmg) {
      buttons.push(
        <button key="dmg" type="button" className="foundry-item-attack" onClick={() => doRoll(`${spell.name} (dano)`, dmg)}>
          🎲 Dano
        </button>,
      );
    }
  } else if (activity.type === "damage") {
    const dmg = spellDamageFormula(activity, character, totalLevel);
    if (dmg) {
      buttons.push(
        <button key="dmg" type="button" className="foundry-item-attack" onClick={() => doRoll(`${spell.name} (dano)`, dmg)}>
          🎲 Dano
        </button>,
      );
    }
  } else if (activity.type === "heal") {
    const heal = spellHealFormula(activity, character, totalLevel);
    if (heal) {
      buttons.push(
        <button key="heal" type="button" className="foundry-item-attack" onClick={() => doRoll(`${spell.name} (cura)`, heal)}>
          💚 Cura
        </button>,
      );
    }
  } else if (activity.type === "save") {
    const dc = spellSaveDC(character, totalLevel, { equipmentData });
    if (dc != null) buttons.push(<span key="cd" className="foundry-spell-meta">CD {dc}</span>);
    const dmg = activity.damage ? spellDamageFormula(activity, character, totalLevel) : null;
    if (dmg) {
      buttons.push(
        <button key="dmg" type="button" className="foundry-item-attack" onClick={() => doRoll(`${spell.name} (dano)`, dmg)}>
          🎲 Dano
        </button>,
      );
    }
  }
  if (!buttons.length) return null;

  return (
    <span className="foundry-spell-roll-actions">
      {buttons}
      {result && (
        <span className="ac-breakdown-popover foundry-spell-roll-popover">
          <p className="ac-breakdown-note">{result.label}</p>
          {result.rolls ? (
            <>
              <ul className="ac-breakdown-list">
                <li>
                  <span>{result.formula}</span>
                  <span>{result.rolls.join(" + ")}{result.bonus ? ` ${result.bonus >= 0 ? "+" : ""}${result.bonus}` : ""}</span>
                </li>
              </ul>
              <p className="ac-breakdown-total">Total: {result.total}</p>
            </>
          ) : (
            <p className="ac-breakdown-note">Fórmula não reconhecida.</p>
          )}
          <button type="button" className="ac-breakdown-use-auto" onClick={() => setResult(null)}>
            Fechar
          </button>
        </span>
      )}
    </span>
  );
}

// Estatísticas de conjuração do personagem (não de uma magia específica) --
// mesmas `spellAttackMod`/`spellSaveDC` já usadas por magia em
// `SpellRollActions`, calculadas uma vez só pra classe conjuradora
// encontrada. Sem classe conjuradora, mostra "—" em vez de esconder o
// cabeçalho (decisão do usuário) -- nunca inventa um número.
// `extra` (opcional): conteúdo extra ancorado à direita do cabeçalho (hoje só
// o ícone-toggle do Mechagrimório, Tecnomancer) -- posicionado via `position:
// absolute` dentro do wrapper, pra NUNCA deslocar os dois badges normais de
// nenhuma outra classe/subclasse (só ocupa espaço quando existe).
function SpellStatsHeader({ character, totalLevel, extra }) {
  const atkMod = spellAttackMod(character, totalLevel, { equipmentData });
  const dc = spellSaveDC(character, totalLevel, { equipmentData });
  return (
    <div className="foundry-spell-stats-header">
      <div className="spell-stat-badge attack">
        <div className="spell-stat-badge-frame">
          <img src="/spell-icons/spell-attack-icon.png" alt="" />
          <span className="spell-stat-badge-value">{atkMod == null ? "—" : fmtMod(atkMod)}</span>
        </div>
        <span className="spell-stat-badge-label">Ataque com Magia</span>
      </div>
      <div className="spell-stat-badge save">
        <div className="spell-stat-badge-frame">
          <img src="/spell-icons/spell-save-dc-icon.png" alt="" />
          <span className="spell-stat-badge-value">{dc == null ? "—" : dc}</span>
        </div>
        <span className="spell-stat-badge-label">CD de Resistência</span>
      </div>
      {extra}
    </div>
  );
}

// Bloco de listagem (agrupado por nível) extraído de `SpellsTab` pra poder
// renderizar tanto a lista normal de magias conhecidas quanto a do
// Mechagrimório (Tecnomancer) com o MESMO layout/visual -- só muda quais
// `entries` entram.
function SpellListGroups({ entries, character, totalLevel }) {
  const byLevel = new Map();
  for (const entry of entries) {
    const level = entry.match?.level ?? 0;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(entry);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  return (
    <>
      {levels.map((level) => (
        <div className="foundry-box" key={level}>
          <div className="foundry-box-header-row">
            <h4>{level === 0 ? "Truques" : `Nível ${level}`}</h4>
            <span>Escola · Tempo · Alcance</span>
          </div>
          <ul className="foundry-item-list foundry-spell-list">
            {byLevel
              .get(level)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((entry, index) => (
                <li key={index}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-item-name">
                    {entry.name}
                    {entry.prepared ? " (preparada)" : ""}
                  </span>
                  <SpellInfoButton spell={entry.match} />
                  {entry.match && (
                    <span className="foundry-spell-meta">
                      {SCHOOL_ABBR[entry.match.school] ?? entry.match.school} · {entry.match.time} ·{" "}
                      {entry.match.range}
                    </span>
                  )}
                  <SpellRollActions spell={entry} character={character} totalLevel={totalLevel} />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function SpellsTab({ character, editable, onChange, classMatches, totalLevel }) {
  const entries = (character.spells ?? []).map((s) => ({
    ...s,
    match: findSpellMatch(s.name, character.rulesMode),
  }));

  // Mechagrimório (Tecnomancer, Artificer): não é uma lista própria guardada
  // à parte -- as magias escolhidas pelo jogador já entram em
  // `character.spells` normalmente (o SpellBrowser já libera a lista de
  // Wizard pra essa subclasse via `computeExpandedSpellPool`/`spellGrants.
  // expanded`). O toggle só FILTRA, dentro do que o personagem já tem, quais
  // nomes vieram dessa expansão (`source === "Tecnomancer"`) -- é a mesma
  // lista de sempre, só que mostrando apenas a fatia do grimório.
  const hasMechagrimorio = Object.values(classMatches ?? {}).some((m) => m?.subclassData?.name === "Tecnomancer");
  const [showMechagrimorio, setShowMechagrimorio] = useState(false);
  const mechagrimorioNames = hasMechagrimorio
    ? new Set(
        computeExpandedSpellPool({ character, classMatches, spellsData })
          .filter((p) => p.source === "Tecnomancer")
          .map((p) => p.name),
      )
    : null;
  const visibleEntries = showMechagrimorio ? entries.filter((e) => mechagrimorioNames.has(e.name)) : entries;
  const headerExtra = hasMechagrimorio && (
    <button
      type="button"
      className={`mechagrimorio-toggle${showMechagrimorio ? " active" : ""}`}
      onClick={() => setShowMechagrimorio((v) => !v)}
      title="Mechagrimório"
    >
      <img src="/spell-icons/mechagrimorio-icon.png" alt="Mechagrimório" />
    </button>
  );

  const [browserOpen, setBrowserOpen] = useState(false);

  function addSpell(name) {
    if (!(character.spells ?? []).some((s) => s.name === name)) {
      onChange({ spells: [...(character.spells ?? []), { name, prepared: false }] });
    }
    setBrowserOpen(false);
  }

  if (editable) {
    // Classe "sabe a lista toda" (Clérigo/Druida/Paladino/Patrulheiro 2014/Artífice) não
    // "adiciona" magia -- já tem acesso à lista inteira (até o círculo que já conjura), só
    // marca quais preparar (ver schema/spellProgression.js `fullListSpellPool`, mesma
    // mudança já feita em StepMagias.jsx). Essas saem do buscador/`ListEditor` genérico e
    // ganham o checklist próprio abaixo; truque e magia de classe "conhece fixo"/grimório
    // continuam no fluxo de sempre.
    const spellCaps = spellProgressionForCharacter(character, classMatches);
    const fullPool = fullListSpellPool(character, classMatches, spellsData, spellCaps);
    const fullPoolNames = new Set(fullPool.map((s) => s.name));
    const checklistSpells = (character.spells ?? []).filter((s) => fullPoolNames.has(s.name));
    const otherSpells = (character.spells ?? []).filter((s) => !fullPoolNames.has(s.name));

    const allowedSpellNames = computeAllowedSpellNames({ character, classMatches, spellsData });
    for (const name of fullPoolNames) allowedSpellNames.delete(name);

    function toggleFullListSpell(name, checked) {
      if (checked) {
        if ((character.spells ?? []).some((s) => s.name === name)) return;
        onChange({ spells: [...(character.spells ?? []), { name, prepared: true }] });
      } else {
        onChange({ spells: (character.spells ?? []).filter((s) => s.name !== name) });
      }
    }

    return (
      <div className="foundry-spells-tab">
        <SpellStatsHeader character={character} totalLevel={totalLevel} />
        {fullPool.length > 0 && (
          <div className="foundry-box">
            <h4>Magias que já tem acesso (marque as preparadas)</h4>
            <PreparedSpellChecklist pool={fullPool} activeNames={new Set(checklistSpells.map((s) => s.name))} atCap={false} onToggle={toggleFullListSpell} />
          </div>
        )}
        <div className="foundry-box">
          <h4>Magias Conhecidas/Preparadas</h4>
          <ListEditor
            items={otherSpells}
            onChange={(items) => onChange({ spells: [...items, ...checklistSpells] })}
            allowAdd={false}
            fields={[
              { key: "name", label: "Nome" },
              { key: "prepared", label: "Preparada", type: "checkbox" },
            ]}
          />
          <button type="button" onClick={() => setBrowserOpen(true)}>
            Adicionar magia
          </button>
          {browserOpen && (
            <BrowserModal title="Magias" onClose={() => setBrowserOpen(false)}>
              <SpellBrowser spells={spellsData} rulesMode={character.rulesMode} allowedNames={allowedSpellNames} onAdd={addSpell} />
            </BrowserModal>
          )}
        </div>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="foundry-spells-tab">
        <SpellStatsHeader character={character} totalLevel={totalLevel} extra={headerExtra} />
        <EmptyRow />
      </div>
    );
  }

  return (
    <div className="foundry-spells-tab">
      <SpellStatsHeader character={character} totalLevel={totalLevel} extra={headerExtra} />
      {showMechagrimorio && !visibleEntries.length ? (
        <p className="field-hint">Nenhuma magia do Mechagrimório conhecida ainda.</p>
      ) : (
        <SpellListGroups entries={visibleEntries} character={character} totalLevel={totalLevel} />
      )}
    </div>
  );
}

function BiographyTab({ character, editable, onChange }) {
  const appearance = character.appearance ?? {};
  const personality = character.personality ?? {};

  function setAppearance(key, value) {
    onChange({ appearance: { ...appearance, [key]: value } });
  }
  function setPersonality(key, value) {
    onChange({ personality: { ...personality, [key]: value } });
  }

  const characteristics = [
    ["eyes", "Olhos"],
    ["height", "Altura"],
    ["faith", "Fé"],
    ["hair", "Cabelo"],
    ["weight", "Peso"],
    ["gender", "Gênero"],
    ["skin", "Pele"],
    ["age", "Idade"],
  ];

  return (
    <div className="foundry-biography-tab">
      <div className="foundry-bio-grid">
        {editable ? (
          <>
            <label>
              Alinhamento
              <select value={character.alignment || ""} onChange={(e) => onChange({ alignment: e.target.value })}>
                <option value="">—</option>
                {ALIGNMENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            {characteristics.map(([key, label]) => (
              <label key={key}>
                {label}
                <input type="text" value={appearance[key] ?? ""} onChange={(e) => setAppearance(key, e.target.value)} />
              </label>
            ))}
          </>
        ) : (
          <>
            <label>
              Alinhamento
              <span>{character.alignment || "—"}</span>
            </label>
            {characteristics.map(([key, label]) => (
              <label key={key}>
                {label}
                <span>{appearance[key] || "—"}</span>
              </label>
            ))}
          </>
        )}
      </div>

      <div className="foundry-bio-cols">
        {[
          ["ideal", "Ideal"],
          ["trait", "Traços de Personalidade"],
          ["bond", "Vínculo"],
        ].map(([key, label]) => (
          <section key={key}>
            <h4>{label}</h4>
            {editable ? (
              <textarea value={personality[key] ?? ""} onChange={(e) => setPersonality(key, e.target.value)} />
            ) : (
              <p>{personality[key] || "—"}</p>
            )}
          </section>
        ))}
        <section>
          <h4>Aparência</h4>
          {editable ? (
            <textarea value={appearance.description ?? ""} onChange={(e) => setAppearance("description", e.target.value)} />
          ) : (
            <p>{appearance.description || "—"}</p>
          )}
        </section>
        <section>
          <h4>Defeito</h4>
          {editable ? (
            <textarea value={personality.flaw ?? ""} onChange={(e) => setPersonality("flaw", e.target.value)} />
          ) : (
            <p>{personality.flaw || "—"}</p>
          )}
        </section>
      </div>

      <section className="foundry-bio-full">
        <h4>Biografia</h4>
        {editable ? (
          <textarea value={character.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} />
        ) : (
          <p>{character.notes || "—"}</p>
        )}
      </section>
    </div>
  );
}

// Campos que essa view sabe editar — o resto do documento (classes, raça,
// escolhas de classe, magias concedidas etc.) é estrutural e continua só no
// Assistente completo, pra não duplicar/discordar da lógica de lá.
const EDITABLE_KEYS = [
  "name", "alignment", "inspiration", "hp", "hpAuto", "ac", "acAuto", "abilities",
  "senses", "size", "toolProficiencies", "languages", "skillProficiencies", "skillExpertise",
  "currency", "equipment", "feats", "spells",
  "personality", "appearance", "notes",
  // Achado ao vivo portando FeatGrants pra cá (Lote 52, nov/2026): sem essas
  // 2 chaves, escolher resistência/perícia/ferramenta de um talento aqui
  // aplicava certo na UI mas "Salvar" descartava silenciosamente --
  // `featGrants`/`raceResistancePicks` nunca estavam no whitelist porque
  // nada escrevia neles a partir desta tela antes.
  "featGrants", "raceResistancePicks",
];

// Visual inspirado na ficha real do Foundry (cabeçalho escuro, retrato,
// abas Detalhes/Inventário/Talentos/Magias/Biografia, iguais à
// navegação de verdade do sistema dnd5e) mas com a IDENTIDADE VISUAL do
// site (cores/fonte de src/index.css :root), não uma cópia literal do tema
// do Foundry — pedido explícito do usuário. Ganhou um toggle "Editar" (como
// o próprio Foundry tem) pra edição rápida in-loco, sem precisar do
// Assistente completo de várias etapas.
export function FoundrySheetView({ character, onSave, profileId }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(character);
  // Caixa vermelha (pedido do usuário, nov/2026): toggles persistentes --
  // ficam ligados até o jogador trocar de volta, nunca "gastam" depois de 1
  // rolagem. Afetam só o motor LOCAL (chat geral); o pedido pendente pro
  // Foundry (sendRollRequest, chat individual) nunca usa isso -- o Foundry
  // já tem o próprio jeito de pedir vantagem/sussurro quando resolver de
  // verdade. `visibility` (geral/sussurro) é só filtro VISUAL no chat, não
  // segurança de verdade -- ver pending_whisper_not_real_privacy.
  const [advantageMode, setAdvantageMode] = useState(ADV_MODE.NORMAL);
  const [visibility, setVisibility] = useState("general");
  // Janela pra digitar um ajuste de PV maior que 1 (clique no círculo de PV)
  // -- `hpModalValue` aceita "-5" (subtrai) ou "5" (soma), mesmo delta que
  // `quickAdjustHp` já aplica nos botões −/+.
  const [hpModalOpen, setHpModalOpen] = useState(false);
  const [hpModalValue, setHpModalValue] = useState("");
  // Mensagem do botão "Atualizar" (ver `refreshFromDatabase` abaixo) --
  // limpa sempre que a sessão de edição muda de estado, pra nunca sobrar
  // uma mensagem de uma rodada de edição anterior.
  const [updateFeedback, setUpdateFeedback] = useState(null);

  useEffect(() => {
    if (!editing) setDraft(character);
  }, [character, editing]);

  const view = editing ? draft : character;

  function onChange(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  // Achado ao vivo testando o Lote 52 (resistência a dano, nov/2026): a
  // ficha editável NUNCA tinha nenhum picker de concessão de talento (nem
  // resistência, nem bônus de atributo, nem perícia/ferramenta mista do
  // Skilled) -- `FeatsTab` só adicionava o NOME via FeatBrowser, sem jeito
  // de aplicar o que o talento concede. Reaproveita o MESMO `FeatGrants` já
  // testado no assistente de criação -- `setDraft` tem a mesma assinatura
  // de setter que `useCharacterAppliers` espera (`(prev) => next`), então
  // funciona sem adaptação.
  const appliers = useCharacterAppliers(setDraft);

  function startEdit() {
    setDraft(character);
    setUpdateFeedback(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(character);
    setUpdateFeedback(null);
    setEditing(false);
  }

  function save() {
    const patch = Object.fromEntries(EDITABLE_KEYS.map((key) => [key, draft[key]]));
    onSave?.(patch);
    setUpdateFeedback(null);
    setEditing(false);
  }

  // Botão "Atualizar" (sessão editável) -- pedido do usuário (nov/2026):
  // sincroniza só CONTEÚDO do banco (texto/mecânica/dado), nunca uma
  // escolha do jogador nem um campo que a própria ficha já deixa editar à
  // mão. Bônus de atributo fica de fora por completo (a habilidade
  // escolhida é sempre do jogador, mesmo quando a quantidade vem fixa do
  // banco) e Sentidos também (tem edição manual própria na ficha, ver
  // SensesInput -- sobrescrever sem critério apagaria um ajuste manual do
  // jogador). Hoje o ÚNICO campo que sobra sem nenhum desses problemas é o
  // Tamanho da raça (`size`): é puro dado do banco, nunca uma escolha, e a
  // ficha não tem campo pra editá-lo à mão. Qualquer campo novo que vier a
  // se encaixar no mesmo critério entra aqui depois.
  function refreshFromDatabase() {
    if (!raceMatch) {
      setUpdateFeedback("Nenhuma raça selecionada pra atualizar.");
      return;
    }
    if (!raceMatch.size || raceMatch.size === view.size) {
      setUpdateFeedback("Já está atualizado.");
      return;
    }
    const from = view.size ?? "—";
    onChange({ size: raceMatch.size });
    setUpdateFeedback(`Tamanho atualizado: ${from} → ${raceMatch.size}.`);
  }

  const totalLevel = (view.classes ?? []).filter((c) => c.name).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
  const classSummary = (view.classes ?? [])
    .filter((c) => c.name)
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ""} ${c.level}`)
    .join(" / ");
  const prof = proficiencyBonus(totalLevel);

  // `useMemo` chaveado nos campos específicos que cada busca usa (não em `view`
  // inteiro): como `onChange`/`setDraft` só faz um spread raso, `view.classes`/
  // `view.race`/etc. mantêm a MESMA referência entre renders sempre que o campo
  // editado não é esse — sem isso, digitar em "Notas"/Biografia (que não afeta
  // raça/classe/CA) reprocessava essas 4 buscas (cada uma varrendo o JSON de
  // conteúdo, centenas de KB) a cada tecla.
  const raceMatch = useMemo(() => findRaceMatch(view), [view.race, view.raceRules]);
  const classMatches = useMemo(
    () => Object.values(resolveClassMatches(view.classes, view.rulesMode)),
    [view.classes, view.rulesMode],
  );
  // Só a classe INICIAL (primeira da lista) concede proficiência de teste de
  // resistência/armadura/arma em multiclasse — mesma convenção de PV máximo
  // já usada no resto do projeto (ver item 15 da memória do projeto).
  const originalClassMatch = useMemo(() => findClassMatch(view.classes?.[0], view.rulesMode), [view.classes, view.rulesMode]);
  const initiative = abilityMod(view.abilities?.dex ?? 10);
  const speed = raceMatch?.speed;
  const hp = view.hp ?? { value: 0, max: 0, temp: 0 };
  // CA automática: recalculada a partir do personagem atual (mesmo padrão de
  // Iniciativa/Deslocamento acima) enquanto `acAuto` estiver ligado. Editar o
  // campo na ficha desliga `acAuto` e passa a usar o número travado em `view.ac`.
  // `computeArmorClass` só lê `abilities`/`equipment`/`classes`/`race` — chaveando
  // nesses 4 em vez de `view` inteiro, editar campos não relacionados (nome,
  // biografia, PV manual etc.) não repete a varredura de `equipment.json`.
  const acBreakdown = useMemo(
    () => computeArmorClassBreakdown(view, { equipmentData }),
    [view.abilities, view.equipment, view.classes, view.race],
  );
  const computedAc = acBreakdown.total;
  const acAuto = view.acAuto ?? true;
  const displayedAc = acAuto ? computedAc : view.ac;
  const [showAcBreakdown, setShowAcBreakdown] = useState(false);
  const acBadgeRef = useRef(null);
  useEffect(() => {
    if (!showAcBreakdown) return;
    function handleClickOutside(event) {
      if (acBadgeRef.current && !acBadgeRef.current.contains(event.target)) setShowAcBreakdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAcBreakdown]);
  function setManualAc(value) {
    onChange({ ac: value, acAuto: false });
  }
  function resetAcToAuto() {
    onChange({ ac: computeArmorClass(view, { equipmentData }), acAuto: true });
  }
  // Botão "Usar automático" do tooltip -- precisa funcionar tanto editando
  // (grava no rascunho, igual `resetAcToAuto`, só persiste no "Salvar") quanto
  // FORA da edição (grava direto via `onSave`, mesmo padrão de
  // `quickToggleEquipmentField` do Inventário -- equipar item e destravar CA
  // manual são as duas metades do mesmo fluxo: "acabei de mudar o equipamento,
  // quero que a CA reflita isso agora", sem forçar entrar no modo de edição).
  function useAutomaticAc() {
    if (editing) resetAcToAuto();
    else onSave?.({ ac: acBreakdown.total, acAuto: true });
    setShowAcBreakdown(false);
  }

  // Mesmo padrão pro PV MÁXIMO -- `hp.value` (PV atual) continua sempre editável
  // direto, independente de `hpAuto` (pode cair por dano, isso não é "cálculo
  // errado"). `computeHitPoints` só lê classes/hpRolls/Constituição/feats/raça.
  const computedHpMax = useMemo(
    () => computeHitPoints(view, { classesData }),
    [view.classes, view.abilities?.con, view.feats, view.race, view.raceRules],
  );
  const hpAuto = view.hpAuto ?? true;
  const displayedHpMax = hpAuto ? computedHpMax : hp.max;
  // Achado real implementando Death Saves (nov/2026): `hp.max:0` salvo no
  // banco só acontece pra personagem cujo PV NUNCA foi tocado nem uma vez
  // (criado antes de ter 0 real de propósito) -- é o mesmo sinal que
  // `hp.value||displayedHpMax||0` já usa há tempos pra mostrar "cheio" em
  // vez de "0/0" assustador. Guardado aqui (`hpInitialized`) como o sinal
  // CONFIÁVEL de "este personagem já foi tocado de verdade" -- nenhum dos
  // dois caminhos que escrevem `hp.value` (edição completa logo abaixo e
  // `quickAdjustHp`) grava mais sem também preencher `max` de verdade, então
  // a partir de agora qualquer personagem que chegar a 0 PV de propósito
  // tem como ser distinguido de um que simplesmente nunca foi mexido.
  const hpInitialized = (hp.max ?? 0) > 0;
  const displayedHpValue = hpInitialized ? (hp.value ?? 0) : hp.value || displayedHpMax || 0;
  function setManualHpMax(value) {
    onChange({ hp: { ...hp, max: value }, hpAuto: false });
  }
  function resetHpMaxToAuto() {
    onChange({ hp: { ...hp, max: computeHitPoints(view, { classesData }) }, hpAuto: true });
  }

  // PV rápido (+/-) fora do modo de edição -- pedido do usuário (nov/2026),
  // mesmo padrão de `quickToggleEquipmentField` (Inventário)/`useAutomaticAc`
  // acima: grava direto via `onSave`, sem precisar entrar em "Editar ficha".
  // Zera os Death Saves sozinho ao sair de 0 -- regra oficial (o próprio
  // Foundry faz o mesmo: qualquer PV acima de 0 reseta os dois contadores).
  // SEMPRE preenche `max` de verdade junto (nunca só `value` sozinho) --
  // ver comentário de `hpInitialized` acima, é o que torna "0 de verdade"
  // diferente de "nunca foi tocado" a partir de agora.
  function quickAdjustHp(delta) {
    if (editing || !onSave) return;
    const max = displayedHpMax ?? 0;
    const next = Math.max(0, Math.min(max, displayedHpValue + delta));
    const patch = { hp: { ...hp, value: next, max } };
    if (next > 0 && ((character.deathSaves?.success ?? 0) > 0 || (character.deathSaves?.failure ?? 0) > 0)) {
      patch.deathSaves = { success: 0, failure: 0 };
    }
    onSave(patch);
  }

  // Mesmo ajuste de cima, só que com um delta digitado (janela aberta ao
  // clicar no círculo de PV) em vez de sempre ±1 -- "-5" subtrai, "5" soma.
  function applyHpModalValue() {
    const delta = Number(hpModalValue);
    setHpModalOpen(false);
    if (!Number.isFinite(delta) || delta === 0) return;
    quickAdjustHp(delta);
  }

  // Teste de Resistência contra a Morte -- d20 fixo vs CD 10 (localRolls.js),
  // atualiza os contadores direto (sem edição) e manda o resultado só pro
  // chat GERAL (mesma lógica de visibilidade/vantagem da caixa vermelha).
  // Regra oficial: 20 natural = volta com 1 PV; 1 natural conta como 2
  // falhas; 3 sucessos estabiliza (zera os dois); 3 falhas = morreu (fica
  // nos 3, não zera sozinho -- só reseta de novo quando o PV subir).
  function rollDeathSave() {
    if (!onSave) return;
    const roll = rollDeathSaveD20(advantageMode);
    const natural = roll.rolls[0];
    const current = character.deathSaves ?? { success: 0, failure: 0 };
    let patch;
    if (natural === 20) {
      patch = { hp: { ...hp, value: 1, max: displayedHpMax ?? 0 }, deathSaves: { success: 0, failure: 0 } };
    } else if (natural >= 10) {
      const success = Math.min(3, current.success + 1);
      patch = { deathSaves: success >= 3 ? { success: 0, failure: 0 } : { ...current, success } };
    } else {
      const failure = Math.min(3, current.failure + (natural === 1 ? 2 : 1));
      patch = { deathSaves: { ...current, failure } };
    }
    onSave(patch);
    sendLocalRoll(profileId, {
      sourceId: character.id,
      authorName: character.name,
      request: { type: "deathSave" },
      result: { formula: roll.formula, total: roll.total, isCritical: natural === 20, isFumble: natural === 1 },
      visibility,
    });
  }

  const [tab, setTab] = useState("details");

  const tabProps = {
    character: view,
    editable: editing,
    onChange,
    originalClassMatch,
    totalLevel,
    raceMatch,
    classMatches,
    profileId,
    onSave,
    advantageMode,
    visibility,
    onApplySkills: appliers.applyFeatSkills,
    onApplyTools: appliers.applyFeatTools,
    onApplyAbilityBonus: appliers.applyAbilityBonusFor,
    onApplyResistance: appliers.applyFeatResistances,
    onRevertGrants: (name) => {
      appliers.revertFeatGrants(name);
      appliers.revertAbilityBonusFor(`feat-${name}`);
    },
  };
  const printTabProps = { ...tabProps, character, editable: false, onChange: () => {}, onSave: undefined };

  return (
    <div className="foundry-sheet">
      <div className="foundry-sheet-toolbar">
        <div className="foundry-sheet-toolbar-export">
          <button type="button" onClick={() => downloadCharacterJSON(character)}>
            ⬇ Baixar JSON
          </button>
          <button type="button" onClick={() => window.print()} title='Abre a caixa de impressão — escolha "Salvar como PDF" como destino'>
            🖶 Baixar PDF
          </button>
        </div>
        {onSave && (
          <div className="foundry-sheet-toolbar-edit">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={refreshFromDatabase}
                  title="Sincroniza com o banco de dados campos que não são escolha do jogador (ex: Tamanho da raça)"
                >
                  ⟳ Atualizar
                </button>
                {updateFeedback && <span className="foundry-sheet-update-feedback">{updateFeedback}</span>}
                <button type="button" className="foundry-sheet-save" onClick={save}>
                  Salvar
                </button>
                <button type="button" onClick={cancelEdit}>
                  Cancelar
                </button>
              </>
            ) : (
              <button type="button" onClick={startEdit}>
                ✎ Editar ficha
              </button>
            )}
          </div>
        )}
      </div>

      <header className="foundry-sheet-header">
        <div className="foundry-sheet-portrait">
          {view.imageUrl ? (
            <img src={view.imageUrl} alt={view.name} />
          ) : (
            <div className="foundry-sheet-portrait-empty">?</div>
          )}
        </div>
        <div className="foundry-sheet-heading">
          {editing ? (
            <input
              type="text"
              className="foundry-sheet-name-input"
              value={view.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Nome do personagem"
            />
          ) : (
            <h2>{view.name || "Sem nome"}</h2>
          )}
          <p className="foundry-sheet-subtitle">
            {view.race || "—"} · {view.background || "—"} · {classSummary || "—"}
          </p>
          <div className="foundry-sheet-heading-tags">
            {!editing && view.alignment && <span className="foundry-sheet-alignment">{view.alignment}</span>}
            <label className="foundry-tag foundry-tag-gold foundry-inspiration-toggle">
              {editing ? (
                <input
                  type="checkbox"
                  checked={!!view.inspiration}
                  onChange={(e) => onChange({ inspiration: e.target.checked })}
                />
              ) : (
                view.inspiration && "Inspiração"
              )}
              {editing && " Inspiração"}
            </label>
          </div>
        </div>
        <div className="foundry-sheet-badges">
          <div className="foundry-sheet-badge">
            <span className="foundry-sheet-badge-value">{totalLevel || "—"}</span>
            <span className="foundry-sheet-badge-label">Nível</span>
          </div>
          <div className="foundry-sheet-badge">
            <span className="foundry-sheet-badge-value">{fmtMod(prof)}</span>
            <span className="foundry-sheet-badge-label">Proficiência</span>
          </div>
          <div className="foundry-sheet-badge">
            <span className="foundry-sheet-badge-value">{fmtMod(initiative)}</span>
            <span className="foundry-sheet-badge-label">Iniciativa</span>
          </div>
          <div className="foundry-sheet-badge" title={raceMatch ? undefined : "Escolha uma raça pra saber o deslocamento"}>
            <span className="foundry-sheet-badge-value">{formatSpeed(speed) ?? "—"}</span>
            <span className="foundry-sheet-badge-label">Deslocamento</span>
          </div>
          <div ref={acBadgeRef} className={`foundry-sheet-badge foundry-sheet-badge-ac ${editing ? "foundry-sheet-badge-editable" : ""}`}>
            {editing ? (
              <input
                type="number"
                className="foundry-sheet-badge-input"
                value={displayedAc ?? 10}
                onChange={(e) => setManualAc(Number(e.target.value))}
              />
            ) : (
              <span
                className="foundry-sheet-badge-value foundry-sheet-badge-value-clickable"
                onClick={() => setShowAcBreakdown((v) => !v)}
                title="Ver de onde vem a CA"
              >
                {displayedAc ?? "—"}
              </span>
            )}
            <span
              className="foundry-sheet-badge-label foundry-sheet-badge-label-clickable"
              onClick={() => setShowAcBreakdown((v) => !v)}
              title="Ver de onde vem a CA"
            >
              CA{!acAuto && " (manual)"}
            </span>
            {editing && !acAuto && (
              <button
                type="button"
                className="foundry-sheet-badge-reset"
                title="Voltar a calcular a CA automaticamente"
                onClick={resetAcToAuto}
              >
                ↺
              </button>
            )}
            {showAcBreakdown && (
              <div className="ac-breakdown-popover" onClick={(e) => e.stopPropagation()}>
                {!acAuto && (
                  <p className="ac-breakdown-note">
                    CA definida manualmente ({view.ac}) — abaixo está o que o cálculo automático daria:
                  </p>
                )}
                <ul className="ac-breakdown-list">
                  {acBreakdown.parts.map((part, index) => (
                    <li key={index}>
                      <span>{part.label}</span>
                      <span>{part.value >= 0 ? `+${part.value}` : part.value}</span>
                    </li>
                  ))}
                </ul>
                <p className="ac-breakdown-total">
                  Total automático: <strong>{acBreakdown.total}</strong>
                </p>
                {!acAuto && onSave && (
                  <button type="button" className="ac-breakdown-use-auto" onClick={useAutomaticAc}>
                    Usar automático ({acBreakdown.total})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className={`foundry-sheet-badge foundry-sheet-badge-hp ${editing ? "foundry-sheet-badge-editable" : ""}`}>
            {editing ? (
              <span className="foundry-sheet-hp-inputs">
                <input
                  type="number"
                  value={hp.value ?? 0}
                  // Preenche `max` de verdade junto -- ver comentário de
                  // `hpInitialized` acima: sem isso, digitar só o PV ATUAL
                  // aqui (deixando o máximo como está) nunca tornaria "0 de
                  // verdade" distinguível de "nunca foi tocado".
                  onChange={(e) =>
                    onChange({ hp: { ...hp, value: Number(e.target.value), max: displayedHpMax ?? 0 } })
                  }
                />
                /
                <input
                  type="number"
                  value={displayedHpMax ?? 0}
                  onChange={(e) => setManualHpMax(Number(e.target.value))}
                />
              </span>
            ) : (
              <span className="foundry-sheet-badge-value foundry-hp-quick-row">
                {onSave && (
                  <button type="button" className="foundry-hp-quick-btn" onClick={() => quickAdjustHp(-1)} title="Dano (-1)">
                    −
                  </button>
                )}
                {/* PV atual continua manual de verdade, mas parte igual ao máximo
                    enquanto ninguém mexeu nele -- sem isso, um personagem recém-criado
                    mostraria "0/12" (parece caído/inconsciente) em vez de cheio. */}
                <span
                  className={onSave ? "foundry-hp-value-clickable" : undefined}
                  onClick={() => {
                    if (!onSave) return;
                    setHpModalValue("");
                    setHpModalOpen(true);
                  }}
                  title={onSave ? "Clique para somar/subtrair do PV" : undefined}
                >
                  {displayedHpValue}/{displayedHpMax ?? 0}
                </span>
                {onSave && (
                  <button type="button" className="foundry-hp-quick-btn" onClick={() => quickAdjustHp(1)} title="Cura (+1)">
                    +
                  </button>
                )}
              </span>
            )}
            <span className="foundry-sheet-badge-label">
              PV{!hpAuto && " (máx. manual)"}
            </span>
            {editing && !hpAuto && (
              <button
                type="button"
                className="foundry-sheet-badge-reset"
                title="Voltar a calcular o PV máximo automaticamente"
                onClick={resetHpMaxToAuto}
              >
                ↺
              </button>
            )}
          </div>
        </div>
      </header>

      {hpModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHpModalOpen(false);
          }}
        >
          <div className="modal-panel hp-adjust-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajustar PV</h3>
              <button type="button" onClick={() => setHpModalOpen(false)}>
                Fechar
              </button>
            </div>
            <p className="hp-adjust-modal-hint">
              PV atual: {displayedHpValue}/{displayedHpMax ?? 0}. Digite um valor pra somar, ou com "-" na frente pra
              subtrair.
            </p>
            <div className="hp-adjust-modal-row">
              <input
                type="number"
                autoFocus
                value={hpModalValue}
                placeholder="ex: 5 ou -5"
                onChange={(event) => setHpModalValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyHpModalValue();
                }}
              />
              <button type="button" onClick={applyHpModalValue}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="foundry-ability-row">
        <div className="foundry-roll-controls">
          {!editing && (
            <>
              {/* Vantagem/Desvantagem: toggle PERSISTENTE (pedido do usuário,
                  nov/2026) -- fica ligado em toda rolagem local até o jogador
                  trocar de volta, nunca "gasta" depois de 1 clique. Só afeta
                  o motor local (chat geral); o pedido pendente pro Foundry
                  nunca usa isso. */}
              <div className="foundry-toggle-group" role="group" aria-label="Vantagem/Desvantagem">
                {[
                  [ADV_MODE.NORMAL, "Normal"],
                  [ADV_MODE.ADVANTAGE, "Vantagem"],
                  [ADV_MODE.DISADVANTAGE, "Desvantagem"],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={advantageMode === mode ? "is-active" : ""}
                    onClick={() => setAdvantageMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Geral/Sussurro -- filtro só VISUAL (ver sendLocalRoll/
                  chatMessages.js), nunca privacidade de verdade. */}
              <div className="foundry-toggle-group" role="group" aria-label="Direcionamento da mensagem">
                {[
                  ["general", "Geral"],
                  ["whisper", "Sussurro"],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    className={visibility === v ? "is-active" : ""}
                    onClick={() => setVisibility(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="foundry-sheet-abilities">
        {editing ? (
          <AbilitiesInput abilities={view.abilities} onChange={(abilities) => onChange({ abilities })} />
        ) : (
          ABILITIES.map((key) => {
            const score = view.abilities?.[key] ?? 10;
            return (
              <button
                type="button"
                key={key}
                className="foundry-ability-badge foundry-rollable"
                onClick={() => {
                  const request = { type: "check", key };
                  sendRollRequest(profileId, { sourceId: character.id, authorName: character.name, request });
                  sendLocalRoll(profileId, {
                    sourceId: character.id,
                    authorName: character.name,
                    request,
                    result: toChatD20Result(rollD20(abilityMod(score), advantageMode)),
                    visibility,
                  });
                }}
                title={`Rolar teste de ${ABILITY_LABELS[key]}`}
              >
                <span className="foundry-ability-label">{ABILITY_LABELS[key]}</span>
                <span className="foundry-ability-score">{score}</span>
                <span className="foundry-ability-mod">{fmtMod(abilityMod(score))}</span>
              </button>
            );
          })
        )}
        </div>

        <div className="foundry-deathsaves-box">
          {/* Só aparece com PV em 0 -- mesma regra do Foundry (rollDeathSave
              avisa "desnecessário" fora disso). Zera sozinho ao sair de 0
              (quickAdjustHp acima cuida disso, não precisa ação própria). */}
          {!editing && hpInitialized && displayedHpValue === 0 && (
            <>
              <span className="foundry-deathsaves-label">Resistência contra a Morte</span>
              <div className="foundry-deathsaves-row">
                <span className="foundry-deathsaves-pips">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`foundry-deathsaves-pip is-success${i < (character.deathSaves?.success ?? 0) ? " is-filled" : ""}`}
                    />
                  ))}
                </span>
                <span className="foundry-deathsaves-pips">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`foundry-deathsaves-pip is-failure${i < (character.deathSaves?.failure ?? 0) ? " is-filled" : ""}`}
                    />
                  ))}
                </span>
              </div>
              {onSave && (character.deathSaves?.success ?? 0) < 3 && (character.deathSaves?.failure ?? 0) < 3 && (
                <button type="button" className="foundry-deathsaves-roll" onClick={rollDeathSave}>
                  Rolar
                </button>
              )}
              {(character.deathSaves?.failure ?? 0) >= 3 && <span className="foundry-deathsaves-dead">Morreu</span>}
            </>
          )}
        </div>
      </div>

      <nav className="foundry-sheet-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === tab ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="foundry-sheet-body">{renderTabContent(tab, tabProps)}</div>

      {/* Só existe pra impressão/PDF (ver .foundry-sheet-print-only no CSS) —
          a tela mostra uma aba por vez, mas o PDF precisa de tudo empilhado.
          Sempre a partir do `character` salvo (não do rascunho em edição). */}
      <div className="foundry-sheet-print-only">
        {TABS.map((t) => (
          <section key={t.key} className="foundry-print-section">
            <h3>{t.label}</h3>
            {renderTabContent(t.key, printTabProps)}
          </section>
        ))}
      </div>
    </div>
  );
}
