import { deleteDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// Cargo de GM do chat geral -- pedido do usuário (nov/2026): só 1 por vez,
// qualquer um pode assumir se estiver livre, perde sozinho ao deslogar ou
// depois de 8h sem sinal de vida.
//
// Documento único, caminho fixo -- reaproveita a MESMA regra de acesso que
// já existe (`profiles/{profileId}/{document=**}` libera qualquer
// profileId pra família, não só os 6 fixos), sem precisar de regra nova no
// Firestore. "_system" nunca aparece na lista de perfis de verdade
// (ProfileLayout/useProfiles só listam os perfis reais), então não
// conflita com nada.
const GM_DOC = () => doc(db, "profiles", "_system", "presence", "gm");

const STALE_MS = 8 * 60 * 60 * 1000; // 8h sem sinal de vida -- perde o cargo sozinho.
export const GM_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // sinal de vida a cada 5min, bem dentro da folga de 8h.

function isStale(data) {
  if (!data?.heldByProfileId) return false;
  const last = data.lastHeartbeatAt?.toMillis?.() ?? 0;
  return Date.now() - last > STALE_MS;
}

// `onData` recebe `null` quando ninguém é GM (ou o cargo expirou por
// inatividade) -- quem assina nunca precisa calcular "stale" sozinho.
export function subscribeToGmPresence(onData, onError) {
  return onSnapshot(
    GM_DOC(),
    (snap) => {
      const data = snap.data();
      onData(isStale(data) ? null : (data ?? null));
    },
    onError,
  );
}

// Transação -- evita 2 pessoas virando GM ao mesmo tempo (corrida real: 2
// cliques quase simultâneos sem ninguém segurando o cargo ainda).
export async function claimGm(profileId, name) {
  await runTransaction(db, async (tx) => {
    const ref = GM_DOC();
    const snap = await tx.get(ref);
    const current = snap.data();
    if (current?.heldByProfileId && !isStale(current)) {
      throw new Error("Já existe um GM agora.");
    }
    tx.set(ref, {
      heldByProfileId: profileId,
      heldByName: name,
      claimedAt: serverTimestamp(),
      lastHeartbeatAt: serverTimestamp(),
    });
  });
}

// Só libera se for VOCÊ quem segura -- nunca derruba o GM de outra pessoa
// por engano (ex: 2 abas da mesma conta família, uma delas clicando "Sair").
export async function releaseGm(profileId) {
  const ref = GM_DOC();
  const snap = await getDoc(ref);
  if (snap.data()?.heldByProfileId === profileId) await deleteDoc(ref);
}

// Chamado periodicamente (GM_HEARTBEAT_INTERVAL_MS) enquanto a aba que
// reivindicou o cargo continuar aberta -- se outra aba/pessoa já assumiu
// nesse meio tempo, não escreve nada (não "rouba" o cargo de volta).
export async function heartbeatGm(profileId) {
  const ref = GM_DOC();
  const snap = await getDoc(ref);
  if (snap.data()?.heldByProfileId === profileId) {
    await setDoc(ref, { lastHeartbeatAt: serverTimestamp() }, { merge: true });
  }
}
