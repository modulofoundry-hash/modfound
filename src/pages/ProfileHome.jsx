import { useParams } from "react-router-dom";
import { getProfile } from "../constants/profiles";

export function ProfileHome() {
  const { profileId } = useParams();
  const profile = getProfile(profileId);

  return (
    <div>
      <h1>Bem-vindo, {profile.name}</h1>
      <p>Use o menu acima para criar personagens, NPCs ou cenas.</p>
    </div>
  );
}
