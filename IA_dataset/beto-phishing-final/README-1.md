# Modelo BETO Entrenado (`beto-phishing-final`)

Coloca aquí los archivos de tu modelo entrenado descargados desde Google Drive para ejecutar el backend FastAPI de forma local sin depender de Drive:

- `config.json`
- `model.safetensors` (o `pytorch_model.bin`)
- `tokenizer_config.json`
- `vocab.txt`
- `special_tokens_map.json`
- `tokenizer.json` (si aplica)

## Ejecución local del backend FastAPI

Desde la raíz del proyecto:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

El archivo `backend/main.py` cargará automáticamente el modelo desde esta carpeta (`IA_dataset/beto-phishing-final`).
