import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
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

// Chat geral (ao lado de "Trocar perfil") -- mesma coleção "chatMessages" de
// TODOS os perfis combinada numa linha do tempo só, via collection-group
// query. PRECISA da regra nova em shared/firestore.rules (match /{path=**}/
// chatMessages/{messageId}) publicada no Firebase Console -- achado testando
// ao vivo: a regra recursiva antiga (`profiles/{profileId}/{document=**}`)
// cobre get/set de um caminho já conhecido, mas NÃO autoriza uma query de
// collection-group (erro real: "Missing or insufficient permissions"), que
// precisa de um `match` ancorado no nome da coleção. `profileId` de cada
// mensagem vem do caminho do documento (`ref.parent.parent.id`), já que
// `collectionGroup` não devolve o pai sozinho em `.data()`.
export function subscribeToAllChatMessages(onData, onError) {
  const q = query(collectionGroup(db, "chatMessages"), orderBy("createdAt"));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(snapshot.docs.map((d) => ({ id: d.id, profileId: d.ref.parent.parent.id, ...d.data() }))),
    onError,
  );
}

// Limite pedido pelo usuário: 15 mensagens no TOTAL, somando os perfis todos
// (não 15 por perfil) -- o chat de uma ficha específica é um subconjunto
// desse mesmo pool, então nunca passa de 15 também. Roda depois de toda
// mensagem nova (texto ou rollRequest), apagando de verdade as mais antigas
// que excederem o limite, não importa de qual perfil vieram.
const CHAT_MESSAGE_LIMIT = 15;

async function trimChatMessagesGlobal() {
  const snapshot = await getDocs(query(collectionGroup(db, "chatMessages"), orderBy("createdAt")));
  const excess = snapshot.size - CHAT_MESSAGE_LIMIT;
  if (excess <= 0) return;
  await Promise.all(snapshot.docs.slice(0, excess).map((d) => deleteDoc(d.ref)));
}

async function sendChatMessage(profileId, data) {
  const ref = await addDoc(collection(db, "profiles", profileId, "chatMessages"), {
    origin: "site",
    createdAt: serverTimestamp(),
    ...data,
  });
  // A mensagem em si já foi criada com sucesso -- corte é só faxina. Se a
  // regra de collection-group ainda não tiver sido publicada (ver comentário
  // de subscribeToAllChatMessages), isso falharia com "permission denied" e
  // faria QUALQUER envio de chat parecer ter dado erro, mesmo tendo
  // funcionado -- por isso silencioso, nunca propaga pro chamador.
  trimChatMessagesGlobal().catch((err) => console.error("chatMessages | falha ao aplicar limite de 15:", err));
  return ref;
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
