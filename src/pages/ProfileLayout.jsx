import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";
import { useProfiles } from "../hooks/useProfiles";
import { GUEST_PROFILE_ID } from "../constants/profiles";
import { useAuth } from "../auth/AuthContext";

export function ProfileLayout() {
  const { profileId } = useParams();
  const { profiles, loading } = useProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  const { logout, authKind } = useAuth();
  const isGuest = profileId === GUEST_PROFILE_ID;

  // Só redireciona depois que a 1ª resposta do Firestore chegou -- um perfil
  // criado por "Criar perfil fixo" (vive em `profileRegistry`, carregado
  // async por useProfiles) ainda não está na lista no 1º render; sem esperar
  // `loading` virar false, essa página nunca conseguia abrir (Navigate
  // desmontava o componente antes do onSnapshot ter chance de entregar o
  // perfil recém-criado).
  if (loading) return null;

  if (!profile) {
    return <Navigate to="/perfis" replace />;
  }

  // Mesma proteção de ProfileSelect.jsx -- sessão visitante não pode abrir o
  // perfil de mais ninguém digitando a URL direto (ex: "/perfis/ayla"). A
  // Regra do Firestore já bloqueia a leitura de qualquer jeito, isso só evita
  // a página ficar num estado quebrado/vazio em vez de redirecionar limpo.
  if (authKind === "guest" && !isGuest) {
    return <Navigate to="/perfis/visitante" replace />;
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
