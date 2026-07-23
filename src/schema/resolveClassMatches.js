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
    if (!row.name) return;
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
