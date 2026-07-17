import { collection, deleteDoc, getCountFromServer, getDocs } from "firebase/firestore";
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

export function createSceneFolder(profileId, data) {
  return createDocument(path(profileId), data);
}

export function updateSceneFolder(profileId, id, data) {
  return updateDocument(path(profileId), id, data);
}

export async function getSceneCount(profileId, folderId) {
  const snapshot = await getCountFromServer(collection(db, ...scenesPath(profileId, folderId)));
  return snapshot.data().count;
}

export async function deleteSceneFolder(profileId, folderId) {
  const scenesSnapshot = await getDocs(collection(db, ...scenesPath(profileId, folderId)));
  await Promise.all(scenesSnapshot.docs.map((sceneDoc) => deleteDoc(sceneDoc.ref)));
  await deleteDocument(path(profileId), folderId);
}
