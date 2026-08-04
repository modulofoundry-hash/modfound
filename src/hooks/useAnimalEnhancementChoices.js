// Mesmo padrão de useWeaponMasteryChoices.js, mas 1 escolha por slot (não N) --
// `slotKey` já é único por definição ("level1"/"level5"), não precisa de posição.
export function useAnimalEnhancementChoices(setCharacter) {
  function setAnimalEnhancementChoice(slotKey, name) {
    setCharacter((prev) => ({
      ...prev,
      animalEnhancementChoices: [...(prev.animalEnhancementChoices ?? []).filter((c) => c.slotKey !== slotKey), { slotKey, name }],
    }));
  }

  // `name` só importa pro slot "reversed" -- é o único que pode ter mais de uma
  // entrada com o mesmo slotKey (ver StepAnimalEnhancement.jsx), então remover
  // precisa mirar o nome específico, não o slot inteiro.
  function clearAnimalEnhancementChoice(slotKey, name) {
    setCharacter((prev) => ({
      ...prev,
      animalEnhancementChoices: (prev.animalEnhancementChoices ?? []).filter((c) => {
        if (c.slotKey !== slotKey) return true;
        return slotKey === "reversed" && c.name !== name;
      }),
    }));
  }

  return { setAnimalEnhancementChoice, clearAnimalEnhancementChoice };
}
