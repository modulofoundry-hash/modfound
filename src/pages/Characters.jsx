import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createCharacter,
  deleteCharacter,
  subscribeToCharacters,
  updateCharacter,
} from "../data/characters";
import { CharacterCreationWizard } from "../components/CharacterCreationWizard";
import { LevelUpWizard } from "../components/LevelUpWizard";
import { SheetCardGrid } from "../components/SheetCardGrid";
import { SheetCard } from "../components/SheetCard";
import { CharacterView } from "./CharacterView";

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
  const [viewing, setViewing] = useState(null);
  const [levelingUp, setLevelingUp] = useState(null);

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

  // A ficha de ANTES do level-up nunca é sobrescrita: fica marcada
  // `isOriginal` (tag visual na lista, continua um card comum, editável e
  // sincronizável com o Foundry igual qualquer outro) e um documento NOVO
  // nasce com o resultado da subida — esse é o que segue "vivo" dali em
  // diante. Pedido explícito do usuário.
  async function handleLevelUpSubmit(updatedData) {
    const { id, ...payload } = updatedData;
    try {
      await updateCharacter(profileId, levelingUp.id, { isOriginal: true });
      await createCharacter(profileId, { ...payload, isOriginal: false, derivedFrom: levelingUp.id });
      setLevelingUp(null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing === "new") {
    return (
      <div>
        <h2>Novo personagem</h2>
        <CharacterCreationWizard onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <h2>{`Editar ${editing.name}`}</h2>
        <CharacterCreationWizard initialValue={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  if (levelingUp) {
    return (
      <div>
        <h2>{`Subir de nível — ${levelingUp.name}`}</h2>
        <LevelUpWizard initialCharacter={levelingUp} onSubmit={handleLevelUpSubmit} onCancel={() => setLevelingUp(null)} />
      </div>
    );
  }

  if (viewing) {
    return (
      <CharacterView
        character={viewing}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
        }}
        onLevelUp={() => {
          setLevelingUp(viewing);
          setViewing(null);
        }}
        onBack={() => setViewing(null)}
      />
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
          <SheetCard
            key={character.id}
            item={character}
            onEdit={setViewing}
            onDelete={handleDelete}
            onLevelUp={setLevelingUp}
          >
            <span className="sheet-card-level">Nível {totalLevel(character.classes)}</span>
            <span className="sheet-card-classes">{classSummary(character.classes)}</span>
            <span className="sheet-card-background">{character.background || "—"}</span>
            {character.rulesMode && <span className="sheet-card-tag">{character.rulesMode}</span>}
            {character.isOriginal && <span className="sheet-card-tag sheet-card-tag-original">Original</span>}
          </SheetCard>
        )}
      />
    </div>
  );
}
