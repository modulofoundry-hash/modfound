import { Navigate, useLocation } from "react-router-dom";
import { useAuth, wasJustLoggedOut } from "./AuthContext";

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Omite "de onde vim" logo depois de um logout -- senão o próximo login
    // (de QUALQUER conta) reabre a página da sessão que acabou de sair. Fora
    // dessa janela, preserva o comportamento normal (voltar pro link direto
    // que o usuário tentou abrir sem estar logado). Ver `wasJustLoggedOut`.
    const state = wasJustLoggedOut() ? undefined : { from: location };
    return <Navigate to="/login" state={state} replace />;
  }

  return children;
}
