import { useOutletContext } from "react-router-dom";
import { GUEST_PROFILE_ID } from "../constants/profiles";

export function ProfileHome() {
  const profile = useOutletContext();
  const isGuest = profile.id === GUEST_PROFILE_ID;

  return (
    <div>
      <h1>Bem-vindo, {profile.name}</h1>
      {isGuest ? (
        <p>Aqui você só pode criar fichas de Personagem.</p>
      ) : (
        <p>Use o menu acima para criar personagens, NPCs ou cenas.</p>
      )}
    </div>
  );
}
