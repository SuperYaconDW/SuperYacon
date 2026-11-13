import { escucharProductos } from "./datos.js";
import { filtrarProductos } from "./carrito.js";
import { pintarProductos, estado, mensajeError } from "./ui.js";

const parametros = new URLSearchParams(location.search);
const formulario = document.querySelector("#filtros");
const rejilla = document.querySelector("#productos");
const aviso = document.querySelector("#estado-productos");
const inicio = document.body.dataset.pagina === "index";
let productos = [];
let detener;
if (formulario) {
  formulario.elements.texto.value = parametros.get("q") || "";
  formulario.elements.categoria.value = parametros.get("categoria") || "";
  formulario.elements.ofertas.checked = parametros.get("ofertas") === "1";
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    mostrar();
  });
  formulario.addEventListener("input", mostrar);
  formulario.addEventListener("reset", () => setTimeout(mostrar, 0));
}

function mostrar() {
  const filtros = formulario
    ? {
        texto: formulario.elements.texto.value,
        categoria: formulario.elements.categoria.value,
        ofertas: formulario.elements.ofertas.checked,
        orden: formulario.elements.orden.value,
      }
    : {};
  let resultado = filtrarProductos(productos, filtros);
  if (inicio)
    resultado.sort((a, b) => Number(b.destacado) - Number(a.destacado));
  pintarProductos(rejilla, inicio ? resultado.slice(0, 10) : resultado);
  const cantidad = document.querySelector("#cantidad-resultados");
  if (cantidad)
    cantidad.textContent =
      resultado.length + (resultado.length === 1 ? " producto" : " productos");
  estado(
    aviso,
    resultado.length
      ? ""
      : productos.length
        ? "No encontramos productos con esos filtros. Probá otra búsqueda."
        : "Estamos preparando nuestro catálogo. Volvé a visitarnos pronto.",
  );
  document.querySelector("#reintentar-productos").hidden = true;
}
function cargar() {
  detener?.();
  estado(aviso, "Cargando productos…");
  rejilla.setAttribute("aria-busy", "true");
  detener = escucharProductos(
    (lista) => {
      productos = lista;
      rejilla.setAttribute("aria-busy", "false");
      mostrar();
    },
    (error) => {
      rejilla.replaceChildren();
      rejilla.setAttribute("aria-busy", "false");
      estado(aviso, mensajeError(error), "error");
      document.querySelector("#reintentar-productos").hidden = false;
    },
  );
}
document
  .querySelector("#reintentar-productos")
  .addEventListener("click", cargar);
window.addEventListener("pagehide", () => detener?.());
window.addEventListener("pageshow", (evento) => {
  if (evento.persisted) cargar();
});
cargar();
