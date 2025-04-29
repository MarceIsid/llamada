const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

const leads = {}; // Aquí guardamos las respuestas por llamada

// Ruta base para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de llamada funcionando correctamente');
});

// Ruta inicial de la llamada
app.post('/voice', (req, res) => {
  const callSid = req.body.CallSid;
  const phoneNumber = req.body.To || 'desconocido';

  leads[callSid] = {
    callSid,
    telefono: phoneNumber,
  };

  const twiml = new VoiceResponse();
  twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Hola. Mi nombre es Marcela, ejecutiva virtual de Gestión Didáctica. Gracias por responder esta llamada. Vamos a hacerte una breve encuesta.');

  const gather = twiml.gather({
    input: 'speech',
    language: 'es-MX',
    action: '/question1',
    method: 'POST',
    timeout: 5
  });

  gather.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Primera pregunta. ¿Te interesa empezar un curso este mes?');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Primera pregunta
app.post('/question1', (req, res) => {
  const callSid = req.body.CallSid;
  const respuesta = (req.body.SpeechResult || '').trim().toLowerCase();
  const twiml = new VoiceResponse();

  if (!leads[callSid]) leads[callSid] = { callSid };

  leads[callSid].respuesta1 = respuesta;

  if (respuesta.includes('sí')) {
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Excelente.');

    const gather = twiml.gather({
      input: 'speech',
      language: 'es-MX',
      action: '/question2',
      method: 'POST',
      timeout: 5
    });

    gather.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Segunda pregunta. ¿Tienes el presupuesto para comenzar?');
  } else {
    leads[callSid].respuesta2 = 'no'; // Si no pasa a la siguiente pregunta, se asume no
    calificarYEnviar(callSid);

    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tu tiempo. Hasta luego.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Segunda pregunta
app.post('/question2', (req, res) => {
  const callSid = req.body.CallSid;
  const respuesta = (req.body.SpeechResult || '').trim().toLowerCase();
  const twiml = new VoiceResponse();

  if (!leads[callSid]) leads[callSid] = { callSid };

  leads[callSid].respuesta2 = respuesta;

  calificarYEnviar(callSid);

  twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

// Función para clasificar al lead y enviar a n8n
function calificarYEnviar(callSid) {
  const lead = leads[callSid];
  if (!lead) return;

  const r1 = lead.respuesta1?.includes('sí') || false;
  const r2 = lead.respuesta2?.includes('sí') || false;

  let categoria;
  if (r1 && r2) categoria = 'A';
  else if (r1 || r2) categoria = 'B';
  else categoria = 'C';

  const payload = {
    callSid,
    telefono: lead.telefono,
    respuesta1: lead.respuesta1,
    respuesta2: lead.respuesta2,
    categoria
  };

  axios.post('http://localhost:5678/webhook/leads-twilio', payload)
    .then(() => console.log(`✅ Lead ${callSid} enviado a n8n como tipo ${categoria}`))
    .catch(err => console.error('❌ Error al enviar lead a n8n:', err.message));
}

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
