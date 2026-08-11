import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { Login } from "./pages/Login";
import { ProfileSelect } from "./pages/ProfileSelect";
import { ProfileLayout } from "./pages/ProfileLayout";
import { ProfileHome } from "./pages/ProfileHome";
import { Scenes } from "./pages/Scenes";

// `Characters`/`Npcs` (não `Scenes`, que não usa nada disso) puxam junto os 6
// JSON de conteúdo (~2MB: races/classes/feats/optionalfeatures/spells/equipment)
// através de CharacterCreationWizard/LevelUpWizard/CharacterView/NpcForm --
// `React.lazy` bota isso num chunk separado, baixado só quando o jogador entra
// numa dessas duas telas, não em toda visita ao site (login, seleção de perfil,
// Cenas pagavam esse custo à toa antes, já que `App.jsx` importava tudo estático).
const Characters = lazy(() => import("./pages/Characters").then((m) => ({ default: m.Characters })));
const Npcs = lazy(() => import("./pages/Npcs").then((m) => ({ default: m.Npcs })));

function App() {
  return (
    <>
      <div className="site-background" aria-hidden="true">
        <img className="site-background-side site-background-left" src="/fillesq.png" alt="" />
        <img className="site-background-main" src="/partygo.png" alt="" />
        <img className="site-background-side site-background-right" src="/filldir.png" alt="" />
      </div>
      <Suspense fallback={<div className="centered-page">Carregando…</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/perfis"
            element={
              <RequireAuth>
                <ProfileSelect />
              </RequireAuth>
            }
          />
          <Route
            path="/perfis/:profileId"
            element={
              <RequireAuth>
                <ProfileLayout />
              </RequireAuth>
            }
          >
            <Route index element={<ProfileHome />} />
            <Route path="personagens" element={<Characters />} />
            <Route path="npcs" element={<Npcs />} />
            <Route path="cenas" element={<Scenes />} />
          </Route>
          <Route path="*" element={<Navigate to="/perfis" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
