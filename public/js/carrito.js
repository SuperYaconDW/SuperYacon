// Carrito local: solo IDs y cantidades. Nunca se confía en precios del navegador.
export const MAX_PRODUCTOS = 8;
const CLAVE = "yacon-carrito-v2";

export function normalizarCarrito(valor) {
  if (!Array.isArray(valor)) return [];
  const resultado = [];
  for (const item of valor) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !/^[a-z0-9-]{1,60}$/.test(item.id)
    )
      continue;
    if (
      !Number.isInteger(item.cantidad) ||
      item.cantidad < 1 ||
      item.cantidad > 99
    )
      continue;
    if (
      !resultado.some((otro) => otro.id === item.id) &&
      resultado.length < MAX_PRODUCTOS
    ) {
      resultado.push({ id: item.id, cantidad: item.cantidad });
    }
  }
  return resultado;
}

export function leerCarrito() {
  try {
    return normalizarCarrito(JSON.parse(localStorage.getItem(CLAVE) || "[]"));
  } catch {
    return [];
  }
}

export function guardarCarrito(items) {
  localStorage.setItem(CLAVE, JSON.stringify(normalizarCarrito(items)));
  // Un cambio en el carrito invalida el identificador de una compra anterior.
  sessionStorage.removeItem("yacon-intento");
  window.dispatchEvent(new Event("carrito-cambiado"));
}

export function agregarProducto(producto) {
  const carrito = leerCarrito();
  const item = carrito.find((item) => item.id === producto.id);
  if (!producto.activo || producto.stock < (item?.cantidad || 0) + 1)
    throw new Error("No hay más unidades disponibles.");
  if (!item && carrito.length >= MAX_PRODUCTOS)
    throw new Error("Podés incluir hasta 8 productos distintos por pedido.");
  if (item && item.cantidad >= 99)
    throw new Error("El máximo es 99 unidades por producto.");
  if (item) item.cantidad++;
  else carrito.push({ id: producto.id, cantidad: 1 });
  guardarCarrito(carrito);
}

export function totalCarrito(items, productos) {
  return items.reduce(
    (suma, item) =>
      suma +
      (productos.find((p) => p.id === item.id)?.precioCentavos || 0) *
        item.cantidad,
    0,
  );
}

export function filtrarProductos(
  productos,
  { texto = "", categoria = "", ofertas = false, orden = "" } = {},
) {
  const limpiar = (texto) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  let resultado = productos.filter(
    (p) =>
      limpiar(p.nombre).includes(limpiar(texto)) &&
      (!categoria || p.categoria === categoria) &&
      (!ofertas || p.precioAnteriorCentavos > p.precioCentavos),
  );
  if (orden === "menor")
    resultado.sort((a, b) => a.precioCentavos - b.precioCentavos);
  if (orden === "mayor")
    resultado.sort((a, b) => b.precioCentavos - a.precioCentavos);
  if (orden === "nombre")
    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return resultado;
}
