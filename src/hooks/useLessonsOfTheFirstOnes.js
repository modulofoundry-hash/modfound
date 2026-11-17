// "Lessons of the First Ones" (Bruxo 2024) concede 1 Talento de Origem à
// escolha por cópia da invocação -- `lessonsOfTheFirstOnesFeats[index]` é o
// nome escolhido pra ocorrência `index` (0 = 1ª cópia escolhida em
// `classChoices`, 1 = 2ª, ...). O nome ativo é sempre espelhado em `feats[]`
// (mesma convenção de `pickOriginFeat`, CharacterCreationWizard.jsx) -- quem
// chama `clearFeat` precisa ter certeza que `index` corresponde à ocorrência
// certa ANTES de remover a entrada de `classChoices` (ver
// StepEscolhasDeClasse.jsx, que calcula isso contra o estado atual antes de
// chamar `onClear`).
export function useLessonsOfTheFirstOnes(setCharacter) {
  function pickFeat(index, featName) {
    if (!featName) return;
    setCharacter((prev) => {
      const list = [...(prev.lessonsOfTheFirstOnesFeats ?? [])];
      const previous = list[index];
      if (previous === featName) return prev;
      list[index] = featName;
      let feats = prev.feats;
      if (previous) feats = feats.filter((f) => f !== previous);
      if (!feats.includes(featName)) feats = [...feats, featName];
      return { ...prev, feats, lessonsOfTheFirstOnesFeats: list };
    });
  }

  // Remove só a escolha de talento da ocorrência `index` (a invocação
  // continua lá, só fica sem talento até escolher outro) -- usado pelo botão
  // "remover" do próprio sub-picker, NÃO quando a invocação inteira é
  // removida (ver `removeOccurrence` abaixo, que faz o splice certo).
  function clearFeat(index) {
    setCharacter((prev) => {
      const list = [...(prev.lessonsOfTheFirstOnesFeats ?? [])];
      const removed = list[index];
      if (!removed) return prev;
      list[index] = undefined;
      return { ...prev, feats: prev.feats.filter((f) => f !== removed), lessonsOfTheFirstOnesFeats: list };
    });
  }

  // Chamado quando a ocorrência `index` de "Lessons of the First Ones" é
  // removida de `classChoices` (invocação inteira, não só o talento) --
  // `splice` desloca as ocorrências seguintes um índice pra trás, igual
  // `clearClassChoice` já faz no array de cima, pra manter os dois em
  // sincronia.
  function removeOccurrence(index) {
    setCharacter((prev) => {
      const list = [...(prev.lessonsOfTheFirstOnesFeats ?? [])];
      const [removed] = list.splice(index, 1);
      return { ...prev, feats: removed ? prev.feats.filter((f) => f !== removed) : prev.feats, lessonsOfTheFirstOnesFeats: list };
    });
  }

  return { pickFeat, clearFeat, removeOccurrence };
}
