import { useEffect, useMemo, useState } from "react";
import { ABILITIES, ABILITY_LABELS, ALIGNMENTS, CONDITIONS, LANGUAGES, SKILLS } from "../schema/character";
import { resolveClassMatches } from "../schema/resolveClassMatches";
import { computeGrantedSpells } from "../schema/grantedSpells";
import { AbilitiesInput } from "./AbilitiesInput";
import { SensesInput } from "./SensesInput";
import { TagListInput } from "./TagListInput";
import { ListEditor } from "./ListEditor";
import racesData from "../data/content/races.json";
import classesData from "../data/content/classes.json";
import featsData from "../data/content/feats.json";
import optionalFeaturesData from "../data/content/optionalfeatures.json";
import spellsData from "../data/content/spells.json";
import equipmentData from "../data/content/equipment.json";
import { computeArmorClass } from "../utils/computeArmorClass";
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
  { key: "effects", label: "Efeitos" },
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
    case "effects":
      return <EffectsTab {...props} />;
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

function DetailsTab({ character, editable, onChange, originalClassMatch, totalLevel }) {
  const prof = proficiencyBonus(totalLevel);
  const expertiseSkills = new Set(character.skillExpertise ?? []);
  const proficientSkills = new Set(character.skillProficiencies ?? []);
  const savingThrowProfs = new Set(originalClassMatch?.savingThrows ?? []);

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
      </div>
    </div>
  );
}

