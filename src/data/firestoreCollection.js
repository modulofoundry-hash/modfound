import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export function subscribeToCollection(pathSegments, onData, onError) {
  const q = query(collection(db, ...pathSegments), orderBy("name"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function createDocument(pathSegments, data) {
  return addDoc(collection(db, ...pathSegments), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function updateDocument(pathSegments, id, data) {
  return updateDoc(doc(db, ...pathSegments, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function deleteDocument(pathSegments, id) {
  return deleteDoc(doc(db, ...pathSegments, id));
}
