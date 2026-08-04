import classesData from "../data/content/classes.json";
import subclassesData from "../data/content/subclasses.json";

// Resolve classData/subclassData de cada classe já presente no personagem
// (nome + edição gravada em row.rules/row.subclassRules) — usado quando um
// wizard recebe um personagem JÁ PRONTO (edição ou level-up) e precisa desses
// dados resolvidos no primeiro render, sem esperar o usuário reabrir a etapa
// de Classe (que normalmente é quem resolve isso via ClassesInput, ao ser
// clicada).
export function resolveClassMatches(classes) {
  const matches = {};
  (classes ?? []).forEach((row, index) => {
    // Precisa gravar UMA entrada por índice, mesmo pra linha sem nome ainda
    // -- bug real achado na revisão: pular a linha deixava `matches` com
    // "buracos" (ex: {1: {...}} se a linha 0 não tem nome), e todo consumidor
    // usa `Object.values(matches)` esperando um array denso alinhado por
    // posição (grantedSpells.js/expandedSpellPool.js/spellProgression.js
    // leem `character.classes[index]`/`row.level` casando pelo MESMO índice
    // desse array) -- `Object.values({1: X})` vira `[X]` no índice 0, não 1,
    // deslocando a leitura de nível/classData pra linha ERRADA sempre que uma
    // linha de multiclasse no meio da lista ainda está sem nome.
    if (!row.name) {
      matches[index] = { classData: null, subclassData: null };
      return;
    }
    const classData =
      classesData.find((c) => c.name === row.name && row.rules && c.rules === row.rules) ??
      classesData.find((c) => c.name === row.name);
    const subclassData = row.subclass
      ? (subclassesData.find(
          (s) => s.name === row.subclass && s.parentClass === classData?.name && row.subclassRules && s.rules === row.subclassRules,
        ) ?? subclassesData.find((s) => s.name === row.subclass && s.parentClass === classData?.name))
      : null;
    matches[index] = { classData, subclassData };
  });
  return matches;
}
