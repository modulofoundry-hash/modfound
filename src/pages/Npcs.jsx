import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createNpc, deleteNpc, subscribeToNpcs, updateNpc } from "../data/npcs";
import { NpcForm } from "../components/NpcForm";

export function Npcs() {
  const { profileId } = useParams();
  const [npcs, setNpcs] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    setError(null);
    const unsubscribe = subscribeToNpcs(profileId, setNpcs, (err) => setError(err.message));
    return unsubscribe;
  }, [profileId]);

  async function handleSubmit(data) {
    const { id, ...payload } = data;
    try {
      if (editing === "new") {
        await createNpc(profileId, payload);
      } else {
        await updateNpc(profileId, editing.id, payload);
      }
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNpc(profileId, id);
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing) {
    return (
      <div>
        <h2>{editing === "new" ? "Novo NPC" : `Editar ${editing.name}`}</h2>
        <NpcForm
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
        <h2>NPCs</h2>
        <button type="button" onClick={() => setEditing("new")}>
          Novo NPC
        </button>
      </div>
      {error && <p className="error">Erro ao carregar do banco: {error}</p>}
      <ul className="sheet-list">
        {npcs.map((npc) => (
          <li key={npc.id}>
            <span>{npc.name || "(sem nome)"}</span>
            <div>
              <button type="button" onClick={() => setEditing(npc)}>
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(npc.id)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
