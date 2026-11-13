import { obtenerSucursales } from "./datos.js";
import { estado, mensajeError } from "./ui.js";

const lista = document.querySelector("#sucursales");
const aviso = document.querySelector("#estado-sucursales");
async function cargar() {
  estado(aviso, "Cargando sucursales…");
  try {
    const sucursales = await obtenerSucursales();
    lista.replaceChildren(
      ...sucursales.map((s, i) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "sucursal tarjeta";
        tarjeta.innerHTML =
          '<span class="sucursal-numero"></span><p class="ceja"></p><h2></h2><p class="referencia"></p><div class="sucursal-enlaces"><a class="boton secundario" target="_blank" rel="noopener">Ver ubicación ↗</a><a class="telefono"></a></div>';
        tarjeta.querySelector(".sucursal-numero").textContent = String(
          i + 1,
        ).padStart(2, "0");
        tarjeta.querySelector(".ceja").textContent = s.zona;
        tarjeta.querySelector("h2").textContent = s.nombre;
        tarjeta.querySelector(".referencia").textContent = s.referencia;
        const mapa = tarjeta.querySelector("a");
        mapa.href = s.mapa.startsWith("https://www.google.com/maps/")
          ? s.mapa
          : "https://www.google.com/maps/";
        tarjeta.querySelector(".telefono").href = "tel:+503" + s.telefono;
        tarjeta.querySelector(".telefono").textContent =
          "Llamar al " + s.telefono.slice(0, 4) + " " + s.telefono.slice(4);
        return tarjeta;
      }),
    );
    estado(
      aviso,
      sucursales.length ? "" : "Consultá nuestras ubicaciones al 2314 0811.",
    );
  } catch (error) {
    estado(aviso, mensajeError(error), "error");
  }
}
document
  .querySelector("#reintentar-sucursales")
  .addEventListener("click", cargar);
cargar();
