# Arquitectura del Sistema: API Backend y Frontend Web Separados

## 1. Pila Tecnológica (Tech Stack)
* **Backend:** Python 3.10+ Portable + **FastAPI** (para levantar la API web de forma explícita) + `llama-cpp-python`.
* **Frontend:** **HTML5, CSS3 y JavaScript Nativo (Vanilla JS)**. Cero librerías (no React, no Vue) para que el alumno vea cómo se manipula el DOM y se hace un `fetch` de streaming puro.
* **Protocolo de Comunicación:** HTTP POST con respuestas del tipo `text/event-stream` (Server-Sent Events) para lograr el efecto de escritura en tiempo real.

## 2. Estructura de Archivos del Proyecto
```text
motor-gguf-desacoplado/
├── python_env/              # Python local aislado y librerías
├── modelos/
│   └── phi3-mini.gguf       # Modelo profesional descargado
├── backend/
│   └── server.py            # API FastAPI que procesa el modelo GGUF
├── frontend/
│   ├── index.html           # Estructura visual del chat
│   ├── style.css            # Estilos visuales del chat
│   └── app.js               # Lógica JS que conecta al backend y hace el fetch
└── INICIAR_SISTEMA.bat      # Levanta el servidor Python y abre el index.html