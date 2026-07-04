// Lógica de la página de gestión de modelos - JavaScript nativo (sin librerías)

const URL_BASE_DEL_BACKEND = "http://localhost:8000";

const formularioDeBusqueda = document.getElementById("formulario-busqueda");
const campoDeBusqueda = document.getElementById("campo-busqueda");
const listaDeResultados = document.getElementById("lista-resultados");
const listaDeInstalados = document.getElementById("lista-instalados");
const botonOrdenarTamano = document.getElementById("boton-ordenar-tamano");
const botonOrdenarParametros = document.getElementById("boton-ordenar-parametros");

// Guardamos los resultados de la última búsqueda para poder reordenarlos
// sin tener que volver a consultar al backend.
let resultadosActuales = [];
let ordenAscendentePorTamano = true;
let ordenAscendentePorParametros = true;

// Convierte una cantidad de parámetros a un texto legible (ej. 7.0B, 350.0M).
function formatearParametros(cantidad) {
  if (!cantidad || cantidad <= 0) {
    return "Parámetros desconocidos";
  }
  const miles_de_millones = cantidad / 1_000_000_000;
  if (miles_de_millones >= 1) {
    return miles_de_millones.toFixed(1) + "B params";
  }
  const millones = cantidad / 1_000_000;
  return millones.toFixed(0) + "M params";
}

// Convierte la cantidad de tokens de contexto a un texto corto (ej. 4K, 128K).
function formatearContexto(cantidadDeTokens) {
  if (cantidadDeTokens >= 1000) {
    return Math.round(cantidadDeTokens / 1000) + "K";
  }
  return String(cantidadDeTokens);
}

// Convierte un número grande de descargas/likes a un texto corto (ej. 232.7K).
function formatearNumeroGrande(numero) {
  if (!numero) {
    return "0";
  }
  if (numero >= 1_000_000) {
    return (numero / 1_000_000).toFixed(1) + "M";
  }
  if (numero >= 1_000) {
    return (numero / 1_000).toFixed(1) + "K";
  }
  return String(numero);
}

// Convierte la fecha ISO de Hugging Face a una fecha simple (ej. 31/12/2023).
function formatearFecha(fechaIso) {
  if (!fechaIso) {
    return null;
  }
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString();
}

// Convierte bytes a un texto legible (MB o GB).
function formatearTamano(bytesTotales) {
  const gigabytes = bytesTotales / (1024 * 1024 * 1024);
  if (gigabytes >= 1) {
    return gigabytes.toFixed(2) + " GB";
  }
  const megabytes = bytesTotales / (1024 * 1024);
  return megabytes.toFixed(1) + " MB";
}

// --- Cargar la lista de modelos ya instalados localmente ---
async function cargarModelosInstalados() {
  const respuesta = await fetch(URL_BASE_DEL_BACKEND + "/api/modelos/instalados");
  const datos = await respuesta.json();

  listaDeInstalados.innerHTML = "";
  if (datos.instalados.length === 0) {
    listaDeInstalados.innerHTML = "<p class='subtitulo'>Todavía no hay modelos descargados.</p>";
    return;
  }

  for (const modelo of datos.instalados) {
    const fila = document.createElement("div");
    fila.classList.add("fila-modelo");
    fila.innerHTML = `
      <div class="info-modelo">
        <span class="nombre-modelo">${modelo.archivo}</span>
        <span class="detalle-modelo">${formatearTamano(modelo.tamano_en_bytes)}</span>
      </div>
      <span class="etiqueta-instalado">Instalado</span>
    `;
    listaDeInstalados.appendChild(fila);
  }
}

// --- Buscar modelos en Hugging Face ---
formularioDeBusqueda.addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const terminoDeBusqueda = campoDeBusqueda.value.trim();
  if (terminoDeBusqueda === "") {
    return;
  }

  listaDeResultados.innerHTML = "<p class='subtitulo'>Buscando...</p>";

  try {
    const respuesta = await fetch(
      URL_BASE_DEL_BACKEND + "/api/modelos/buscar?q=" + encodeURIComponent(terminoDeBusqueda)
    );
    const datos = await respuesta.json();
    resultadosActuales = datos.resultados;
    const hayResultados = resultadosActuales.length > 0;
    botonOrdenarTamano.style.display = hayResultados ? "inline-block" : "none";
    botonOrdenarParametros.style.display = hayResultados ? "inline-block" : "none";
    dibujarResultados(resultadosActuales);
  } catch (error) {
    listaDeResultados.innerHTML = "<p class='subtitulo'>Error al buscar modelos. ¿Está el backend corriendo?</p>";
    console.error(error);
  }
});

