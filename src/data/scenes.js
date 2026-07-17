import {
  createDocument,
  deleteDocument,
  subscribeToCollection,
  updateDocument,
} from "./firestoreCollection";

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

export function createScene(profileId, folderId, data) {
  return createDocument(path(profileId, folderId), data);
}

export function updateScene(profileId, folderId, id, data) {
  return updateDocument(path(profileId, folderId), id, data);
}

export function deleteScene(profileId, folderId, id) {
  return deleteDocument(path(profileId, folderId), id);
}
