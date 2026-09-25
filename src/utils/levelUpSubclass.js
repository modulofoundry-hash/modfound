// Regras de subclasse do assistente de subida de nível (mesmas do app, ver app/src/utils/levelUp.js):
//  - a escolha da subclasse só existe na subida que ATRAVESSA o nível de subclasse da classe (nível DA CLASSE, não do
//    personagem), é obrigatória e nunca muda depois -- não existe escolher tarde;
//  - a etapa também aparece, só leitura, sempre que a subclasse já escolhida concede algo nos níveis novos.
import { subclassGrantsAtLevel } from "./subclassGrants";

// Features-marcador ("Martial Archetype", "Subclass Feature", "Path Feature"...): só marcam o nível em que a subclasse
// concede algo, sem conteúdo. Lista EXATA de nomes -- uma regex solta escondia "Contact Patron", feature real do
// Warlock 2024.
const PLACEHOLDER = new RegExp(
  "^((primal )?path|bard college|divine domain|druid circle|martial archetype|monastic tradition|sacred oath|" +
    "ranger archetype|roguish archetype|sorcerous origin|otherworldly patron|arcane tradition|artificer specialist)( feature)?$|" +
    "^([a-z]+ )?subclass( feature)?$",
  "i",
);

export function isFeaturePlaceholder(name) {
  return PLACEHOLDER.test(name);
}

// Antes da subida a classe estava abaixo do nível de subclasse e agora chegou nele ou passou.
export function subclassChoicePending(classData, originalLevel, level) {
  const at = classData?.subclassLevel;
  return at != null && (originalLevel ?? 0) < at && (level ?? 0) >= at;
}

// Um bloco por (classe, nível NOVO) em que a subclasse escolhida concede algo:
// { classIndex, className, level, subclass: { name, features, sections } }.
export function subclassGainBlocks({ character, classMatches, originalLevels }) {
  const blocks = [];
  character.classes.forEach((row, classIndex) => {
    if (!row.name) return;
    const classData = classMatches[classIndex]?.classData;
    const subclassData = classMatches[classIndex]?.subclassData;
    if (!subclassData) return;
    for (let level = (originalLevels[classIndex] ?? 0) + 1; level <= (row.level ?? 0); level++) {
      const grants = subclassGrantsAtLevel({ subclassData, classData, level, character, isFeaturePlaceholder });
      if (grants.any) blocks.push({ classIndex, className: row.name, level, subclass: { name: subclassData.name, features: grants.features, sections: grants.sections } });
    }
  });
  return blocks;
}
