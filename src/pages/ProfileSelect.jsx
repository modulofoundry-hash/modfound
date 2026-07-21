import { useState } from "react";
import { Link } from "react-router-dom";
import { useProfiles } from "../hooks/useProfiles";
import { createDocument } from "../data/firestoreCollection";
import { GUEST_PROFILE_ID } from "../constants/profiles";

export function ProfileSelect() {
  const profiles = useProfiles().filter((profile) => profile.id !== GUEST_PROFILE_ID);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

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
