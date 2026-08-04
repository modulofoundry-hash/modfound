import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebase";

const STORAGE_KEY = "oos_authenticated";
const AuthContext = createContext(null);

// E-mails fixos das 2 contas reais do Firebase Authentication (criadas no
// Console, e-mail/senha) -- não são segredo, são só o "usuário" de cada
// conta; a senha de verdade é validada pelo próprio Firebase Auth agora, não
// mais comparada no cliente. Ver auditoria de segurança (ago/2026): antes
// disso, QUALQUER visitante conseguia acesso total ao Firestore chamando
// `signInAnonymously()` direto, sem senha nenhuma -- a tela de login era só
// decoração, nunca era verificada em lugar nenhum do lado do servidor.
// TESTE (ago/2026): usuário recria essas 2 contas a cada sessão de trabalho
// no projeto, apagando ao final do dia -- trocar pras contas permanentes
// (familia@/visitante@modfoundy.local, sem "teste") quando o projeto
// estabilizar. UID correspondente também precisa bater com
// shared/firestore.rules a cada recriação.
const FAMILY_EMAIL = "testefamilia@modfoundy.local";
const GUEST_EMAIL = "testevisitante@modfoundy.local";

// Deriva "main"/"guest"/null a partir do e-mail da sessão do Firebase --
// mais simples e confiável que guardar isso num campo próprio (não tem como
// dessincronizar: "quem está logado" e "qual conta é essa" vêm da MESMA
// fonte). Usado tanto no login quanto pra restaurar o tipo depois de um
// reload de página (sessão persistida pelo próprio Firebase).
function kindFromEmail(email) {
  if (email === FAMILY_EMAIL) return "main";
  if (email === GUEST_EMAIL) return "guest";
  return null;
}

// Só esses códigos significam "senha/credencial rejeitada" de verdade --
// qualquer outro erro do Firebase Auth (rede, projeto mal configurado, conta
// desabilitada, rate-limit) deve subir pro chamador em vez de virar "senha
// incorreta" (ver `login`, abaixo).
const CREDENTIAL_ERROR_CODES = new Set([
  "auth/wrong-password",
  "auth/invalid-credential",
  "auth/user-not-found",
  "auth/invalid-email",
]);

function isCredentialError(err) {
  return CREDENTIAL_ERROR_CODES.has(err?.code);
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem(STORAGE_KEY) === "1");
  // Achado testando o login de verdade pela primeira vez (ago/2026): sem
  // saber o TIPO da sessão (família vs. visitante) depois do redirect
  // inicial, nada impedia o visitante de digitar "/perfis" na barra de
  // endereço e ver a grade com os 6 perfis fixos -- a restrição só existia
  // no momento do login (ProfileSelect.jsx/ProfileLayout.jsx agora leem isso
  // pra se proteger). `null` = ainda não confirmado pelo Firebase (reload
  // recente) -- páginas que dependem disso tratam `null` como "deixa passar,
  // a checagem de verdade é a Regra do Firestore", só bloqueiam de propósito
  // quando `authKind === "guest"` é confirmado.
  const [authKind, setAuthKind] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthKind(kindFromEmail(user?.email));
      if (!user && sessionStorage.getItem(STORAGE_KEY) === "1") {
        sessionStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
      }
    });
  }, []);

  // Devolve "main" (conta família, mostra os 6 perfis fixos), "guest" (conta
  // visitante, pula direto pro perfil efêmero) ou false (senha errada nas
  // duas contas). Tenta família primeiro (caso comum) -- cada tentativa é
  // uma chamada real ao Firebase Auth, que valida a senha no SERVIDOR.
  //
  // Só cai pra tentar a 2ª conta (ou devolve `false`) quando o erro é
  // realmente de CREDENCIAL rejeitada -- outros erros (rede fora do ar,
  // Firebase mal configurado, etc.) sobem pro `catch` de Login.jsx, que já
  // tem uma mensagem própria pra isso ("Não foi possível conectar ao
  // banco"). Bug real achado na revisão: antes, um `catch` sem filtro
  // engolia QUALQUER erro das duas tentativas -- um problema de rede virava
  // sempre "Senha incorreta", mensagem enganosa pra quem for investigar.
  async function login(password) {
    let kind;
    try {
      await signInWithEmailAndPassword(auth, FAMILY_EMAIL, password);
      kind = "main";
    } catch (err) {
      if (!isCredentialError(err)) throw err;
      try {
        await signInWithEmailAndPassword(auth, GUEST_EMAIL, password);
        kind = "guest";
      } catch (err2) {
        if (!isCredentialError(err2)) throw err2;
        return false;
      }
    }
    sessionStorage.setItem(STORAGE_KEY, "1");
    setIsAuthenticated(true);
    setAuthKind(kind);
    return kind;
  }

  async function logout() {
    await signOut(auth);
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setAuthKind(null);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, authKind, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
