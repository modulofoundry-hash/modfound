import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCharacter,
  deleteCharacter,
  subscribeToCharacters,
  updateCharacter,
} from "../data/characters";
import { CharacterForm } from "../components/CharacterForm";

export function Characters() {
  const { profileId } = useParams();
  const [characters, setCharacters] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    setError(null);
    const unsubscribe = subscribeToCharacters(profileId, setCharacters, (err) =>
      setError(err.message),
    );
    return unsubscribe;
  }, [profileId]);

  async function handleSubmit(data) {
    const { id, ...payload } = data;
    try {
      if (editing === "new") {
        await createCharacter(profileId, payload);
      } else {
        await updateCharacter(profileId, editing.id, payload);
      }
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteCharacter(profileId, id);
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing) {
    return (
      <div>
        <h2>{editing === "new" ? "Novo personagem" : `Editar ${editing.name}`}</h2>
        <CharacterForm
          initialValue={editing === "new" ? undefined : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="sheet-list-header">
        <h2>Personagens</h2>
        <button type="button" onClick={() => setEditing("new")}>
          Novo personagem
        </button>
      </div>
      {error && <p className="error">Erro ao carregar do banco: {error}</p>}
      <ul className="sheet-list">
        {characters.map((character) => (
          <li key={character.id}>
            <span>{character.name || "(sem nome)"}</span>
            <div>
              <button type="button" onClick={() => setEditing(character)}>
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(character.id)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
