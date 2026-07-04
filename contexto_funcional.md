# Contexto Funcional: Motor de Inferencia GGUF con Arquitectura Cliente-Servidor Desacoplada

## 1. Propósito del Proyecto
El objetivo de este proyecto es construir un ecosistema de inferencia local para modelos profesionales (GGUF) que separe estrictamente la interfaz de usuario (Frontend) de la lógica de procesamiento numérico de IA (Backend). El sistema demuestra cómo funciona un servicio moderno de Chat-AI (estilo OpenAI o Anthropic), donde una interfaz web ligera interactúa con un servidor de cómputo remoto o local mediante una API HTTP.

## 2. Objetivos Clave y Enfoque Pedagógico
* **Arquitectura Cliente-Servidor Real:** Enseñar a los estudiantes el concepto de desacoplamiento. El backend de Python solo procesa tokens y el frontend de JavaScript solo renderiza la interfaz visual.
* **Consumo de APIs y Streaming:** Aprender cómo el navegador web puede recibir texto del modelo palabra por palabra en tiempo real utilizando *Server-Sent Events* (SSE) o técnicas de streaming HTTP.
* **Portabilidad Autónoma:** Ambos componentes viven localmente en la carpeta del proyecto y se ejecutan de forma nativa sin instalaciones globales en el sistema operativo.

## 3. Componentes del Sistema
1. **Servidor Backend (Python + FastAPI):** Carga el archivo `.gguf` mediante `llama-cpp-python` y expone un endpoint local (`/api/chat`).
2. **Cliente Frontend (HTML/CSS/JS Nativo):** Una interfaz de chat limpia y estética que se ejecuta directamente en el navegador abriendo un archivo `index.html`.