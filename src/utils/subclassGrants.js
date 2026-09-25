// O que uma SUBCLASSE concede em cada nível DA CLASSE (contas puras, testáveis no Node). Além das features, a
// subclasse concede magias sempre preparadas / conhecidas / inatas, amplia a lista de magias, libera escolhas
// (Manobras, terreno, modelo de armadura...) e às vezes conjura por conta própria (Eldritch Knight, Arcane
// Trickster). Tudo isso conta como "a subclasse concede algo" naquele nível.
import { CLASS_CHOICE_CATEGORY_LABELS } from "./classChoiceLabels";
import { spellProgressionForCharacter } from "../schema/spellProgression";

const SMALL_WORDS = new Set(["of", "and", "the", "to", "from", "in", "on", "for", "a", "with"]);

// "protection from evil and good|xphb" / "mage hand#c" -> "Protection from Evil and Good" / "Mage Hand (truque)".
export function spellLabel(raw) {
  const text = String(raw ?? "");
  const cantrip = text.includes("#c");
  const name = text.split("|")[0].split("#")[0].trim();
  const pretty = name
    .split(" ")
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
  return cantrip ? `${pretty} (truque)` : pretty;
}

// Todas as strings (nomes de magia) de uma estrutura aninhada (o `innate` tem daily/rest/resource...).
function collectNames(value, out = []) {
  if (typeof value === "string") out.push(spellLabel(value));
  else if (Array.isArray(value)) value.forEach((v) => collectNames(v, out));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) if (key !== "choose" && key !== "count") collectNames(v, out);
  }
  return out;
}

const SPELL_LEVEL_LABEL = (n) => (Number(n) === 0 ? "truques" : `${n}º círculo`);

// "level=0;1|class=Wizard|school=A" -> "truques e 1º círculo, lista de Wizard, escola A".
function describeQuery(query) {
  const parts = String(query ?? "").split("|").map((p) => p.split("="));
  const get = (key) => parts.find(([k]) => k === key)?.[1];
  const bits = [];
  const levels = get("level");
  if (levels) bits.push(levels.split(";").map(SPELL_LEVEL_LABEL).join(", "));
  if (get("class")) bits.push(`lista de ${get("class")}`);
  if (get("school")) bits.push(`escola ${get("school")}`);
  if (get("source")) bits.push(`livro ${get("source")}`);
  return bits.join(", ") || String(query);
}

function grantValues(subclassData, kind, level) {
  const found = [];
  for (const grant of subclassData?.spellGrants ?? []) {
    const byLevel = grant?.[kind];
    if (byLevel && byLevel[String(level)] != null) found.push(byLevel[String(level)]);
  }
  return found;
}

// Valor acumulado de uma progressão { "3": 3, "7": 5 } no nível dado (último degrau alcançado).
function progressionAt(progression, level) {
  const reached = Object.keys(progression ?? {}).map(Number).filter((l) => l <= level);
  return reached.length ? progression[Math.max(...reached)] : 0;
}

