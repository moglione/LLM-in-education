// Lógica del cliente de chat - JavaScript nativo (sin librerías)

const CLAVE_DE_ALMACENAMIENTO = "conversaciones-gguf";
const URL_BASE_DEL_BACKEND = "http://localhost:8000";
const URL_DEL_BACKEND = URL_BASE_DEL_BACKEND + "/api/chat";

// --- Elementos del DOM ---
const listaDeConversaciones = document.getElementById("lista-conversaciones");
const botonNuevoChat = document.getElementById("boton-nuevo-chat");
const tituloConversacion = document.getElementById("titulo-conversacion");
const ventanaDeMensajes = document.getElementById("ventana-mensajes");
const formulario = document.getElementById("formulario-chat");
const campoDeMensaje = document.getElementById("campo-mensaje");

const controlTemperatura = document.getElementById("control-temperatura");
const valorTemperatura = document.getElementById("valor-temperatura");
const controlTopK = document.getElementById("control-topk");
const valorTopK = document.getElementById("valor-topk");
const controlTopP = document.getElementById("control-topp");
const valorTopP = document.getElementById("valor-topp");
const controlMaxTokens = document.getElementById("control-max-tokens");

const dropdownModelo = document.getElementById("dropdown-modelo");
const botonDropdownModelo = document.getElementById("boton-dropdown-modelo");
const textoModeloElegido = document.getElementById("texto-modelo-elegido");
const listaDropdownModelo = document.getElementById("lista-dropdown-modelo");

const indicadorEstadoModelo = document.getElementById("indicador-estado-modelo");
const barraCpu = document.getElementById("barra-cpu");
const textoCpu = document.getElementById("texto-cpu");
const barraMemoria = document.getElementById("barra-memoria");
const textoMemoria = document.getElementById("texto-memoria");

// --- Estado en memoria: todas las conversaciones guardadas ---
let conversaciones = cargarConversacionesDesdeAlmacenamiento();
let idConversacionActiva = null;

// --- Sincronizar las etiquetas numéricas con los sliders ---
controlTemperatura.addEventListener("input", () => {
  valorTemperatura.textContent = controlTemperatura.value;
});
controlTopK.addEventListener("input", () => {
  valorTopK.textContent = controlTopK.value;
});
controlTopP.addEventListener("input", () => {
  valorTopP.textContent = controlTopP.value;
});

// --- Persistencia con localStorage ---
function cargarConversacionesDesdeAlmacenamiento() {
  const datosGuardados = localStorage.getItem(CLAVE_DE_ALMACENAMIENTO);
  return datosGuardados ? JSON.parse(datosGuardados) : [];
}

function guardarConversacionesEnAlmacenamiento() {
  localStorage.setItem(CLAVE_DE_ALMACENAMIENTO, JSON.stringify(conversaciones));
}

function obtenerConversacionActiva() {
  return conversaciones.find((conversacion) => conversacion.id === idConversacionActiva);
}

// --- Crear una conversación nueva ---
function crearNuevaConversacion() {
  const nuevaConversacion = {
    id: Date.now().toString(),
    titulo: "Nueva conversación",
    mensajes: [],
  };
  conversaciones.unshift(nuevaConversacion);
  idConversacionActiva = nuevaConversacion.id;
  guardarConversacionesEnAlmacenamiento();
  dibujarListaDeConversaciones();
  dibujarConversacionActiva();
}

botonNuevoChat.addEventListener("click", crearNuevaConversacion);

