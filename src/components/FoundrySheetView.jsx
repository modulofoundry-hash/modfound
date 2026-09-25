import { useEffect, useMemo, useRef, useState } from "react";
import { ABILITIES, ABILITY_LABELS, ALIGNMENTS, LANGUAGES, SKILLS } from "../schema/character";
import { resolveClassMatches } from "../schema/resolveClassMatches";
import { computeGrantedSpells } from "../schema/grantedSpells";
import { computeAllowedSpellNames } from "../schema/expandedSpellPool";
import { AbilitiesInput } from "./AbilitiesInput";
import { SensesInput } from "./SensesInput";
import { TagListInput } from "./TagListInput";
import { ListEditor } from "./ListEditor";
import { SpellBrowser } from "./SpellBrowser";
import { FeatBrowser } from "./FeatBrowser";
import { EquipmentBrowser } from "./EquipmentBrowser";
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
import { sendRollRequest } from "../data/chatMessages";

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function fmtMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
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

function findFeatMatch(name) {
  return featsData.find((f) => f.name === name) ?? null;
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

function DetailsTab({ character, editable, onChange, originalClassMatch, totalLevel, raceMatch, classMatches }) {
  const prof = proficiencyBonus(totalLevel);
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
                  <span className="foundry-skill-label">{skill.label}</span>
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
                  <span className="foundry-skill-ability">{ABILITY_LABELS[key]}</span>
                  <span className="foundry-skill-mod">{fmtMod(mod)}</span>
                </div>
              );
            })}
          </div>
          <p className="field-hint">Proficiência de resistência vem da classe original, não é editável aqui.</p>
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
              {grantedSpells.map((entry, index) => (
                <li key={index}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-item-name">{entry.name}</span>
                  <span className="foundry-spell-meta">
                    {entry.source}
                    {!entry.unlocked && ` · a partir do nível ${entry.level}`}
                  </span>
                </li>
              ))}
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