// Ganhos da subclasse no nível `level` da classe. `sections` = [{ title, text }]; `features` = features do nível.
// `any` diz se a subclasse concede algo neste nível (é isso que decide se a etapa Subclasse aparece).
export function subclassGrantsAtLevel({ subclassData, classData, level, character, isFeaturePlaceholder }) {
  if (!subclassData) return { any: false, features: [], sections: [] };
  const features = (subclassData.features ?? []).filter((f) => f.level === level && !isFeaturePlaceholder(f.name));
  const sections = [];

  const prepared = grantValues(subclassData, "prepared", level).flatMap((v) => collectNames(v));
  if (prepared.length) sections.push({ title: "Magias sempre preparadas", text: prepared.join(", ") });

  const known = grantValues(subclassData, "known", level);
  const knownNames = known.flatMap((v) => collectNames(v));
  if (knownNames.length) sections.push({ title: "Magias concedidas (conhecidas)", text: knownNames.join(", ") });
  const knownChoices = known.flatMap((v) => (Array.isArray(v) ? v : [])).filter((item) => item && typeof item === "object" && item.choose);
  for (const choice of knownChoices) {
    sections.push({ title: "Escolha de magia", text: `Escolha ${choice.count ?? 1} magia(s): ${describeQuery(choice.choose)} (etapa Magias)` });
  }

  const innate = grantValues(subclassData, "innate", level).flatMap((v) => collectNames(v));
  if (innate.length) sections.push({ title: "Magias inatas", text: `${innate.join(", ")} (uso limitado)` });

  const expanded = grantValues(subclassData, "expanded", level).flatMap((v) => (Array.isArray(v) ? v : []));
  if (expanded.length) {
    const text = expanded.map((item) => (typeof item === "string" ? spellLabel(item) : `todas as magias (${describeQuery(item.all)})`)).join("; ");
    sections.push({ title: "Lista de magias ampliada", text });
  }
  // Warlock 2014: lista ampliada por círculo ("s1".."s5"), disponível desde que a subclasse é escolhida.
  if (level === (classData?.subclassLevel ?? -1)) {
    const bySpellLevel = [];
    for (const grant of subclassData.spellGrants ?? []) {
      for (const [key, names] of Object.entries(grant?.expanded ?? {})) {
        if (/^s\d+$/.test(key)) bySpellLevel.push(`${key.slice(1)}º: ${collectNames(names).join(", ")}`);
      }
    }
    if (bySpellLevel.length) sections.push({ title: "Lista de magias ampliada (por círculo)", text: bySpellLevel.join(" · ") });
  }

  for (const choice of subclassData.spellChoices ?? []) {
    if (choice.level === level) {
      sections.push({ title: "Escolha de magia", text: `Escolha ${choice.count} magia(s) de uma lista da subclasse com ${choice.pool?.length ?? "?"} opções (etapa Magias)` });
    }
  }

  for (const pool of subclassData.optionalFeatureChoices ?? []) {
    const now = progressionAt(pool.progression, level);
    const before = level > 1 ? progressionAt(pool.progression, level - 1) : 0;
    if (now > before) {
      const label = CLASS_CHOICE_CATEGORY_LABELS[pool.category] ?? pool.category;
      sections.push({ title: "Escolhas da subclasse", text: `${label}: ${before ? `${before} → ` : ""}${now} (etapa Escolhas de classe)` });
    }
  }

  // Conjuração própria da subclasse (Eldritch Knight, Arcane Trickster): só a diferença DESTA subclasse.
  if (subclassData.spellcasting) {
    const at = (lvl) => spellProgressionForCharacter({ abilities: character.abilities, classes: [{ level: lvl }] }, [{ classData: null, subclassData }]);
    const now = at(level);
    const before = level > 1 ? at(level - 1) : { cantripsKnown: 0, spellsKnown: null, maxPrepared: null, maxSpellLevel: 0 };
    const lines = [];
    if (now.cantripsKnown !== before.cantripsKnown) lines.push(`Truques conhecidos: ${before.cantripsKnown} → ${now.cantripsKnown}`);
    if (now.spellsKnown != null && now.spellsKnown !== (before.spellsKnown ?? 0)) lines.push(`Magias conhecidas: ${before.spellsKnown ?? 0} → ${now.spellsKnown}`);
    if (now.maxPrepared != null && now.maxPrepared !== (before.maxPrepared ?? 0)) lines.push(`Magias preparadas: ${before.maxPrepared ?? 0} → ${now.maxPrepared}`);
    if (now.maxSpellLevel > before.maxSpellLevel) lines.push(`Novo círculo de magia: ${now.maxSpellLevel}º`);
    if (lines.length) sections.push({ title: "Conjuração da subclasse", text: lines.join(" · ") });
  }

  return { any: features.length > 0 || sections.length > 0, features, sections };
}
