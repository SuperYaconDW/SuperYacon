import { sesionLista, obtenerSesion } from "./sesion.js";
import {
  escucharProductos,
  guardarProducto,
  eliminarProducto,
  cargarDatosIniciales,
  escucharPedidos,
  cambiarEstadoPedido,
} from "./datos.js";
import { dinero, estado, mensajeError, avisar, tarjetaPedido } from "./ui.js";

let productos = [];
let uidActivo;
let pararProductos;
let pararPedidos;
let editando = false;
const form = document.querySelector("#form-producto");
const aviso = document.querySelector("#estado-admin");
const lista = document.querySelector("#filas-productos");

function limpiarFormulario() {
  form.reset();
  editando = false;
  form.elements.id.readOnly = false;
  form.elements.activo.checked = true;
  document.querySelector("#titulo-editor").textContent = "Nuevo producto";
  document.querySelector("#guardar-producto").textContent = "Crear producto";
}

function editar(producto) {
  editando = true;
  for (const campo of [
    "id",
    "nombre",
    "categoria",
    "presentacion",
    "imagen",
    "stock",
  ])
    form.elements[campo].value = producto[campo];
  form.elements.precio.value = (producto.precioCentavos / 100).toFixed(2);
  form.elements.anterior.value = (
    producto.precioAnteriorCentavos / 100
  ).toFixed(2);
  form.elements.activo.checked = producto.activo;
  form.elements.destacado.checked = producto.destacado;
  form.elements.id.readOnly = true;
  document.querySelector("#titulo-editor").textContent = "Editar producto";
  document.querySelector("#guardar-producto").textContent = "Guardar cambios";
  form.scrollIntoView({ behavior: "auto", block: "start" });
  form.elements.nombre.focus({ preventScroll: true });
}

function mostrarProductos() {
  const texto = document.querySelector("#buscar-admin").value.toLowerCase();
  const filtrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(texto),
  );
  lista.replaceChildren(
    ...filtrados.map((producto) => {
      const fila = document.createElement("tr");
      fila.innerHTML =
        '<td><span class="nombre-producto"></span><small></small></td><td class="precio"></td><td class="stock"></td><td class="acciones"><button type="button" class="boton-texto editar">Editar</button><button type="button" class="boton-texto peligro eliminar">Eliminar</button></td>';
      fila.querySelector(".nombre-producto").textContent = producto.nombre;
      fila.querySelector("small").textContent = producto.activo
        ? producto.categoria
        : "Oculto";
      fila.querySelector(".precio").textContent = dinero(
        producto.precioCentavos,
      );
      fila.querySelector(".stock").textContent = producto.stock;
      fila
        .querySelector(".editar")
        .addEventListener("click", () => editar(producto));
      fila
        .querySelector(".eliminar")
        .addEventListener("click", async (evento) => {
          if (
            !confirm(
              "¿Eliminar " +
                producto.nombre +
                "? Los pedidos anteriores conservarán su detalle.",
            )
          )
            return;
          evento.currentTarget.disabled = true;
          try {
            await eliminarProducto(producto.id);
            avisar("Producto eliminado.");
            if (form.elements.id.value === producto.id) limpiarFormulario();
          } catch (error) {
            estado(aviso, mensajeError(error), "error");
            mostrarProductos();
          }
        });
      return fila;
    }),
  );
  document.querySelector("#total-productos").textContent = productos.length;
  document.querySelector("#stock-bajo").textContent = productos.filter(
    (p) => p.stock <= 5,
  ).length;
  document.querySelector("#sin-productos").hidden = filtrados.length > 0;
}

