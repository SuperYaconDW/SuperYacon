import {
  sesionLista,
  obtenerSesion,
  registrarse,
  ingresar,
  salir,
  actualizarSesion,
} from "./sesion.js";
import { escucharPedidos, guardarPerfil } from "./datos.js";
import { estado, mensajeError, tarjetaPedido, avisar } from "./ui.js";

const acceso = document.querySelector("#acceso");
const panel = document.querySelector("#mi-cuenta");
const aviso = document.querySelector("#estado-cuenta");
let dejarPedidos;
let escuchandoUid;

function mostrarCuenta() {
  const { usuario, perfil, error } = obtenerSesion();
  acceso.hidden = Boolean(usuario);
  panel.hidden = !usuario;
  if (error) estado(aviso, mensajeError(error), "error");
  if (!usuario) {
    dejarPedidos?.();
    escuchandoUid = null;
    document.querySelector("#pedidos").replaceChildren();
    return;
  }
  document.querySelector("#correo-cuenta").textContent = usuario.email;
  document.querySelector("#saludo-cuenta").textContent = perfil
    ? "Hola, " + perfil.nombre.split(" ")[0]
    : "Completá tu cuenta";
  document.querySelector("#nombre-perfil").value = perfil?.nombre || "";
  document.querySelector("#perfil-incompleto").hidden = Boolean(perfil);
  if (escuchandoUid !== usuario.uid) {
    dejarPedidos?.();
    escuchandoUid = usuario.uid;
    const mensajePedidos = document.querySelector("#estado-pedidos");
    estado(mensajePedidos, "Cargando tus pedidos…");
    dejarPedidos = escucharPedidos(
      usuario.uid,
      false,
      (pedidos) => {
        document
          .querySelector("#pedidos")
          .replaceChildren(...pedidos.map((p) => tarjetaPedido(p)));
        estado(
          mensajePedidos,
          pedidos.length
            ? ""
            : "Todavía no tenés pedidos. Tu próxima compra empieza en el catálogo.",
        );
      },
      (error) => estado(mensajePedidos, mensajeError(error), "error"),
    );
  }
}

for (const id of ["form-login", "form-registro"]) {
  const form = document.getElementById(id);
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    estado(aviso, "Conectando…");
    try {
      if (id === "form-registro") {
        if (form.elements.clave.value !== form.elements.confirmar.value)
          throw new Error("Las contraseñas deben coincidir.");
        const nombre = form.elements.nombre.value.trim();
        if (nombre.length < 2) throw new Error("Escribí tu nombre.");
        await registrarse(
          nombre,
          form.elements.correo.value.trim(),
          form.elements.clave.value,
        );
      } else
        await ingresar(
          form.elements.correo.value.trim(),
          form.elements.clave.value,
        );
      form.reset();
      estado(aviso, "Tu sesión está lista.", "exito");
      mostrarCuenta();
      if (new URLSearchParams(location.search).get("continuar") === "compra")
        location.href = "compra.html";
    } catch (error) {
      estado(aviso, mensajeError(error), "error");
    } finally {
      boton.disabled = false;
    }
  });
}
document
  .querySelector("#form-perfil")
  .addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const boton = form.querySelector("button");
    boton.disabled = true;
    try {
      const { usuario, perfil } = obtenerSesion();
      if (!usuario) throw new Error("Iniciá sesión nuevamente.");
      const nombre = form.elements.nombre.value.trim();
      if (nombre.length < 2)
        throw new Error("Escribí al menos dos caracteres.");
      await guardarPerfil(usuario.uid, nombre, !perfil);
      await actualizarSesion();
      estado(aviso, "Datos actualizados.", "exito");
    } catch (error) {
      estado(aviso, mensajeError(error), "error");
    } finally {
      boton.disabled = false;
    }
  });
document.querySelector("#salir").addEventListener("click", async () => {
  try {
    await salir();
    estado(aviso, "Cerraste tu sesión.");
  } catch (error) {
    avisar(mensajeError(error), true);
  }
});
window.addEventListener("sesion-cambiada", mostrarCuenta);
window.addEventListener("pagehide", () => dejarPedidos?.());
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    escuchandoUid = null;
    mostrarCuenta();
  }
});
sesionLista.then(mostrarCuenta);
