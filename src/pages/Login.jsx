import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname ?? "/perfis";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const ok = await login(password);
      if (!ok) {
        setError("Senha incorreta.");
        return;
      }
      const redirectTo = location.state?.from?.pathname ?? "/perfis";
      navigate(redirectTo, { replace: true });
    } catch {
      setError("Não foi possível conectar ao banco. Verifique a configuração do Firebase.");
    }
  }

  return (
    <div className="centered-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Out of Service</h1>
        <input
          type="password"
          autoFocus
          placeholder="Senha"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
        />
        <button type="submit">Entrar</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