async function iniciar() {
  const { usuario, perfil } = obtenerSesion();
  const permitido = perfil?.rol === "admin";
  document.querySelector("#sin-permiso").hidden = permitido;
  document.querySelector("#administracion").hidden = !permitido;
  if (!permitido) {
    pararProductos?.();
    pararPedidos?.();
    uidActivo = null;
    lista.replaceChildren();
    document.querySelector("#pedidos-admin").replaceChildren();
    return;
  }
  if (uidActivo === usuario.uid) return;
  uidActivo = usuario.uid;
  estado(aviso, "Cargando administración…");
  pararProductos = escucharProductos(
    (datos) => {
      productos = datos;
      mostrarProductos();
      estado(aviso, "");
    },
    (error) => estado(aviso, mensajeError(error), "error"),
    true,
  );
  pararPedidos = escucharPedidos(
    usuario.uid,
    true,
    (pedidos) => {
      document.querySelector("#total-pedidos").textContent = pedidos.filter(
        (p) => p.estado !== "entregado",
      ).length;
      document
        .querySelector("#pedidos-admin")
        .replaceChildren(
          ...pedidos.map((p) => tarjetaPedido(p, true, cambiarEstadoPedido)),
        );
      document.querySelector("#sin-pedidos").hidden = pedidos.length > 0;
    },
    (error) => estado(aviso, mensajeError(error), "error"),
  );
  try {
    const respuesta = await fetch("datos/productos.json");
    if (!respuesta.ok)
      throw new Error("No se pudo cargar la biblioteca de imágenes.");
    const imagenes = await respuesta.json();
    const selector = form.elements.imagen;
    selector.replaceChildren(new Option("Seleccioná una fotografía", ""));
    imagenes.forEach((p) =>
      selector.add(new Option(p.nombre + " · " + p.presentacion, p.imagen)),
    );
  } catch (error) {
    estado(aviso, mensajeError(error), "error");
  }
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = document.querySelector("#guardar-producto");
  boton.disabled = true;
  try {
    const precioCentavos = Math.round(Number(form.elements.precio.value) * 100);
    const precioAnteriorCentavos = Math.round(
      Number(form.elements.anterior.value || 0) * 100,
    );
    if (precioAnteriorCentavos && precioAnteriorCentavos <= precioCentavos)
      throw new Error(
        "El precio anterior debe ser mayor que el precio de venta, o cero si no hay oferta.",
      );
    const id = form.elements.id.value.trim();
    if (!editando && productos.some((p) => p.id === id))
      throw new Error(
        "Ese identificador ya existe. Elegí otro o editá el producto.",
      );
    const nombre = form.elements.nombre.value.trim();
    if (nombre.length < 2) throw new Error("Escribí el nombre del producto.");
    const presentacion = form.elements.presentacion.value.trim();
    if (!presentacion) throw new Error("Indicá la presentación.");
    await guardarProducto(
      id,
      {
        nombre,
        categoria: form.elements.categoria.value,
        presentacion,
        imagen: form.elements.imagen.value,
        precioCentavos,
        precioAnteriorCentavos,
        stock: Number(form.elements.stock.value),
        activo: form.elements.activo.checked,
        destacado: form.elements.destacado.checked,
      },
      !editando,
    );
    limpiarFormulario();
    estado(aviso, "Producto guardado.", "exito");
  } catch (error) {
    estado(aviso, mensajeError(error), "error");
  } finally {
    boton.disabled = false;
  }
});
document
  .querySelector("#nuevo-producto")
  .addEventListener("click", limpiarFormulario);
document
  .querySelector("#buscar-admin")
  .addEventListener("input", mostrarProductos);
document
  .querySelector("#cargar-datos")
  .addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      await cargarDatosIniciales((texto) => estado(aviso, texto));
      estado(
        aviso,
        "Catálogo y sucursales disponibles. Se conservaron los registros existentes.",
        "exito",
      );
    } catch (error) {
      estado(aviso, mensajeError(error), "error");
    } finally {
      boton.disabled = false;
    }
  });
window.addEventListener("sesion-cambiada", iniciar);
window.addEventListener("pagehide", () => {
  pararProductos?.();
  pararPedidos?.();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    uidActivo = null;
    iniciar();
  }
});
sesionLista.then(iniciar);
limpiarFormulario();
