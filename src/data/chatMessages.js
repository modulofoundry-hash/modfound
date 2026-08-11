import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Mesma coleção que o módulo do Foundry lê/escreve (ver module/scripts/live/
// liveRollBridge.js e chatMirror.js) -- ordenada por createdAt (não por
// "name" como o resto de firestoreCollection.js, por isso não reaproveita
// subscribeToCollection direto).
export function subscribeToChatMessages(profileId, onData, onError) {
  const q = query(collection(db, "profiles", profileId, "chatMessages"), orderBy("createdAt"));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

function sendChatMessage(profileId, data) {
  return addDoc(collection(db, "profiles", profileId, "chatMessages"), {
    origin: "site",
    createdAt: serverTimestamp(),
    ...data,
  });
}

export function sendChatText(profileId, { sourceId, authorName, text }) {
  return sendChatMessage(profileId, {
    kind: "text",
    status: "pending",
    sourceId,
    authorName,
    text,
    request: null,
  });
}

// `request.type`: "check" | "save" | "skill" | "attack" | "formula" — ver
// modelo de dados no módulo (liveRollBridge.js) pra saber quais campos cada
// tipo espera dentro de `request`.
export function sendRollRequest(profileId, { sourceId, authorName, request }) {
  return sendChatMessage(profileId, {
    kind: "rollRequest",
    status: "pending",
    sourceId,
    authorName,
    text: null,
    request,
  });
}
