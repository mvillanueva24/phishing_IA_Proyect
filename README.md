# Correo Seguro BETO — Simulador de Detección de Phishing

Aplicación web local para probar un modelo **BETO (`dccuchile/bert-base-spanish-wwm-cased`)** entrenado con fine-tuning para la detección binaria de phishing en correos electrónicos en español (`0` = seguro, `1` = phishing).

---

## Arquitectura

El proyecto consta de **2 servicios locales** que deben ejecutarse en paralelo:

1. **Backend de IA (Python / FastAPI)** — `backend/main.py`
   - Corre en `http://127.0.0.1:8000`.
   - Carga **estrictamente desde disco** (`local_files_only=True`) el modelo entrenado ubicado en `IA_dataset/beto-phishing-final/`.
   - Expone `GET /health` y `POST /predict`.
   - No utiliza ningún LLM externo ni conexión a internet para inferir.
2. **Servidor web + Frontend (Node / Express + Vite + React)** — `server.ts`
   - Corre en `http://localhost:3000`.
   - Sirve las vistas de **Emisor** y **Receptor** con actualización en tiempo real (SSE).
   - Envía cada correo al backend local FastAPI (`http://127.0.0.1:8000/predict`) con el formato exacto de entrenamiento:
     ```text
     Asunto: {subject} \nCuerpo: {body}
     ```

---

## Requisitos previos

- **Python 3.10+** (probado con Python 3.12)
- **Node.js 20+** y **npm** (probado con Node v24)
- **Git** (en Windows se recomienda usar **Git Bash**)
- **Pesos del modelo entrenado** dentro de `IA_dataset/beto-phishing-final/`:
  - `config.json`
  - `model.safetensors` (~439 MB)
  - `tokenizer.json`
  - `tokenizer_config.json`

> **Nota al clonar en otra computadora:** El archivo `IA_dataset/beto-phishing-final/model.safetensors` (~439 MB) **no está incluido en GitHub** (está en `.gitignore` por superar el límite de 100 MB). Después de clonar el repositorio, obtén el archivo por separado y cópialo en `IA_dataset/beto-phishing-final/model.safetensors`. Los demás archivos del modelo (`config.json`, `tokenizer.json`, `tokenizer_config.json`, `training_args.bin`) ya vienen incluidos en el repositorio.

---

## Instalación y ejecución (primera vez)

> **Importante:** Ejecuta siempre los comandos desde la **raíz del proyecto** (`phishing_IA_Proyect/`), **no** desde `src/` ni `backend/`.

Necesitarás **2 terminales abiertas** en la raíz del proyecto.

### Opción A: Git Bash en Windows (recomendado)

#### Terminal 1 — Backend FastAPI (Modelo BETO)
```bash
# 1. Crear y activar el entorno virtual de Python
python -m venv .venv
source .venv/Scripts/activate

# 2. Instalar dependencias de Python (FastAPI, Uvicorn, PyTorch, Transformers)
pip install -r backend/requirements.txt

# 3. Levantar el servidor en el puerto 8000
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Comprueba en el navegador que el modelo cargó correctamente entrando a:
- **http://127.0.0.1:8000/health** (debe mostrar `"loaded": true`).

#### Terminal 2 — Frontend + Servidor Express
```bash
# 1. Instalar dependencias de Node (usar --legacy-peer-deps por conflicto entre vite y esbuild)
npm install --legacy-peer-deps

# 2. Levantar la aplicación web en el puerto 3000
npm run dev
```

Abre en tu navegador:
- **http://localhost:3000** *(o **http://127.0.0.1:3000**)*

---

### Opción B: PowerShell en Windows

Si usas PowerShell y aparece el error `running scripts is disabled on this system`, habilita scripts locales una sola vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Luego:

- **Terminal 1 (FastAPI):**
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  pip install -r backend\requirements.txt
  uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Terminal 2 (Node):**
  ```powershell
  npm install --legacy-peer-deps
  npm run dev
  ```

---

### Opción C: Linux / macOS

- **Terminal 1 (FastAPI):**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r backend/requirements.txt
  uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Terminal 2 (Node):**
  ```bash
  npm install --legacy-peer-deps
  npm run dev
  ```

---

## Ejecución rápida (en usos posteriores)

Una vez instaladas las dependencias, solo necesitas ejecutar esto desde la raíz del proyecto:

- **Terminal 1 (Git Bash):**
  ```bash
  source .venv/Scripts/activate
  uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Terminal 2 (Git Bash):**
  ```bash
  npm run dev
  ```

