import {
  createDocument,
  deleteDocument,
  subscribeToCollection,
  updateDocument,
} from "./firestoreCollection";
import { adjustSceneCount } from "./sceneFolders";

const path = (profileId, folderId) => [
  "profiles",
  profileId,
  "sceneFolders",
  folderId,
  "scenes",
];

export function subscribeToScenes(profileId, folderId, onData, onError) {
  return subscribeToCollection(path(profileId, folderId), onData, onError);
}

// Mantém `sceneCount` da pasta em dia a cada criação/remoção (ver
// adjustSceneCount em sceneFolders.js) -- `updateScene` não mexe na contagem,
// só cria/apaga muda quantas cenas a pasta tem.
export async function createScene(profileId, folderId, data) {
  const ref = await createDocument(path(profileId, folderId), data);
  await adjustSceneCount(profileId, folderId, 1);
  return ref;
}

export function updateScene(profileId, folderId, id, data) {
  return updateDocument(path(profileId, folderId), id, data);
}

export async function deleteScene(profileId, folderId, id) {
  await deleteDocument(path(profileId, folderId), id);
  await adjustSceneCount(profileId, folderId, -1);
}