// --- Dibujar la lista de conversaciones en el sidebar izquierdo ---
function dibujarListaDeConversaciones() {
  listaDeConversaciones.innerHTML = "";
  for (const conversacion of conversaciones) {
    const item = document.createElement("div");
    item.classList.add("item-conversacion");
    if (conversacion.id === idConversacionActiva) {
      item.classList.add("activo");
    }

    const textoDelItem = document.createElement("span");
    textoDelItem.classList.add("texto-item-conversacion");
    textoDelItem.textContent = conversacion.titulo;
    textoDelItem.addEventListener("click", () => {
      idConversacionActiva = conversacion.id;
      dibujarListaDeConversaciones();
      dibujarConversacionActiva();
    });

    const botonRenombrar = document.createElement("button");
    botonRenombrar.classList.add("boton-accion-conversacion");
    botonRenombrar.textContent = "✎";
    botonRenombrar.title = "Cambiar nombre";
    botonRenombrar.addEventListener("click", (evento) => {
      evento.stopPropagation();
      renombrarConversacion(conversacion.id);
    });

    const botonBorrar = document.createElement("button");
    botonBorrar.classList.add("boton-accion-conversacion");
    botonBorrar.textContent = "🗑";
    botonBorrar.title = "Borrar conversación";
    botonBorrar.addEventListener("click", (evento) => {
      evento.stopPropagation();
      borrarConversacion(conversacion.id);
    });

    item.appendChild(textoDelItem);
    item.appendChild(botonRenombrar);
    item.appendChild(botonBorrar);
    listaDeConversaciones.appendChild(item);
  }
}

// Le pide al usuario un nuevo nombre y lo guarda.
function renombrarConversacion(idDeConversacion) {
  const conversacion = conversaciones.find((c) => c.id === idDeConversacion);
  if (!conversacion) {
    return;
  }
  const nuevoTitulo = prompt("Nuevo nombre para la conversación:", conversacion.titulo);
  if (nuevoTitulo === null || nuevoTitulo.trim() === "") {
    return;
  }
  conversacion.titulo = nuevoTitulo.trim();
  guardarConversacionesEnAlmacenamiento();
  dibujarListaDeConversaciones();
  if (idDeConversacion === idConversacionActiva) {
    tituloConversacion.textContent = conversacion.titulo;
  }
}

// Borra la conversación luego de confirmar, y ajusta la conversación activa si era esa.
function borrarConversacion(idDeConversacion) {
  const confirmacion = confirm("¿Borrar esta conversación? Esta acción no se puede deshacer.");
  if (!confirmacion) {
    return;
  }

  conversaciones = conversaciones.filter((c) => c.id !== idDeConversacion);
  guardarConversacionesEnAlmacenamiento();

  if (idDeConversacion === idConversacionActiva) {
    idConversacionActiva = conversaciones.length > 0 ? conversaciones[0].id : null;
  }

  dibujarListaDeConversaciones();
  dibujarConversacionActiva();
}

// --- Dibujar los mensajes de la conversación activa ---
function dibujarConversacionActiva() {
  const conversacion = obtenerConversacionActiva();
  ventanaDeMensajes.innerHTML = "";

  if (!conversacion) {
    tituloConversacion.textContent = "Nueva conversación";
    return;
  }

  tituloConversacion.textContent = conversacion.titulo;
  for (const mensaje of conversacion.mensajes) {
    const clase = mensaje.role === "user" ? "burbuja-usuario" : "burbuja-modelo";
    agregarBurbuja(mensaje.content, clase);
  }
}

// Crea visualmente una burbuja de mensaje y la agrega a la ventana de chat.
function agregarBurbuja(texto, clase) {
  const burbuja = document.createElement("div");
  burbuja.classList.add("burbuja", clase);
  burbuja.textContent = texto;
  ventanaDeMensajes.appendChild(burbuja);
  ventanaDeMensajes.scrollTop = ventanaDeMensajes.scrollHeight;
  return burbuja;
}

// Agrega o actualiza la línea de estadísticas debajo de una burbuja del modelo.
function mostrarEstadisticasEnBurbuja(burbuja, stats) {
  // Buscamos solo en el hermano inmediato para no confundir etiquetas de
  // distintas burbujas cuando hay varias respuestas en la misma conversación.
  let etiqueta = burbuja.nextElementSibling;
  if (!etiqueta || !etiqueta.classList.contains("etiqueta-velocidad")) {
    etiqueta = document.createElement("div");
    etiqueta.classList.add("etiqueta-velocidad");
    burbuja.insertAdjacentElement("afterend", etiqueta);
  }
  etiqueta.textContent = `${stats.tokens_por_segundo} tok/s · ${stats.tokens} tokens generados · ${stats.tokens_prompt} tokens de contexto · ${stats.segundos}s`;
}

