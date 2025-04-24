const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Ruta inicial para la llamada
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Hola. Gracias por responder esta llamada. Vamos a hacerte una breve encuesta.');

  const gather = twiml.gather({
    input: 'speech',
    language: 'es-MX',
    action: '/question1',
    method: 'POST',
    timeout: 2
  });

  gather.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Primera pregunta. ¿Te interesa empezar un curso este mes? Puedes responder sí o no.');

  // En caso de no responder
  twiml.redirect('/voice');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Respuesta a la primera pregunta
app.post('/question1', (req, res) => {
  const respuesta = (req.body.SpeechResult || '').toLowerCase();
  const twiml = new VoiceResponse();

  if (respuesta.includes('sí')) {
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Excelente.');

    const gather = twiml.gather({
      input: 'speech',
      language: 'es-MX',
      action: '/question2',
      method: 'POST',
      timeout: 2
    });

    gather.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Segunda pregunta. ¿Tienes el presupuesto para comenzar? Puedes responder sí o no.');

    // Fallback si no contesta
    twiml.redirect('/question1');
  } else {
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tu tiempo. Hasta luego.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Respuesta a la segunda pregunta
app.post('/question2', (req, res) => {
  const respuesta = (req.body.SpeechResult || '').toLowerCase();
  const twiml = new VoiceResponse();

  twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
