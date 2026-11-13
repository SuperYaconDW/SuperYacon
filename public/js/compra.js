import {
  escucharProductos,
  obtenerSucursales,
  confirmarPedido,
} from "./datos.js";
import { sesionLista, obtenerSesion } from "./sesion.js";
import { leerCarrito, guardarCarrito, totalCarrito } from "./carrito.js";
import { dinero, estado, mensajeError, avisar } from "./ui.js";

let productos = [];
let productosListos = false;
let comprando = false;
let confirmado = false;
const lista = document.querySelector("#lineas-carrito");
const form = document.querySelector("#form-compra");
const aviso = document.querySelector("#estado-compra");
const boton = document.querySelector("#confirmar-compra");
let detenerProductos;

function mostrar() {
  if (comprando || confirmado) return;
  const carrito = leerCarrito();
  const { usuario, perfil } = obtenerSesion();
  document.querySelector("#carrito-vacio").hidden = carrito.length > 0;
  document.querySelector("#compra-contenido").hidden = !carrito.length;
  document.querySelector("#necesita-cuenta").hidden = Boolean(
    usuario && perfil,
  );
  document.querySelector("#total").textContent = dinero(
    totalCarrito(carrito, productos),
  );
  let valido = productosListos && carrito.length > 0;
  lista.replaceChildren();
  for (const item of carrito) {
    const producto = productos.find((p) => p.id === item.id);
    const linea = document.createElement("article");
    linea.className = "linea-carrito";
    linea.innerHTML =
      '<img width="100" height="100" alt=""><div class="linea-info"><h3></h3><p></p><button type="button" class="enlace-boton quitar">Quitar</button></div><div class="cantidad"><button type="button" class="menos" aria-label="Quitar una unidad">−</button><output></output><button type="button" class="mas" aria-label="Agregar una unidad">+</button></div><strong></strong>';
    const disponible = producto && producto.stock >= item.cantidad;
    if (!disponible) valido = false;
    linea.querySelector("img").src =
      producto?.imagen || "img/producto-no-disponible.svg";
    linea.querySelector("img").alt = producto?.nombre || "Producto";
    linea.querySelector("h3").textContent =
      producto?.nombre ||
      (productosListos ? "Producto no disponible" : "Cargando producto…");
    linea.querySelector("p").textContent = !productosListos
      ? ""
      : !producto
        ? "Quitá este producto para continuar."
        : !disponible
          ? "Solo quedan " + producto.stock + " unidades."
          : dinero(producto.precioCentavos) + " por unidad";
    if (!disponible && productosListos)
      linea.querySelector("p").className = "texto-error";
    linea.querySelector("output").textContent = item.cantidad;
    linea.querySelector("strong").textContent = producto
      ? dinero(producto.precioCentavos * item.cantidad)
      : "—";
    const cambiar = (diferencia) => {
      const actualizado = leerCarrito()
        .map((i) =>
          i.id === item.id ? { ...i, cantidad: i.cantidad + diferencia } : i,
        )
        .filter((i) => i.cantidad > 0);
      guardarCarrito(actualizado);
    };
    linea.querySelector(".menos").addEventListener("click", () => cambiar(-1));
    const mas = linea.querySelector(".mas");
    mas.disabled =
      !producto || item.cantidad >= producto.stock || item.cantidad >= 99;
    mas.addEventListener("click", () => cambiar(1));
    linea
      .querySelector(".quitar")
      .addEventListener("click", () =>
        guardarCarrito(leerCarrito().filter((i) => i.id !== item.id)),
      );
    lista.append(linea);
  }
  boton.disabled =
    !valido || !usuario || !perfil || !form.elements.sucursal.value;
}

async function cargar() {
  estado(aviso, "Consultando disponibilidad…");
  detenerProductos?.();
  detenerProductos = escucharProductos(
    (datos) => {
      productos = datos;
      productosListos = true;
      mostrar();
      estado(aviso, "");
    },
    (error) => {
      productosListos = false;
      mostrar();
      estado(aviso, mensajeError(error), "error");
    },
  );
  try {
    const sucursales = await obtenerSucursales();
    const selector = form.elements.sucursal;
    selector.replaceChildren(new Option("Elegí dónde recoger", ""));
    sucursales.forEach((s) => selector.add(new Option(s.nombre, s.id)));
    if (!sucursales.length)
      estado(
        aviso,
        "No hay sucursales disponibles para recoger en este momento.",
      );
    mostrar();
  } catch (error) {
    estado(aviso, mensajeError(error), "error");
  }
}

form.addEventListener("change", mostrar);
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (comprando) return;
  const { usuario, perfil } = obtenerSesion();
  if (!usuario || !perfil) {
    avisar("Ingresá y completá tu cuenta para continuar.", true);
    return;
  }
  const carrito = leerCarrito();
  if (!productosListos || !carrito.length) return;
  comprando = true;
  // Bloquear también cambios en cantidades y sucursal mientras se confirma.
  document
    .querySelectorAll("#compra-contenido button, #compra-contenido select")
    .forEach((el) => {
      el.disabled = true;
    });
  estado(aviso, "Confirmando tu pedido…");
  try {
    const huella = JSON.stringify([
      usuario.uid,
      form.elements.sucursal.value,
      carrito,
    ]);
    let intento;
    try {
      intento = JSON.parse(sessionStorage.getItem("yacon-intento"));
    } catch {
      intento = null;
    }
    if (!intento || intento.huella !== huella) {
      intento = { huella, id: usuario.uid + "_" + crypto.randomUUID() };
      sessionStorage.setItem("yacon-intento", JSON.stringify(intento));
    }
    const pedido = await confirmarPedido({
      uid: usuario.uid,
      nombre: perfil.nombre,
      sucursalId: form.elements.sucursal.value,
      carrito,
      preciosEsperados: Object.fromEntries(
        productos.map((p) => [p.id, p.precioCentavos]),
      ),
      intentoId: intento.id,
    });
    confirmado = true;
    guardarCarrito([]);
    document.querySelector("#compra-contenido").hidden = true;
    const exito = document.querySelector("#compra-exitosa");
    exito.hidden = false;
    exito.querySelector("[data-numero]").textContent = pedido.id
      .slice(-8)
      .toUpperCase();
    exito.querySelector("[data-sucursal]").textContent = pedido.nombreSucursal;
    exito.querySelector("[data-total]").textContent = dinero(
      pedido.totalCentavos,
    );
    exito.focus();
    estado(aviso, "");
  } catch (error) {
    estado(aviso, mensajeError(error), "error");
  } finally {
    comprando = false;
    document
      .querySelectorAll("#compra-contenido button, #compra-contenido select")
      .forEach((el) => {
        el.disabled = false;
      });
    mostrar();
  }
});
window.addEventListener("carrito-cambiado", mostrar);
window.addEventListener("storage", mostrar);
window.addEventListener("sesion-cambiada", mostrar);
window.addEventListener("pagehide", () => detenerProductos?.());
window.addEventListener("pageshow", (e) => {
  if (e.persisted) cargar();
});
sesionLista.then(mostrar);
mostrar();
cargar();
