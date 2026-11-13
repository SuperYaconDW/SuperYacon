# Súper Yacón - Desafío Práctico II

Tienda: **https://yaconbd.web.app** · Proyecto Firebase: **yaconbd** · Plan: **Spark**.

## Problema y procesos

El primer parcial solo mostraba información. Esta versión relaciona dos procesos:

1. **Compra y retiro:** catálogo → carrito → acceso → pedido → descuento de existencias → historial.
2. **Administración:** CRUD de productos, precio, ofertas e inventario; preparación y entrega de pedidos.

El inventario es único para la tienda en línea. La sucursal indica dónde recoger, no un inventario independiente. Cada pedido admite 8 productos distintos y de 1 a 99 unidades por producto, sujeto al stock.

## Tecnología y estructura

HTML5, CSS propio, JavaScript nativo en módulos ES y Firebase SDK modular 13.2.0 desde CDN. Authentication administra el correo y la contraseña. Firestore guarda datos y aplica autorización; Firebase Hosting publica los archivos. No hay framework, servidor propio, Cloud Functions, Analytics ni Cloud Storage.

```text
public/                  Sitio que se publica
  index.html             Inicio con productos
  catalogo.html          Búsqueda, categorías, ofertas y orden
  sucursales.html         Lugares de retiro
  contacto.html          Teléfono, correo, redes y preguntas
  cuenta.html            Registro, acceso, perfil e historial
  compra.html            Carrito y confirmación
  admin.html             CRUD e inventario; gestión de pedidos
  css/                   Una hoja independiente por página
  js/                    Configuración, datos, sesión, carrito e interfaces
  img/                   Logo original y fotografías optimizadas
  datos/                 24 productos y 5 sucursales para carga inicial
firestore.rules          Autorización y validaciones efectivas
firestore.indexes.json   Índices (las consultas actuales no requieren compuestos)
firebase.json            Hosting y emuladores
docs/                    Guía de defensa, fuentes, propuesta y requisitos
tests/                   Pruebas de reglas, carrito y navegador
```

Solo `public/` se publica. Documentación, pruebas, credenciales de CLI y dependencias permanecen fuera del sitio.

## Ejecutar y publicar

La tienda publicada ya utiliza Firebase real. Para trabajar localmente:

1. Instalar Node.js 22 o posterior y Firebase CLI. Si no está instalado, usar `npm install -g firebase-tools`.
2. Abrir PowerShell en la carpeta raíz del proyecto, donde está `firebase.json`.
3. Conectar Firebase CLI una sola vez: `firebase login`. Se abrirá Google en el navegador.
4. Confirmar que aparece el proyecto: `firebase projects:list`.
5. Publicar el sitio y sus reglas: `firebase deploy --only hosting,firestore:rules,firestore:indexes --project yaconbd`.
6. Abrir `https://yaconbd.web.app` para revisar la publicación.

La publicación usa comandos directos del CLI; no requiere archivos `.ps1`. Ejecuta el comando desde la raíz, no desde `public/`. Hosting publica únicamente `public/`; las reglas actualizan permisos, pero no borran los productos, sucursales ni pedidos guardados.

Para trabajar localmente, ejecutar `npm ci` y después `npm run dev`; abrir `http://127.0.0.1:8765`. Esta configuración se conecta al proyecto real y los cambios de datos sí se guardan en `yaconbd`.

## Cuentas y permisos

- El registro público crea un perfil con `rol: cliente`. Nunca permite elegir administrador.
- El propietario de Firebase asigna `rol: admin` en el documento `usuarios/UID` del administrador. Recargar la página después del cambio.
- El administrador entra por **Administrar** o `admin.html`. Puede crear, leer, editar y eliminar productos y avanzar los pedidos: recibido → preparando → listo → entregado.
- El cliente solo puede ver sus propios pedidos y editar su nombre. Ni siquiera el administrador puede editar precios históricos o borrar pedidos desde la aplicación.
- La cuenta propietaria que se registró durante la instalación ya recibió el rol administrativo.
- Las contraseñas las gestiona Authentication. **No guardar credenciales de prueba en este README ni en GitHub:** entregarlas por el medio privado indicado en Moodle.

Los productos y sucursales ya están cargados. **Cargar catálogo inicial** solo agrega registros ausentes: no sobrescribe precios ni existencias. Si se elimina un producto del conjunto inicial, volver a cargar lo recrea.

## Cómo se protege una compra

`public/js/datos.js`, función `confirmarPedido`, usa una transacción. Primero lee el pedido del intento, la sucursal y los productos; luego comprueba precios y existencias, crea el pedido y descuenta stock. Firestore confirma todo o nada y reintenta ante compras concurrentes.

Las reglas validan simultáneamente pedido y productos mediante `getAfter()`. El producto comprueba la cantidad y el precio de su línea; el pedido exige que todas sus líneas actualicen los productos correspondientes y valida el total. El mismo pedido no puede reutilizarse para descontar nuevamente. El límite de ocho se aplica en JavaScript **y en las reglas**, y fue probado con el emulador.

Precios y totales son enteros en centavos. El carrito guarda únicamente IDs y cantidades en `localStorage`. El identificador del intento está en `sessionStorage`. El historial conserva una copia del nombre y precio de cada artículo.

## Imágenes, referencias y alcance

El logo es el original del ZIP del primer parcial. Las 24 fotografías corresponden a productos reales del catálogo público de Walmart El Salvador; las páginas de origen se registran en `docs/fuentes-productos.json`. Los archivos se optimizaron a WebP y suman aproximadamente 0.8 MB.

**Los precios y las existencias son datos de referencia para evaluar la aplicación, no una afirmación del inventario ni de los precios vigentes de la empresa.** La lista inicial de sucursales conserva las cinco zonas del parcial; su exhaustividad no pudo confirmarse. Ver `docs/FUENTES.md`.

El pago es representativo: solo hay una tarjeta predefinida terminada en 4242, sin campos para número, vencimiento o CVV, sin procesador de pago y sin cobros. Los pedidos y los descuentos de stock sí se guardan en la base de datos. La interfaz comercial se mantiene libre de documentación académica.

## Pruebas

```sh
npm test
```

`npm test` requiere Java 21 o posterior; inicia emuladores de Authentication y Firestore con **demo-yacon**, ejecuta 17 pruebas y los cierra. No toca la base real. Comprueba autorización, CRUD, límites, precios alterados, reintentos, privacidad y dos compradores de la última unidad.

Prueba opcional de navegador: instalar `playwright` como herramienta de desarrollo (`npm install --no-save playwright`), ejecutar `npx playwright install chromium`, iniciar `npm run emuladores` en otra terminal y ejecutar `node tests/navegador.mjs`. Esta prueba borra y recrea **solo los datos de demo-yacon**. No ejecutarla junto con `npm test` porque comparten puertos.

Para navegar manualmente contra emuladores: `http://127.0.0.1:8765/index.html?emuladores=1`. `?emuladores=0` vuelve a la conexión real. Esa opción está desactivada en dominios publicados.

## Para entregar

Consultar `docs/REQUISITOS.md` y `docs/GITHUB_EQUIPO.md`. Faltan las acciones propias del equipo: aprobación del profesor si está pendiente, aportes auténticos de los tres en GitHub, credenciales de evaluación por Moodle y preparación de la defensa. Cada integrante debe entender todo el sitio; la comprobación individual no permite consultar apuntes, documentación ni IA.
