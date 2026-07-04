# Servidor Backend - Motor de Inferencia GGUF
# Este script carga un modelo de lenguaje local (.gguf) y lo expone
# como una API web para que el frontend pueda conversar con él.

import os
from typing import List
import psutil
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llama_cpp import Llama

# Proceso actual, usado para medir cuánta CPU y memoria consume el servidor.
proceso_actual = psutil.Process(os.getpid())

# --- 1. Parámetros de configuración del modelo ---
# Carpeta donde se guardan todos los archivos .gguf descargados.
CARPETA_DE_MODELOS = "modelos"
# Nombre del archivo que se carga por defecto al iniciar el servidor.
NOMBRE_DE_MODELO_POR_DEFECTO = "phi3-mini.gguf"
# Cantidad de hilos de CPU que se usarán para procesar la inferencia.
HILOS_DE_CPU = 4
# Tamaño de la ventana de contexto (cuántos tokens recuerda el modelo).
VENTANA_DE_CONTEXTO = 4096
# Cantidad máxima de mensajes anteriores que se envían como historial.
# Si se envían demasiados, el total de tokens puede superar la ventana de
# contexto y hacer que la librería de C++ termine el proceso abruptamente.
# OJO: cada vez que este límite recorta el mensaje más viejo, el modelo
# pierde la caché interna (KV cache) de la conversación y debe reprocesar
# todo el historial restante desde cero, lo que vuelve esa respuesta mucho
# más lenta. Por eso este número se deja alto: para que en una conversación
# típica nunca llegue a recortar nada.
MAXIMO_DE_MENSAJES_DE_HISTORIAL = 40

# --- 2. Carga del modelo en memoria ---
# Variables globales que representan el modelo actualmente cargado.
modelo = None
nombre_del_modelo_activo = None
# Indica si en este momento se está cargando un modelo nuevo en memoria.
cargando_modelo = False


def cargar_modelo(nombre_de_archivo: str):
    """Carga (o reemplaza) el modelo activo en memoria a partir de un archivo .gguf."""
    global modelo, nombre_del_modelo_activo, cargando_modelo

    cargando_modelo = True
    try:
        ruta_del_modelo = os.path.join(CARPETA_DE_MODELOS, nombre_de_archivo)
        print(f"Cargando el modelo '{nombre_de_archivo}' en memoria, por favor espera...")
        modelo = Llama(
            model_path=ruta_del_modelo,
            n_threads=HILOS_DE_CPU,
            n_ctx=VENTANA_DE_CONTEXTO,
        )
        nombre_del_modelo_activo = nombre_de_archivo
        print(f"Modelo '{nombre_de_archivo}' cargado. El servidor está listo para recibir peticiones.")
    finally:
        cargando_modelo = False


# Al iniciar el servidor, cargamos el modelo por defecto si existe en la carpeta,
# o el primer archivo .gguf que encontremos como alternativa.
_archivos_gguf_disponibles = [
    archivo for archivo in os.listdir(CARPETA_DE_MODELOS) if archivo.lower().endswith(".gguf")
]
if NOMBRE_DE_MODELO_POR_DEFECTO in _archivos_gguf_disponibles:
    cargar_modelo(NOMBRE_DE_MODELO_POR_DEFECTO)
elif _archivos_gguf_disponibles:
    cargar_modelo(_archivos_gguf_disponibles[0])
else:
    print("No se encontró ningún archivo .gguf en la carpeta 'modelos/'.")

# --- 3. Creación de la aplicación web ---
app = FastAPI()

# Permitimos que el navegador (frontend) se conecte a este servidor
# aunque estén en "orígenes" distintos (archivo local vs servidor local).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Un mensaje individual dentro del historial de la conversación.
class MensajeDeHistorial(BaseModel):
    role: str
    content: str


# Estructura esperada de la petición que envía el frontend.
class PeticionDeChat(BaseModel):
    historial: List[MensajeDeHistorial]
    temperatura: float = 0.7
    top_k: int = 50
    top_p: float = 0.9
    max_tokens: int = 512


