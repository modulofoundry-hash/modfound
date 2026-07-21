import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCharacter,
  deleteCharacter,
  subscribeToCharacters,
  updateCharacter,
} from "../data/characters";
import { CharacterForm } from "../components/CharacterForm";
import { SheetCardGrid } from "../components/SheetCardGrid";
import { SheetCard } from "../components/SheetCard";

function totalLevel(classes) {
  return (classes ?? []).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
}

function classSummary(classes) {
  const valid = (classes ?? []).filter((c) => c.name);
  if (!valid.length) return "—";
  return valid.map((c) => `${c.name} ${c.level}`).join(" / ");
}

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
      <SheetCardGrid
        items={characters}
        renderCard={(character) => (
          <SheetCard key={character.id} item={character} onEdit={setEditing} onDelete={handleDelete}>
            <span className="sheet-card-level">Nível {totalLevel(character.classes)}</span>
            <span className="sheet-card-classes">{classSummary(character.classes)}</span>
            <span className="sheet-card-background">{character.background || "—"}</span>
            {character.rulesMode && <span className="sheet-card-tag">{character.rulesMode}</span>}
          </SheetCard>
        )}
      />
    </div>
  );
}
