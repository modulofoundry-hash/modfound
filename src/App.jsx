import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { Login } from "./pages/Login";
import { ProfileSelect } from "./pages/ProfileSelect";
import { ProfileLayout } from "./pages/ProfileLayout";
import { ProfileHome } from "./pages/ProfileHome";
import { Characters } from "./pages/Characters";
import { Npcs } from "./pages/Npcs";
import { Scenes } from "./pages/Scenes";

function App() {
  return (
    <>
      <div className="site-background" aria-hidden="true">
        <img className="site-background-side site-background-left" src="/fillesq.png" alt="" />
        <img className="site-background-main" src="/partygo.png" alt="" />
        <img className="site-background-side site-background-right" src="/filldir.png" alt="" />
      </div>
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
    </>
  );
}

export default App;
