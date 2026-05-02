import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyB18M9FSegBBx8ZJnQmXVuWOE_GtAYT1D0",
  authDomain: "connect-four-ea92e.firebaseapp.com",
  projectId: "connect-four-ea92e",
  storageBucket: "connect-four-ea92e.firebasestorage.app",
  messagingSenderId: "661961025897",
  appId: "1:661961025897:web:d983ac6833d8d6c015b5f8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

window.addEventListener('beforeunload', () => {
  const user = auth.currentUser;
  if (user && user.isAnonymous) user.delete();
});

export function waitForAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then(() => {
            const unsub2 = onAuthStateChanged(auth, u => {
              if (u) { unsub2(); resolve(u); }
            });
          })
          .catch(reject);
      }
    });
  });
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function checkModAccess(uid) {
  try {
    const ref = doc(db, 'admins', uid);
    const snap = await getDoc(ref);
    return snap.exists() && snap.data().mod === true;
  } catch {
    return false;
  }
}