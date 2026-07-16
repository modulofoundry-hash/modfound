import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "../firebase";

const STORAGE_KEY = "oos_authenticated";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === "1",
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user && sessionStorage.getItem(STORAGE_KEY) === "1") {
        sessionStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
      }
    });
  }, []);

  async function login(password) {
    if (password !== import.meta.env.VITE_SITE_PASSWORD) return false;
    await signInAnonymously(auth);
    sessionStorage.setItem(STORAGE_KEY, "1");
    setIsAuthenticated(true);
    return true;
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
