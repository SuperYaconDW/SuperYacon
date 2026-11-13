import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { normalizarCarrito } from "./carrito.js";

const datosDocumento = (documento) => ({
  id: documento.id,
  ...documento.data(),
});

export function escucharProductos(recibir, error, administrador = false) {
  const referencia = collection(db, "productos");
  const consulta = administrador
    ? query(referencia, limit(100))
    : query(referencia, where("activo", "==", true), limit(100));
  return onSnapshot(
    consulta,
    (resultado) => recibir(resultado.docs.map(datosDocumento)),
    error,
  );
}

//GetDocs, trae los datos de las surucsales
export async function obtenerSucursales() {
  const resultado = await getDocs(
    query(collection(db, "sucursales"), where("activa", "==", true)),
  );
  return resultado.docs
    .map(datosDocumento)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

//Getdocs, obtiene el dato del perfil con el uid
export async function obtenerPerfil(uid) {
  const perfil = await getDoc(doc(db, "usuarios", uid));
  return perfil.exists() ? perfil.data() : null;
}

export async function guardarPerfil(uid, nombre, nuevo = false) {
  const referencia = doc(db, "usuarios", uid);
  if (nuevo)
    await setDoc(referencia, {
      nombre,
      rol: "cliente",
      creadoEn: serverTimestamp(),
    });
  else await updateDoc(referencia, { nombre });
}
//Agregar nuevo producto si nuevo es true, si es false, se edita
export async function guardarProducto(id, datos, nuevo = false) {
  if (nuevo) {
    await setDoc(doc(db, "productos", id), {
      ...datos,
      ultimoPedidoId: "",
      actualizadoEn: serverTimestamp(),
    });
  } else {
    await updateDoc(doc(db, "productos", id), {
      ...datos,
      actualizadoEn: serverTimestamp(),
    });
  }
}
//Borrar producto
export async function eliminarProducto(id) {
  await deleteDoc(doc(db, "productos", id));
}

export function escucharPedidos(uid, administrador, recibir, error) {
  const referencia = collection(db, "pedidos");
  const consulta = administrador
    ? query(referencia, orderBy("creadoEn", "desc"), limit(100))
    : query(referencia, where("clienteId", "==", uid), limit(100));
  return onSnapshot(
    consulta,
    (resultado) => {
      const pedidos = resultado.docs.map(datosDocumento);
      pedidos.sort(
        (a, b) => (b.creadoEn?.toMillis() || 0) - (a.creadoEn?.toMillis() || 0),
      );
      recibir(pedidos);
    },
    error,
  );
}

export async function cambiarEstadoPedido(id, estado) {
  await updateDoc(doc(db, "pedidos", id), { estado });
}

// Una transacción es "todo o nada": pedido y stock se confirman juntos.
// Firestore reintenta si otro comprador modificó los mismos productos.
export async function confirmarPedido({
  uid,
  nombre,
  sucursalId,
  carrito,
  preciosEsperados,
  intentoId,
}) {
  const items = normalizarCarrito(carrito);
  if (!items.length || items.length !== carrito.length)
    throw new Error("Revisá las cantidades de tu carrito.");
  const pedidoRef = doc(db, "pedidos", intentoId);
  return runTransaction(db, async (transaccion) => {
    // Leer primero permite reconocer un intento ya confirmado sin descontar otra vez.
    const anterior = await transaccion.get(pedidoRef);
    if (anterior.exists()) return { id: anterior.id, ...anterior.data() };
    const sucursal = await transaccion.get(doc(db, "sucursales", sucursalId));
    if (!sucursal.exists() || !sucursal.data().activa)
      throw new Error("Elegí una sucursal disponible.");
    const documentos = [];
    for (const item of items)
      documentos.push(await transaccion.get(doc(db, "productos", item.id)));
    const detalle = {};
    let totalCentavos = 0;
    documentos.forEach((documento, indice) => {
      const item = items[indice];
      if (!documento.exists())
        throw new Error(
          "Un producto ya no está disponible. Actualizá tu carrito.",
        );
      const producto = documento.data();
      if (!producto.activo || producto.stock < item.cantidad)
        throw new Error(
          "No quedan suficientes unidades de " + producto.nombre + ".",
        );
      if (producto.precioCentavos !== preciosEsperados[item.id])
        throw new Error(
          "Cambió el precio de " +
            producto.nombre +
            ". Revisá el total y confirmá nuevamente.",
        );
      detalle[item.id] = {
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precioCentavos: producto.precioCentavos,
      };
      totalCentavos += producto.precioCentavos * item.cantidad;
    });
    const pedido = {
      clienteId: uid,
      nombreCliente: nombre,
      sucursalId,
      nombreSucursal: sucursal.data().nombre,
      productoIds: items.map((item) => item.id),
      items: detalle,
      totalCentavos,
      estado: "recibido",
      metodoPago: "tarjeta-predefinida",
      creadoEn: serverTimestamp(),
    };
    transaccion.set(pedidoRef, pedido);
    documentos.forEach((documento, indice) => {
      transaccion.update(documento.ref, {
        stock: documento.data().stock - items[indice].cantidad,
        ultimoPedidoId: intentoId,
        actualizadoEn: serverTimestamp(),
      });
    });
    return { id: intentoId, ...pedido };
  });
}

// Carga repetible: únicamente agrega registros que todavía no existan.
export async function cargarDatosIniciales(informar = () => {}) {
  for (const nombre of ["productos", "sucursales"]) {
    const respuesta = await fetch("datos/" + nombre + ".json");
    if (!respuesta.ok) throw new Error("No se pudo abrir la carga inicial.");
    const lista = await respuesta.json();
    for (const registro of lista) {
      const { id, ...datos } = registro;
      const referencia = doc(db, nombre, id);
      await runTransaction(db, async (transaccion) => {
        const existente = await transaccion.get(referencia);
        if (!existente.exists())
          transaccion.set(
            referencia,
            nombre === "productos"
              ? { ...datos, actualizadoEn: serverTimestamp() }
              : datos,
          );
      });
      informar("Revisando " + registro.nombre + "…");
    }
  }
}
