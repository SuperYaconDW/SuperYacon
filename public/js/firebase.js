// Configuración pública. La autorización se aplica en firestore.rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMn1rD_wgcpEdMXtfwWUFWk90LUl6upNg",
  authDomain: "yaconbd.firebaseapp.com",
  projectId: "yaconbd",
  storageBucket: "yaconbd.firebasestorage.app",
  messagingSenderId: "932531746939",
  appId: "1:932531746939:web:c70b4abac8013cd2b88ade",
};

// Únicamente en localhost: ?emuladores=1 activa los servicios locales de prueba.
const local = ["localhost", "127.0.0.1"].includes(location.hostname);

if (local && new URLSearchParams(location.search).has("emuladores")) {
  sessionStorage.setItem(
    "yacon-emuladores",
    new URLSearchParams(location.search).get("emuladores"),
  );
}
export const usaEmuladores =
  local && sessionStorage.getItem("yacon-emuladores") === "1";

  //Inicia 
export const app = initializeApp(
  usaEmuladores
    ? { ...firebaseConfig, projectId: "demo-yacon", apiKey: "demo-key" }
    : firebaseConfig,
);
export const auth = getAuth(app);
export const db = getFirestore(app);


if (usaEmuladores) {
  connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
}
