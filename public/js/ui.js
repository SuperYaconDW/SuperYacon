import { leerCarrito, agregarProducto } from "./carrito.js";
import { sesionLista, obtenerSesion } from "./sesion.js";

export const dinero = (centavos) =>
  new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(
    centavos / 100,
  );
export const categorias = [
  "Despensa",
  "Lácteos",
  "Bebidas",
  "Limpieza",
  "Cuidado personal",
];

export function mensajeError(error) {
  const mensajes = {
    "auth/email-already-in-use":
      "Ese correo ya tiene una cuenta. Iniciá sesión.",
    "auth/invalid-credential": "Revisá tu correo y contraseña.",
    "auth/invalid-email": "Escribí un correo válido.",
    "auth/weak-password": "Usá una contraseña de al menos 8 caracteres.",
    "auth/too-many-requests":
      "Hubo varios intentos. Esperá un momento antes de intentar de nuevo.",
    "auth/network-request-failed": "No se pudo conectar. Revisá tu conexión.",
    "auth/operation-not-allowed":
      "El acceso no está disponible en este momento.",
    "permission-denied":
      "No pudimos completar esta operación con los permisos actuales.",
    unavailable: "No hay conexión con la tienda. Reintentá en un momento.",
  };
  return (
    mensajes[error?.code] ||
    (error?.code
      ? "No se pudo completar la operación. Intentá nuevamente."
      : error?.message) ||
    "Ocurrió un problema. Intentá nuevamente."
  );
}

export function estado(elemento, texto, tipo = "") {
  elemento.textContent = texto;
  elemento.className = "estado " + tipo;
  elemento.hidden = !texto;
}

export function avisar(texto, error = false) {
  const aviso = document.querySelector("#aviso");
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.className = "aviso visible" + (error ? " error" : "");
  clearTimeout(avisar.temporizador);
  avisar.temporizador = setTimeout(
    () => aviso.classList.remove("visible"),
    5000,
  );
}

export function actualizarCabecera() {
  const cantidad = leerCarrito().reduce(
    (suma, item) => suma + item.cantidad,
    0,
  );
  document.querySelectorAll("[data-cantidad-carrito]").forEach((el) => {
    el.textContent = cantidad;
  });
  const { usuario, perfil } = obtenerSesion();
  const enlace = document.querySelector("[data-cuenta]");
  if (enlace) enlace.textContent = usuario ? "Mi cuenta" : "Ingresar";
  const admin = document.querySelector("[data-admin]");
  if (admin) admin.hidden = perfil?.rol !== "admin";
}

export function tarjetaProducto(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "producto";
  tarjeta.innerHTML = `<div class="producto-foto"><span class="etiqueta" hidden></span><img loading="lazy" width="400" height="400" alt=""></div><div class="producto-info"><p class="producto-categoria"></p><h3></h3><p class="presentacion"></p><div class="precios"><strong></strong><del hidden></del></div><p class="existencias"></p><button type="button" class="boton agregar">Agregar <span aria-hidden="true">+</span></button></div>`;
  const imagen = tarjeta.querySelector("img");
  // Únicamente recursos locales de la biblioteca de productos.
  imagen.src = /^img\/productos\/[a-z0-9-]+\.webp$/.test(producto.imagen)
    ? producto.imagen
    : "img/producto-no-disponible.svg";
  imagen.alt = producto.nombre;
  imagen.addEventListener(
    "error",
    () => {
      imagen.src = "img/producto-no-disponible.svg";
    },
    { once: true },
  );
  tarjeta.querySelector("h3").textContent = producto.nombre;
  tarjeta.querySelector(".producto-categoria").textContent = producto.categoria;
  tarjeta.querySelector(".presentacion").textContent = producto.presentacion;
  tarjeta.querySelector("strong").textContent = dinero(producto.precioCentavos);
  if (producto.precioAnteriorCentavos > producto.precioCentavos) {
    const etiqueta = tarjeta.querySelector(".etiqueta");
    etiqueta.hidden = false;
    etiqueta.textContent =
      "Ahorrá " +
      dinero(producto.precioAnteriorCentavos - producto.precioCentavos);
    const anterior = tarjeta.querySelector("del");
    anterior.hidden = false;
    anterior.textContent = dinero(producto.precioAnteriorCentavos);
  }
  const stock = tarjeta.querySelector(".existencias");
  stock.textContent =
    producto.stock === 0
      ? "Agotado"
      : producto.stock <= 5
        ? "Últimas " + producto.stock + " unidades"
        : "Disponible";
  if (producto.stock <= 5) stock.classList.add("pocas");
  const boton = tarjeta.querySelector("button");
  boton.disabled = producto.stock === 0;
  boton.setAttribute(
    "aria-label",
    "Agregar " + producto.nombre + " al carrito",
  );
  boton.dataset.agregar = producto.id;
  boton.addEventListener("click", () => {
    try {
      agregarProducto(producto);
      avisar("Agregado a tu carrito.");
      boton.textContent = "Agregado ✓";
      setTimeout(() => {
        boton.innerHTML = 'Agregar <span aria-hidden="true">+</span>';
      }, 900);
    } catch (error) {
      avisar(mensajeError(error), true);
    }
  });
  return tarjeta;
}

export function pintarProductos(contenedor, productos) {
  contenedor.replaceChildren(...productos.map(tarjetaProducto));
}

export function tarjetaPedido(pedido, administrador = false, cambiarEstado) {
  const articulo = document.createElement("article");
  articulo.className = "pedido tarjeta";
  articulo.innerHTML =
    '<div class="pedido-titulo"><h3></h3><span class="estado-pedido"></span></div><p class="pedido-meta"></p><ul></ul><strong class="pedido-total"></strong>';
  articulo.querySelector("h3").textContent =
    "Pedido " + pedido.id.slice(-8).toUpperCase();
  articulo.querySelector(".estado-pedido").textContent = pedido.estado;
  const fecha =
    pedido.creadoEn?.toDate?.().toLocaleDateString("es-SV") ||
    "Recién recibido";
  articulo.querySelector(".pedido-meta").textContent = [
    fecha,
    pedido.nombreSucursal,
    administrador ? pedido.nombreCliente : "",
  ]
    .filter(Boolean)
    .join(" · ");
  for (const item of Object.values(pedido.items)) {
    const li = document.createElement("li");
    li.textContent = `${item.cantidad} × ${item.nombre} — ${dinero(item.precioCentavos * item.cantidad)}`;
    articulo.querySelector("ul").append(li);
  }
  articulo.querySelector(".pedido-total").textContent =
    "Total " + dinero(pedido.totalCentavos);
  if (administrador && pedido.estado !== "entregado") {
    const estados = ["recibido", "preparando", "listo", "entregado"];
    const siguiente = estados[estados.indexOf(pedido.estado) + 1];
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton secundario";
    boton.textContent = "Marcar como " + siguiente;
    boton.addEventListener("click", async () => {
      boton.disabled = true;
      try {
        await cambiarEstado(pedido.id, siguiente);
        avisar("Pedido actualizado.");
      } catch (error) {
        avisar(mensajeError(error), true);
        boton.disabled = false;
      }
    });
    articulo.append(boton);
  }
  return articulo;
}

window.addEventListener("carrito-cambiado", actualizarCabecera);
window.addEventListener("storage", actualizarCabecera);
window.addEventListener("sesion-cambiada", actualizarCabecera);
actualizarCabecera();
sesionLista.then(actualizarCabecera);
