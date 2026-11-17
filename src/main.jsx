import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext";

// Chunks lazy-loaded (`App.jsx`) ganham hash novo a cada deploy -- uma aba
// aberta de antes do deploy atual tenta buscar um chunk que não existe mais,
// cai no catch-all do netlify.toml (`/* -> /index.html`) e recebe HTML onde
// esperava um módulo JS. Recarregar busca o index.html atual, com os hashes
// certos.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
