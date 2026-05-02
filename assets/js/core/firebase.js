import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  if (isInAppBrowser()) {
    await signInWithRedirect(auth, googleProvider);
    return;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
    } else {
      throw e;
    }
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

function isInAppBrowser() {
  const ua = navigator.userAgent;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isStandalone) return false;
  return /FB_IAB|FBAN|FBAV|Instagram|Twitter|LinkedInApp|Snapchat|TikTok|BytedanceWebview|GSA|musical_ly/.test(ua)
    || /wv/.test(ua)
    || (/Android/.test(ua) && !/Chrome\/[.0-9]* Mobile/.test(ua) && /Version\//.test(ua))
    || (window.ReactNativeWebView !== undefined)
    || (typeof Android !== 'undefined');
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