def generador_de_tokens(peticion: PeticionDeChat):
    """Recorre la respuesta del modelo token por token y la va entregando (yield)."""
    import time
    import json

    historial_recortado = peticion.historial[-MAXIMO_DE_MENSAJES_DE_HISTORIAL:]
    mensajes = [{"role": m.role, "content": m.content} for m in historial_recortado]
    # Contamos los tokens del prompt antes de iniciar la inferencia usando
    # el tokenizador interno del modelo, que siempre está disponible.
    texto_del_prompt = " ".join(m["content"] for m in mensajes)
    tokens_de_prompt = len(modelo.tokenize(texto_del_prompt.encode("utf-8")))

    flujo_de_respuesta = modelo.create_chat_completion(
        messages=mensajes,
        max_tokens=peticion.max_tokens,
        temperature=peticion.temperatura,
        top_k=peticion.top_k,
        top_p=peticion.top_p,
        stream=True,
    )

    tiempo_de_inicio = time.perf_counter()
    tokens_generados = 0

    for fragmento in flujo_de_respuesta:
        texto_generado = fragmento["choices"][0]["delta"].get("content", "")
        if texto_generado:
            tokens_generados += 1
            yield texto_generado

    tiempo_total = time.perf_counter() - tiempo_de_inicio

    tokens_por_segundo = tokens_generados / tiempo_total if tiempo_total > 0 else 0

    estadisticas = json.dumps({
        "tokens": tokens_generados,
        "tokens_prompt": tokens_de_prompt,
        "segundos": round(tiempo_total, 2),
        "tokens_por_segundo": round(tokens_por_segundo, 1),
    })
    yield f"\n__STATS__:{estadisticas}"


@app.post("/api/chat")
def chat(peticion: PeticionDeChat):
    """Recibe el historial de la conversación y devuelve la respuesta del modelo en streaming."""
    if modelo is None:
        return StreamingResponse(
            iter(["No hay ningún modelo cargado. Elegí uno en 'Gestionar Modelos'."]),
            media_type="text/plain",
        )
    return StreamingResponse(
        generador_de_tokens(peticion),
        media_type="text/plain",
    )


# --- 4. Búsqueda y descarga de modelos desde Hugging Face ---

URL_DE_BUSQUEDA_HUGGINGFACE = "https://huggingface.co/api/models"


@app.get("/api/modelos/buscar")
def buscar_modelos(q: str):
    """Busca en Hugging Face repositorios que contengan archivos .gguf."""
    respuesta = requests.get(
        URL_DE_BUSQUEDA_HUGGINGFACE,
        params={"search": q, "filter": "gguf", "full": "true", "limit": 15},
        timeout=15,
    )
    repositorios_encontrados = respuesta.json()

    # Límite de archivos a mostrar, para no recargar la página con resultados.
    MAXIMO_DE_RESULTADOS = 15

    resultados = []
    for repositorio in repositorios_encontrados:
        if len(resultados) >= MAXIMO_DE_RESULTADOS:
            break

        id_del_repositorio = repositorio["id"]

        # Pedimos los "blobs" del repositorio: una sola petición que trae
        # el tamaño de TODOS sus archivos, en vez de una petición HEAD por archivo.
        # Esta misma respuesta también incluye la cantidad de parámetros del modelo,
        # la ventana de contexto y la licencia.
        tamanos_por_archivo = {}
        cantidad_de_parametros = 0
        ventana_de_contexto = 0
        licencia = "Desconocida"
        try:
            respuesta_de_blobs = requests.get(
                f"{URL_DE_BUSQUEDA_HUGGINGFACE}/{id_del_repositorio}",
                params={"blobs": "true"},
                timeout=10,
            )
            datos_del_repositorio = respuesta_de_blobs.json()
            for archivo_con_tamano in datos_del_repositorio.get("siblings", []):
                tamanos_por_archivo[archivo_con_tamano["rfilename"]] = archivo_con_tamano.get("size", 0)
            cantidad_de_parametros = datos_del_repositorio.get("gguf", {}).get("total", 0)
            ventana_de_contexto = datos_del_repositorio.get("gguf", {}).get("context_length", 0)
            licencia = datos_del_repositorio.get("cardData", {}).get("license", "Desconocida")
        except requests.RequestException:
            tamanos_por_archivo = {}

        # La licencia también puede venir como una etiqueta del estilo "license:mit".
        if licencia == "Desconocida":
            for etiqueta in repositorio.get("tags", []):
                if etiqueta.startswith("license:"):
                    licencia = etiqueta.replace("license:", "")
                    break

        for archivo in repositorio.get("siblings", []):
            if len(resultados) >= MAXIMO_DE_RESULTADOS:
                break

            nombre_del_archivo = archivo["rfilename"]
            if nombre_del_archivo.lower().endswith(".gguf"):
                resultados.append({
                    "repositorio": id_del_repositorio,
                    "archivo": nombre_del_archivo,
                    "url_descarga": (
                        f"https://huggingface.co/{id_del_repositorio}"
                        f"/resolve/main/{nombre_del_archivo}"
                    ),
                    "tamano_en_bytes": tamanos_por_archivo.get(nombre_del_archivo, 0),
                    "cantidad_de_parametros": cantidad_de_parametros,
                    "ventana_de_contexto": ventana_de_contexto,
                    "licencia": licencia,
                    "descargas": repositorio.get("downloads", 0),
                    "me_gusta": repositorio.get("likes", 0),
                    "ultima_actualizacion": repositorio.get("lastModified", ""),
                })

    return {"resultados": resultados}


