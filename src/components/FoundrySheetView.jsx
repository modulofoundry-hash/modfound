import { useState } from "react";
import { ABILITIES, ABILITY_LABELS, SKILLS } from "../schema/character";
import racesData from "../data/content/races.json";
import classesData from "../data/content/classes.json";
import featsData from "../data/content/feats.json";
import spellsData from "../data/content/spells.json";

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
// verdade por `rulesMode` (convenção do projeto), então usa isso direto.
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
  { key: "biography", label: "Biografia" },
];

function EmptyRow({ children = "—" }) {
  return <p className="foundry-sheet-empty">{children}</p>;
}

function DetailsTab({ character, originalClassMatch, totalLevel }) {
  const prof = proficiencyBonus(totalLevel);
  const expertiseSkills = new Set(character.skillExpertise ?? []);
  const savingThrowProfs = new Set(originalClassMatch?.savingThrows ?? []);

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
              const proficient = character.skillProficiencies?.includes(skill.id);
              const expertise = expertiseSkills.has(skill.id);
              const bonus = (proficient ? prof : 0) + (expertise ? prof : 0);
              const mod = abilityMod(character.abilities?.[skill.ability] ?? 10) + bonus;
              return (
                <li key={skill.id} className={expertise ? "is-expertise" : proficient ? "is-proficient" : ""}>
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-skill-ability">{skill.ability.toUpperCase()}</span>
                  <span className="foundry-skill-label">{skill.label}</span>
                  <span className="foundry-skill-mod">{fmtMod(mod)}</span>
                  <span className="foundry-skill-passive">{10 + mod}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {character.toolProficiencies?.length > 0 && (
          <div className="foundry-box">
            <h4>Ferramentas</h4>
            <ul className="foundry-skill-list">
              {character.toolProficiencies.map((tool) => (
                <li key={tool} className="is-proficient">
                  <span className="foundry-skill-dot" aria-hidden="true" />
                  <span className="foundry-skill-label">{tool}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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

        {(senseEntries.length > 0 || specialSense) && (
          <div className="foundry-box">
            <h4>Sentidos</h4>
            <div className="foundry-tag-row">
              {senseEntries.map((s) => (
                <span key={s.key} className="foundry-tag">
                  {s.label} {s.value} {character.senses?.units ?? "ft"}
                </span>
              ))}
              {specialSense && <span className="foundry-tag">{specialSense}</span>}
            </div>
          </div>
        )}

        {character.languages?.length > 0 && (
          <div className="foundry-box">
            <h4>Idiomas</h4>
            <div className="foundry-tag-row">
              {character.languages.map((lang) => (
                <span key={lang} className="foundry-tag">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="foundry-details-col foundry-details-traits">
        {/* Compara pelo NOME digitado (não pelo match no banco oficial) —
            raça/antecedente customizado (Firestore customRaces/
            customBackgrounds) não existe em races.json/backgrounds.json,
            mas ainda é uma escolha de verdade do jogador e merece card. */}
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

function InventoryTab({ character }) {
  const currency = character.currency ?? {};
  return (
    <div className="foundry-inventory-tab">
      <div className="foundry-currency-row">
        {["pp", "gp", "ep", "sp", "cp"].map((key) => (
          <div key={key} className="foundry-currency-chip">
            <span className="foundry-currency-label">{key.toUpperCase()}</span>
            <span className="foundry-currency-value">{currency[key] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="foundry-box">
        <div className="foundry-box-header-row">
          <h4>Equipamento</h4>
          <span>Quantidade</span>
        </div>
        {character.equipment?.length ? (
          <ul className="foundry-item-list">
            {character.equipment.map((item, index) => (
              <li key={index}>
                <span className="foundry-skill-dot" aria-hidden="true" />
                <span className="foundry-item-name">{item.name}</span>
                <span className="foundry-item-qty">{item.quantity > 1 ? `${item.quantity}x` : "1x"}</span>
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

function FeatsTab({ character, raceMatch }) {
  return (
    <div className="foundry-feats-tab">
      <div className="foundry-box">
        <h4>Talentos</h4>
        {character.feats?.length ? (
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

function SpellsTab({ character }) {
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

  if (!entries.length) {
    return (
      <div className="foundry-spells-tab">
        <EmptyRow />
      </div>
    );
  }

  return (
    <div className="foundry-spells-tab">
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

function BiographyTab({ character }) {
  const appearance = character.appearance ?? {};
  const personality = character.personality ?? {};
  return (
    <div className="foundry-biography-tab">
      <div className="foundry-bio-grid">
        <label>
          Alinhamento
          <span>{character.alignment || "—"}</span>
        </label>
        <label>
          Olhos
          <span>{appearance.eyes || "—"}</span>
        </label>
        <label>
          Altura
          <span>{appearance.height || "—"}</span>
        </label>
        <label>
          Fé
          <span>{appearance.faith || "—"}</span>
        </label>
        <label>
          Cabelo
          <span>{appearance.hair || "—"}</span>
        </label>
        <label>
          Peso
          <span>{appearance.weight || "—"}</span>
        </label>
        <label>
          Gênero
          <span>{appearance.gender || "—"}</span>
        </label>
        <label>
          Pele
          <span>{appearance.skin || "—"}</span>
        </label>
        <label>
          Idade
          <span>{appearance.age || "—"}</span>
        </label>
      </div>

      <div className="foundry-bio-cols">
        <section>
          <h4>Ideal</h4>
          <p>{personality.ideal || "—"}</p>
        </section>
        <section>
          <h4>Traços de Personalidade</h4>
          <p>{personality.trait || "—"}</p>
        </section>
        <section>
          <h4>Vínculo</h4>
          <p>{personality.bond || "—"}</p>
        </section>
        <section>
          <h4>Aparência</h4>
          <p>{appearance.description || "—"}</p>
        </section>
        <section>
          <h4>Defeito</h4>
          <p>{personality.flaw || "—"}</p>
        </section>
      </div>

      <section className="foundry-bio-full">
        <h4>Biografia</h4>
        <p>{character.notes || "—"}</p>
      </section>
    </div>
  );
}

// Visual inspirado na ficha real do Foundry (cabeçalho escuro, retrato,
// abas Detalhes/Inventário/Talentos/Magias/Biografia, iguais à navegação de
// verdade do sistema dnd5e) — não é pixel-idêntico (fontes/ícones próprios
// do Foundry não são reaproveitáveis fora dele), mas segue a MESMA estrutura
// e agrupamento de informação, não só a paleta de cores.
export function FoundrySheetView({ character }) {
  const [tab, setTab] = useState("details");

  const totalLevel = (character.classes ?? []).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
  const classSummary = (character.classes ?? [])
    .filter((c) => c.name)
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ""} ${c.level}`)
    .join(" / ");
  const prof = proficiencyBonus(totalLevel);

  const raceMatch = findRaceMatch(character);
  // Só a classe INICIAL (primeira da lista) concede proficiência de teste de
  // resistência/armadura/arma em multiclasse — mesma convenção de PV máximo
  // já usada no resto do projeto (ver item 15 da memória do projeto).
  const originalClassMatch = findClassMatch(character.classes?.[0], character.rulesMode);
  const initiative = abilityMod(character.abilities?.dex ?? 10);
  const speed = raceMatch?.speed;

  return (
    <div className="foundry-sheet">
      <header className="foundry-sheet-header">
        <div className="foundry-sheet-portrait">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} />
          ) : (
            <div className="foundry-sheet-portrait-empty">?</div>
          )}
        </div>
        <div className="foundry-sheet-heading">
          <h2>{character.name || "Sem nome"}</h2>
          <p className="foundry-sheet-subtitle">
            {character.race || "—"} · {character.background || "—"} · {classSummary || "—"}
          </p>
          <div className="foundry-sheet-heading-tags">
            {character.alignment && <span className="foundry-sheet-alignment">{character.alignment}</span>}
            {character.inspiration && <span className="foundry-tag foundry-tag-gold">Inspiração</span>}
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
          <div
            className="foundry-sheet-badge foundry-sheet-badge-muted"
            title="Calculado pelo Foundry depois de sincronizar (depende de equipamento/efeitos)"
          >
            <span className="foundry-sheet-badge-value">—</span>
            <span className="foundry-sheet-badge-label">CA</span>
          </div>
          <div
            className="foundry-sheet-badge foundry-sheet-badge-muted"
            title="Calculado pelo Foundry depois de sincronizar (depende da classe/rolagem de PV)"
          >
            <span className="foundry-sheet-badge-value">—</span>
            <span className="foundry-sheet-badge-label">PV</span>
          </div>
        </div>
      </header>

      <div className="foundry-sheet-abilities">
        {ABILITIES.map((key) => {
          const score = character.abilities?.[key] ?? 10;
          return (
            <div key={key} className="foundry-ability-badge">
              <span className="foundry-ability-label">{ABILITY_LABELS[key]}</span>
              <span className="foundry-ability-score">{score}</span>
              <span className="foundry-ability-mod">{fmtMod(abilityMod(score))}</span>
            </div>
          );
        })}
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

      <div className="foundry-sheet-body">
        {tab === "details" && (
          <DetailsTab character={character} originalClassMatch={originalClassMatch} totalLevel={totalLevel} />
        )}
        {tab === "inventory" && <InventoryTab character={character} />}
        {tab === "feats" && <FeatsTab character={character} raceMatch={raceMatch} />}
        {tab === "spells" && <SpellsTab character={character} />}
        {tab === "biography" && <BiographyTab character={character} />}
      </div>
    </div>
  );
}
