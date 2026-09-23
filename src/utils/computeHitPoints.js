// Calcula o PV máximo seguindo a regra real do dnd5e (mesma fórmula que
// `HitPointsAdvancement`/`getAdjustedTotal` usam no Foundry, dnd5e.mjs): nível 1 da
// classe INICIAL sempre usa o dado de vida CHEIO; todo outro nível usa a escolha do
// jogador (`hpRolls[i]`, ver HpRollPicker.jsx) -- "avg" ou vazio contam como média
// (`floor(dado/2)+1`, mesmo sentinela nativo do dnd5e), um NÚMERO já é o valor
// resolvido (rolado no Foundry OU no site, ver "Rolar aqui"), "pending" ainda não
// tem resultado então também conta como média (só uma prévia, o valor real só existe
// depois de sincronizar com o Foundry e rolar de verdade). Sempre soma o mod de
// Constituição por nível (mínimo 1 por nível), igual a regra oficial.
//
// Feats/traço racial/traço de subclasse que aumentam PV MÁXIMO (dado curado, mesma
// filosofia de computeArmorClass.js) -- só o que é sempre-ativo, nunca temporário
// (Aid/Heroes' Feast ficam de fora de propósito, são buffs de magia). Achados numa
// varredura completa do banco procurando `attributes.hp.bonuses.*`/"hit point
// maximum" -- Draconic Bloodline/Sorcery e Frost Sorcery TINHAM o texto da regra mas
// não tinham Active Effect nenhum no Foundry (bug real, corrigido na mesma sessão
// adicionando `mechanics.effects` a essas 3 features -- ver
// fix_draconic_resilience_hp_ac_missing_effect.md); mesmo assim entram aqui também,
// porque o site precisa mostrar a prévia ANTES do personagem existir no Foundry.
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

function abilityMod(score) {
  return Math.floor(((score ?? 10) - 10) / 2);
}

function hitDieValue(hitDie) {
  return Number(String(hitDie ?? "d6").replace(/\D/g, "")) || 6;
}

function averageForHitDie(hitDie) {
  return Math.floor(hitDieValue(hitDie) / 2) + 1;
}

// Bônus fixo (soma uma vez, independente de nível) concedido por TALENTO.
// Tough: +2 por nível TOTAL do personagem (2014 usa fórmula, 2024 usa
// `bonuses.level`, mas o resultado final é sempre "+2 × nível total").
// Boon of Fortitude (Epic Boon 2024, nível 19+): +40 fixo.
const FEAT_HP_BONUSES = [
  { name: "Tough", value: (totalLevel) => 2 * totalLevel },
  { name: "Boon of Fortitude", value: () => 40 },
];

// Bônus por RAÇA -- Dwarven Toughness, +1 por nível TOTAL do personagem. Em 2014 só
// "Dwarf (Hill)" concede (Anão da Montanha/base não têm essa feature); em 2024 a
// raça unificada "Dwarf" concede direto.
const RACE_HP_BONUSES = [
  { raceName: "Dwarf (Hill)", value: (totalLevel) => totalLevel },
  { raceName: "Dwarf", rules: "2024", value: (totalLevel) => totalLevel },
];

// Bônus por SUBCLASSE -- +1 por nível DAQUELA CLASSE (não nível total, diferente dos
// dois de cima) -- por isso não dá pra usar o campo genérico `hp.bonuses.level` do
// Foundry (que multiplica pelo nível total do personagem); usa o nível da própria
// entrada de classe (`row.level`) direto.
const SUBCLASS_HP_BONUSES = [
  { subclassName: "Draconic Bloodline", rules: "2014", value: (classLevel) => classLevel },
  { subclassName: "Draconic Sorcery", rules: "2024", value: (classLevel) => classLevel },
  { subclassName: "Frost Sorcery", rules: "2024", value: (classLevel) => classLevel },
];

function totalCharacterLevel(character) {
  return (character.classes ?? []).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
}

// Nível-a-nível de UMA entrada de classe (mesma regra de "nível 1 da classe inicial =
// dado cheio" que o módulo já usa em advancement.js:resolveHpLevelValue).
function classHpTotal(row, isOriginalClass, hitDie, conMod) {
  const level = Math.max(1, Number(row.level) || 1);
  const hpRolls = row.hpRolls ?? [];
  let total = 0;
  for (let lvl = 1; lvl <= level; lvl++) {
    let value;
    if (lvl === 1 && isOriginalClass) {
      value = hitDieValue(hitDie);
    } else {
      const entry = hpRolls[lvl - 1];
      value = typeof entry === "number" ? entry : averageForHitDie(hitDie);
    }
    total += Math.max(value + conMod, 1);
  }
  return total;
}

export function computeHitPoints(character, { classesData }) {
  const conMod = abilityMod(character.abilities?.con);
  const totalLevel = totalCharacterLevel(character);
  let total = 0;

  (character.classes ?? []).forEach((row, index) => {
    if (!row.name) return;
    const rules = row.rules || character.rulesMode;
    const match = classesData.find((c) => c.name === row.name && c.rules === rules) ?? classesData.find((c) => c.name === row.name);
    if (!match) return;
    total += classHpTotal(row, index === 0, match.hitDie, conMod);

    if (row.subclass) {
      const subclassRules = row.subclassRules || rules;
      const bonus = SUBCLASS_HP_BONUSES.find((b) => b.subclassName === row.subclass && b.rules === subclassRules);
      if (bonus) total += bonus.value(Math.max(1, Number(row.level) || 1));
    }
  });

  for (const bonus of FEAT_HP_BONUSES) {
    if ((character.feats ?? []).includes(bonus.name)) total += bonus.value(totalLevel);
  }

  for (const bonus of RACE_HP_BONUSES) {
    if (character.race !== bonus.raceName) continue;
    if (bonus.rules && character.raceRules !== bonus.rules) continue;
    total += bonus.value(totalLevel);
    break;
  }

  return Math.max(total, 0);
}
