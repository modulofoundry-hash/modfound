export const PROFILES = [
  { id: "ayla", name: "Ayla" },
  { id: "gabriel", name: "Gabriel" },
  { id: "nico", name: "Nico" },
  { id: "nicolas", name: "Nicolas" },
  { id: "pedro", name: "Pedro" },
  { id: "tayron", name: "Tayron" },
];

export function getProfile(id) {
  return PROFILES.find((p) => p.id === id);
}
