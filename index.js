const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Ruta inicial para la llamada
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  // Mensaje inicial: se reproduce inmediatamente al contestar
  twiml.say({ language: 'es-MX', voice: 'woman' }, 'Hola. Gracias por responder esta llamada. Vamos a hacerte una breve encuesta.');

  // Luego viene la primera pregunta dentro de gather
  const gather = twiml.gather({
    numDigits: 1,
    action: '/question1',
    method: 'POST'
  });

  gather.say({ language: 'es-MX', voice: 'woman' }, 'Primera pregunta. ¿Te interesa empezar un curso este mes? Presiona 1 para sí, 2 para no.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Ruta para la respuesta a la primera pregunta
app.post('/question1', (req, res) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  if (digit === '1') {
    // Mensaje fuera del gather (se reproduce inmediatamente)
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Excelente.');

    const gather = twiml.gather({
      numDigits: 1,
      action: '/question2',
      method: 'POST'
    });

    gather.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Segunda pregunta. ¿Tienes el presupuesto para comenzar? Presiona 1 para sí, 2 para no.');
  } else {
    twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tu tiempo. Hasta luego.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Ruta para la respuesta a la segunda pregunta
app.post('/question2', (req, res) => {
  const twiml = new VoiceResponse();

  twiml.say({ language: 'es-MX', voice: 'Polly.Conchita' }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`Servidor de encuesta corriendo en http://localhost:${port}`);
});
