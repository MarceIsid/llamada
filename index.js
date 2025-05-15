const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Configuración mejorada de bodyParser
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Configuración del webhook n8n (usar variable de entorno en producción)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ac8b-191-125-143-243.ngrok-free.app/webhook/webhook/leads-twilio';

// Almacenamiento temporal de leads
const leads = {};

// Clasificación de leads
const clasificarLead = (respuesta1, respuesta2) => {
  const positiva1 = respuesta1.includes('sí') || respuesta1.includes('si');
  const positiva2 = respuesta2.includes('sí') || respuesta2.includes('si');

  if (positiva1 && positiva2) return 'A';
  if (positiva1 || positiva2) return 'B';
  return 'C';
};

// Ruta para recibir llamadas de Twilio
app.post('/voice', (req, res) => {
  const callSid = req.body.CallSid;
  const nombreCliente = req.query.nombre || 'Cliente';

  // Registro del lead
  leads[callSid] = {
    callSid,
    nombre: nombreCliente,
    timestamp: new Date().toISOString()
  };

  const twiml = new VoiceResponse();
  twiml.say({ 
    language: 'es-MX', 
    voice: 'Polly.Conchita' 
  }, `Hola ${nombreCliente}. Gracias por responder esta llamada. Mi nombre es Marti, ejecutiva virtual de Gestión Didáctica. ¿Te interesa empezar un curso este mes?`);

  const gather = twiml.gather({
    input: 'speech',
    language: 'es-MX',
    action: '/question1',
    method: 'POST',
    timeout: 10,
    speechTimeout: 'auto'
  });

  res.type('text/xml').send(twiml.toString());
});

// Primera pregunta
app.post('/question1', (req, res) => {
  const callSid = req.body.CallSid;
  const respuesta = (req.body.SpeechResult || '').trim().toLowerCase();

  if (!leads[callSid]) leads[callSid] = { callSid };
  leads[callSid].respuesta1 = respuesta;

  const twiml = new VoiceResponse();

  if (respuesta.includes('sí') || respuesta.includes('si')) {
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias. Segunda pregunta: ¿Tienes el presupuesto para comenzar? .');

    twiml.gather({
      input: 'speech',
      language: 'es-MX',
      action: '/question2',
      method: 'POST',
      timeout: 10,
      speechTimeout: 'auto'
    });
  } else {
    leads[callSid].respuesta2 = 'no';
    enviarLeadAN8N(callSid);
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tu tiempo. Hasta luego.');
    twiml.hangup();
  }

  res.type('text/xml').send(twiml.toString());
});

// Segunda pregunta
app.post('/question2', (req, res) => {
  const callSid = req.body.CallSid;
  const respuesta = (req.body.SpeechResult || '').trim().toLowerCase();

  if (!leads[callSid]) leads[callSid] = { callSid };
  leads[callSid].respuesta2 = respuesta;

  enviarLeadAN8N(callSid);

  const twiml = new VoiceResponse();
  twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
  twiml.hangup();

  res.type('text/xml').send(twiml.toString());
});

// Función mejorada para enviar datos a n8n
async function enviarLeadAN8N(callSid) {
  try {
    const lead = leads[callSid];
    if (!lead) throw new Error('Lead no encontrado');

    const payload = {
      callSid: lead.callSid,
      telefono_participante: lead.telefono,
      nombre_participante: lead.nombre,
      id_curso: lead.idCurso,
      id_participante: lead.idParticipante,
      correo: lead.correo,
      respuesta1: lead.respuesta1 || '',
      respuesta2: lead.respuesta2 || '',
      timestamp: lead.timestamp || new Date().toISOString()
    };

    console.log('Enviando a n8n:', JSON.stringify(payload, null, 2));

    const response = await axios.post(N8N_WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error al enviar:', {
      message: error.message,
      requestData: payload,
      responseData: error.response?.data
    });
    throw error;
  }
}

app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
  console.log(`Webhook n8n configurado en: ${N8N_WEBHOOK_URL}`);
});
