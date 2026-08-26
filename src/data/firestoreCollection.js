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
  // Firestore rejeita updateDoc() com QUALQUER campo undefined (erro em
  // runtime, não em build) -- acontece sempre que um caller manda um patch
  // parcial contendo uma chave que o documento nunca teve (ex: ficha antiga
  // sem campo "hp" editada pela FoundrySheetView sem tocar o HP). Omitir a
  // chave tem o mesmo efeito de não mandar nada pra ela; pra apagar um campo
  // de verdade um caller precisaria de deleteField(), que nenhum usa hoje.
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  return updateDoc(doc(db, ...pathSegments, id), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
}

export function deleteDocument(pathSegments, id) {
  return deleteDoc(doc(db, ...pathSegments, id));
}
