from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
import numpy as np
import joblib

app = FastAPI()

# === CORS para desarrollo local (Live Server -> FastAPI en :8000) ===
# Ajusta allow_origins si deseas restringirlo a puertos/hosts específicos.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en desarrollo, permitir todos los orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Cargar modelo entrenado ===
modelo = joblib.load('modelo_inundacion.pkl')

# === Configuración Windy API ===
API_KEY = 'wVbZxJNUUYNNb1GLSIdLTwDMalJdb7Sy'
WINDY_URL = 'https://api.windy.com/api/point-forecast/v2'
HEADERS = {'Content-Type': 'application/json'}
PARAMS = ['rh', 'pressure', 'windGust', 'precip', 'cape', 'lclouds', 'convPrecip']
LEVELS = ['surface']
RENOMBRAR = {
    'precip': 'past3hprecip-surface',
    'convPrecip': 'past3hconvprecip-surface',
    'rh': 'rh-surface',
    'pressure': 'pressure-surface',
    'windGust': 'gust-surface',
    'cape': 'cape-surface',
    'lclouds': 'lclouds-surface'
}
COLUMNAS_MODELO = list(RENOMBRAR.values())

# === Clasificación de riesgo ===
def categorizar(prob):
    if prob < 0.5:
        return "baja"
    elif prob < 0.7:
        return "media"
    else:
        return "alta"

# === Función para consultar Windy y predecir ===
def consultar_y_predecir(lat, lon):
    payload = {
        "lat": lat,
        "lon": lon,
        "model": "gfs",
        "parameters": PARAMS,
        "levels": LEVELS,
        "key": API_KEY
    }

    response = requests.post(WINDY_URL, json=payload, headers=HEADERS)
    response.raise_for_status()
    data = response.json()

    df_raw = pd.DataFrame({k: v for k, v in data.items() if k != 'units'})
    df_renombrado = df_raw.rename(columns=RENOMBRAR)
    df_single = df_renombrado.iloc[[0]][COLUMNAS_MODELO]

    probabilidad = modelo.predict_proba(df_single)[0][1]
    return round(probabilidad, 4)

# === Endpoint para La María ===
@app.get("/la_maria")
def prediccion_la_maria():
    lat = 4.597956
    lon = -74.201885
    try:
        prob = consultar_y_predecir(lat, lon)
        return [prob, categorizar(prob)]
    except Exception as e:
        return {"error": "Error en La María", "detalle": str(e)}

# === Endpoint para Danubio ===
@app.get("/danubio")
def prediccion_danubio():
    lat = 4.590101
    lon = -74.224665
    try:
        prob = consultar_y_predecir(lat, lon)
        return [prob, categorizar(prob)]
    except Exception as e:
        return {"error": "Error en Danubio", "detalle": str(e)}

# === Endpoint para simulación arriesgada ===
@app.get("/simulacion_arriesgada")
def simulacion_arriesgada():
    simulacion = pd.DataFrame([{
        'past3hprecip-surface': np.random.uniform(0.05, 0.15),
        'past3hconvprecip-surface': np.random.uniform(0.05, 0.15),
        'rh-surface': np.random.uniform(85, 95),
        'pressure-surface': np.random.uniform(97000, 98500),
        'gust-surface': np.random.uniform(4, 8),
        'cape-surface': np.random.uniform(150, 400),
        'lclouds-surface': np.random.uniform(50, 80)
    }])
    try:
        prob = modelo.predict_proba(simulacion)[0][1]
        return [round(prob, 4), categorizar(prob)]
    except Exception as e:
        return {"error": "Error en simulación arriesgada", "detalle": str(e)}

# === Endpoint para simulación peligrosa ===
@app.get("/simulacion_peligrosa")
def simulacion_peligrosa():
    simulacion = pd.DataFrame([{
        'past3hprecip-surface': 0.3,
        'past3hconvprecip-surface': 0.3,
        'rh-surface': 98,
        'pressure-surface': 96000,
        'gust-surface': 12,
        'cape-surface': 800,
        'lclouds-surface': 95
    }])
    try:
        prob = modelo.predict_proba(simulacion)[0][1]
        return [round(prob, 4), categorizar(prob)]
    except Exception as e:
        return {"error": "Error en simulación peligrosa", "detalle": str(e)}

@app.get("/parametros_la_maria")
def parametros_la_maria():
    lat = 4.597956
    lon = -74.201885
    return obtener_parametros_crudos(lat, lon)

@app.get("/parametros_danubio")
def parametros_danubio():
    lat = 4.590101
    lon = -74.224665
    return obtener_parametros_crudos(lat, lon)

# === Función auxiliar compartida ===
def obtener_parametros_crudos(lat, lon):
    payload = {
        "lat": lat,
        "lon": lon,
        "model": "gfs",
        "parameters": PARAMS,
        "levels": LEVELS,
        "key": API_KEY
    }

    try:
        response = requests.post(WINDY_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        return {k: v[0] for k, v in data.items() if k != 'units'}
    except Exception as e:
        return {"error": "Error al consultar Windy", "detalle": str(e)}