import { useEffect, useState } from "react";
import { subscribeToCollection } from "../data/firestoreCollection";
import { PROFILES, GUEST_PROFILE } from "../constants/profiles";

// Perfis fixos criados depois pelo botão "Criar perfil fixo" (ver
// ProfileSelect.jsx) vivem em Firestore (coleção "profileRegistry"), não no
// array PROFILES — essa lista combina os 6 originais (fixos no código) com os
// criados depois, mais o perfil de visitante (sempre presente, nunca listado
// na grade de escolha — ver ProfileSelect.jsx).
export function useProfiles() {
  const [registryProfiles, setRegistryProfiles] = useState([]);

  useEffect(() => {
    return subscribeToCollection(["profileRegistry"], setRegistryProfiles, () => {});
  }, []);

  return [...PROFILES, ...registryProfiles, GUEST_PROFILE];
}