// --- Envío del mensaje y streaming de la respuesta ---
formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const textoDelUsuario = campoDeMensaje.value.trim();
  if (textoDelUsuario === "") {
    return;
  }

  // Si no hay conversación activa, se crea una automáticamente.
  if (!obtenerConversacionActiva()) {
    crearNuevaConversacion();
  }
  const conversacion = obtenerConversacionActiva();

  // Si es el primer mensaje, usamos su texto como título de la conversación.
  if (conversacion.mensajes.length === 0) {
    conversacion.titulo = textoDelUsuario.slice(0, 30);
    tituloConversacion.textContent = conversacion.titulo;
    dibujarListaDeConversaciones();
  }

  conversacion.mensajes.push({ role: "user", content: textoDelUsuario });
  agregarBurbuja(textoDelUsuario, "burbuja-usuario");
  campoDeMensaje.value = "";

  // Burbuja vacía del modelo que se irá llenando con el streaming.
  const burbujaDelModelo = agregarBurbuja("", "burbuja-modelo");

  const cuerpoDeLaPeticion = {
    historial: conversacion.mensajes,
    temperatura: parseFloat(controlTemperatura.value),
    top_k: parseInt(controlTopK.value, 10),
    top_p: parseFloat(controlTopP.value),
    max_tokens: parseInt(controlMaxTokens.value, 10),
  };

  try {
    const respuesta = await fetch(URL_DEL_BACKEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpoDeLaPeticion),
    });

    // El lector nos permite leer el cuerpo de la respuesta en trozos (chunks).
    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder("utf-8");
    // Acumulamos todo el stream en una sola variable. Al hacer split sobre ella
    // siempre separamos correctamente el texto del marcador __STATS__, sin
    // importar en qué chunk llegue cada parte.
    let streamCompleto = "";

    let leyendo = true;
    while (leyendo) {
      const resultado = await lector.read();
      leyendo = !resultado.done;

      if (resultado.value) {
        streamCompleto += decodificador.decode(resultado.value);

        // Mostramos en la burbuja solo la parte anterior al marcador.
        const partes = streamCompleto.split("\n__STATS__:");
        burbujaDelModelo.textContent = partes[0];
        ventanaDeMensajes.scrollTop = ventanaDeMensajes.scrollHeight;
      }
    }

    // Al terminar el stream extraemos el texto limpio y las estadísticas.
    const partes = streamCompleto.split("\n__STATS__:");
    const textoFinal = partes[0];
    burbujaDelModelo.textContent = textoFinal;

    if (partes.length > 1) {
      try {
        const stats = JSON.parse(partes[1]);
        mostrarEstadisticasEnBurbuja(burbujaDelModelo, stats);
      } catch (_) {}
    }

    conversacion.mensajes.push({ role: "assistant", content: textoFinal });
    guardarConversacionesEnAlmacenamiento();
  } catch (error) {
    burbujaDelModelo.textContent = "Error al conectar con el servidor backend.";
    console.error(error);
  }
});

// --- Selector de modelo activo (dropdown propio, con el tema oscuro) ---

let archivoDelModeloActivo = null;

// Carga la lista de modelos instalados y dibuja las opciones del dropdown.
async function inicializarSelectorDeModelo() {
  const [respuestaInstalados, respuestaActivo] = await Promise.all([
    fetch(URL_BASE_DEL_BACKEND + "/api/modelos/instalados"),
    fetch(URL_BASE_DEL_BACKEND + "/api/modelos/activo"),
  ]);
  const datosInstalados = await respuestaInstalados.json();
  const datosActivo = await respuestaActivo.json();

  archivoDelModeloActivo = datosActivo.archivo;
  textoModeloElegido.textContent = archivoDelModeloActivo || "Sin modelo";

  listaDropdownModelo.innerHTML = "";
  for (const modeloInstalado of datosInstalados.instalados) {
    const opcion = document.createElement("div");
    opcion.classList.add("opcion-dropdown-modelo");
    if (modeloInstalado.archivo === archivoDelModeloActivo) {
      opcion.classList.add("activo");
    }
    opcion.textContent = modeloInstalado.archivo;
    opcion.addEventListener("click", () => seleccionarModelo(modeloInstalado.archivo));
    listaDropdownModelo.appendChild(opcion);
  }
}

