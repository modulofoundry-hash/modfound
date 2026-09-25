// Mecânica de rolagem de magia (ataque/dano/cura/CD) -- portado de
// `app/src/dice/mechanics.js` (mesma lógica pura, sem depender de React
// Native), pra alimentar os botões de rolagem novos em `SpellsTab`
// (FoundrySheetView.jsx). Fonte da mecânica: `spell.activities[0]`, campo
// novo em `spells.json` desde `generate-spells-catalog.mjs` (extraído de
// `system.activities` do Item real do Foundry).
//
// Regra geral (igual ao app): se um token (@abilities.X.mod, @prof etc.) não
// resolve com dado real do personagem, a função devolve `null` -- quem
// chama NÃO mostra botão de rolar nesse caso, em vez de inventar um número.
import classesData from "../data/content/classes.json";

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

// Mesma fórmula usada em todo o resto do projeto (nível total → bônus de
// proficiência).
export function proficiencyBonus(totalLevel) {
  return 2 + Math.floor(Math.max(totalLevel - 1, 0) / 4);
}

function ability(character, key) {
  return abilityMod(character.abilities?.[key] ?? 10);
}

// Resolve os tokens conhecidos (@abilities.X.mod, @prof) contra o personagem
// -- @classes.*.levels e @scale.*.* (usados em feature de classe, não em
// magia) ficaram de fora de propósito, mesmo escopo que o app cobre pra
// `spellDamageFormula`/`spellHealFormula`. Devolve `null` se sobrar QUALQUER
// token sem resolver.
function resolveTokens(formula, { character, totalLevel }) {
  if (!formula) return undefined;
  let ok = true;
  const resolved = String(formula).replace(/@[a-zA-Z0-9_.-]+/g, (token) => {
    const m = token.match(/^@abilities\.([a-z]+)\.mod$/);
    if (m) return String(ability(character, m[1]));
    if (token === "@prof") return String(proficiencyBonus(totalLevel));
    ok = false;
    return token;
  });
  return ok ? resolved : null;
}

function damagePartsFormula(parts, ctx) {
  if (!parts?.length) return null;
  const pieces = [];
  for (const part of parts) {
    let piece;
    if (part.custom?.enabled && part.custom.formula) {
      piece = resolveTokens(part.custom.formula, ctx);
    } else if (part.number != null && part.denomination != null) {
      piece = `${part.number}d${part.denomination}`;
      if (part.bonus) {
        const bonus = resolveTokens(part.bonus, ctx);
        if (bonus === null) return null;
        if (bonus) piece += bonus.startsWith("-") ? bonus : `+${bonus}`;
      }
    }
    if (piece == null) return null;
    pieces.push(piece);
  }
  return pieces.join("+");
}

// Acha a PRIMEIRA classe conjuradora do personagem (mesma convenção já usada
// no resto do projeto pra PV máximo/testes de resistência em multiclasse).
export function findSpellcastingClass(character) {
  for (const row of character.classes ?? []) {
    if (!row.name) continue;
    const match = classesData.find((c) => c.name === row.name && c.rules === row.rules) ?? classesData.find((c) => c.name === row.name);
    if (match?.spellcasting?.ability) return { row, match };
  }
  return null;
}

// Bônus de item mágico equipado ao Ataque com Magia / CD de Resistência --
// mesmo padrão já validado de `magicAcBonusParts` em computeArmorClass.js
// (app tem a cópia espelhada em dice/mechanics.js, mesmos comentários lá).
function magicSpellBonusTotals(character, equipmentData) {
  const equippedByName = new Map(
    (character.equipment ?? []).filter((e) => e.equipped && e.name).map((e) => [e.name.trim().toLowerCase(), e])
  );
  const characterClasses = new Set((character.classes ?? []).filter((c) => c.name).map((c) => c.name));
  const countedNames = new Set();
  let attack = 0;
  let dc = 0;
  for (const item of equipmentData ?? []) {
    if (item.foundryType !== "magicItem") continue;
    if (typeof item.spellAttackBonus !== "number" && typeof item.spellSaveDcBonus !== "number") continue;
    const key = (item.name ?? "").toLowerCase();
    const equipped = equippedByName.get(key);
    if (!equipped || countedNames.has(key)) continue;
    if (item.requiresAttunement && !equipped.attuned) continue;
    if (item.spellBonusClasses && !item.spellBonusClasses.some((c) => characterClasses.has(c))) continue;
    countedNames.add(key);
    if (typeof item.spellAttackBonus === "number") attack += item.spellAttackBonus;
    if (typeof item.spellSaveDcBonus === "number") dc += item.spellSaveDcBonus;
  }
  return { attack, dc };
}

export function spellAttackMod(character, totalLevel, { equipmentData } = {}) {
  const sc = findSpellcastingClass(character);
  if (!sc) return null;
  const mod = ability(character, sc.match.spellcasting.ability);
  const itemBonus = equipmentData ? magicSpellBonusTotals(character, equipmentData).attack : 0;
  return mod + proficiencyBonus(totalLevel) + itemBonus;
}

export function spellSaveDC(character, totalLevel, { equipmentData } = {}) {
  const sc = findSpellcastingClass(character);
  if (!sc) return null;
  const mod = ability(character, sc.match.spellcasting.ability);
  const itemBonus = equipmentData ? magicSpellBonusTotals(character, equipmentData).dc : 0;
  return 8 + proficiencyBonus(totalLevel) + mod + itemBonus;
}

export function spellDamageFormula(activity, character, totalLevel) {
  const ctx = { character, totalLevel };
  return damagePartsFormula(activity.damage?.parts, ctx);
}

export function spellHealFormula(activity, character, totalLevel) {
  const h = activity.healing;
  if (!h) return null;
  const ctx = { character, totalLevel };
  if (h.custom?.enabled && h.custom.formula) return resolveTokens(h.custom.formula, ctx);
  if (h.number == null || h.denomination == null) return null;
  let formula = `${h.number}d${h.denomination}`;
  if (h.bonus) {
    const bonus = resolveTokens(h.bonus, ctx);
    if (bonus === null) return null;
    if (bonus) formula += bonus.startsWith("-") ? bonus : `+${bonus}`;
  }
  return formula;
}
