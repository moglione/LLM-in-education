@echo off
echo ============================================
echo  Iniciando Motor de Inferencia GGUF
echo ============================================

echo [1/3] Levantando el servidor backend (FastAPI)...
start /B "" "python_env\python.exe" "backend\server.py"

echo [2/3] Esperando 3 segundos a que el servidor este listo en el puerto 8000...
ping 127.0.0.1 -n 4 >nul

echo [3/3] Abriendo la interfaz de chat en el navegador...
start "" "frontend\index.html"

echo Listo. La consola del servidor sigue corriendo en segundo plano.
