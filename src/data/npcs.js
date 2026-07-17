import {
  createDocument,
  deleteDocument,
  subscribeToCollection,
  updateDocument,
} from "./firestoreCollection";

const path = (profileId) => ["profiles", profileId, "npcs"];

export function subscribeToNpcs(profileId, onData, onError) {
  return subscribeToCollection(path(profileId), onData, onError);
}

export function createNpc(profileId, data) {
  return createDocument(path(profileId), data);
}

export function updateNpc(profileId, id, data) {
  return updateDocument(path(profileId), id, data);
}

export function deleteNpc(profileId, id) {
  return deleteDocument(path(profileId), id);
}
