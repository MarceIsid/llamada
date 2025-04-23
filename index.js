const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Ruta inicial de la llamada
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/question1',
    method: 'POST'
  });

  gather.say({ language: 'es-CL', voice: 'female' }, 'Hola. Gracias por responder esta llamada. Vamos a hacerte una breve encuesta.');
  gather.say({ language: 'es-CL', voice: 'female' }, 'Primera pregunta. ¿Te interesa empezar un curso este mes? Presiona 1 para sí, 2 para no.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Procesa respuesta de pregunta 1
app.post('/question1', (req, res) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  if (digit === '1') {
    const gather = twiml.gather({
      numDigits: 1,
      action: '/question2',
      method: 'POST'
    });

    gather.say({ language: 'es-CL', voice: 'female' }, 'Excelente. Segunda pregunta. ¿Tienes el presupuesto para comenzar? Presiona 1 para sí, 2 para no.');
  } else {
    twiml.say({ language: 'es-CL', voice: 'female' }, 'Gracias por tu tiempo. Hasta luego.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Procesa respuesta de pregunta 2
app.post('/question2', (req, res) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  twiml.say({ language: 'es-CL', voice: 'female' }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`Servidor de encuesta corriendo en http://localhost:${port}`);
});
