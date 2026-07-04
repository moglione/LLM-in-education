# Plan de Implementación por Fases y Validaciones (Arquitectura Desacoplada)

## Resumen de Recursos Estimados
* **Tiempo Total de Desarrollo:** 8 a 10 días (dedicación parcial).
* **Complejidad Global:** Media.
* **Enfoque Pedagógico:** Tanto el código de Python (Backend) como el de JavaScript (Frontend) deben evitar librerías intermedias avanzadas. Se prefiere la manipulación directa de datos y flujos (streams) para que el alumno vea la fontanería real del sistema.

---

### Fase 1: El Servidor Backend (API FastAPI)
* **Duración:** 3 días.
* **Nivel de Complejidad:** Media.
* **Descripción:** Creación del script ejecutable `server.py` que inicializa el modelo `.gguf` en memoria. Usando FastAPI, se expone un servidor local en el puerto 8000 con un endpoint que recibe el historial de chat y devuelve las palabras del modelo como un flujo continuo de bytes (Stream).

> **Prompt de Implementación para la IA:**
> *"Escribe un script en Python didáctico llamado 'server.py' usando FastAPI y 'llama_cpp'. Debe cargar el modelo local 'modelos/phi3-mini.gguf'. Crea un endpoint POST en '/api/chat' que reciba el mensaje del usuario. REQUISITO DE ESTILO: Configura CORS de forma explícita para permitir conexiones locales desde el navegador. Usa la clase 'StreamingResponse' de FastAPI para enviar la respuesta de 'model.create_completion(stream=True)' token por token de manera abierta usando un generador 'yield'. El código debe ser lineal, muy comentado en español y sin decoradores avanzados u optimizaciones complejas de software."*

---

### Fase 2: La Interfaz Frontend (HTML/CSS/JS Nativo)
* **Duración:** 4 días.
* **Nivel de Complejidad:** Media.
* **Descripción:** Construcción de la interfaz web dentro de la carpeta `frontend/`. Se diseña una pantalla de chat clásica con su respectivo cuadro de texto. El script `app.js` captura el evento de envío, despacha los datos al servidor FastAPI y lee el flujo de datos (stream) para pintar el resultado dinámicamente.

> **Prompt de Implementación para la IA:**
> *"Escribe el código para tres archivos de frontend interactivo y didáctico: 'index.html', 'style.css' y 'app.js'. Deben crear una interfaz de chat limpia (estilo ChatGPT). REQUISITO DE ESTILO: El archivo 'app.js' debe usar JavaScript moderno pero estrictamente nativo (Vanilla JS), sin frameworks ni librerías de terceros. Debe usar la función 'fetch()' apuntando a 'http://localhost:8000/api/chat'. Implementa la lectura del streaming usando 'response.body.getReader()' y un bucle 'while' explícito para decodificar los trozos de texto (chunks) que llegan del servidor backend e insertarlos carácter por carácter dentro de la burbuja de chat en el HTML de forma fluida. Todo el proceso de recepción del stream debe estar rigurosamente explicado con comentarios en español."*

---

### Fase 3: Automatización y Lanzamiento Automatizado (El Orquestador)
* **Duración:** 2 días.
* **Nivel de Complejidad:** Baja.
* **Descripción:** Creación del archivo lanzador (`INICIAR_SISTEMA.bat` para Windows o `.sh` para Linux/Mac). Este script automatiza el arranque en paralelo: activa el entorno local de Python, levanta el backend de FastAPI en segundo plano y abre automáticamente el navegador web apuntando al archivo `index.html` del frontend.

> **Prompt de Implementación para la IA:**
> *"Escribe un archivo de procesamiento por lotes de Windows (.bat) llamado 'INICIAR_SISTEMA.bat' que automatice el arranque del proyecto de forma portable. El script debe hacer tres cosas en secuencia: 1) Ejecutar en segundo plano el servidor de Python usando el entorno local sin abrir una ventana nueva (ej. ejecutando './python_env/python backend/server.py'), 2) Esperar 3 segundos para asegurar que el servidor FastAPI esté escuchando en el puerto 8000, y 3) Lanzar el navegador web predeterminado del sistema abriendo directamente el archivo local 'frontend/index.html'. Incluye comandos 'echo' didácticos en la terminal para que el usuario sepa qué está ocurriendo en cada paso."*

---

### Pruebas de Validación del Sistema Desacoplado

#### Validación del Backend (API)
* **Prueba de Aislamiento de Red:** Consumir el endpoint del backend utilizando una herramienta externa de pruebas (como Postman o el comando `curl` desde la terminal de comandos) enviando un JSON estructurado de prueba.
* **Criterio de Aceptación:** El servidor Python debe responder inmediatamente con código de estado 200 y empezar a escupir texto fragmentado en la consola en tiempo real.

#### Validación del Frontend (Cliente Autónomo)
* **Prueba de Conexión Cruzada:** Abrir el archivo `index.html` directamente en el navegador web haciendo doble clic sobre él. Al escribir un mensaje y presionar enviar, revisar la pestaña "Network" del navegador.
* **Criterio de Aceptación:** La interfaz web debe conectarse exitosamente al backend, procesar la solicitud sin lanzar errores de CORS y reflejar las palabras en streaming en la pantalla.

#### Validación de la Automatización (Experiencia de Usuario)
* **Prueba del Lanzador Portable:** Hacer doble clic en `INICIAR_SISTEMA.bat` en una máquina limpia.
* **Criterio de Aceptación:** La consola debe abrirse, mostrar los mensajes de carga, cerrarse o quedarse en segundo plano, y el navegador debe abrir el chat web listo para interactuar inmediatamente con el modelo GGUF sin intervención manual del usuario.