---

## Cómo verificar que realmente usa tu modelo BETO

1. **En la Terminal 1 (FastAPI):** cada correo enviado desde la web registra:
   ```text
   INFO:     127.0.0.1:xxxxx - "POST /predict HTTP/1.1" 200 OK
   ```
2. **En la Terminal 2 (Node):** se imprime el veredicto devuelto por tu modelo:
   ```text
   [BETO FastAPI] http://127.0.0.1:8000/predict -> label=phishing (raw_label=LABEL_1, prediction=1, confidence=99.42%, urls=1)
   ```
3. **Sin internet:** si desconectas el Wi-Fi con ambos servidores locales activos, seguirá clasificando normalmente.
4. **Sin FastAPI:** si detienes la Terminal 1, enviar un correo mostrará explícitamente un error de conexión con el backend local de BETO (no existe ningún respaldo a LLMs externos).

---

## Almacenamiento de correos

El simulador no usa base de datos externa (`server/store.ts`):
- Los correos se mantienen en **memoria RAM** del servidor Node mientras `npm run dev` esté encendido (sobreviven a recargar o cerrar pestañas del navegador).
- En Linux/macOS intenta persistirlos en `/tmp/correo-seguro-beto-emails.json`. En Windows, si no existe la carpeta `\tmp` en el disco actual, solo permanecen en memoria y se reinician al detener `npm run dev`.

---

## Variables de entorno (opcionales)

No es necesario crear un archivo `.env` para correr el proyecto localmente. Si deseas personalizar rutas o puertos, puedes configurar:

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor Express + Vite |
| `FASTAPI_URL` | `http://127.0.0.1:8000` | URL del backend FastAPI |
| `BETO_MODEL_PATH` | `IA_dataset/beto-phishing-final` | Carpeta con los pesos de BETO |
| `PHISHING_LABEL_IDX` | `1` | Índice de la clase phishing (`0` o `1`) |
| `BETO_INPUT_TEMPLATE` | `Asunto: {subject} \nCuerpo: {body}` | Plantilla de entrada al tokenizador |

---

## Solución de problemas comunes

| Problema | Causa | Solución |
| --- | --- | --- |
| `npm error code ERESOLVE` (`vite@8.3.x` vs `esbuild@0.25.x`) | Conflicto estricto de peer dependencies en `npm` (el proyecto viene con `bun.lock`) | Ejecuta `npm install --legacy-peer-deps` desde la raíz del proyecto |
| `npm install` o `npm run dev` falla o no encuentra archivos | Estás parado dentro de `src/` u otra subcarpeta | Vuelve a la raíz con `cd ..` (donde está `package.json`) |
| PowerShell bloquea `npm` o `Activate.ps1` (`PSSecurityException`) | Política de ejecución restringida en Windows | Usa **Git Bash**, o ejecuta `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en PowerShell |
| La consola muestra `running on http://0.0.0.0:3000` | `0.0.0.0` indica que escucha en todas las interfaces locales | En el navegador entra a **http://localhost:3000** o **http://127.0.0.1:3000** |
| Error `No se pudo conectar con el backend local de BETO` | FastAPI no está corriendo en el puerto `8000` | Inicia `uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload` en otra terminal |
| Advertencia de Vite sobre `__dirname` en `vite.config.ts` | Aviso informativo de futuras versiones de Vite | No impide la ejecución; se puede ignorar |
| Error al arrancar FastAPI indicando que faltan archivos del modelo | Falta `config.json` o `model.safetensors` | Verifica que todos los archivos del modelo estén en `IA_dataset/beto-phishing-final/` |
