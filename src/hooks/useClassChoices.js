// Extraído de CharacterCreationWizard.jsx pra ser reaproveitado pelo wizard de
// Level-Up também. `classChoices` é achatado por categoria (sem
// classIndex/nível, igual `feats`) -- a posição dentro da categoria já vem
// calculada pelo StepEscolhasDeClasse (soma dos `count` dos cards anteriores
// da mesma categoria), então aqui só precisa saber "troca/apaga a posição N
// da categoria X".
export function useClassChoices(setCharacter) {
  function setClassChoice(category, position, item) {
    setCharacter((prev) => {
      const others = prev.classChoices.filter((c) => c.category !== category);
      const current = prev.classChoices.filter((c) => c.category === category);
      current[position] = { category, name: item.name, rules: item.rules ?? "" };
      return { ...prev, classChoices: [...others, ...current.filter(Boolean)] };
    });
  }

  function clearClassChoice(category, position) {
    setCharacter((prev) => {
      const others = prev.classChoices.filter((c) => c.category !== category);
      const current = prev.classChoices.filter((c) => c.category === category);
      current.splice(position, 1);
      return { ...prev, classChoices: [...others, ...current] };
    });
  }

  return { setClassChoice, clearClassChoice };
}
