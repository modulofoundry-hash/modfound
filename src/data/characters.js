import {
  createDocument,
  deleteDocument,
  subscribeToCollection,
  updateDocument,
} from "./firestoreCollection";

const path = (profileId) => ["profiles", profileId, "characters"];

export function subscribeToCharacters(profileId, onData, onError) {
  return subscribeToCollection(path(profileId), onData, onError);
}

export function createCharacter(profileId, data) {
  return createDocument(path(profileId), data);
}

export function updateCharacter(profileId, id, data) {
  return updateDocument(path(profileId), id, data);
}

export function deleteCharacter(profileId, id) {
  return deleteDocument(path(profileId), id);
}
