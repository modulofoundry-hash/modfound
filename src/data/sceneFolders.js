import { collection, deleteDoc, doc, getCountFromServer, getDocs, increment, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  createDocument,
  deleteDocument,
  subscribeToCollection,
  updateDocument,
} from "./firestoreCollection";

const path = (profileId) => ["profiles", profileId, "sceneFolders"];
const scenesPath = (profileId, folderId) => [
  "profiles",
  profileId,
  "sceneFolders",
  folderId,
  "scenes",
];

export function subscribeToSceneFolders(profileId, onData, onError) {
  return subscribeToCollection(path(profileId), onData, onError);
}

// `sceneCount: 0` desde a criação -- pasta nova nunca cai no fallback de
// consulta ao vivo (ver getSceneCount abaixo), já nasce com o contador certo.
export function createSceneFolder(profileId, data) {
  return createDocument(path(profileId), { sceneCount: 0, ...data });
}

export function updateSceneFolder(profileId, id, data) {
  return updateDocument(path(profileId), id, data);
}

// Consulta ao vivo -- só usada como fallback pra pasta antiga sem `sceneCount`
// ainda gravado (ver self-cura em Scenes.jsx). Toda pasta nova já nasce com
// `sceneCount` certo (createSceneFolder abaixo), e `adjustSceneCount` mantém
// atualizado dali em diante -- não precisa mais desta consulta pra pasta nenhuma
// depois que ela é tocada uma vez.
export async function getSceneCount(profileId, folderId) {
  const snapshot = await getCountFromServer(collection(db, ...scenesPath(profileId, folderId)));
  return snapshot.data().count;
}

// Ajusta o contador denormalizado da pasta sem precisar reler nada --
// `increment()` roda no servidor de forma atômica, seguro mesmo com 2 clientes
// criando/apagando cena ao mesmo tempo na mesma pasta (um "lê contagem, grava
// contagem+1" no cliente perderia incrementos concorrentes). Usado por
// createScene/deleteScene (data/scenes.js) -- antes, `Scenes.jsx` fazia UMA
// consulta `getCountFromServer` por pasta a cada mudança na listagem
// (N pastas = N idas ao servidor toda vez); agora a contagem já vem pronta no
// próprio documento da pasta, no mesmo snapshot que já é assinado.
export function adjustSceneCount(profileId, folderId, delta) {
  return updateDoc(doc(db, ...path(profileId), folderId), { sceneCount: increment(delta) });
}

export async function deleteSceneFolder(profileId, folderId) {
  const scenesSnapshot = await getDocs(collection(db, ...scenesPath(profileId, folderId)));
  await Promise.all(scenesSnapshot.docs.map((sceneDoc) => deleteDoc(sceneDoc.ref)));
  await deleteDocument(path(profileId), folderId);
}
