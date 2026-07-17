import { useEffect, useState } from "react";
import { subscribeToCollection } from "./firestoreCollection";

// Raça/antecedente/classe importados de compêndios do Foundry pelo botão
// "Enviar Itens" do módulo — coleções de nível raiz, compartilhadas entre os 6
// perfis (ver shared/firestore.rules e module/scripts/customContent.js).
function useCustomCollection(collectionName) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToCollection([collectionName], setItems, () => {});
    return unsubscribe;
  }, [collectionName]);

  return items;
}

export function useCustomRaces() {
  return useCustomCollection("customRaces");
}

export function useCustomBackgrounds() {
  return useCustomCollection("customBackgrounds");
}

export function useCustomClasses() {
  return useCustomCollection("customClasses");
}
