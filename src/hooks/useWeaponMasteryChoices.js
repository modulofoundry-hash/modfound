// Mesmo padrão de useClassChoices.js (achatado por "categoria", aqui `sourceKey` --
// "class:<classIndex>" ou "feat" -- em vez de category de optionalFeature). Extraído
// cedo pra ser reaproveitado pelo wizard de Level-Up também, mesma razão do original.
export function useWeaponMasteryChoices(setCharacter) {
  function setWeaponMasteryChoice(sourceKey, position, weaponKey) {
    setCharacter((prev) => {
      const others = (prev.weaponMasteryChoices ?? []).filter((c) => c.sourceKey !== sourceKey);
      const current = (prev.weaponMasteryChoices ?? []).filter((c) => c.sourceKey === sourceKey);
      current[position] = { sourceKey, weaponKey };
      return { ...prev, weaponMasteryChoices: [...others, ...current.filter(Boolean)] };
    });
  }

  function clearWeaponMasteryChoice(sourceKey, position) {
    setCharacter((prev) => {
      const others = (prev.weaponMasteryChoices ?? []).filter((c) => c.sourceKey !== sourceKey);
      const current = (prev.weaponMasteryChoices ?? []).filter((c) => c.sourceKey === sourceKey);
      current.splice(position, 1);
      return { ...prev, weaponMasteryChoices: [...others, ...current] };
    });
  }

  return { setWeaponMasteryChoice, clearWeaponMasteryChoice };
}
