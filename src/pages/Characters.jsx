import { useEffect, useRef, useState } from "react";
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
  return (classes ?? []).filter((c) => c.name).reduce((sum, c) => sum + (Number(c.level) || 0), 0);
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
  const importInputRef = useRef(null);

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

  // Contraparte do "Baixar JSON" da ficha (FoundrySheetView) — sempre cria um
  // personagem NOVO, nunca sobrescreve um existente. `id`/`updatedAt` vêm do
  // Firestore e não fazem sentido num documento novo; `isOriginal`/
  // `derivedFrom` são de uma cadeia de level-up de outro documento, que não
  // existe mais depois do import (evita ficar com uma referência morta).
  async function handleImportJSON(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.name) {
        throw new Error("O arquivo não parece ser uma ficha de personagem (falta o campo \"name\").");
      }
      const { id, updatedAt, isOriginal, derivedFrom, ...payload } = parsed;
      await createCharacter(profileId, payload);
    } catch (err) {
      setError(err instanceof SyntaxError ? "JSON inválido — o arquivo não pôde ser lido." : err.message);
    }
  }

  // Edição rápida in-loco na FoundrySheetView (toggle "Editar" da própria ficha,
  // não o assistente completo) — mesmo `updateCharacter` que o assistente usa,
  // só que sem passar pelas etapas guiadas. `viewing` é atualizado localmente
  // também pra ficha continuar mostrando o valor novo sem esperar o próximo
  // snapshot do Firestore.
  async function handleQuickSave(id, patch) {
    try {
      await updateCharacter(profileId, id, patch);
      setViewing((current) => (current && current.id === id ? { ...current, ...patch } : current));
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
      // Cria a ficha NOVA primeiro, só marca a antiga como `isOriginal`
      // depois que ela existe de verdade -- ordem invertida (era: marcar
      // antiga -> criar nova). Se `createCharacter` falhar, a ficha antiga
      // fica intocada em vez de virar um "Original" órfão sem sucessora
      // (achado na revisão: com a ordem antiga, uma falha de rede/permissão
      // bem no meio deixava a ficha original marcada pra sempre, sem nenhuma
      // ficha "viva" pra substituí-la, e sem aviso visível — ver fix do erro
      // não aparecer nesta tela, logo acima).
      await createCharacter(profileId, { ...payload, isOriginal: false, derivedFrom: levelingUp.id });
      await updateCharacter(profileId, levelingUp.id, { isOriginal: true });
      setLevelingUp(null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing === "new") {
    return (
      <div>
        <h2>Novo personagem</h2>
        {error && <p className="error">Erro ao salvar: {error}</p>}
        <CharacterCreationWizard onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <h2>{`Editar ${editing.name}`}</h2>
        {error && <p className="error">Erro ao salvar: {error}</p>}
        <CharacterCreationWizard initialValue={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  if (levelingUp) {
    return (
      <div>
        <h2>{`Subir de nível — ${levelingUp.name}`}</h2>
        {error && <p className="error">Erro ao subir de nível: {error}</p>}
        <LevelUpWizard initialCharacter={levelingUp} onSubmit={handleLevelUpSubmit} onCancel={() => setLevelingUp(null)} />
      </div>
    );
  }

  if (viewing) {
    return (
      <CharacterView
        character={viewing}
        profileId={profileId}
        onEdit={() => {
          setEditing(viewing);
          setViewing(null);
        }}
        onLevelUp={() => {
          setLevelingUp(viewing);
          setViewing(null);
        }}
        onBack={() => setViewing(null)}
        onSave={(patch) => handleQuickSave(viewing.id, patch)}
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
        <button type="button" onClick={() => importInputRef.current?.click()}>
          ⬆ Importar JSON
        </button>
        <input
          type="file"
          accept="application/json,.json"
          ref={importInputRef}
          onChange={handleImportJSON}
          style={{ display: "none" }}
        />
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
