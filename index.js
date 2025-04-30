const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Configuración avanzada
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configuración del webhook (usar variable de entorno en producción)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ac8b-191-125-143-243.ngrok-free.app/webhook/webhook/leads-twilio';

// Almacenamiento temporal de leads
const leads = {};

// Ruta de verificación de salud
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'operativo',
    version: '1.0.0',
    n8n_webhook_url: N8N_WEBHOOK_URL,
    leads_activos: Object.keys(leads).length
  });
});

// Ruta de inicio de llamada
app.post('/voice', (req, res) => {
  try {
    const callSid = req.body.CallSid || req.body.callSid;
    const phoneNumber = req.body.To || req.body.From || 'desconocido';

    if (!callSid) {
      throw new Error('CallSid no proporcionado');
    }

    leads[callSid] = {
      callSid,
      telefono: phoneNumber,
      timestampInicio: new Date().toISOString(),
      estado: 'iniciado'
    };

    const twiml = new VoiceResponse();
    twiml.say({ 
      language: 'es-MX', 
      voice: 'Polly.Conchita',
      rate: 'medium'
    }, 'Hola. Mi nombre es Marcela, ejecutiva virtual de Gestión Didáctica. Gracias por responder esta llamada. Vamos a hacerte una breve encuesta.');

    const gather = twiml.gather({
      input: 'speech',
      language: 'es-MX',
      action: '/question1',
      method: 'POST',
      timeout: 10,
      speechTimeout: 'auto',
      actionOnEmptyResult: true
    });

    gather.say({ 
      language: 'es-MX', 
      voice: 'Polly.Conchita',
      rate: 'medium'
    }, 'Primera pregunta. ¿Te interesa empezar un curso este mes? Responde sí o no.');

    res.type('text/xml').status(200).send(twiml.toString());
  } catch (error) {
    console.error('Error en /voice:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Primera pregunta
app.post('/question1', (req, res) => {
  try {
    const callSid = req.body.CallSid || req.body.callSid;
    const respuesta = (req.body.SpeechResult || '').trim().toLowerCase();

    if (!callSid) {
      throw new Error('CallSid no proporcionado');
    }

    if (!leads[callSid]) {
      leads[callSid] = { callSid };
    }

    leads[callSid].respuesta1 = respuesta;
    leads[callSid].timestampPregunta1 = new Date().toISOString();
    leads[callSid].estado = 'pregunta1_respondida';

    const twiml = new VoiceResponse();

    if (respuesta.includes('sí') || respuesta.includes('si')) {
      twiml.say({ 
        language: 'es-MX', 
        voice: 'Polly.Conchita',
        rate: 'medium'
      }, 'Excelente.');

      const gather = twiml.gather({
        input: 'speech',
        language: 'es-MX',
        action: '/question2',
        method: 'POST',
        timeout: 10,
        speechTimeout: 'auto',
        actionOnEmptyResult: true
      });

      gather.say({ 
        language: 'es-MX', 
        voice: 'Polly.Conchita',
        rate: 'medium'
      }, 'Segunda pregunta. ¿Tienes el presupuesto para comenzar? Responde sí o no.');
    } else {
      leads[callSid].respuesta2 = 'no';
      leads[callSid].estado = 'completado';
      leads[callSid].timestampFinalizacion = new Date().toISOString();
      
      enviarRespuestasAN8N(callSid);
      
      twiml.say({ 
        language: 'es-MX', 
        voice: 'Polly.Conchita',
        rate: 'medium'
      }, 'Gracias por tu tiempo. Hasta luego.');
      twiml.hangup();
    }

    res.type('text/xml').status(200).send(twiml.toString());
  } catch (error) {
    console.error('Error en /question1:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Segunda pregunta
app.post('/question2', (req, res) => {
  try {
    const callSid = req.body.CallSid || req.body.callSid;
    const respuesta = (req.body.SpeechResult || '').trim().toLowerCase();

    if (!callSid) {
      throw new Error('CallSid no proporcionado');
    }

    if (!leads[callSid]) {
      leads[callSid] = { callSid };
    }

    leads[callSid].respuesta2 = respuesta;
    leads[callSid].timestampPregunta2 = new Date().toISOString();
    leads[callSid].estado = 'completado';
    leads[callSid].timestampFinalizacion = new Date().toISOString();

    enviarRespuestasAN8N(callSid);

    const twiml = new VoiceResponse();
    twiml.say({ 
      language: 'es-MX', 
      voice: 'Polly.Conchita',
      rate: 'medium'
    }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
    twiml.hangup();

    res.type('text/xml').status(200).send(twiml.toString());
  } catch (error) {
    console.error('Error en /question2:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Función mejorada para enviar datos a n8n
async function enviarRespuestasAN8N(callSid) {
  try {
    if (!leads[callSid]) {
      throw new Error(`Lead con CallSid ${callSid} no encontrado`);
    }

    const payload = {
      metadata: {
        callSid: callSid,
        timestamp: new Date().toISOString(),
        source: 'twilio-voice'
      },
      respuestas: {
        ...leads[callSid],
        duracionSegundos: calcularDuracionLlamada(leads[callSid])
      }
    };

    console.log('Enviando a n8n:', {
      url: N8N_WEBHOOK_URL,
      payload: payload
    });

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Source': 'twilio-voice-app'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Respuesta de n8n:', {
      status: response.status,
      data: response.data
    });

    return response.data;
  } catch (error) {
    console.error('Error al enviar a n8n:', {
      message: error.message,
      url: N8N_WEBHOOK_URL,
      code: error.code,
      stack: error.stack,
      response: error.response?.data
    });
    throw error;
  }
}

// Función auxiliar para calcular duración
function calcularDuracionLlamada(lead) {
  try {
    if (!lead.timestampInicio) return 0;
    
    const inicio = new Date(lead.timestampInicio);
    const fin = new Date(lead.timestampFinalizacion || new Date().toISOString());
    return Math.round((fin - inicio) / 1000);
  } catch (error) {
    console.error('Error calculando duración:', error);
    return 0;
  }
}

// Ruta para debug (opcional)
app.get('/debug/leads', (req, res) => {
  res.status(200).json({
    count: Object.keys(leads).length,
    leads: leads
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
  console.log(`🔗 Webhook n8n configurado en: ${N8N_WEBHOOK_URL}`);
  console.log('📝 Registros detallados activados');
});
