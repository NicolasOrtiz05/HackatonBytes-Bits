# Proyecto
Solución tecnológica para fortalecer la prevención de desastres en la Cruz Roja que integra: un dashboard web en tiempo real (HTML/Tailwind/JS) con Power BI embebido para monitorear barrios priorizados, un sistema de comunicación ciudadana por WhatsApp con un agente de IA que valida y estructura reportes locales, y un modelo predictivo que estima riesgo meteorológico y dispara alertas tempranas; el flujo orquesta datos mediante FastAPI (servicios y scoring), Make.com (ingesta y agregación) y n8n (automatización y envío por WhatsApp Business Cloud), con actualizaciones automáticas cada 30 s, trazabilidad de eventos, y reglas de activación por nivel de alerta; al combinar señales de la comunidad con pronósticos y analítica, permite decisiones más rápidas, focalización geográfica de recursos y una respuesta humanitaria más eficiente y humana.

## Configuración de la API

1. Instala las dependencias para la API:

   ```sh
   pip install fastapi uvicorn joblib requests pandas scikit-learn
   
2. Ejectuta el siguiente comando en la consola:

    ```sh
   uvicorn API:app --reload
