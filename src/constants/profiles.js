export const PROFILES = [
  { id: "ayla", name: "Ayla" },
  { id: "gabriel", name: "Gabriel" },
  { id: "nico", name: "Nico" },
  { id: "nicolas", name: "Nicolas" },
  { id: "pedro", name: "Pedro" },
  { id: "tayron", name: "Tayron" },
];

// Perfil especial acessado pela senha de visitante (ver AuthContext) — não
// aparece na grade de "Quem é você?" nem entra em PROFILES, mas resolve
// normalmente pra rota /perfis/visitante. Fichas de Personagem criadas aqui
// são efêmeras por padrão (ver data/characters.js).
export const GUEST_PROFILE_ID = "visitante";
export const GUEST_PROFILE = { id: GUEST_PROFILE_ID, name: "Visitante" };

export function getProfile(id) {
  if (id === GUEST_PROFILE_ID) return GUEST_PROFILE;
  return PROFILES.find((p) => p.id === id);
}
