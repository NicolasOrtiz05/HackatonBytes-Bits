# Proyecto
Solución tecnológica para fortalecer la prevención de desastres en la Cruz Roja que integra tres desarrollos clave para anticiparse a los desastres y mejorar la respuesta humanitaria:

- Un dashboard web inteligente en tiempo real, construido con HTML, Tailwind y JavaScript, que incorpora Power BI embebido para visibilizar acciones humanitarias y monitorear barrios priorizados.
- Un sistema de comunicación ciudadana vía WhatsApp, potenciado por un agente de inteligencia artificial que valida y estructura reportes locales.
- Un modelo predictivo de riesgo meteorológico, que estima escenarios y activa alertas tempranas según niveles de alerta definidos.

El flujo de datos se orquesta mediante FastAPI, Make.com y n8n, con actualizaciones automáticas cada 30 segundos, trazabilidad de eventos y reglas de activación. Al combinar señales comunitarias con pronósticos y analítica avanzada, se logra una gestión más precisa, focalización geográfica de recursos y una respuesta más eficiente y humana.

## Configuración de la API

1. Instala las dependencias para la API:

   ```sh
   pip install fastapi uvicorn joblib requests pandas scikit-learn
   
2. Ejectuta el siguiente comando en la consola:

    ```sh
   uvicorn API:app --reload
