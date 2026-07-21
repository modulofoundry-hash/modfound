import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { createNpc, deleteNpc, subscribeToNpcs, updateNpc } from "../data/npcs";
import { NpcForm } from "../components/NpcForm";
import { SheetCardGrid } from "../components/SheetCardGrid";
import { SheetCard } from "../components/SheetCard";
import { GUEST_PROFILE_ID } from "../constants/profiles";

export function Npcs() {
  const { profileId } = useParams();
  const [npcs, setNpcs] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  // Perfil visitante só cria Personagem — bloqueia acesso direto por URL
  // (o menu já esconde o link, ver ProfileLayout.jsx).
  const isGuest = profileId === GUEST_PROFILE_ID;

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

  if (isGuest) {
    return <Navigate to={`/perfis/${profileId}`} replace />;
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
      <SheetCardGrid
        items={npcs}
        renderCard={(npc) => <SheetCard key={npc.id} item={npc} onEdit={setEditing} onDelete={handleDelete} />}
      />
    </div>
  );
}
