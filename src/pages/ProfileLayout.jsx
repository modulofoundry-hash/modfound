import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { getProfile } from "../constants/profiles";
import { useAuth } from "../auth/AuthContext";

export function ProfileLayout() {
  const { profileId } = useParams();
  const profile = getProfile(profileId);
  const { logout } = useAuth();

  if (!profile) {
    return <Navigate to="/perfis" replace />;
  }

  return (
    <div className="profile-layout">
      <header className="profile-header">
        <span className="profile-name">{profile.name}</span>
        <nav>
          <NavLink to="personagens">Personagens</NavLink>
          <NavLink to="npcs">NPCs</NavLink>
          <NavLink to="cenas">Cenas</NavLink>
        </nav>
        <div className="profile-header-actions">
          <NavLink to="/perfis">Trocar perfil</NavLink>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
