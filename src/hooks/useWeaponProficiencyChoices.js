// Mesmo padrão de useWeaponMasteryChoices.js -- sourceKey aqui é "race" ou
// "feat:<nome>" (ver weaponProficiencySlots em utils/weaponProficiency.js).
export function useWeaponProficiencyChoices(setCharacter) {
  function setWeaponProficiencyChoice(sourceKey, position, weaponKey) {
    setCharacter((prev) => {
      const others = (prev.weaponProficiencies ?? []).filter((c) => c.sourceKey !== sourceKey);
      const current = (prev.weaponProficiencies ?? []).filter((c) => c.sourceKey === sourceKey);
      current[position] = { sourceKey, weaponKey };
      return { ...prev, weaponProficiencies: [...others, ...current.filter(Boolean)] };
    });
  }

  function clearWeaponProficiencyChoice(sourceKey, position) {
    setCharacter((prev) => {
      const others = (prev.weaponProficiencies ?? []).filter((c) => c.sourceKey !== sourceKey);
      const current = (prev.weaponProficiencies ?? []).filter((c) => c.sourceKey === sourceKey);
      current.splice(position, 1);
      return { ...prev, weaponProficiencies: [...others, ...current] };
    });
  }

  return { setWeaponProficiencyChoice, clearWeaponProficiencyChoice };
}