@app.get("/api/modelos/instalados")
def listar_modelos_instalados():
    """Lista los archivos .gguf que ya están descargados localmente."""
    archivos_instalados = []
    for nombre_de_archivo in os.listdir(CARPETA_DE_MODELOS):
        if nombre_de_archivo.lower().endswith(".gguf"):
            ruta_completa = os.path.join(CARPETA_DE_MODELOS, nombre_de_archivo)
            tamano_en_bytes = os.path.getsize(ruta_completa)
            archivos_instalados.append({
                "archivo": nombre_de_archivo,
                "tamano_en_bytes": tamano_en_bytes,
            })
    return {"instalados": archivos_instalados}


@app.get("/api/modelos/activo")
def obtener_modelo_activo():
    """Indica qué archivo .gguf está actualmente cargado en memoria."""
    return {"archivo": nombre_del_modelo_activo, "cargando": cargando_modelo}


@app.get("/api/sistema/recursos")
def obtener_recursos_del_sistema():
    """Informa cuánta CPU y memoria está usando el servidor en este momento."""
    porcentaje_de_cpu = psutil.cpu_percent(interval=0.2)
    memoria_en_mb = proceso_actual.memory_info().rss / (1024 * 1024)
    return {
        "cpu_porcentaje": porcentaje_de_cpu,
        "memoria_en_mb": round(memoria_en_mb, 1),
    }


class PeticionDeSeleccion(BaseModel):
    archivo: str


@app.post("/api/modelos/seleccionar")
def seleccionar_modelo(peticion: PeticionDeSeleccion):
    """Descarga de memoria el modelo actual y carga el archivo .gguf elegido por el usuario."""
    try:
        cargar_modelo(peticion.archivo)
        return {"archivo": nombre_del_modelo_activo, "error": None}
    except Exception as error:
        # Si el archivo .gguf usa una arquitectura que el motor no reconoce,
        # o está corrupto, avisamos con un mensaje claro en vez de romper la petición.
        return {"archivo": nombre_del_modelo_activo, "error": str(error)}


def generador_de_progreso_de_descarga(url_descarga: str, nombre_del_archivo: str):
    """Descarga el archivo en trozos (chunks) e informa el progreso en cada paso."""
    ruta_destino = os.path.join(CARPETA_DE_MODELOS, nombre_del_archivo)
    ruta_temporal = ruta_destino + ".descargando"

    respuesta = requests.get(url_descarga, stream=True, timeout=30)
    tamano_total_en_bytes = int(respuesta.headers.get("Content-Length", 0))
    bytes_descargados = 0

    with open(ruta_temporal, "wb") as archivo_destino:
        for trozo in respuesta.iter_content(chunk_size=1024 * 1024):
            archivo_destino.write(trozo)
            bytes_descargados += len(trozo)

            if tamano_total_en_bytes > 0:
                porcentaje = int((bytes_descargados / tamano_total_en_bytes) * 100)
            else:
                porcentaje = 0

            yield f"PROGRESO:{porcentaje}\n"

    os.replace(ruta_temporal, ruta_destino)
    yield "PROGRESO:100\n"
    yield "COMPLETADO\n"


@app.get("/api/modelos/descargar")
def descargar_modelo(url: str, nombre_archivo: str):
    """Descarga un modelo .gguf desde Hugging Face hacia la carpeta modelos/."""
    return StreamingResponse(
        generador_de_progreso_de_descarga(url, nombre_archivo),
        media_type="text/plain",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
