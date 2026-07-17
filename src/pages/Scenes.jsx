import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createSceneFolder,
  deleteSceneFolder,
  getSceneCount,
  subscribeToSceneFolders,
} from "../data/sceneFolders";
import { createScene, deleteScene, subscribeToScenes, updateScene } from "../data/scenes";
import { SceneForm } from "../components/SceneForm";

export function Scenes() {
  const { profileId } = useParams();
  const [folders, setFolders] = useState([]);
  const [folderCounts, setFolderCounts] = useState({});
  const [error, setError] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [openFolder, setOpenFolder] = useState(null);

  useEffect(() => {
    setError(null);
    const unsubscribe = subscribeToSceneFolders(profileId, setFolders, (err) => setError(err.message));
    return unsubscribe;
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      folders.map((folder) => getSceneCount(profileId, folder.id).then((count) => [folder.id, count])),
    )
      .then((entries) => {
        if (!cancelled) setFolderCounts(Object.fromEntries(entries));
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [folders, profileId]);

  async function handleCreateFolder(event) {
    event.preventDefault();
    try {
      await createSceneFolder(profileId, { name: folderName });
      setFolderName("");
      setCreatingFolder(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFolder(folderId) {
    try {
      await deleteSceneFolder(profileId, folderId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (openFolder) {
    return <SceneFolderView profileId={profileId} folder={openFolder} onBack={() => setOpenFolder(null)} />;
  }

  return (
    <div>
      <div className="sheet-list-header">
        <h2>Cenas</h2>
        <button type="button" onClick={() => setCreatingFolder(true)}>
          Pasta de Cenas
        </button>
      </div>
      {error && <p className="error">Erro ao carregar do banco: {error}</p>}

      {creatingFolder && (
        <form className="sheet-form" onSubmit={handleCreateFolder}>
          <label>
            Nome da pasta
            <input type="text" required autoFocus value={folderName} onChange={(e) => setFolderName(e.target.value)} />
          </label>
          <div className="sheet-form-actions">
            <button type="submit">Criar</button>
            <button type="button" onClick={() => setCreatingFolder(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="folder-grid">
        {folders.map((folder) => (
          <div key={folder.id} className="folder-card">
            <button type="button" className="folder-card-open" onClick={() => setOpenFolder(folder)}>
              <span className="folder-name">{folder.name}</span>
              <span className="folder-count">{folderCounts[folder.id] ?? "…"} cena(s)</span>
            </button>
            <button type="button" onClick={() => handleDeleteFolder(folder.id)}>
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneFolderView({ profileId, folder, onBack }) {
  const [scenes, setScenes] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    setError(null);
    const unsubscribe = subscribeToScenes(profileId, folder.id, setScenes, (err) => setError(err.message));
    return unsubscribe;
  }, [profileId, folder.id]);

  async function handleSubmit(data) {
    const { id, ...payload } = data;
    try {
      if (editing === "new") {
        await createScene(profileId, folder.id, payload);
      } else {
        await updateScene(profileId, folder.id, editing.id, payload);
      }
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteScene(profileId, folder.id, id);
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing) {
    return (
      <div>
        <h2>{editing === "new" ? "Nova cena" : `Editar ${editing.name}`}</h2>
        <SceneForm
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
        <div className="folder-view-title">
          <button type="button" onClick={onBack}>
            ← Pastas
          </button>
          <h2>{folder.name}</h2>
        </div>
        <button type="button" onClick={() => setEditing("new")}>
          Nova Cena
        </button>
      </div>
      {error && <p className="error">Erro ao carregar do banco: {error}</p>}
      <ul className="sheet-list">
        {scenes.map((scene) => (
          <li key={scene.id}>
            <span>{scene.name || "(sem nome)"}</span>
            <div>
              <button type="button" onClick={() => setEditing(scene)}>
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(scene.id)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