// --- Ordenar los resultados ya cargados por tamaño de archivo ---
botonOrdenarTamano.addEventListener("click", () => {
  resultadosActuales.sort((a, b) =>
    ordenAscendentePorTamano
      ? a.tamano_en_bytes - b.tamano_en_bytes
      : b.tamano_en_bytes - a.tamano_en_bytes
  );
  botonOrdenarTamano.textContent = ordenAscendentePorTamano ? "Ordenar por tamaño ↓" : "Ordenar por tamaño ↑";
  ordenAscendentePorTamano = !ordenAscendentePorTamano;
  dibujarResultados(resultadosActuales);
});

// --- Ordenar los resultados ya cargados por cantidad de parámetros ---
botonOrdenarParametros.addEventListener("click", () => {
  resultadosActuales.sort((a, b) =>
    ordenAscendentePorParametros
      ? a.cantidad_de_parametros - b.cantidad_de_parametros
      : b.cantidad_de_parametros - a.cantidad_de_parametros
  );
  botonOrdenarParametros.textContent = ordenAscendentePorParametros
    ? "Ordenar por parámetros ↓"
    : "Ordenar por parámetros ↑";
  ordenAscendentePorParametros = !ordenAscendentePorParametros;
  dibujarResultados(resultadosActuales);
});

function dibujarResultados(resultados) {
  listaDeResultados.innerHTML = "";

  if (resultados.length === 0) {
    listaDeResultados.innerHTML = "<p class='subtitulo'>No se encontraron archivos .gguf para esa búsqueda.</p>";
    return;
  }

  for (const resultado of resultados) {
    const fila = document.createElement("div");
    fila.classList.add("fila-modelo");
    const tamanoTexto = resultado.tamano_en_bytes > 0
      ? formatearTamano(resultado.tamano_en_bytes)
      : "Tamaño desconocido";
    const parametrosTexto = formatearParametros(resultado.cantidad_de_parametros);
    const contextoTexto = resultado.ventana_de_contexto > 0
      ? formatearContexto(resultado.ventana_de_contexto)
      : null;
    const actualizacionTexto = formatearFecha(resultado.ultima_actualizacion);

    fila.innerHTML = `
      <div class="info-modelo">
        <span class="nombre-modelo">${resultado.archivo}</span>
        <span class="detalle-modelo">${resultado.repositorio}</span>

        <div class="insignias-modelo">
          <span class="insignia">${parametrosTexto}</span>
          ${contextoTexto ? `<span class="insignia">${contextoTexto} contexto</span>` : ""}
          <span class="insignia">${resultado.licencia}</span>
        </div>

        <div class="estadisticas-modelo">
          <span>⬇ ${formatearNumeroGrande(resultado.descargas)} descargas</span>
          <span>♥ ${formatearNumeroGrande(resultado.me_gusta)}</span>
          <span>${tamanoTexto}</span>
          ${actualizacionTexto ? `<span>Actualizado: ${actualizacionTexto}</span>` : ""}
        </div>
      </div>
      <button class="boton-descargar">Descargar</button>
      <div class="barra-progreso-contenedor" style="display:none;">
        <div class="barra-progreso-relleno"></div>
        <span class="texto-progreso">0%</span>
      </div>
    `;

    const botonDescargar = fila.querySelector(".boton-descargar");
    botonDescargar.addEventListener("click", () => {
      descargarModelo(resultado, fila);
    });

    listaDeResultados.appendChild(fila);
  }
}

// --- Descargar un modelo y mostrar el progreso en tiempo real ---
async function descargarModelo(resultado, fila) {
  const botonDescargar = fila.querySelector(".boton-descargar");
  const contenedorDeProgreso = fila.querySelector(".barra-progreso-contenedor");
  const relleno = fila.querySelector(".barra-progreso-relleno");
  const textoDeProgreso = fila.querySelector(".texto-progreso");

  botonDescargar.style.display = "none";
  contenedorDeProgreso.style.display = "flex";

  const parametros = new URLSearchParams({
    url: resultado.url_descarga,
    nombre_archivo: resultado.archivo,
  });

  const respuesta = await fetch(URL_BASE_DEL_BACKEND + "/api/modelos/descargar?" + parametros.toString());
  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder("utf-8");
  let textoAcumulado = "";

  let leyendo = true;
  while (leyendo) {
    const resultadoDeLectura = await lector.read();
    leyendo = !resultadoDeLectura.done;

    if (resultadoDeLectura.value) {
      textoAcumulado += decodificador.decode(resultadoDeLectura.value);
      const lineas = textoAcumulado.split("\n");
      textoAcumulado = lineas.pop();

      for (const linea of lineas) {
        if (linea.startsWith("PROGRESO:")) {
          const porcentaje = linea.replace("PROGRESO:", "");
          relleno.style.width = porcentaje + "%";
          textoDeProgreso.textContent = porcentaje + "%";
        } else if (linea === "COMPLETADO") {
          textoDeProgreso.textContent = "¡Listo!";
          cargarModelosInstalados();
        }
      }
    }
  }
}

// --- Inicialización ---
cargarModelosInstalados();