function InventoryTab({ character, editable, onChange, profileId, onSave }) {
  const currency = character.currency ?? {};
  const [browserOpen, setBrowserOpen] = useState(false);

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
    sendRollRequest(profileId, {
      sourceId: character.id,
      authorName: character.name,
      request: { type: "attack", itemName },
    });
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
                {looksAttackable(item.name) && (
                  <button type="button" className="foundry-item-attack" onClick={() => attackWith(item.name)}>
                    ⚔ Atacar
                  </button>
                )}
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

function FeatsTab({ character, editable, onChange, raceMatch, classMatches }) {
  const featureGroups = classFeatureGroups(character, classMatches);
  const classChoiceEntries = (character.classChoices ?? []).map((c) => ({ ...c, match: findClassChoiceMatch(c) }));
  const masteryEntries = (character.weaponMasteryChoices ?? []).map((c) => c.weaponKey).filter(Boolean).map(weaponLabel);
  const proficiencyEntries = (character.weaponProficiencies ?? []).map((c) => weaponLabel(c.weaponKey));
  const enhancementEntries = (character.animalEnhancementChoices ?? []).map((c) => ({
    ...c,
    match: findAnimalEnhancementMatch(c.name),
  }));
  const [browserOpen, setBrowserOpen] = useState(false);

  function addFeat(name) {
    if (!(character.feats ?? []).includes(name)) onChange({ feats: [...(character.feats ?? []), name] });
    setBrowserOpen(false);
  }

  return (
    <div className="foundry-feats-tab">
      <div className="foundry-box">
        <h4>Talentos</h4>
        {editable ? (
          <>
            <ul className="foundry-feature-list">
              {(character.feats ?? []).map((name, index) => (
                <li key={index}>
                  <div className="feats-list-item-row">
                    <strong>{name}</strong>
                    <button
                      type="button"
                      onClick={() => onChange({ feats: character.feats.filter((f) => f !== name) })}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setBrowserOpen(true)}>
              Adicionar talento
            </button>
            {browserOpen && (
              <BrowserModal title="Talentos" onClose={() => setBrowserOpen(false)}>
                <FeatBrowser items={featsData} excludeNames={new Set(character.feats ?? [])} onAdd={addFeat} />
              </BrowserModal>
            )}
          </>
        ) : character.feats?.length ? (
          <ul className="foundry-feature-list">
            {character.feats.map((name, index) => {
              const match = findFeatMatch(name);
              return (
                <li key={index}>
                  <strong>{name}</strong>
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
function SpellStatsHeader({ character, totalLevel }) {
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
    </div>
  );
}

function SpellsTab({ character, editable, onChange, classMatches, totalLevel }) {
  const entries = (character.spells ?? []).map((s) => ({
    ...s,
    match: findSpellMatch(s.name, character.rulesMode),
  }));
  const byLevel = new Map();
  for (const entry of entries) {
    const level = entry.match?.level ?? 0;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(entry);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  const [browserOpen, setBrowserOpen] = useState(false);

  function addSpell(name) {
    if (!(character.spells ?? []).some((s) => s.name === name)) {
      onChange({ spells: [...(character.spells ?? []), { name, prepared: false }] });
    }
    setBrowserOpen(false);
  }

  if (editable) {
    const allowedSpellNames = computeAllowedSpellNames({ character, classMatches, spellsData });
    return (
      <div className="foundry-spells-tab">
        <SpellStatsHeader character={character} totalLevel={totalLevel} />
        <div className="foundry-box">
          <h4>Magias Conhecidas/Preparadas</h4>
          <ListEditor
            items={character.spells ?? []}
            onChange={(items) => onChange({ spells: items })}
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
        <SpellStatsHeader character={character} totalLevel={totalLevel} />
        <EmptyRow />
      </div>
    );
  }

  return (
    <div className="foundry-spells-tab">
      <SpellStatsHeader character={character} totalLevel={totalLevel} />
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
  "senses", "toolProficiencies", "languages", "skillProficiencies", "skillExpertise",
  "currency", "equipment", "feats", "spells",
  "personality", "appearance", "notes",
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

  useEffect(() => {
    if (!editing) setDraft(character);
  }, [character, editing]);

  const view = editing ? draft : character;

  function onChange(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function startEdit() {
    setDraft(character);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(character);
    setEditing(false);
  }

  function save() {
    const patch = Object.fromEntries(EDITABLE_KEYS.map((key) => [key, draft[key]]));
    onSave?.(patch);
    setEditing(false);
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
  function setManualHpMax(value) {
    onChange({ hp: { ...hp, max: value }, hpAuto: false });
  }
  function resetHpMaxToAuto() {
    onChange({ hp: { ...hp, max: computeHitPoints(view, { classesData }) }, hpAuto: true });
  }

  const [tab, setTab] = useState("details");

  const tabProps = { character: view, editable: editing, onChange, originalClassMatch, totalLevel, raceMatch, classMatches, profileId, onSave };
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
                  onChange={(e) => onChange({ hp: { ...hp, value: Number(e.target.value) } })}
                />
                /
                <input
                  type="number"
                  value={displayedHpMax ?? 0}
                  onChange={(e) => setManualHpMax(Number(e.target.value))}
                />
              </span>
            ) : (
              <span className="foundry-sheet-badge-value">
                {/* PV atual continua manual de verdade, mas parte igual ao máximo
                    enquanto ninguém mexeu nele -- sem isso, um personagem recém-criado
                    mostraria "0/12" (parece caído/inconsciente) em vez de cheio. */}
                {hp.value || displayedHpMax || 0}/{displayedHpMax ?? 0}
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

      <div className="foundry-sheet-abilities">
        {editing ? (
          <AbilitiesInput abilities={view.abilities} onChange={(abilities) => onChange({ abilities })} />
        ) : (
          ABILITIES.map((key) => {
            const score = view.abilities?.[key] ?? 10;
            return (
              <div key={key} className="foundry-ability-badge">
                <span className="foundry-ability-label">{ABILITY_LABELS[key]}</span>
                <span className="foundry-ability-score">{score}</span>
                <span className="foundry-ability-mod">{fmtMod(abilityMod(score))}</span>
              </div>
            );
          })
        )}
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
