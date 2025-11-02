# Proyecto
Proyecto web de Gestión de Riesgos para Cruz Roja: un panel en HTML, Tailwind y JavaScript que muestra el monitoreo de barrios (La María y Danubio) con índice de riesgo y parámetros climáticos, se actualiza automáticamente cada 30 segundos, incluye simulaciones de riesgo, embebe un reporte de Power BI de forma responsive y permite enviar alertas por WhatsApp mediante un botón que llama a un webhook en n8n, el cual reenvía a WhatsApp Business Cloud; los datos operativos llegan desde un webhook de Make.com y un backend FastAPI local con CORS habilitado.

## Configuración de la API

1. Instala las dependencias para la API:

   ```sh
   pip install fastapi uvicorn joblib requests pandas scikit-learn
   
2. Ejectuta el siguiente comando en la consola:

    ```sh
   uvicorn API:app --reload
