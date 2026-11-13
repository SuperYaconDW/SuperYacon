import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { obtenerPerfil, guardarPerfil } from "./datos.js";

let actual = { usuario: null, perfil: null };
let resolver;
export const sesionLista = new Promise((resolve) => {
  resolver = resolve;
});
export const obtenerSesion = () => actual;

export async function actualizarSesion() {
  const usuario = auth.currentUser;
  let perfil = null;
  let error = null;
  try {
    if (usuario) perfil = await obtenerPerfil(usuario.uid);
  } catch (e) {
    error = e;
  }
  // Evitar que una lectura iniciada antes del logout restaure la sesión anterior.
  if (auth.currentUser?.uid !== usuario?.uid) return;
  actual = { usuario, perfil, error };
  window.dispatchEvent(new CustomEvent("sesion-cambiada", { detail: actual }));
  resolver(actual);
}
onAuthStateChanged(auth, actualizarSesion);

export async function registrarse(nombre, correo, clave) {
  const credencial = await createUserWithEmailAndPassword(auth, correo, clave);
  // Si falla el perfil, Cuenta permite completarlo; no se pierde la cuenta creada.
  await guardarPerfil(credencial.user.uid, nombre, true);
  await actualizarSesion();
}
export async function ingresar(correo, clave) {
  await signInWithEmailAndPassword(auth, correo, clave);
  await actualizarSesion();
}
export async function salir() {
  await signOut(auth);
}