function InventoryTab({ character, editable, onChange, profileId }) {
  const currency = character.currency ?? {};

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
          <ListEditor
            items={character.equipment ?? []}
            onChange={(items) => onChange({ equipment: items })}
            addLabel="Adicionar item"
            fields={[
              { key: "name", label: "Nome" },
              { key: "quantity", label: "Qtd.", type: "number", default: 1 },
            ]}
          />
        ) : character.equipment?.length ? (
          <ul className="foundry-item-list">
            {character.equipment.map((item, index) => (
              <li key={index}>
                <span className="foundry-skill-dot" aria-hidden="true" />
                <span className="foundry-item-name">{item.name}</span>
                <span className="foundry-item-qty">{item.quantity > 1 ? `${item.quantity}x` : "1x"}</span>
                <button type="button" className="foundry-item-attack" onClick={() => attackWith(item.name)}>
                  ⚔ Atacar
                </button>
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

function FeatsTab({ character, editable, onChange, raceMatch }) {
  return (
    <div className="foundry-feats-tab">
      <div className="foundry-box">
        <h4>Talentos</h4>
        {editable ? (
          <TagListInput
            items={character.feats ?? []}
            onChange={(items) => onChange({ feats: items })}
            placeholder="Ex: Alerta"
            addLabel="Adicionar talento"
          />
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
    </div>
  );
}

function SpellsTab({ character, editable, onChange, raceMatch, classMatches }) {
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

  // Concedidas por Raça/Feat/Subclasse/Escolha de Classe -- só exibição, ver
  // schema/grantedSpells.js pro porquê de nunca entrar em `character.spells`.
  const granted = computeGrantedSpells({ character, raceMatch, classMatches, featsData, optionalFeaturesData });

  if (editable) {
    return (
      <div className="foundry-spells-tab">
        <div className="foundry-box">
          <h4>Magias Conhecidas/Preparadas</h4>
          <ListEditor
            items={character.spells ?? []}
            onChange={(items) => onChange({ spells: items })}
            addLabel="Adicionar magia"
            fields={[
              { key: "name", label: "Nome" },
              { key: "prepared", label: "Preparada", type: "checkbox" },
            ]}
          />
        </div>
        {granted.length > 0 && (
          <div className="foundry-box">
            <div className="foundry-box-header-row">
              <h4>Concedidas automaticamente</h4>
            </div>
            <ul className="foundry-item-list foundry-spell-list">
              {granted.map((entry, index) => (
                <li key={index}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-item-name">{entry.name}</span>
                  <span className="foundry-spell-meta">{entry.source}</span>
                </li>
              ))}
            </ul>
            <p className="field-hint">Essas vêm de raça/talento/classe — não precisa (nem dá pra) editar aqui.</p>
          </div>
        )}
      </div>
    );
  }

  if (!entries.length && !granted.length) {
    return (
      <div className="foundry-spells-tab">
        <EmptyRow />
      </div>
    );
  }

  return (
    <div className="foundry-spells-tab">
      {granted.length > 0 && (
        <div className="foundry-box">
          <div className="foundry-box-header-row">
            <h4>Concedidas automaticamente</h4>
          </div>
          <ul className="foundry-item-list foundry-spell-list">
            {granted.map((entry, index) => (
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
            O Foundry adiciona essas magias sozinho ao sincronizar (não precisa buscar/adicionar aqui).
          </p>
        </div>
      )}
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
                  {entry.match && (
                    <span className="foundry-spell-meta">
                      {SCHOOL_ABBR[entry.match.school] ?? entry.match.school} · {entry.match.time} ·{" "}
                      {entry.match.range}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Nova aba (o Foundry deriva isso de Active Effects de verdade; o site não
// recebe esse dado sincronizado — ver foundry_character_sheet_ui_architecture.md
// e a decisão do usuário — então aqui é uma checklist manual mesmo, sem
// pretensão de refletir o estado real da ficha no Foundry).
function EffectsTab({ character, editable, onChange }) {
  const active = new Set(character.conditions ?? []);

  function toggle(id, checked) {
    const set = new Set(character.conditions ?? []);
    if (checked) set.add(id);
    else set.delete(id);
    onChange({ conditions: [...set] });
  }

  return (
    <div className="foundry-effects-tab">
      <p className="field-hint">
        Condições marcadas manualmente — o site não recebe do Foundry quais efeitos estão ativos de verdade.
      </p>
      <div className="foundry-box">
        <h4>Condições</h4>
        <div className="foundry-conditions-grid">
          {CONDITIONS.map((c) => (
            <label key={c.id} className={`foundry-condition-pill ${active.has(c.id) ? "is-active" : ""}`}>
              {editable ? (
                <input type="checkbox" checked={active.has(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} />
              ) : (
                <input type="checkbox" checked={active.has(c.id)} disabled readOnly />
              )}
              {c.label}
            </label>
          ))}
        </div>
        {!editable && !active.size && <EmptyRow />}
      </div>
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
  "name", "alignment", "inspiration", "hp", "ac", "acAuto", "abilities",
  "senses", "toolProficiencies", "languages", "skillProficiencies", "skillExpertise",
  "currency", "equipment", "feats", "spells", "conditions",
  "personality", "appearance", "notes",
];

// Visual inspirado na ficha real do Foundry (cabeçalho escuro, retrato,
// abas Detalhes/Inventário/Talentos/Magias/Efeitos/Biografia, iguais à
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
  const classMatches = useMemo(() => Object.values(resolveClassMatches(view.classes)), [view.classes]);
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
  const computedAc = useMemo(
    () => computeArmorClass(view, { equipmentData }),
    [view.abilities, view.equipment, view.classes, view.race],
  );
  const acAuto = view.acAuto ?? true;
  const displayedAc = acAuto ? computedAc : view.ac;
  function setManualAc(value) {
    onChange({ ac: value, acAuto: false });
  }
  function resetAcToAuto() {
    onChange({ ac: computeArmorClass(view, { equipmentData }), acAuto: true });
  }

  const [tab, setTab] = useState("details");

  const tabProps = { character: view, editable: editing, onChange, originalClassMatch, totalLevel, raceMatch, classMatches, profileId };
  const printTabProps = { ...tabProps, character, editable: false, onChange: () => {} };

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
            <span className="foundry-sheet-badge-value">{speed ?? "—"}</span>
            <span className="foundry-sheet-badge-label">Deslocamento</span>
          </div>
          <div className={`foundry-sheet-badge ${editing ? "foundry-sheet-badge-editable" : ""}`}>
            {editing ? (
              <input
                type="number"
                className="foundry-sheet-badge-input"
                value={displayedAc ?? 10}
                onChange={(e) => setManualAc(Number(e.target.value))}
              />
            ) : (
              <span className="foundry-sheet-badge-value">{displayedAc ?? "—"}</span>
            )}
            <span className="foundry-sheet-badge-label">
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
                  value={hp.max ?? 0}
                  onChange={(e) => onChange({ hp: { ...hp, max: Number(e.target.value) } })}
                />
              </span>
            ) : (
              <span className="foundry-sheet-badge-value">
                {hp.value ?? 0}/{hp.max ?? 0}
              </span>
            )}
            <span className="foundry-sheet-badge-label">PV</span>
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
