import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const auth = window.firebaseAuth;

function initApp() {
    if (window.onAuthReady) {
        window.onAuthReady(); 
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        console.log("User is authenticated:", user.uid);
        initApp();
    } else {
        signInAnonymously(auth)
            .then(() => {
                console.log("Signed in anonymously.");
            })
            .catch((error) => {
                console.error("Anonymous sign-in failed:", error);
                alert("Failed to connect to multiplayer services. Please refresh.");
            });
    }
});