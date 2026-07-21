import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { useProfiles } from "../hooks/useProfiles";
import { GUEST_PROFILE_ID } from "../constants/profiles";
import { useAuth } from "../auth/AuthContext";

export function ProfileLayout() {
  const { profileId } = useParams();
  const profiles = useProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  const { logout } = useAuth();
  const isGuest = profileId === GUEST_PROFILE_ID;

  if (!profile) {
    return <Navigate to="/perfis" replace />;
  }

  return (
    <div className="profile-layout">
      <header className="profile-header">
        <span className="profile-name">{profile.name}</span>
        <nav>
          <NavLink to="personagens">Personagens</NavLink>
          {!isGuest && <NavLink to="npcs">NPCs</NavLink>}
          {!isGuest && <NavLink to="cenas">Cenas</NavLink>}
        </nav>
        <div className="profile-header-actions">
          <NavLink to="/perfis">Trocar perfil</NavLink>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main>
        <Outlet context={profile} />
      </main>
    </div>
  );
}
