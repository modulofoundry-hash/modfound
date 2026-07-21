import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "../firebase";

const STORAGE_KEY = "oos_authenticated";
const AuthContext = createContext(null);
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => isLocalhost || sessionStorage.getItem(STORAGE_KEY) === "1",
  );

  // Em localhost (dev) pula a tela de senha — só entra anônimo direto no Firebase.
  useEffect(() => {
    if (isLocalhost) signInAnonymously(auth).catch(() => {});
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user && !isLocalhost && sessionStorage.getItem(STORAGE_KEY) === "1") {
        sessionStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
      }
    });
  }, []);

  // Devolve "main" (senha normal, mostra os 6 perfis fixos), "guest" (senha de
  // visitante, pula direto pro perfil efêmero) ou false (senha errada).
  async function login(password) {
    let kind;
    if (password === import.meta.env.VITE_SITE_PASSWORD) kind = "main";
    else if (password === import.meta.env.VITE_GUEST_PASSWORD) kind = "guest";
    else return false;

    await signInAnonymously(auth);
    sessionStorage.setItem(STORAGE_KEY, "1");
    setIsAuthenticated(true);
    return kind;
  }

  async function logout() {
    await signOut(auth);
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
