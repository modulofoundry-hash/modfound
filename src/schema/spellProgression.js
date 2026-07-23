// Quantos cantrips/magias conhecidas ("conjurador conhecido": Bardo/Feiticeiro/
// Bruxo/Patrulheiro 2014) ou espaços de preparo ("conjurador preparado": todo
// mundo em 2024 + Clérigo/Druida/Mago/Paladino em 2014) o personagem já tem
// direito no nível atual -- soma de TODAS as classes conjuradoras (sem tentar
// dividir por classe na lista achatada de `character.spells`, mesma
// simplificação que `feats`/`classChoices` já usam). Reaproveitado pelo wizard
// de Criação (etapa Magias) e pelo de Level-Up.
//
// `classData.spellProgression` (banco de conteúdo) só existe quando o Foundry
// já modela a classe com tabela fixa (`cantripsKnown`/`spellsKnown`/
// `maxPrepared`, ver shared/schema/content-database.md). Quando falta
// (conjurador "preparado" 2014 sem tabela: Clérigo/Druida/Mago/Paladino/
// Patrulheiro 2014, Artificiante) o preparo é calculado na hora — mod de
// habilidade + nível cheio/metade, regra real do livro, sem precisar de dado
// novo no banco.
function abilityMod(score) {
  return Math.floor(((score ?? 10) - 10) / 2);
}

function valueAtLevel(table, level) {
  if (!table) return 0;
  const reached = Object.keys(table)
    .map(Number)
    .filter((lvl) => lvl <= level);
  if (!reached.length) return 0;
  return table[Math.max(...reached)] ?? 0;
}

const PROGRESSION_FACTOR = { full: 1, half: 0.5, third: 1 / 3, artificer: 0.5 };

export function spellProgressionForCharacter(character, classMatches) {
  let cantripsKnown = 0;
  let spellsKnown = 0;
  let hasKnownCap = false;
  let maxPrepared = 0;
  let hasPreparedCap = false;

  (character.classes ?? []).forEach((row, index) => {
    const classData = classMatches[index]?.classData;
    if (!classData?.spellcasting) return;
    const level = row.level ?? 1;
    const prog = classData.spellProgression ?? {};

    cantripsKnown += valueAtLevel(prog.cantripsKnown, level);

    if (prog.spellsKnown) {
      spellsKnown += valueAtLevel(prog.spellsKnown, level);
      hasKnownCap = true;
    } else if (prog.maxPrepared) {
      maxPrepared += valueAtLevel(prog.maxPrepared, level);
      hasPreparedCap = true;
    } else {
      // Conjurador "preparado" sem tabela fixa (2014 Clérigo/Druida/Mago/
      // Paladino/Patrulheiro, Artificiante nas duas edições) — fórmula real:
      // mod de habilidade + nível cheio/metade (mínimo 1).
      const factor = PROGRESSION_FACTOR[classData.spellcasting.progression] ?? 1;
      const mod = abilityMod(character.abilities?.[classData.spellcasting.ability]);
      maxPrepared += Math.max(1, Math.floor(level * factor) + mod);
      hasPreparedCap = true;
    }
  });

  return {
    cantripsKnown,
    spellsKnown: hasKnownCap ? spellsKnown : null,
    maxPrepared: hasPreparedCap ? maxPrepared : null,
  };
}

// Cruza o nome da magia com o catálogo do site pra saber se é truque (nível 0)
// -- `character.spells[]` não guarda o nível, só nome + preparada.
export function isCantripName(name, spellsData) {
  return spellsData.some((s) => s.name === name && s.level === 0);
}