// Abre y cierra el dropdown al hacer clic en el botón.
botonDropdownModelo.addEventListener("click", () => {
  dropdownModelo.classList.toggle("abierto");
});

// Cierra el dropdown si el usuario hace clic afuera.
document.addEventListener("click", (evento) => {
  if (!dropdownModelo.contains(evento.target)) {
    dropdownModelo.classList.remove("abierto");
  }
});

// Le pide al backend que cargue el modelo elegido.
async function seleccionarModelo(archivoElegido) {
  dropdownModelo.classList.remove("abierto");
  if (archivoElegido === archivoDelModeloActivo) {
    return;
  }

  textoModeloElegido.textContent = "Cargando...";
  botonDropdownModelo.disabled = true;

  try {
    const respuesta = await fetch(URL_BASE_DEL_BACKEND + "/api/modelos/seleccionar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivo: archivoElegido }),
    });
    const datos = await respuesta.json();

    if (datos.error) {
      alert(
        `No se pudo cargar "${archivoElegido}".\n\n` +
        `Motivo: ${datos.error}\n\n` +
        `Es probable que este archivo use una arquitectura de modelo que el motor todavía no soporta. ` +
        `Se mantiene activo "${datos.archivo}".`
      );
    }
  } catch (error) {
    console.error("No se pudo cambiar de modelo:", error);
    alert("No se pudo conectar con el backend para cambiar de modelo.");
  } finally {
    botonDropdownModelo.disabled = false;
    inicializarSelectorDeModelo();
  }
}

// --- Estado del modelo y uso de CPU/memoria (se consultan periódicamente) ---

async function actualizarEstadoDelModelo() {
  try {
    const respuesta = await fetch(URL_BASE_DEL_BACKEND + "/api/modelos/activo");
    const datos = await respuesta.json();

    if (datos.cargando) {
      indicadorEstadoModelo.textContent = "Cargando...";
      indicadorEstadoModelo.className = "indicador-estado cargando";
    } else if (datos.archivo) {
      indicadorEstadoModelo.textContent = "Listo (" + datos.archivo + ")";
      indicadorEstadoModelo.className = "indicador-estado listo";
    } else {
      indicadorEstadoModelo.textContent = "Sin modelo";
      indicadorEstadoModelo.className = "indicador-estado";
    }
  } catch (error) {
    indicadorEstadoModelo.textContent = "Backend no disponible";
    indicadorEstadoModelo.className = "indicador-estado error";
  }
}

async function actualizarRecursosDelSistema() {
  try {
    const respuesta = await fetch(URL_BASE_DEL_BACKEND + "/api/sistema/recursos");
    const datos = await respuesta.json();

    const porcentajeDeCpu = Math.min(100, datos.cpu_porcentaje);
    barraCpu.style.width = porcentajeDeCpu + "%";
    textoCpu.textContent = datos.cpu_porcentaje.toFixed(0) + "%";

    // La barra de memoria se referencia contra 8 GB para tener una escala visual razonable.
    const porcentajeDeMemoria = Math.min(100, (datos.memoria_en_mb / 8192) * 100);
    barraMemoria.style.width = porcentajeDeMemoria + "%";
    textoMemoria.textContent = (datos.memoria_en_mb / 1024).toFixed(2) + " GB";
  } catch (error) {
    textoCpu.textContent = "—";
    textoMemoria.textContent = "—";
  }
}

// --- Inicialización al cargar la página ---
if (conversaciones.length > 0) {
  idConversacionActiva = conversaciones[0].id;
}
dibujarListaDeConversaciones();
dibujarConversacionActiva();
inicializarSelectorDeModelo();

actualizarEstadoDelModelo();
actualizarRecursosDelSistema();
setInterval(actualizarEstadoDelModelo, 2000);
setInterval(actualizarRecursosDelSistema, 2000);
