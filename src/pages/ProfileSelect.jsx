import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useProfiles } from "../hooks/useProfiles";
import { createDocument } from "../data/firestoreCollection";
import { GUEST_PROFILE_ID } from "../constants/profiles";
import { useAuth } from "../auth/AuthContext";

export function ProfileSelect() {
  // Todos os hooks primeiro, SEMPRE na mesma ordem (regra do React) -- o
  // guard condicional (abaixo) só decide o que RENDERIZAR, nunca pula hook.
  const { authKind } = useAuth();
  const { profiles: allProfiles } = useProfiles();
  const profiles = allProfiles.filter((profile) => profile.id !== GUEST_PROFILE_ID);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Segunda camada de proteção (a primeira é o redirect no login, Login.jsx)
  // -- sem isso, o visitante digitando "/perfis" na barra de endereço (ou
  // clicando "Trocar perfil") via a grade com os 6 perfis fixos do site,
  // mesmo não conseguindo abrir nenhum de verdade (a Regra do Firestore já
  // bloqueia a leitura). `authKind === null` (ainda carregando) deixa passar
  // de propósito -- ver comentário em AuthContext.jsx.
  if (authKind === "guest") return <Navigate to="/perfis/visitante" replace />;

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    try {
      await createDocument(["profileRegistry"], { name: trimmed });
      setName("");
      setCreating(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="centered-page">
      <h1>Quem é você?</h1>
      <div className="profile-grid">
        {profiles.map((profile) => (
          <Link key={profile.id} to={`/perfis/${profile.id}`} className="profile-card">
            {profile.name}
          </Link>
        ))}
      </div>

      {creating ? (
        <form className="profile-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            autoFocus
            placeholder="Nome do novo perfil"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit">Criar</button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <button type="button" className="profile-create-toggle" onClick={() => setCreating(true)}>
          Criar perfil fixo
        </button>
      )}
      {error && <p className="error">Erro ao criar perfil: {error}</p>}
    </div>
  );
}
