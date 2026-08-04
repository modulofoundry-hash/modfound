import { useEffect, useState } from "react";
import { subscribeToCollection } from "../data/firestoreCollection";
import { PROFILES, GUEST_PROFILE } from "../constants/profiles";

// Perfis fixos criados depois pelo botão "Criar perfil fixo" (ver
// ProfileSelect.jsx) vivem em Firestore (coleção "profileRegistry"), não no
// array PROFILES — essa lista combina os 6 originais (fixos no código) com os
// criados depois, mais o perfil de visitante (sempre presente, nunca listado
// na grade de escolha — ver ProfileSelect.jsx).
// `loading` fica `true` até a primeira resposta do Firestore (sucesso ou erro)
// -- necessário pra distinguir "perfil dinâmico ainda não chegou" de "perfil
// não existe de verdade" em quem consome isso pra decidir redirecionar (ver
// ProfileLayout.jsx: sem essa distinção, abrir um perfil criado por "Criar
// perfil fixo" redirecionava direto de volta pra "/perfis" no primeiro
// render, antes do onSnapshot assíncrono ter chance de entregar o perfil).
export function useProfiles() {
  const [registryProfiles, setRegistryProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToCollection(
      ["profileRegistry"],
      (docs) => {
        setRegistryProfiles(docs);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  return { profiles: [...PROFILES, ...registryProfiles, GUEST_PROFILE], loading };
}
